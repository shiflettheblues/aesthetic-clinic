import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { createPaymentIntent, refundPayment, constructWebhookEvent } from "../services/stripe.js";
import { createNotification } from "../services/notification.js";

const createIntentSchema = z.object({
  appointmentId: z.string(),
  amountCents: z.number().int().min(1),
  type: z.enum(["DEPOSIT", "BALANCE"]),
  paymentMethod: z.enum(["STRIPE", "KLARNA", "CLEARPAY", "CASH"]).optional(),
});

export async function paymentRoutes(app: FastifyInstance) {
  // Create payment intent
  app.post("/payments/create-intent", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createIntentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { appointmentId, amountCents, type, paymentMethod } = parsed.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { treatment: true },
    });

    if (!appointment) {
      return reply.status(404).send({ error: "Appointment not found", code: "NOT_FOUND" });
    }

    // Clients can only pay for their own appointments
    if (request.user.role === "CLIENT" && appointment.clientId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    if (paymentMethod === "CASH") {
      // Cash payments recorded directly by admin
      if (request.user.role === "CLIENT") {
        return reply.status(403).send({ error: "Only staff can record cash payments", code: "FORBIDDEN" });
      }

      const payment = await prisma.payment.create({
        data: {
          appointmentId,
          clientId: appointment.clientId,
          amountCents,
          type,
          paymentMethod: "CASH",
          status: "CAPTURED",
        },
      });

      if (type === "DEPOSIT") {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { depositPaid: true, depositAmountCents: amountCents },
        });
      }

      return reply.status(201).send({ payment });
    }

    // Create Stripe payment intent
    const intent = await createPaymentIntent({
      amountCents,
      metadata: {
        appointmentId,
        clientId: appointment.clientId,
        type,
      },
    });

    // Create pending payment record
    const payment = await prisma.payment.create({
      data: {
        appointmentId,
        clientId: appointment.clientId,
        amountCents,
        type,
        paymentMethod: paymentMethod ?? "STRIPE",
        status: "PENDING",
        stripePaymentIntentId: intent.id,
      },
    });

    return reply.status(201).send({
      payment,
      clientSecret: intent.client_secret,
    });
  });

  // Stripe webhook
  app.post("/payments/webhook", {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers["stripe-signature"] as string;
    if (!signature) {
      return reply.status(400).send({ error: "Missing signature" });
    }

    let event;
    try {
      const body = (request as unknown as { rawBody: string | Buffer }).rawBody ?? JSON.stringify(request.body);
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      return reply.status(400).send({ error: "Webhook signature verification failed" });
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: intent.id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "CAPTURED",
            stripeChargeId: intent.latest_charge as string | undefined,
          },
        });

        if (payment.type === "DEPOSIT" && payment.appointmentId) {
          await prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { depositPaid: true, depositAmountCents: payment.amountCents },
          });
        }

        await createNotification({
          userId: payment.clientId,
          type: "PAYMENT_SUCCESS",
          title: "Payment Received",
          body: `Your payment of £${(payment.amountCents / 100).toFixed(2)} has been received.`,
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: intent.id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
      }
    }

    return reply.send({ received: true });
  });

  // List payments (admin sees all, clients see own)
  app.get("/payments", { preHandler: authenticate }, async (request, reply) => {
    const { appointmentId, clientId, status } = request.query as {
      appointmentId?: string;
      clientId?: string;
      status?: string;
    };

    const where: Record<string, unknown> = {};

    if (request.user.role === "CLIENT") {
      where.clientId = request.user.sub;
    } else if (clientId) {
      where.clientId = clientId;
    }

    if (appointmentId) where.appointmentId = appointmentId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        appointment: {
          select: { id: true, startsAt: true, treatment: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ payments });
  });

  // Refund payment (admin only)
  app.post("/payments/:id/refund", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { amountCents } = (request.body as { amountCents?: number }) ?? {};

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return reply.status(404).send({ error: "Payment not found", code: "NOT_FOUND" });
    }

    if (payment.status !== "CAPTURED") {
      return reply.status(400).send({ error: "Payment not captured", code: "NOT_CAPTURED" });
    }

    if (payment.stripePaymentIntentId && payment.paymentMethod === "STRIPE") {
      await refundPayment(payment.stripePaymentIntentId, amountCents);
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "REFUNDED" },
    });

    await createNotification({
      userId: payment.clientId,
      type: "PAYMENT_REFUNDED",
      title: "Refund Processed",
      body: `A refund of £${((amountCents ?? payment.amountCents) / 100).toFixed(2)} has been processed.`,
    });

    return reply.send({ payment: updated });
  });
}
