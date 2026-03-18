import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["TREATMENT_PLAN", "SKINCARE_ROUTINE", "BRIDAL_PACKAGE", "AFTERCARE_GUIDE", "OTHER"]),
  content: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function sopTemplateRoutes(app: FastifyInstance) {
  app.get("/sop-templates", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (_request, reply) => {
    const templates = await prisma.sopTemplate.findMany({ orderBy: { name: "asc" } });
    return reply.send({ templates });
  });

  app.post("/sop-templates", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    const template = await prisma.sopTemplate.create({ data: parsed.data });
    return reply.status(201).send({ template });
  });

  app.patch("/sop-templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = schema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    const existing = await prisma.sopTemplate.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: "Not found" });
    const template = await prisma.sopTemplate.update({ where: { id }, data: parsed.data });
    return reply.send({ template });
  });

  app.delete("/sop-templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.sopTemplate.delete({ where: { id } });
    return reply.send({ message: "Deleted" });
  });
}
