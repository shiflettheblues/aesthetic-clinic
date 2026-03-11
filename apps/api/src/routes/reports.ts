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
