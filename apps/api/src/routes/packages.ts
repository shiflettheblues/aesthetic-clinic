import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  treatmentIds: z.array(z.string()).min(1),
  sessions: z.number().int().min(1),
  validDays: z.number().int().min(1).default(365),
  priceCents: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

const purchaseSchema = z.object({
  templateId: z.string(),
  clientId: z.string(),
});

export async function packageRoutes(app: FastifyInstance) {
  // List package templates (admin)
  app.get("/package-templates", { preHandler: requireRole("ADMIN") }, async (_req, reply) => {
    const templates = await prisma.packageTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ templates });
  });

  // Create package template (admin)
  app.post("/package-templates", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }
    const template = await prisma.packageTemplate.create({ data: parsed.data });
    return reply.status(201).send({ template });
  });

  // Update package template (admin)
  app.patch("/package-templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = templateSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }
    const template = await prisma.packageTemplate.update({ where: { id }, data: parsed.data });
    return reply.send({ template });
  });

  // Delete package template (admin)
  app.delete("/package-templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.packageTemplate.delete({ where: { id } });
    return reply.send({ message: "Template deleted" });
  });

  // Issue a package to a patient (admin)
  app.post("/packages/purchase", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = purchaseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }
    const { templateId, clientId } = parsed.data;

    const template = await prisma.packageTemplate.findUnique({ where: { id: templateId } });
    if (!template) return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });

    // Use first treatment as primary treatmentId for compatibility
    const treatmentId = template.treatmentIds[0];
    if (!treatmentId) return reply.status(400).send({ error: "Template has no treatments", code: "VALIDATION_ERROR" });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + template.validDays);

    const pkg = await prisma.package.create({
      data: {
        name: template.name,
        treatmentId,
        templateId: template.id,
        sessionsTotal: template.sessions,
        sessionsRemaining: template.sessions,
        clientId,
        priceCents: template.priceCents,
        expiresAt,
      },
      include: { treatment: { select: { name: true } } },
    });

    return reply.status(201).send({ package: pkg });
  });

  // Get packages for a patient (admin)
  app.get("/packages/patient/:clientId", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const packages = await prisma.package.findMany({
      where: { clientId },
      include: {
        treatment: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, treatmentIds: true } },
      },
      orderBy: { purchasedAt: "desc" },
    });
    return reply.send({ packages });
  });

  // Redeem a session from a package (admin)
  app.post("/packages/:id/redeem", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pkg = await prisma.package.findUnique({ where: { id } });
    if (!pkg) return reply.status(404).send({ error: "Package not found", code: "NOT_FOUND" });
    if (pkg.sessionsRemaining <= 0) return reply.status(400).send({ error: "No sessions remaining", code: "NO_SESSIONS" });
    if (pkg.expiresAt && pkg.expiresAt < new Date()) return reply.status(400).send({ error: "Package expired", code: "EXPIRED" });

    const updated = await prisma.package.update({
      where: { id },
      data: { sessionsRemaining: pkg.sessionsRemaining - 1 },
    });
    return reply.send({ package: updated });
  });
}
