import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

export async function closedDateRoutes(app: FastifyInstance) {
  // List all closed dates
  app.get("/closed-dates", async (_request, reply) => {
    const dates = await prisma.closedDate.findMany({
      orderBy: { date: "asc" },
    });
    return reply.send({ dates });
  });

  // Create a closed date (admin)
  app.post("/closed-dates", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const schema = z.object({
      date: z.string(),
      reason: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });

    // Check for duplicate
    const existing = await prisma.closedDate.findFirst({
      where: { date: new Date(parsed.data.date) },
    });
    if (existing) return reply.status(400).send({ error: "Date already marked as closed", code: "DUPLICATE" });

    const closed = await prisma.closedDate.create({
      data: { date: new Date(parsed.data.date), reason: parsed.data.reason },
    });
    return reply.status(201).send({ closed });
  });

  // Delete a closed date (admin)
  app.delete("/closed-dates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.closedDate.delete({ where: { id } });
    return reply.send({ message: "Removed" });
  });
}
