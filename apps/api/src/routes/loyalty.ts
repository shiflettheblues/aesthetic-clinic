import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export async function loyaltyRoutes(app: FastifyInstance) {
  // Get loyalty balance for current user or specific client
  app.get("/loyalty/balance", { preHandler: authenticate }, async (request, reply) => {
    const { clientId } = request.query as { clientId?: string };
    const id = request.user.role === "CLIENT" ? request.user.sub : (clientId ?? request.user.sub);

    const result = await prisma.loyaltyPoints.aggregate({
      _sum: { points: true },
      where: { clientId: id },
    });

    return reply.send({ balance: result._sum.points ?? 0, clientId: id });
  });

  // Get loyalty history
  app.get("/loyalty/history", { preHandler: authenticate }, async (request, reply) => {
    const { clientId } = request.query as { clientId?: string };
    const id = request.user.role === "CLIENT" ? request.user.sub : (clientId ?? request.user.sub);

    const entries = await prisma.loyaltyPoints.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return reply.send({ entries });
  });

  // Get all clients with points (admin)
  app.get("/loyalty/all", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const pointsByClient = await prisma.loyaltyPoints.groupBy({
      by: ["clientId"],
      _sum: { points: true },
    });

    const clientIds = pointsByClient.map((p) => p.clientId);
    const clients = await prisma.user.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const result = pointsByClient
      .map((p) => ({
        clientId: p.clientId,
        ...clientMap.get(p.clientId),
        balance: p._sum.points ?? 0,
      }))
      .sort((a, b) => b.balance - a.balance);

    return reply.send({ clients: result });
  });

  // Award points (admin)
  app.post("/loyalty/award", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const schema = z.object({
      clientId: z.string(),
      points: z.number().int().min(1),
      reason: z.string(),
      reference: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const entry = await prisma.loyaltyPoints.create({ data: parsed.data });
    return reply.status(201).send({ entry });
  });

  // Redeem points (client or admin)
  app.post("/loyalty/redeem", { preHandler: authenticate }, async (request, reply) => {
    const schema = z.object({
      points: z.number().int().min(1),
      reference: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const balance = await prisma.loyaltyPoints.aggregate({
      _sum: { points: true },
      where: { clientId: request.user.sub },
    });

    if ((balance._sum.points ?? 0) < parsed.data.points) {
      return reply.status(400).send({ error: "Insufficient points", code: "INSUFFICIENT_POINTS" });
    }

    const entry = await prisma.loyaltyPoints.create({
      data: {
        clientId: request.user.sub,
        points: -parsed.data.points,
        reason: "redemption",
        reference: parsed.data.reference,
      },
    });

    return reply.status(201).send({ entry, newBalance: (balance._sum.points ?? 0) - parsed.data.points });
  });
}
