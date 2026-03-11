import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import crypto from "crypto";

export async function referralRoutes(app: FastifyInstance) {
  // Get or create referral code for current user
  app.get("/referrals/my-code", { preHandler: authenticate }, async (request, reply) => {
    let referral = await prisma.referral.findFirst({
      where: { referrerId: request.user.sub, referredId: null },
    });

    if (!referral) {
      referral = await prisma.referral.create({
        data: {
          referrerId: request.user.sub,
          referralCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
          status: "pending",
          rewardPoints: 100,
        },
      });
    }

    return reply.send({ referralCode: referral.referralCode });
  });

  // Get referral history
  app.get("/referrals/history", { preHandler: authenticate }, async (request, reply) => {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: request.user.sub, referredId: { not: null } },
      include: {
        referred: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ referrals });
  });

  // List all referrals (admin)
  app.get("/referrals", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const referrals = await prisma.referral.findMany({
      where: { referredId: { not: null } },
      include: {
        referrer: { select: { firstName: true, lastName: true, email: true } },
        referred: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ referrals });
  });

  // Apply referral code (during registration)
  app.post("/referrals/apply", { preHandler: authenticate }, async (request, reply) => {
    const { code } = request.body as { code: string };
    if (!code) {
      return reply.status(400).send({ error: "Code required", code: "VALIDATION_ERROR" });
    }

    const referral = await prisma.referral.findUnique({
      where: { referralCode: code.toUpperCase() },
    });

    if (!referral) {
      return reply.status(404).send({ error: "Invalid referral code", code: "INVALID_CODE" });
    }

    if (referral.referrerId === request.user.sub) {
      return reply.status(400).send({ error: "Cannot refer yourself", code: "SELF_REFERRAL" });
    }

    // Create new referral record for this specific referral
    const newReferral = await prisma.referral.create({
      data: {
        referrerId: referral.referrerId,
        referredId: request.user.sub,
        referralCode: `${code.toUpperCase()}-${Date.now()}`,
        status: "completed",
        rewardPoints: referral.rewardPoints,
      },
    });

    // Award points to both parties
    await prisma.$transaction([
      prisma.loyaltyPoints.create({
        data: { clientId: referral.referrerId, points: referral.rewardPoints, reason: "referral", reference: newReferral.id },
      }),
      prisma.loyaltyPoints.create({
        data: { clientId: request.user.sub, points: Math.round(referral.rewardPoints / 2), reason: "referred_bonus", reference: newReferral.id },
      }),
    ]);

    return reply.send({ message: "Referral applied", pointsEarned: Math.round(referral.rewardPoints / 2) });
  });
}
