import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export async function membershipRoutes(app: FastifyInstance) {
  // List membership tiers (public)
  app.get("/memberships", async (_request, reply) => {
    const memberships = await prisma.membership.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceCents: "asc" },
    });
    return reply.send({ memberships });
  });

  // List all subscriptions (admin)
  app.get("/memberships/subscriptions", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const subscriptions = await prisma.membershipSubscription.findMany({
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        membership: { select: { id: true, name: true, monthlyPriceCents: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ subscriptions });
  });

  // Create membership tier (admin)
  app.post("/memberships", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      monthlyPriceCents: z.number().int().min(0),
      benefits: z.record(z.unknown()),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const membership = await prisma.membership.create({
      data: {
        ...parsed.data,
        benefits: parsed.data.benefits as object,
      },
    });
    return reply.status(201).send({ membership });
  });

  // Update membership tier (admin)
  app.patch("/memberships/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(1).optional(),
      monthlyPriceCents: z.number().int().min(0).optional(),
      benefits: z.record(z.unknown()).optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.benefits) data.benefits = parsed.data.benefits as object;

    const membership = await prisma.membership.update({ where: { id }, data });
    return reply.send({ membership });
  });

  // Subscribe client to membership
  app.post("/memberships/subscribe", { preHandler: authenticate }, async (request, reply) => {
    const schema = z.object({ membershipId: z.string() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const existing = await prisma.membershipSubscription.findFirst({
      where: { clientId: request.user.sub, status: "active" },
    });
    if (existing) {
      return reply.status(409).send({ error: "Already subscribed", code: "ALREADY_SUBSCRIBED" });
    }

    const subscription = await prisma.membershipSubscription.create({
      data: {
        clientId: request.user.sub,
        membershipId: parsed.data.membershipId,
        status: "active",
      },
    });

    return reply.status(201).send({ subscription });
  });

  // Get current subscription
  app.get("/memberships/my-subscription", { preHandler: authenticate }, async (request, reply) => {
    const subscription = await prisma.membershipSubscription.findFirst({
      where: { clientId: request.user.sub, status: "active" },
      include: { membership: true },
    });
    return reply.send({ subscription });
  });

  // Cancel subscription
  app.post("/memberships/cancel", { preHandler: authenticate }, async (request, reply) => {
    const subscription = await prisma.membershipSubscription.findFirst({
      where: { clientId: request.user.sub, status: "active" },
    });

    if (!subscription) {
      return reply.status(404).send({ error: "No active subscription", code: "NOT_FOUND" });
    }

    await prisma.membershipSubscription.update({
      where: { id: subscription.id },
      data: { status: "cancelled" },
    });

    return reply.send({ message: "Subscription cancelled" });
  });
}
