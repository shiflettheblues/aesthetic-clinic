import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  clientId: z.string(),
  treatmentId: z.string(),
  practitionerId: z.string().optional(),
  preferredDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function waitlistRoutes(app: FastifyInstance) {
  // List all waitlist entries (admin)
  app.get("/waitlist", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const entries = await prisma.waitlistEntry.findMany({
      where: status ? { status: status as "WAITING" | "NOTIFIED" | "BOOKED" | "CANCELLED" } : {},
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        treatment: { select: { id: true, name: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ entries });
  });

  // Add to waitlist (public — client booking flow)
  app.post("/waitlist", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });

    const entry = await prisma.waitlistEntry.create({
      data: {
        clientId: parsed.data.clientId,
        treatmentId: parsed.data.treatmentId,
        practitionerId: parsed.data.practitionerId,
        preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : undefined,
        notes: parsed.data.notes,
      },
      include: {
        treatment: { select: { name: true } },
      },
    });
    return reply.status(201).send({ entry });
  });

  // Update status (admin)
  app.patch("/waitlist/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      status: z.enum(["WAITING", "NOTIFIED", "BOOKED", "CANCELLED"]).optional(),
      notes: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });

    const existing = await prisma.waitlistEntry.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    const entry = await prisma.waitlistEntry.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.status === "NOTIFIED" ? { notifiedAt: new Date() } : {}),
      },
    });
    return reply.send({ entry });
  });

  // Notify client (admin — sends SMS if available)
  app.post("/waitlist/:id/notify", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = await prisma.waitlistEntry.findUnique({
      where: { id },
      include: {
        client: { select: { firstName: true, phone: true } },
        treatment: { select: { name: true } },
      },
    });
    if (!entry) return reply.status(404).send({ error: "Not found" });

    // Update status to NOTIFIED
    await prisma.waitlistEntry.update({
      where: { id },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });

    // If client has phone, send SMS
    if (entry.client.phone) {
      try {
        const { sendSms } = await import("../services/sms.js");
        await sendSms({
          to: entry.client.phone,
          body: `Hi ${entry.client.firstName}, a slot has opened for ${entry.treatment.name}! Please call or book online to secure your appointment.`,
        });
      } catch {
        // SMS failure is non-fatal
      }
    }

    return reply.send({ message: "Client notified" });
  });

  // Delete / remove from waitlist (admin)
  app.delete("/waitlist/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.waitlistEntry.delete({ where: { id } });
    return reply.send({ message: "Removed from waitlist" });
  });

  // Client's own waitlist entries
  app.get("/waitlist/my", { preHandler: authenticate }, async (request, reply) => {
    const entries = await prisma.waitlistEntry.findMany({
      where: { clientId: request.user.sub, status: { in: ["WAITING", "NOTIFIED"] } },
      include: {
        treatment: { select: { name: true } },
        practitioner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ entries });
  });
}
