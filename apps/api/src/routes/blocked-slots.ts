import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  practitionerId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().optional(),
});

export async function blockedSlotRoutes(app: FastifyInstance) {
  // List blocked slots
  app.get("/blocked-slots", { preHandler: authenticate }, async (request, reply) => {
    const { practitionerId, from, to } = request.query as {
      practitionerId?: string;
      from?: string;
      to?: string;
    };

    const where: Record<string, unknown> = {};

    if (request.user.role === "PRACTITIONER") {
      where.practitionerId = request.user.sub;
    } else if (practitionerId) {
      where.practitionerId = practitionerId;
    }

    if (from || to) {
      where.startsAt = {};
      if (from) (where.startsAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startsAt as Record<string, unknown>).lte = new Date(to);
    }

    const blockedSlots = await prisma.blockedSlot.findMany({
      where,
      include: {
        practitioner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return reply.send({ blockedSlots });
  });

  // Create blocked slot
  app.post("/blocked-slots", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    // Practitioners can only block their own time
    if (request.user.role === "PRACTITIONER" && parsed.data.practitionerId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    const blockedSlot = await prisma.blockedSlot.create({
      data: {
        practitionerId: parsed.data.practitionerId,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        reason: parsed.data.reason,
      },
    });

    return reply.status(201).send({ blockedSlot });
  });

  // Delete blocked slot
  app.delete("/blocked-slots/:id", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const blockedSlot = await prisma.blockedSlot.findUnique({ where: { id } });
    if (!blockedSlot) {
      return reply.status(404).send({ error: "Blocked slot not found", code: "NOT_FOUND" });
    }

    if (request.user.role === "PRACTITIONER" && blockedSlot.practitionerId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    await prisma.blockedSlot.delete({ where: { id } });
    return reply.send({ message: "Blocked slot deleted" });
  });
}
