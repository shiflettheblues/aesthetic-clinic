import dayjs from "dayjs";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

interface Slot {
  startsAt: string;
  endsAt: string;
}

/**
 * Generate available time slots for a practitioner on a given date
 * for a specific treatment duration.
 */
export async function getAvailableSlots(
  practitionerId: string,
  date: string, // YYYY-MM-DD
  durationMinutes: number,
  slotIntervalMinutes = 15
): Promise<Slot[]> {
  const practitioner = await prisma.user.findFirst({
    where: { id: practitionerId, role: "PRACTITIONER" },
    select: { workingHoursStart: true, workingHoursEnd: true, workingDays: true },
  });

  if (!practitioner) return [];

  const dayOfWeek = dayjs(date).day(); // 0=Sun, 6=Sat
  if (!practitioner.workingDays.includes(dayOfWeek)) return [];

  const start = practitioner.workingHoursStart ?? "09:00";
  const end = practitioner.workingHoursEnd ?? "18:00";

  const dayStart = dayjs(`${date}T${start}:00`);
  const dayEnd = dayjs(`${date}T${end}:00`);

  // Fetch existing appointments for this practitioner on this date
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      practitionerId,
      status: { notIn: ["CANCELLED"] },
      startsAt: { gte: dayStart.toDate(), lt: dayEnd.toDate() },
    },
    select: { startsAt: true, endsAt: true },
  });

  // Fetch blocked slots for this date
  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      practitionerId,
      startsAt: { lt: dayEnd.toDate() },
      endsAt: { gt: dayStart.toDate() },
    },
    select: { startsAt: true, endsAt: true },
  });

  // Fetch Redis locks (slot:lock:{practitionerId}:{ISO})
  const lockedKeys = await redis.keys(`slot:lock:${practitionerId}:${date}*`);
  const lockedSlots: { startsAt: Date; endsAt: Date }[] = [];
  for (const key of lockedKeys) {
    const data = await redis.get(key);
    if (data) {
      const parsed = JSON.parse(data) as { startsAt: string; endsAt: string };
      lockedSlots.push({
        startsAt: new Date(parsed.startsAt),
        endsAt: new Date(parsed.endsAt),
      });
    }
  }

  const allBlocked = [
    ...existingAppointments,
    ...blockedSlots,
    ...lockedSlots,
  ];

  // Generate slots
  const slots: Slot[] = [];
  let cursor = dayStart;

  while (cursor.add(durationMinutes, "minute").isBefore(dayEnd) || cursor.add(durationMinutes, "minute").isSame(dayEnd)) {
    const slotStart = cursor;
    const slotEnd = cursor.add(durationMinutes, "minute");

    // Check for overlap with blocked/booked
    const overlaps = allBlocked.some((blocked) => {
      const bStart = dayjs(blocked.startsAt);
      const bEnd = dayjs(blocked.endsAt);
      return slotStart.isBefore(bEnd) && slotEnd.isAfter(bStart);
    });

    // Skip past slots
    if (!overlaps && slotStart.isAfter(dayjs())) {
      slots.push({
        startsAt: slotStart.toISOString(),
        endsAt: slotEnd.toISOString(),
      });
    }

    cursor = cursor.add(slotIntervalMinutes, "minute");
  }

  return slots;
}

/**
 * Lock a slot in Redis for 10 minutes during checkout
 */
export async function lockSlot(
  practitionerId: string,
  startsAt: string,
  endsAt: string,
  clientId: string
): Promise<boolean> {
  const key = `slot:lock:${practitionerId}:${startsAt}`;
  const existing = await redis.get(key);
  if (existing) {
    const parsed = JSON.parse(existing) as { clientId: string };
    if (parsed.clientId !== clientId) return false; // locked by someone else
  }

  await redis.set(
    key,
    JSON.stringify({ startsAt, endsAt, clientId }),
    "EX",
    600 // 10 minutes
  );
  return true;
}

/**
 * Unlock a slot (after booking completes or times out)
 */
export async function unlockSlot(practitionerId: string, startsAt: string): Promise<void> {
  const key = `slot:lock:${practitionerId}:${startsAt}`;
  await redis.del(key);
}
