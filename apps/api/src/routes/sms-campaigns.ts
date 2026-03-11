import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";
import { sendSms } from "../services/sms.js";

export async function smsCampaignRoutes(app: FastifyInstance) {
  // Get SMS credit balance
  app.get("/sms/credits", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const result = await prisma.smsCredit.aggregate({ _sum: { quantity: true } });
    return reply.send({ balance: result._sum.quantity ?? 0 });
  });

  // Add credits (admin)
  app.post("/sms/credits", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const schema = z.object({ quantity: z.number().int().min(1), reason: z.string() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    await prisma.smsCredit.create({ data: { ...parsed.data } });
    return reply.status(201).send({ message: "Credits added" });
  });

  // List campaigns
  app.get("/sms/campaigns", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const campaigns = await prisma.smsCampaign.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ campaigns });
  });

  // Create campaign
  app.post("/sms/campaigns", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1),
      message: z.string().min(1).max(160),
      targetFilter: z.record(z.unknown()).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    // Count potential recipients based on filter
    const filter = parsed.data.targetFilter ?? {};
    const where: Record<string, unknown> = { role: "CLIENT", phone: { not: null } };

    if (filter.treatmentId) {
      where.clientAppointments = { some: { treatmentId: filter.treatmentId } };
    }

    const recipientCount = await prisma.user.count({ where });

    const campaign = await prisma.smsCampaign.create({
      data: {
        name: parsed.data.name,
        message: parsed.data.message,
        targetFilter: (parsed.data.targetFilter as object) ?? undefined,
        recipientCount,
        status: "draft",
      },
    });

    return reply.status(201).send({ campaign });
  });

  // Send campaign
  app.post("/sms/campaigns/:id/send", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await prisma.smsCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return reply.status(404).send({ error: "Campaign not found", code: "NOT_FOUND" });
    }

    if (campaign.status === "sent") {
      return reply.status(400).send({ error: "Campaign already sent", code: "ALREADY_SENT" });
    }

    // Check credits
    const credits = await prisma.smsCredit.aggregate({ _sum: { quantity: true } });
    const balance = credits._sum.quantity ?? 0;
    if (balance < campaign.recipientCount) {
      return reply.status(400).send({ error: `Insufficient SMS credits (need ${campaign.recipientCount}, have ${balance})`, code: "INSUFFICIENT_CREDITS" });
    }

    // Get recipients
    const filter = (campaign.targetFilter as Record<string, unknown>) ?? {};
    const where: Record<string, unknown> = { role: "CLIENT", phone: { not: null } };
    if (filter.treatmentId) {
      where.clientAppointments = { some: { treatmentId: filter.treatmentId } };
    }

    const recipients = await prisma.user.findMany({
      where,
      select: { phone: true, firstName: true },
    });

    // Send messages
    let sentCount = 0;
    for (const recipient of recipients) {
      if (recipient.phone) {
        const personalizedMessage = campaign.message.replace("{name}", recipient.firstName);
        await sendSms({ to: recipient.phone, body: personalizedMessage });
        sentCount++;
      }
    }

    // Deduct credits
    await prisma.smsCredit.create({
      data: { quantity: -sentCount, reason: `Campaign: ${campaign.name}`, reference: campaign.id },
    });

    await prisma.smsCampaign.update({
      where: { id },
      data: { status: "sent", sentCount, sentAt: new Date() },
    });

    return reply.send({ message: `Campaign sent to ${sentCount} recipients` });
  });
}
