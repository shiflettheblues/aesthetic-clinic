import { FastifyInstance } from "fastify";
import { z } from "zod";
import dayjs from "dayjs";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { getAvailableSlots, lockSlot, unlockSlot } from "../services/availability.js";
import { notifyBookingCreated, notifyBookingCancelled } from "../services/notification.js";
import { sendEmail } from "../services/email.js";

const createSchema = z.object({
  clientId: z.string(),
  practitionerId: z.string(),
  treatmentId: z.string(),
  startsAt: z.string().datetime(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  notes: z.string().optional(),
  startsAt: z.string().datetime().optional(),
});

export async function appointmentRoutes(app: FastifyInstance) {
  // List appointments (filtered by role)
  app.get("/appointments", { preHandler: authenticate }, async (request, reply) => {
    const { from, to, practitionerId, status } = request.query as {
      from?: string;
      to?: string;
      practitionerId?: string;
      status?: string;
    };

    const where: Record<string, unknown> = {};

    // Clients only see their own
    if (request.user.role === "CLIENT") {
      where.clientId = request.user.sub;
    } else if (request.user.role === "PRACTITIONER") {
      where.practitionerId = request.user.sub;
    }

    if (practitionerId && request.user.role === "ADMIN") {
      where.practitionerId = practitionerId;
    }

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.startsAt = {};
      if (from) (where.startsAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.startsAt as Record<string, unknown>).lte = new Date(to);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return reply.send({ appointments });
  });

  // Get single appointment
  app.get("/appointments/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: true,
        payments: true,
      },
    });

    if (!appointment) {
      return reply.status(404).send({ error: "Appointment not found", code: "NOT_FOUND" });
    }

    // Clients can only view their own
    if (request.user.role === "CLIENT" && appointment.clientId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    return reply.send({ appointment });
  });

  // Get availability
  app.get("/appointments/availability", async (request, reply) => {
    const { practitionerId, date, treatmentId } = request.query as {
      practitionerId: string;
      date: string;
      treatmentId: string;
    };

    if (!practitionerId || !date || !treatmentId) {
      return reply.status(400).send({
        error: "practitionerId, date, and treatmentId are required",
        code: "VALIDATION_ERROR",
      });
    }

    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    const slots = await getAvailableSlots(practitionerId, date, treatment.durationMinutes);
    return reply.send({ slots, date, practitionerId, treatmentId });
  });

  // Lock a slot during checkout
  app.post("/appointments/lock-slot", { preHandler: authenticate }, async (request, reply) => {
    const schema = z.object({
      practitionerId: z.string(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const locked = await lockSlot(
      parsed.data.practitionerId,
      parsed.data.startsAt,
      parsed.data.endsAt,
      request.user.sub
    );

    if (!locked) {
      return reply.status(409).send({ error: "Slot already locked", code: "SLOT_LOCKED" });
    }

    return reply.send({ locked: true, expiresInSeconds: 600 });
  });

  // Create appointment
  app.post("/appointments", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { clientId, practitionerId, treatmentId, startsAt, notes } = parsed.data;

    // Clients can only book for themselves
    if (request.user.role === "CLIENT" && clientId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    const treatment = await prisma.treatment.findUnique({ where: { id: treatmentId } });
    if (!treatment) {
      return reply.status(404).send({ error: "Treatment not found", code: "NOT_FOUND" });
    }

    const endsAt = dayjs(startsAt).add(treatment.durationMinutes, "minute").toISOString();

    // Check for overlapping appointments
    const overlap = await prisma.appointment.findFirst({
      where: {
        practitionerId,
        status: { notIn: ["CANCELLED"] },
        startsAt: { lt: new Date(endsAt) },
        endsAt: { gt: new Date(startsAt) },
      },
    });

    if (overlap) {
      return reply.status(409).send({ error: "Time slot not available", code: "SLOT_UNAVAILABLE" });
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        practitionerId,
        treatmentId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        notes,
        status: "CONFIRMED",
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
    });

    // Release slot lock
    await unlockSlot(practitionerId, startsAt);

    // Send notifications
    await notifyBookingCreated({
      clientId,
      practitionerId,
      treatmentName: treatment.name,
      startsAt: new Date(startsAt),
    });

    // Auto-award loyalty points
    try {
      await prisma.loyaltyPoints.create({
        data: {
          clientId,
          points: 10,
          reason: "booking",
          reference: appointment.id,
        },
      });
    } catch (e) {
      console.error("[LOYALTY] Failed to award booking points:", e);
    }

    return reply.status(201).send({ appointment });
  });

  // Update appointment
  app.patch("/appointments/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { treatment: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: "Appointment not found", code: "NOT_FOUND" });
    }

    // Clients can only cancel their own
    if (request.user.role === "CLIENT") {
      if (existing.clientId !== request.user.sub) {
        return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
      }
      if (parsed.data.status && parsed.data.status !== "CANCELLED") {
        return reply.status(403).send({ error: "Clients can only cancel", code: "FORBIDDEN" });
      }
    }

    const data: Record<string, unknown> = { ...parsed.data };

    // Recalculate endsAt if startsAt changes
    if (parsed.data.startsAt) {
      data.startsAt = new Date(parsed.data.startsAt);
      data.endsAt = dayjs(parsed.data.startsAt).add(existing.treatment.durationMinutes, "minute").toDate();
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
        treatment: { select: { id: true, name: true } },
      },
    });

    if (parsed.data.status === "CANCELLED") {
      await notifyBookingCancelled({
        clientId: existing.clientId,
        practitionerId: existing.practitionerId,
        treatmentName: existing.treatment.name,
        startsAt: existing.startsAt,
      });
    }

    // Auto-send Google review request on completion
    if (parsed.data.status === "COMPLETED") {
      try {
        const googleConfig = await prisma.integrationConfig.findUnique({
          where: { provider: "google_reviews" },
        });
        if (googleConfig?.isEnabled) {
          const settings = (googleConfig.settings as Record<string, unknown>) ?? {};
          const placeId = settings.placeId as string;
          const autoSend = settings.autoSendReview !== false;
          if (placeId && autoSend) {
            const client = await prisma.user.findUnique({ where: { id: existing.clientId } });
            if (client?.email) {
              const reviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
              await sendEmail({
                to: client.email,
                subject: "How was your visit? Leave us a review!",
                html: `
                  <h2>Thank you for visiting us!</h2>
                  <p>Hi ${client.firstName},</p>
                  <p>We hope you enjoyed your ${existing.treatment.name} today. We'd love to hear your feedback!</p>
                  <p><a href="${reviewUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Leave a Google Review</a></p>
                  <p>Thank you for choosing Aesthetic Clinic!</p>
                `,
              });
            }
          }
        }
      } catch (e) {
        console.error("[GOOGLE_REVIEWS] Failed to send review request:", e);
      }
    }

    return reply.send({ appointment });
  });
}
