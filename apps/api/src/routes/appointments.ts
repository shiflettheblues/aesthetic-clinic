import { FastifyInstance } from "fastify";
import { z } from "zod";
import dayjs from "dayjs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { getAvailableSlots, lockSlot, unlockSlot } from "../services/availability.js";
import { notifyBookingCreated, notifyBookingCancelled, sendTemplatedNotification, buildAppointmentVars, createNotification } from "../services/notification.js";
import { sendEmail, sendBookingConfirmation, sendAccountInviteEmail } from "../services/email.js";
import { subscribeContact } from "../services/mailchimp.js";

const createSchema = z.object({
  clientId: z.string(),
  practitionerId: z.string(),
  treatmentId: z.string(),
  startsAt: z.string().datetime(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  notes: z.string().optional(),
  startsAt: z.string().datetime().optional(),
});

export async function appointmentRoutes(app: FastifyInstance) {
  // List appointments (filtered by role)
  app.get("/appointments", { preHandler: authenticate }, async (request, reply) => {
    const { from, to, practitionerId, status } = request.query as {
      from?: string;
      to?: string;
      practitionerId?: string;
      status?: string;
    };

    const where: Record<string, unknown> = {};

    // Clients only see their own
    if (request.user.role === "CLIENT") {
      where.clientId = request.user.sub;
    } else if (request.user.role === "PRACTITIONER") {
      where.practitionerId = request.user.sub;
    }

    if (practitionerId && request.user.role === "ADMIN") {
      where.practitionerId = practitionerId;
    }

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.startsAt = {};
      if (from) (where.startsAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startsAt as Record<string, unknown>).lte = new Date(to);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            consentForms: { select: { id: true }, take: 1 },
          },
        },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return reply.send({ appointments });
  });

  // Get single appointment
  app.get("/appointments/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: true,
        payments: true,
      },
    });

    if (!appointment) {
      return reply.status(404).send({ error: "Appointment not found", code: "NOT_FOUND" });
    }

    // Clients can only view their own
    if (request.user.role === "CLIENT" && appointment.clientId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    return reply.send({ appointment });
  });

  // Get availability
  app.get("/appointments/availability", async (request, reply) => {
    const { practitionerId, date, treatmentId } = request.query as {
      practitionerId: string;
      date: string;
      treatmentId: string;
    };

    if (!practitionerId || !date || !treatmentId) {
      return reply.status(400).send({
        error: "practitionerId, date, and treatmentId are required",
        code: "VALIDATION_ERROR",
      });
    }

    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    const slots = await getAvailableSlots(practitionerId, date, treatment.durationMinutes);
    return reply.send({ slots, date, practitionerId, treatmentId });
  });

  // Lock a slot during checkout
  app.post("/appointments/lock-slot", { preHandler: authenticate }, async (request, reply) => {
    const schema = z.object({
      practitionerId: z.string(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const locked = await lockSlot(
      parsed.data.practitionerId,
      parsed.data.startsAt,
      parsed.data.endsAt,
      request.user.sub
    );

    if (!locked) {
      return reply.status(409).send({ error: "Slot already locked", code: "SLOT_LOCKED" });
    }

    return reply.send({ locked: true, expiresInSeconds: 600 });
  });

  // Create appointment
  app.post("/appointments", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { clientId, practitionerId, treatmentId, startsAt, notes } = parsed.data;

    // Clients can only book for themselves
    if (request.user.role === "CLIENT" && clientId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    const endsAt = dayjs(startsAt).add(treatment.durationMinutes, "minute").toISOString();

    // Check for overlapping appointments
    const overlap = await prisma.appointment.findFirst({
      where: {
        practitionerId,
        status: { notIn: ["CANCELLED"] },
        startsAt: { lt: new Date(endsAt) },
        endsAt: { gt: new Date(startsAt) },
      },
    });

    if (overlap) {
      return reply.status(409).send({ error: "Time slot not available", code: "SLOT_UNAVAILABLE" });
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        practitionerId,
        treatmentId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        notes,
        status: "CONFIRMED",
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
    });

    // Release slot lock
    await unlockSlot(practitionerId, startsAt);

    // Send in-app notifications
    await notifyBookingCreated({
      clientId,
      practitionerId,
      treatmentName: treatment.name,
      startsAt: new Date(startsAt),
    });

    // Send templated email/SMS confirmation
    try {
      const vars = buildAppointmentVars({
        clientName: appointment.client.firstName,
        treatmentName: treatment.name,
        practitionerName: `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`,
        startsAt: new Date(startsAt),
      });
      await sendTemplatedNotification({
        type: "BOOKING_CONFIRMED",
        clientEmail: appointment.client.email ?? null,
        clientPhone: null, // phone not in create select — send on confirm only
        vars,
      });
    } catch (e) {
      console.error("[NOTIFY] Booking confirmed send error:", e);
    }

    // Auto-award loyalty points
    try {
      await prisma.loyaltyPoints.create({
        data: {
          clientId,
          points: 10,
          reason: "booking",
          reference: appointment.id,
        },
      });
    } catch (e) {
      console.error("[LOYALTY] Failed to award booking points:", e);
    }

    return reply.status(201).send({ appointment });
  });

  // Guest booking — no auth required
  const guestSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    practitionerId: z.string(),
    treatmentId: z.string(),
    startsAt: z.string().datetime(),
    notes: z.string().optional(),
  });

  app.post("/appointments/guest", async (request, reply) => {
    const parsed = guestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { firstName, lastName, email, phone, practitionerId, treatmentId, startsAt, notes } = parsed.data;

    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    const endsAt = dayjs(startsAt).add(treatment.durationMinutes, "minute").toISOString();

    // Check for overlapping appointments
    const overlap = await prisma.appointment.findFirst({
      where: {
        practitionerId,
        status: { notIn: ["CANCELLED"] },
        startsAt: { lt: new Date(endsAt) },
        endsAt: { gt: new Date(startsAt) },
      },
    });

    if (overlap) {
      return reply.status(409).send({ error: "Time slot not available", code: "SLOT_UNAVAILABLE" });
    }

    // Find or create client
    let client = await prisma.user.findUnique({ where: { email } });
    let isNewClient = false;

    if (!client) {
      // Create guest user with no usable password (random hash)
      const randomPass = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPass, 12);
      const inviteToken = crypto.randomBytes(32).toString("hex");

      client = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          passwordHash,
          role: "CLIENT",
          inviteToken,
          inviteExpiresAt: dayjs().add(7, "day").toDate(),
        },
      });
      isNewClient = true;
    } else {
      // Update phone if not set
      if (!client.phone && phone) {
        await prisma.user.update({ where: { id: client.id }, data: { phone } });
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        practitionerId,
        treatmentId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        notes,
        status: "CONFIRMED",
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
    });

    // Release slot lock
    await unlockSlot(practitionerId, startsAt);

    // Send in-app notifications
    await notifyBookingCreated({
      clientId: client.id,
      practitionerId,
      treatmentName: treatment.name,
      startsAt: new Date(startsAt),
    });

    const practitioner = appointment.practitioner;
    const practitionerName = `${practitioner.firstName} ${practitioner.lastName}`;
    const dateTime = dayjs(startsAt).format("dddd D MMMM YYYY [at] HH:mm");

    // Send booking confirmation email
    try {
      await sendBookingConfirmation({
        to: email,
        clientName: firstName,
        treatmentName: treatment.name,
        practitionerName,
        dateTime,
      });
    } catch (e) {
      console.error("[GUEST] Booking confirmation email error:", e);
    }

    // Send account invite email for new clients
    if (isNewClient && client.inviteToken) {
      try {
        await sendAccountInviteEmail({
          to: email,
          clientName: firstName,
          treatmentName: treatment.name,
          practitionerName,
          dateTime,
          inviteToken: client.inviteToken,
        });
      } catch (e) {
        console.error("[GUEST] Account invite email error:", e);
      }
    }

    // Subscribe to Mailchimp
    try {
      await subscribeContact({
        email,
        firstName,
        lastName,
        phone,
        tags: ["guest-booking", treatment.category ?? "Other"],
      });
    } catch (e) {
      console.error("[GUEST] Mailchimp subscribe error:", e);
    }

    // Auto-award loyalty points
    try {
      await prisma.loyaltyPoints.create({
        data: {
          clientId: client.id,
          points: 10,
          reason: "booking",
          reference: appointment.id,
        },
      });
    } catch (e) {
      console.error("[LOYALTY] Failed to award booking points:", e);
    }

    return reply.status(201).send({ appointment, isNewClient });
  });

  // Update appointment
  app.patch("/appointments/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { treatment: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: "Appointment not found", code: "NOT_FOUND" });
    }

    // Clients can only cancel their own
    if (request.user.role === "CLIENT") {
      if (existing.clientId !== request.user.sub) {
        return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
      }
      if (parsed.data.status && parsed.data.status !== "CANCELLED") {
        return reply.status(403).send({ error: "Clients can only cancel", code: "FORBIDDEN" });
      }
    }

    const data: Record<string, unknown> = { ...parsed.data };

    // Recalculate endsAt if startsAt changes
    if (parsed.data.startsAt) {
      data.startsAt = new Date(parsed.data.startsAt);
      data.endsAt = dayjs(parsed.data.startsAt).add(existing.treatment.durationMinutes, "minute").toDate();
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, name: true } },
      },
    });

    const client = appointment.client;
    const vars = buildAppointmentVars({
      clientName: client.firstName,
      treatmentName: existing.treatment.name,
      practitionerName: `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`,
      startsAt: existing.startsAt,
    });

    if (parsed.data.status === "CANCELLED") {
      await notifyBookingCancelled({
        clientId: existing.clientId,
        practitionerId: existing.practitionerId,
        treatmentName: existing.treatment.name,
        startsAt: existing.startsAt,
      });
      // Send templated cancellation email/SMS
      try {
        await sendTemplatedNotification({
          type: "BOOKING_CANCELLED",
          clientEmail: client.email ?? null,
          clientPhone: client.phone ?? null,
          vars,
        });
      } catch (e) {
        console.error("[NOTIFY] Cancellation send error:", e);
      }
    }

    // Rescheduled: notify client of new time
    if (parsed.data.startsAt && parsed.data.status !== "CANCELLED") {
      try {
        const newVars = buildAppointmentVars({
          clientName: client.firstName,
          treatmentName: existing.treatment.name,
          practitionerName: `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`,
          startsAt: new Date(parsed.data.startsAt),
        });
        await sendTemplatedNotification({
          type: "BOOKING_CONFIRMED",
          clientEmail: client.email ?? null,
          clientPhone: client.phone ?? null,
          vars: newVars,
        });
      } catch (e) {
        console.error("[NOTIFY] Reschedule send error:", e);
      }
    }

    // Completed: send follow-up + aftercare SOPs
    if (parsed.data.status === "COMPLETED") {
      // Send follow-up message
      try {
        await sendTemplatedNotification({
          type: "FOLLOW_UP",
          clientEmail: client.email ?? null,
          clientPhone: client.phone ?? null,
          vars,
        });
      } catch (e) {
        console.error("[NOTIFY] Follow-up send error:", e);
      }

      // Send aftercare SOP guides
      try {
        const aftercareTemplates = await prisma.sopTemplate.findMany({
          where: { type: "AFTERCARE_GUIDE", isActive: true },
        });
        if (aftercareTemplates.length > 0 && client.email) {
          const aftercareHtml = aftercareTemplates
            .map((t) => `<h3>${t.name}</h3><div style="white-space:pre-wrap">${t.content}</div>`)
            .join("<hr>");
          await sendEmail({
            to: client.email,
            subject: `Aftercare Instructions — ${existing.treatment.name}`,
            html: `
              <h2>Aftercare Instructions</h2>
              <p>Hi ${client.firstName},</p>
              <p>Thank you for your ${existing.treatment.name} today. Please follow these aftercare instructions:</p>
              ${aftercareHtml}
              <p>If you have any questions, please contact the clinic.</p>
              <p>Dr Skin Central</p>
            `,
          });
        }
      } catch (e) {
        console.error("[AFTERCARE] Failed to send aftercare instructions:", e);
      }

      // Auto-send Google review request
      try {
        const googleConfig = await prisma.integrationConfig.findUnique({
          where: { provider: "google_reviews" },
        });
        if (googleConfig?.isEnabled) {
          const settings = (googleConfig.settings as Record<string, unknown>) ?? {};
          const placeId = settings.placeId as string;
          const autoSend = settings.autoSendReview !== false;
          if (placeId && autoSend && client.email) {
            const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
            await sendEmail({
              to: client.email,
              subject: "How was your visit? Leave us a review!",
              html: `
                <h2>Thank you for visiting us!</h2>
                <p>Hi ${client.firstName},</p>
                <p>We hope you enjoyed your ${existing.treatment.name} today. We'd love to hear your feedback!</p>
                <p><a href="${reviewUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Leave a Google Review</a></p>
                <p>Thank you for choosing Dr Skin Central!</p>
              `,
            });
          }
        }
      } catch (e) {
        console.error("[GOOGLE_REVIEWS] Failed to send review request:", e);
      }
    }

    return reply.send({ appointment });
  });

  // Send 24h reminders — call this from an external cron (e.g. daily at 10am)
  app.post("/appointments/send-reminders", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const now = dayjs();
    const windowStart = now.add(23, "hour").toDate();
    const windowEnd = now.add(25, "hour").toDate();

    const appointments = await prisma.appointment.findMany({
      where: {
        startsAt: { gte: windowStart, lte: windowEnd },
        status: "CONFIRMED",
        reminder24hSentAt: null,
      },
      include: {
        client: { select: { id: true, firstName: true, email: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { name: true } },
      },
    });

    let sent = 0;
    for (const appt of appointments) {
      try {
        const vars = buildAppointmentVars({
          clientName: appt.client.firstName,
          treatmentName: appt.treatment.name,
          practitionerName: `${appt.practitioner.firstName} ${appt.practitioner.lastName}`,
          startsAt: appt.startsAt,
        });
        await sendTemplatedNotification({
          type: "BOOKING_REMINDER_24H",
          clientEmail: appt.client.email ?? null,
          clientPhone: appt.client.phone ?? null,
          vars,
        });
        await createNotification({
          userId: appt.client.id,
          type: "BOOKING_REMINDER_24H",
          title: "Appointment Tomorrow",
          body: `Reminder: ${appt.treatment.name} tomorrow at ${dayjs(appt.startsAt).format("HH:mm")}.`,
        });
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminder24hSentAt: new Date() },
        });
        sent++;
      } catch (e) {
        console.error(`[REMINDERS] Failed for appointment ${appt.id}:`, e);
      }
    }

    return reply.send({ sent, total: appointments.length });
  });
}
