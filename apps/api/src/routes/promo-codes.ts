import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  code: z.string().min(3).transform((v) => v.toUpperCase()),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().int().min(1),
  maxUses: z.number().int().min(1).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  treatmentId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function promoCodeRoutes(app: FastifyInstance) {
  // List promo codes (admin)
  app.get("/promo-codes", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ codes });
  });

  // Create promo code (admin)
  app.post("/promo-codes", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }

    const existing = await prisma.promoCode.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return reply.status(409).send({ error: "Code already exists", code: "CODE_EXISTS" });
    }

    const promo = await prisma.promoCode.create({
      data: {
        ...parsed.data,
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : null,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      },
    });

    return reply.status(201).send({ promo });
  });

  // Validate promo code (public/authenticated)
  app.post("/promo-codes/validate", async (request, reply) => {
    const { code, treatmentId } = request.body as { code: string; treatmentId?: string };
    if (!code) {
      return reply.status(400).send({ error: "Code required", code: "VALIDATION_ERROR" });
    }

    const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo || !promo.isActive) {
      return reply.status(404).send({ error: "Invalid promo code", code: "INVALID_CODE" });
    }

    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return reply.status(400).send({ error: "Code has been fully used", code: "CODE_EXHAUSTED" });
    }

    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) {
      return reply.status(400).send({ error: "Code not yet valid", code: "CODE_NOT_VALID" });
    }
    if (promo.validUntil && now > promo.validUntil) {
      return reply.status(400).send({ error: "Code has expired", code: "CODE_EXPIRED" });
    }

    if (promo.treatmentId && treatmentId && promo.treatmentId !== treatmentId) {
      return reply.status(400).send({ error: "Code not valid for this treatment", code: "CODE_TREATMENT_MISMATCH" });
    }

    return reply.send({
      valid: true,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      treatmentId: promo.treatmentId,
    });
  });

  // Delete promo code (admin)
  app.delete("/promo-codes/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.promoCode.delete({ where: { id } });
    return reply.send({ message: "Promo code deleted" });
  });
}
