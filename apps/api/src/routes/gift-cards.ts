import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const createSchema = z.object({
  balanceCents: z.number().int().min(100),
  expiresAt: z.string().datetime().optional(),
  clientId: z.string().optional(),
});

const redeemSchema = z.object({
  code: z.string(),
  amountCents: z.number().int().min(1),
  appointmentId: z.string().optional(),
  clientId: z.string().optional(),
});

export async function giftCardRoutes(app: FastifyInstance) {
  // List all gift cards (admin)
  app.get("/gift-cards", { preHandler: requireRole("ADMIN") }, async (_req, reply) => {
    const cards = await prisma.giftCard.findMany({
      include: {
        purchasedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        redeemedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ giftCards: cards });
  });

  // Issue a gift card (admin)
  app.post("/gift-cards", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }

    // Generate a unique code
    let code = generateCode();
    let attempts = 0;
    while (await prisma.giftCard.findUnique({ where: { code } })) {
      code = generateCode();
      if (++attempts > 10) return reply.status(500).send({ error: "Failed to generate unique code" });
    }

    const card = await prisma.giftCard.create({
      data: {
        code,
        balanceCents: parsed.data.balanceCents,
        originalBalanceCents: parsed.data.balanceCents,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        purchasedByClientId: parsed.data.clientId ?? null,
      },
    });

    return reply.status(201).send({ giftCard: card });
  });

  // Check balance (public)
  app.get("/gift-cards/check/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const card = await prisma.giftCard.findUnique({ where: { code: code.toUpperCase() } });
    if (!card) return reply.status(404).send({ error: "Gift card not found", code: "NOT_FOUND" });
    if (card.expiresAt && card.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Gift card has expired", code: "EXPIRED" });
    }
    return reply.send({ balanceCents: card.balanceCents, originalBalanceCents: card.originalBalanceCents, expiresAt: card.expiresAt });
  });

  // Redeem gift card (admin)
  app.post("/gift-cards/redeem", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = redeemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }
    const { code, amountCents, appointmentId, clientId } = parsed.data;

    const card = await prisma.giftCard.findUnique({ where: { code: code.toUpperCase() } });
    if (!card) return reply.status(404).send({ error: "Gift card not found", code: "NOT_FOUND" });
    if (card.expiresAt && card.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Gift card has expired", code: "EXPIRED" });
    }
    if (card.balanceCents < amountCents) {
      return reply.status(400).send({ error: "Insufficient balance", code: "INSUFFICIENT_BALANCE" });
    }

    const deduct = Math.min(amountCents, card.balanceCents);

    await prisma.giftCard.update({
      where: { id: card.id },
      data: {
        balanceCents: card.balanceCents - deduct,
        redeemedByClientId: clientId ?? card.redeemedByClientId,
      },
    });

    return reply.send({ deducted: deduct, remaining: card.balanceCents - deduct });
  });

  // Void a gift card (admin)
  app.delete("/gift-cards/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await prisma.giftCard.findUnique({ where: { id } });
    if (!card) return reply.status(404).send({ error: "Gift card not found", code: "NOT_FOUND" });
    await prisma.giftCard.update({ where: { id }, data: { balanceCents: 0 } });
    return reply.send({ message: "Gift card voided" });
  });

  // Get gift cards for a patient (admin)
  app.get("/gift-cards/patient/:clientId", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const cards = await prisma.giftCard.findMany({
      where: { purchasedByClientId: clientId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ giftCards: cards });
  });
}
