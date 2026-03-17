import { FastifyInstance } from "fastify";
import { z } from "zod";
import dayjs from "dayjs";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const targetSchema = z.object({
  practitionerId: z.string(),
  type: z.enum(["REVENUE", "APPOINTMENTS"]),
  amountCents: z.number().int().optional(),
  appointmentCount: z.number().int().optional(),
  period: z.enum(["WEEKLY", "MONTHLY"]),
});

async function getPractitionerStats(practitionerId: string) {
  const now = dayjs();
  const todayStart = now.startOf("day").toDate();
  const todayEnd = now.endOf("day").toDate();
  const monthStart = now.startOf("month").toDate();
  const monthEnd = now.endOf("month").toDate();
  const last30Start = now.subtract(30, "day").toDate();
  const prev90Start = now.subtract(90, "day").toDate();
  const prev30End = now.subtract(30, "day").toDate();

  const [todayAppts, monthAppts, recentClients, prevClients, futureAppts, targets] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { practitionerId, startsAt: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          treatment: { select: { name: true, priceCents: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: { practitionerId, startsAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
        include: { treatment: { select: { priceCents: true } } },
      }),
      prisma.appointment.findMany({
        where: { practitionerId, startsAt: { gte: last30Start }, status: "COMPLETED" },
        select: { clientId: true },
      }),
      prisma.appointment.findMany({
        where: { practitionerId, startsAt: { gte: prev90Start, lt: prev30End }, status: "COMPLETED" },
        select: { clientId: true },
      }),
      prisma.appointment.findMany({
        where: { practitionerId, startsAt: { gt: now.toDate() }, status: { not: "CANCELLED" } },
        select: { clientId: true },
      }),
      prisma.staffTarget.findMany({
        where: { practitionerId, startsAt: { lte: now.toDate() }, endsAt: { gte: now.toDate() } },
      }),
    ]);

  const monthRevenue = monthAppts.reduce((s, a) => s + (a.treatment?.priceCents ?? 0), 0);
  const recentClientIds = new Set(recentClients.map((a) => a.clientId));
  const prevClientIds = new Set(prevClients.map((a) => a.clientId));
  const retained = [...recentClientIds].filter((id) => prevClientIds.has(id)).length;
  const retentionRate = prevClientIds.size > 0 ? Math.round((retained / prevClientIds.size) * 100) : 0;

  const futureClientIds = new Set(futureAppts.map((a) => a.clientId));
  const rebookedCount = [...recentClientIds].filter((id) => futureClientIds.has(id)).length;
  const rebookedRate = recentClientIds.size > 0 ? Math.round((rebookedCount / recentClientIds.size) * 100) : 0;

  const targetsWithProgress = targets.map((t) => {
    const achieved = t.type === "REVENUE" ? monthRevenue : monthAppts.length;
    const goal = t.type === "REVENUE" ? (t.amountCents ?? 0) : (t.appointmentCount ?? 0);
    return { ...t, achieved, goal, percent: goal > 0 ? Math.min(Math.round((achieved / goal) * 100), 100) : 0 };
  });

  return { todayAppointments: todayAppts, monthRevenueCents: monthRevenue, completedThisMonth: monthAppts.length, retentionRate, rebookedRate, targets: targetsWithProgress };
}

export async function staffRoutes(app: FastifyInstance) {
  // All staff dashboard (admin)
  app.get("/staff/dashboard", { preHandler: requireRole("ADMIN") }, async (_req, reply) => {
    const practitioners = await prisma.user.findMany({
      where: { role: "PRACTITIONER" },
      select: { id: true, firstName: true, lastName: true, bio: true, specialties: true },
    });
    const staff = await Promise.all(
      practitioners.map(async (p) => ({ ...p, stats: await getPractitionerStats(p.id) }))
    );
    return reply.send({ staff });
  });

  // My dashboard (practitioner or admin)
  app.get("/staff/my-dashboard", { preHandler: authenticate }, async (request, reply) => {
    const { sub: id, role } = request.user;
    if (role !== "PRACTITIONER" && role !== "ADMIN") {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const practitioner = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, bio: true, specialties: true },
    });
    if (!practitioner) return reply.status(404).send({ error: "Not found" });
    const stats = await getPractitionerStats(id);
    return reply.send({ practitioner, stats });
  });

  // List targets (admin)
  app.get("/staff/targets", { preHandler: requireRole("ADMIN") }, async (_req, reply) => {
    const targets = await prisma.staffTarget.findMany({
      include: { practitioner: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ targets });
  });

  // Create target (admin)
  app.post("/staff/targets", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = targetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }
    const now = dayjs();
    const startsAt = (parsed.data.period === "MONTHLY" ? now.startOf("month") : now.startOf("week")).toDate();
    const endsAt = (parsed.data.period === "MONTHLY" ? now.endOf("month") : now.endOf("week")).toDate();
    const target = await prisma.staffTarget.create({ data: { ...parsed.data, startsAt, endsAt } });
    return reply.status(201).send({ target });
  });

  // Delete target (admin)
  app.delete("/staff/targets/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.staffTarget.delete({ where: { id } });
    return reply.send({ message: "Target deleted" });
  });
}
