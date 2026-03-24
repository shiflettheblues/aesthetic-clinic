import { FastifyInstance } from "fastify";
import dayjs from "dayjs";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/stats", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const now = dayjs();
    const todayStart = now.startOf("day").toDate();
    const todayEnd = now.endOf("day").toDate();
    const monthStart = now.startOf("month").toDate();
    const monthEnd = now.endOf("month").toDate();
    const last30Start = now.subtract(30, "day").toDate();
    const prev90Start = now.subtract(90, "day").toDate();
    const prev30End = now.subtract(30, "day").toDate();

    const [
      todayAppts,
      totalPatients,
      newClientsThisMonth,
      monthCompletedAppts,
      recentClients,
      prevClients,
      futureAppts,
      unreadNotifications,
      upcomingAppts,
    ] = await Promise.all([
      // Today's appointments
      prisma.appointment.findMany({
        where: { startsAt: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          practitioner: { select: { id: true, firstName: true, lastName: true } },
          treatment: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      // Total patients
      prisma.user.count({ where: { role: "CLIENT", archivedAt: null } }),
      // New clients this month
      prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: monthStart, lte: monthEnd } } }),
      // Completed appointments this month (for revenue)
      prisma.appointment.findMany({
        where: { startsAt: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
        include: { treatment: { select: { priceCents: true } } },
      }),
      // Recent clients (last 30 days) for retention
      prisma.appointment.findMany({
        where: { startsAt: { gte: last30Start }, status: "COMPLETED" },
        select: { clientId: true },
      }),
      // Previous clients (30-90 days ago) for retention
      prisma.appointment.findMany({
        where: { startsAt: { gte: prev90Start, lt: prev30End }, status: "COMPLETED" },
        select: { clientId: true },
      }),
      // Future appointments for rebooked rate
      prisma.appointment.findMany({
        where: { startsAt: { gt: now.toDate() }, status: { not: "CANCELLED" } },
        select: { clientId: true },
      }),
      // Unread notifications for admin
      prisma.notification.count({
        where: { userId: (request.user as { sub: string }).sub, readAt: null },
      }),
      // Next 5 upcoming appointments
      prisma.appointment.findMany({
        where: { startsAt: { gt: now.toDate() }, status: { not: "CANCELLED" } },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          practitioner: { select: { id: true, firstName: true, lastName: true } },
          treatment: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
        },
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
    ]);

    // Today's revenue
    const todayRevenueCents = todayAppts
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + (a.treatment?.priceCents ?? 0), 0);

    // Monthly revenue
    const monthRevenueCents = monthCompletedAppts.reduce(
      (sum, a) => sum + (a.treatment?.priceCents ?? 0),
      0
    );

    // Retention rate (clinic-wide)
    const recentClientIds = new Set(recentClients.map((a) => a.clientId));
    const prevClientIds = new Set(prevClients.map((a) => a.clientId));
    const retained = [...recentClientIds].filter((id) => prevClientIds.has(id)).length;
    const retentionRate = prevClientIds.size > 0
      ? Math.round((retained / prevClientIds.size) * 100)
      : 0;

    // Rebooked rate (clinic-wide)
    const futureClientIds = new Set(futureAppts.map((a) => a.clientId));
    const rebookedCount = [...recentClientIds].filter((id) => futureClientIds.has(id)).length;
    const rebookedRate = recentClientIds.size > 0
      ? Math.round((rebookedCount / recentClientIds.size) * 100)
      : 0;

    return reply.send({
      todayAppointments: todayAppts,
      todayRevenueCents,
      totalPatients,
      newClientsThisMonth,
      monthRevenueCents,
      completedThisMonth: monthCompletedAppts.length,
      retentionRate,
      rebookedRate,
      unreadNotifications,
      upcomingAppointments: upcomingAppts,
    });
  });
}
