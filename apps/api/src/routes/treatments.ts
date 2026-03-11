import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(5),
  priceCents: z.number().int().min(0),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export async function treatmentRoutes(app: FastifyInstance) {
  // List treatments (public)
  app.get("/treatments", async (request, reply) => {
    const { active } = request.query as { active?: string };
    const where = active === "true" ? { isActive: true } : {};

    const treatments = await prisma.treatment.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return reply.send({ treatments });
  });

  // Get single treatment (public)
  app.get("/treatments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const treatment = await prisma.treatment.findUnique({ where: { id } });
    if (!treatment) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    return reply.send({ treatment });
  });

  // Create treatment (admin only)
  app.post("/treatments", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const treatment = await prisma.treatment.create({ data: parsed.data });
    return reply.status(201).send({ treatment });
  });

  // Update treatment (admin only)
  app.patch("/treatments/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.treatment.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    const treatment = await prisma.treatment.update({ where: { id }, data: parsed.data });
    return reply.send({ treatment });
  });

  // Delete treatment (admin only)
  app.delete("/treatments/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.treatment.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    await prisma.treatment.delete({ where: { id } });
    return reply.send({ message: "Treatment deleted" });
  });
}
