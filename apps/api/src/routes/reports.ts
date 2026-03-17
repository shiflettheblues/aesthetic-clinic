import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

export async function reportRoutes(app: FastifyInstance) {
  // Revenue report
  app.get("/reports/revenue", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to, groupBy } = request.query as { from?: string; to?: string; groupBy?: string };

    const where: Record<string, unknown> = { status: "CAPTURED" };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        appointment: {
          include: {
            treatment: { select: { id: true, name: true, category: true } },
            practitioner: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amountCents, 0);
    const totalPayments = payments.length;

    // Group by treatment
    const byTreatment: Record<string, { name: string; revenue: number; count: number }> = {};
    const byPractitioner: Record<string, { name: string; revenue: number; count: number }> = {};

    for (const p of payments) {
      if (p.appointment?.treatment) {
        const t = p.appointment.treatment;
        if (!byTreatment[t.id]) byTreatment[t.id] = { name: t.name, revenue: 0, count: 0 };
        byTreatment[t.id]!.revenue += p.amountCents;
        byTreatment[t.id]!.count += 1;
      }
      if (p.appointment?.practitioner) {
        const pr = p.appointment.practitioner;
        if (!byPractitioner[pr.id]) byPractitioner[pr.id] = { name: `${pr.firstName} ${pr.lastName}`, revenue: 0, count: 0 };
        byPractitioner[pr.id]!.revenue += p.amountCents;
        byPractitioner[pr.id]!.count += 1;
      }
    }

    return reply.send({
      totalRevenue,
      totalPayments,
      byTreatment: Object.values(byTreatment).sort((a, b) => b.revenue - a.revenue),
      byPractitioner: Object.values(byPractitioner).sort((a, b) => b.revenue - a.revenue),
    });
  });

  // Patient report
  app.get("/reports/patients", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const [totalPatients, newPatients, appointmentStats] = await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({
        where: {
          role: "CLIENT",
          ...(from || to ? { createdAt: dateFilter } : {}),
        },
      }),
      prisma.appointment.groupBy({
        by: ["clientId"],
        where: {
          status: "COMPLETED",
          ...(from || to ? { startsAt: dateFilter } : {}),
        },
        _count: true,
      }),
    ]);

    const totalCompletedAppointments = appointmentStats.reduce((sum, s) => sum + s._count, 0);
    const uniqueClients = appointmentStats.length;
    const avgVisitsPerClient = uniqueClients > 0 ? totalCompletedAppointments / uniqueClients : 0;

    // Retention: clients with >1 completed appointment
    const returningClients = appointmentStats.filter((s) => s._count > 1).length;
    const retentionRate = uniqueClients > 0 ? (returningClients / uniqueClients) * 100 : 0;

    // Average spend per client
    const totalRevenueResult = await prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: {
        status: "CAPTURED",
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
    });
    const avgSpend = uniqueClients > 0 ? (totalRevenueResult._sum.amountCents ?? 0) / uniqueClients : 0;

    return reply.send({
      totalPatients,
      newPatients,
      uniqueClients,
      returningClients,
      retentionRate: Math.round(retentionRate * 10) / 10,
      avgVisitsPerClient: Math.round(avgVisitsPerClient * 10) / 10,
      avgSpendCents: Math.round(avgSpend),
    });
  });

  // Treatment popularity
  app.get("/reports/treatments", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const stats = await prisma.appointment.groupBy({
      by: ["treatmentId"],
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        ...(from || to ? { startsAt: dateFilter } : {}),
      },
      _count: true,
    });

    const treatments = await prisma.treatment.findMany({
      select: { id: true, name: true, priceCents: true, category: true },
    });
    const treatmentMap = new Map(treatments.map((t) => [t.id, t]));

    const result = stats
      .map((s) => {
        const t = treatmentMap.get(s.treatmentId);
        return {
          treatmentId: s.treatmentId,
          name: t?.name ?? "Unknown",
          category: t?.category ?? "Other",
          bookings: s._count,
          estimatedRevenue: (t?.priceCents ?? 0) * s._count,
        };
      })
      .sort((a, b) => b.bookings - a.bookings);

    return reply.send({ treatments: result });
  });

  // Business report (profit margins)
  app.get("/reports/business", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    // Revenue
    const revenueResult = await prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: {
        status: "CAPTURED",
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
    });

    // Product costs (from treatment-product links and completed appointments)
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        status: "COMPLETED",
        ...(from || to ? { startsAt: dateFilter } : {}),
      },
      include: {
        treatment: {
          include: {
            treatmentProducts: {
              include: { product: { select: { costCents: true } } },
            },
          },
        },
      },
    });

    const totalProductCost = completedAppointments.reduce((sum, apt) => {
      const treatmentCost = apt.treatment.treatmentProducts.reduce(
        (tSum, tp) => tSum + tp.product.costCents * tp.quantityUsed,
        0
      );
      return sum + treatmentCost;
    }, 0);

    const totalRevenue = revenueResult._sum.amountCents ?? 0;
    const grossProfit = totalRevenue - totalProductCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return reply.send({
      totalRevenueCents: totalRevenue,
      totalProductCostCents: Math.round(totalProductCost),
      grossProfitCents: Math.round(grossProfit),
      profitMarginPercent: Math.round(profitMargin * 10) / 10,
      completedAppointments: completedAppointments.length,
    });
  });

  // SMS Campaign reports
  app.get("/reports/sms", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const campaigns = await prisma.smsCampaign.findMany({
      where: from || to ? { createdAt: dateFilter } : {},
      orderBy: { createdAt: "desc" },
    });

    const creditResult = await prisma.smsCredit.aggregate({ _sum: { quantity: true } });

    const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount ?? 0), 0);
    const creditsUsed = campaigns
      .filter((c) => c.status === "sent")
      .reduce((sum, c) => sum + (c.sentCount ?? 0), 0);

    return reply.send({
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        recipientCount: c.recipientCount,
        sentCount: c.sentCount,
        sentAt: c.sentAt,
        createdAt: c.createdAt,
      })),
      totalCampaigns: campaigns.length,
      totalSmsSent: totalSent,
      creditsUsed,
      creditsBalance: creditResult._sum.quantity ?? 0,
    });
  });

  // Marketing reports (referrals, promos, loyalty)
  app.get("/reports/marketing", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const dateWhere = from || to ? { createdAt: dateFilter } : {};

    const [referrals, promoUsage, loyaltyAwarded, loyaltyRedeemed] = await Promise.all([
      prisma.referral.findMany({
        where: { ...dateWhere, referredId: { not: null } },
      }),
      prisma.promoCode.findMany({
        where: { currentUses: { gt: 0 } },
      }),
      prisma.loyaltyPoints.aggregate({
        _sum: { points: true },
        where: { points: { gt: 0 }, ...dateWhere },
      }),
      prisma.loyaltyPoints.aggregate({
        _sum: { points: true },
        where: { points: { lt: 0 }, ...dateWhere },
      }),
    ]);

    return reply.send({
      referralConversions: referrals.filter((r) => r.status === "completed").length,
      totalReferrals: referrals.length,
      totalReferralPoints: referrals.reduce((sum, r) => sum + r.rewardPoints, 0),
      promoCodes: promoUsage.map((p) => ({
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        uses: p.currentUses,
      })),
      loyaltyPointsAwarded: loyaltyAwarded._sum.points ?? 0,
      loyaltyPointsRedeemed: Math.abs(loyaltyRedeemed._sum.points ?? 0),
    });
  });

  // ---------- APPOINTMENT REPORTS ----------

  app.get("/reports/appointments/daysheet", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to, practitionerId } = request.query as { from?: string; to?: string; practitionerId?: string };
    const where: Record<string, unknown> = {};
    if (from || to) {
      where.startsAt = {};
      if (from) (where.startsAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startsAt as Record<string, unknown>).lte = new Date(to);
    }
    if (practitionerId) where.practitionerId = practitionerId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { name: true, durationMinutes: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return reply.send({ appointments });
  });

  app.get("/reports/appointments/cancelled", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "CANCELLED",
        ...(from || to ? { startsAt: dateFilter } : {}),
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    return reply.send({ appointments });
  });

  app.get("/reports/appointments/no-shows", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "NO_SHOW",
        ...(from || to ? { startsAt: dateFilter } : {}),
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    // Count total no-shows per client
    const allNoShows = await prisma.appointment.groupBy({
      by: ["clientId"],
      where: { status: "NO_SHOW" },
      _count: true,
    });
    const noShowCounts = new Map(allNoShows.map((n) => [n.clientId, n._count]));

    return reply.send({
      appointments: appointments.map((a) => ({
        ...a,
        clientNoShowCount: noShowCounts.get(a.clientId) ?? 1,
      })),
    });
  });

  app.get("/reports/appointments/incomplete", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        endsAt: { lt: new Date() },
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    return reply.send({ appointments });
  });

  // ---------- CLIENT REPORTS ----------

  app.get("/reports/clients/spend", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const clients = await prisma.user.findMany({
      where: { role: "CLIENT" },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true,
        clientAppointments: {
          where: { status: "COMPLETED" },
          select: { id: true, startsAt: true },
          orderBy: { startsAt: "desc" },
        },
        payments: {
          where: { status: "CAPTURED" },
          select: { amountCents: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = clients
      .map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        totalSpentCents: c.payments.reduce((s, p) => s + p.amountCents, 0),
        appointmentCount: c.clientAppointments.length,
        lastVisit: c.clientAppointments[0]?.startsAt ?? null,
      }))
      .sort((a, b) => b.totalSpentCents - a.totalSpentCents);

    return reply.send({ clients: result });
  });

  app.get("/reports/clients/absent-since", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    if (!date) return reply.status(400).send({ error: "date param required" });

    const cutoff = new Date(date);

    // Clients who have NO appointment after the cutoff
    const clientsWithRecentAppt = await prisma.appointment.findMany({
      where: { startsAt: { gte: cutoff }, status: { not: "CANCELLED" } },
      select: { clientId: true },
      distinct: ["clientId"],
    });
    const recentIds = new Set(clientsWithRecentAppt.map((a) => a.clientId));

    const clients = await prisma.user.findMany({
      where: { role: "CLIENT", id: { notIn: [...recentIds] } },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        clientAppointments: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true },
        },
      },
    });

    return reply.send({
      clients: clients.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        lastVisit: c.clientAppointments[0]?.startsAt ?? null,
      })),
    });
  });

  app.get("/reports/clients/not-retained", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) return reply.status(400).send({ error: "from and to params required" });

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const followUpEnd = new Date(toDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const seenInRange = await prisma.appointment.findMany({
      where: { startsAt: { gte: fromDate, lte: toDate }, status: { not: "CANCELLED" } },
      select: { clientId: true },
      distinct: ["clientId"],
    });
    const seenIds = seenInRange.map((a) => a.clientId);

    const returnedAfter = await prisma.appointment.findMany({
      where: {
        clientId: { in: seenIds },
        startsAt: { gt: toDate, lte: followUpEnd },
        status: { not: "CANCELLED" },
      },
      select: { clientId: true },
      distinct: ["clientId"],
    });
    const returnedIds = new Set(returnedAfter.map((a) => a.clientId));
    const notRetainedIds = seenIds.filter((id) => !returnedIds.has(id));

    const clients = await prisma.user.findMany({
      where: { id: { in: notRetainedIds } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    return reply.send({ clients, total: clients.length });
  });

  app.get("/reports/clients/by-service", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { treatmentId } = request.query as { treatmentId?: string };
    if (!treatmentId) return reply.status(400).send({ error: "treatmentId param required" });

    const appointments = await prisma.appointment.findMany({
      where: { treatmentId, status: { not: "CANCELLED" } },
      include: { client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
      distinct: ["clientId"],
    });

    return reply.send({ clients: appointments.map((a) => a.client) });
  });

  // ---------- FINANCIAL REPORTS ----------

  app.get("/reports/financial/deposits", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const appointments = await prisma.appointment.findMany({
      where: {
        depositPaid: true,
        ...(from || to ? { startsAt: dateFilter } : {}),
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { name: true } },
        practitioner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    return reply.send({ appointments });
  });

  app.get("/reports/financial/voided", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const payments = await prisma.payment.findMany({
      where: {
        status: { in: ["REFUNDED", "FAILED"] },
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        appointment: { include: { treatment: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ payments });
  });

  // ---------- MARKETING REPORTS ----------

  app.get("/reports/marketing/birthdays", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { month } = request.query as { month?: string };
    const monthNum = month ? parseInt(month) : null;

    const clients = await prisma.user.findMany({
      where: { role: "CLIENT", dateOfBirth: { not: null } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true },
    });

    const filtered = monthNum
      ? clients.filter((c) => c.dateOfBirth && new Date(c.dateOfBirth).getMonth() + 1 === monthNum)
      : clients;

    return reply.send({ clients: filtered });
  });

  app.get("/reports/marketing/overdue", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { treatmentId, daysSince } = request.query as { treatmentId?: string; daysSince?: string };
    const days = daysSince ? parseInt(daysSince) : 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = { status: "COMPLETED", startsAt: { lt: cutoff } };
    if (treatmentId) where.treatmentId = treatmentId;

    // Latest completed appointment per client (for this treatment if specified)
    const latest = await prisma.appointment.findMany({
      where,
      orderBy: { startsAt: "desc" },
      distinct: ["clientId"],
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        treatment: { select: { name: true } },
      },
    });

    // Exclude clients who have a more recent appointment for this treatment
    const recentWhere: Record<string, unknown> = { status: { not: "CANCELLED" }, startsAt: { gte: cutoff } };
    if (treatmentId) recentWhere.treatmentId = treatmentId;
    const recentClients = await prisma.appointment.findMany({
      where: recentWhere,
      select: { clientId: true },
      distinct: ["clientId"],
    });
    const recentIds = new Set(recentClients.map((a) => a.clientId));

    return reply.send({
      clients: latest
        .filter((a) => !recentIds.has(a.clientId))
        .map((a) => ({ ...a.client, lastTreatment: a.treatment.name, lastVisit: a.startsAt })),
    });
  });

  app.get("/reports/marketing/non-returning", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { days } = request.query as { days?: string };
    const dayCount = days ? parseInt(days) : 60;
    const cutoff = new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);

    const recentClients = await prisma.appointment.findMany({
      where: { startsAt: { gte: cutoff }, status: { not: "CANCELLED" } },
      select: { clientId: true },
      distinct: ["clientId"],
    });
    const recentIds = new Set(recentClients.map((a) => a.clientId));

    const allClients = await prisma.user.findMany({
      where: { role: "CLIENT" },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        clientAppointments: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true },
        },
      },
    });

    const nonReturning = allClients.filter(
      (c) => !recentIds.has(c.id) && c.clientAppointments.length > 0
    );

    return reply.send({
      clients: nonReturning.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        lastVisit: c.clientAppointments[0]?.startsAt ?? null,
      })),
    });
  });

  // ---------- STAFF REPORTS ----------

  app.get("/reports/staff/summary", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const practitioners = await prisma.user.findMany({
      where: { role: "PRACTITIONER" },
      select: { id: true, firstName: true, lastName: true },
    });

    const results = await Promise.all(
      practitioners.map(async (p) => {
        const [apptCount, revenue] = await Promise.all([
          prisma.appointment.count({
            where: {
              practitionerId: p.id,
              status: { in: ["COMPLETED", "CONFIRMED"] },
              ...(from || to ? { startsAt: dateFilter } : {}),
            },
          }),
          prisma.payment.aggregate({
            _sum: { amountCents: true },
            where: {
              status: "CAPTURED",
              appointment: {
                practitionerId: p.id,
                ...(from || to ? { startsAt: dateFilter } : {}),
              },
            },
          }),
        ]);
        return {
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          appointments: apptCount,
          revenueCents: revenue._sum.amountCents ?? 0,
        };
      })
    );

    return reply.send({ staff: results });
  });

  app.get("/reports/staff/targets", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const targets = await prisma.staffTarget.findMany({
      include: { practitioner: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const result = await Promise.all(
      targets.map(async (t) => {
        let achieved = 0;
        if (t.type === "REVENUE") {
          const rev = await prisma.payment.aggregate({
            _sum: { amountCents: true },
            where: {
              status: "CAPTURED",
              appointment: { practitionerId: t.practitionerId, startsAt: { gte: t.startsAt, lte: t.endsAt } },
            },
          });
          achieved = rev._sum.amountCents ?? 0;
        } else {
          achieved = await prisma.appointment.count({
            where: {
              practitionerId: t.practitionerId,
              status: "COMPLETED",
              startsAt: { gte: t.startsAt, lte: t.endsAt },
            },
          });
        }
        const goal = t.type === "REVENUE" ? (t.amountCents ?? 0) : (t.appointmentCount ?? 0);
        const percent = goal > 0 ? Math.min(Math.round((achieved / goal) * 100), 100) : 0;
        return {
          id: t.id,
          practitioner: `${t.practitioner.firstName} ${t.practitioner.lastName}`,
          type: t.type,
          period: t.period,
          goal,
          achieved,
          percent,
          startsAt: t.startsAt,
          endsAt: t.endsAt,
          isActive: t.endsAt >= now,
        };
      })
    );

    return reply.send({ targets: result });
  });

  // Product usage reports
  app.get("/reports/products", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const completedAppointments = await prisma.appointment.findMany({
      where: {
        status: "COMPLETED",
        ...(from || to ? { startsAt: dateFilter } : {}),
      },
      include: {
        treatment: {
          include: {
            treatmentProducts: {
              include: { product: { select: { id: true, name: true, costCents: true } } },
            },
          },
        },
      },
    });

    // Aggregate product usage
    const productUsage: Record<string, { name: string; quantity: number; costCents: number; treatmentCount: number }> = {};
    for (const apt of completedAppointments) {
      for (const tp of apt.treatment.treatmentProducts) {
        const pid = tp.product.id;
        if (!productUsage[pid]) {
          productUsage[pid] = { name: tp.product.name, quantity: 0, costCents: 0, treatmentCount: 0 };
        }
        productUsage[pid]!.quantity += tp.quantityUsed;
        productUsage[pid]!.costCents += tp.product.costCents * tp.quantityUsed;
        productUsage[pid]!.treatmentCount += 1;
      }
    }

    // Stock movements
    const stockMovements = await prisma.stockMovement.findMany({
      where: from || to ? { createdAt: dateFilter } : {},
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return reply.send({
      products: Object.values(productUsage).sort((a, b) => b.quantity - a.quantity),
      recentStockMovements: stockMovements.map((m) => ({
        productName: m.product.name,
        quantity: m.quantity,
        reason: m.reason,
        createdAt: m.createdAt,
      })),
      totalProductCost: Object.values(productUsage).reduce((sum, p) => sum + p.costCents, 0),
    });
  });
}
