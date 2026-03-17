import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

const DEFAULTS: { type: string; channel: string; subject?: string; body: string }[] = [
  { type: "BOOKING_CONFIRMED", channel: "SMS", body: "Hi {name}, your appointment for {treatment} on {date} at {time} is confirmed. See you soon! - {clinic}" },
  { type: "BOOKING_CONFIRMED", channel: "EMAIL", subject: "Booking Confirmed — {treatment}", body: "Hi {name},\n\nYour appointment for {treatment} with {practitioner} on {date} at {time} is confirmed.\n\nSee you soon!\n{clinic}" },
  { type: "BOOKING_REMINDER_24H", channel: "SMS", body: "Reminder: You have an appointment for {treatment} tomorrow at {time}. Reply STOP to opt out. - {clinic}" },
  { type: "BOOKING_REMINDER_24H", channel: "EMAIL", subject: "Appointment Reminder — Tomorrow at {time}", body: "Hi {name},\n\nJust a reminder that you have an appointment for {treatment} with {practitioner} tomorrow at {time}.\n\n{clinic}" },
  { type: "BOOKING_CANCELLED", channel: "SMS", body: "Hi {name}, your appointment for {treatment} on {date} has been cancelled. Please contact us to rebook. - {clinic}" },
  { type: "BOOKING_CANCELLED", channel: "EMAIL", subject: "Appointment Cancelled", body: "Hi {name},\n\nYour appointment for {treatment} on {date} has been cancelled.\n\nPlease contact us to rebook at your convenience.\n\n{clinic}" },
  { type: "REBOOK_REMINDER", channel: "SMS", body: "Hi {name}, it's been a while! Book your next {treatment} session at {clinic}." },
  { type: "REBOOK_REMINDER", channel: "EMAIL", subject: "Time for your next appointment?", body: "Hi {name},\n\nWe noticed it's been a while since your last visit. We'd love to see you again!\n\nBook your next {treatment} session with us.\n\n{clinic}" },
  { type: "BIRTHDAY", channel: "SMS", body: "Happy Birthday {name}! 🎂 Treat yourself — enjoy a special birthday discount on your next visit. - {clinic}" },
  { type: "BIRTHDAY", channel: "EMAIL", subject: "Happy Birthday from {clinic}!", body: "Hi {name},\n\nHappy Birthday! 🎂\n\nAs a birthday treat, we'd love to offer you a special discount on your next appointment.\n\n{clinic}" },
  { type: "OVERDUE_TREATMENT", channel: "SMS", body: "Hi {name}, your {treatment} is due for a top-up! Book now at {clinic}." },
  { type: "OVERDUE_TREATMENT", channel: "EMAIL", subject: "Your {treatment} is due", body: "Hi {name},\n\nBased on your last treatment, it may be time for a top-up of your {treatment}.\n\nBook your next appointment with us.\n\n{clinic}" },
  { type: "PAYMENT_RECEIVED", channel: "SMS", body: "Hi {name}, we've received your payment of £{amount}. Thank you! - {clinic}" },
  { type: "PAYMENT_RECEIVED", channel: "EMAIL", subject: "Payment Received — £{amount}", body: "Hi {name},\n\nThank you! We've received your payment of £{amount}.\n\n{clinic}" },
  { type: "FOLLOW_UP", channel: "SMS", body: "Hi {name}, how are you feeling after your {treatment}? We hope you're happy with your results! - {clinic}" },
  { type: "FOLLOW_UP", channel: "EMAIL", subject: "How are you after your {treatment}?", body: "Hi {name},\n\nWe hope you're happy with your {treatment} results!\n\nIf you have any questions or concerns, please don't hesitate to get in touch.\n\n{clinic}" },
];

async function ensureDefaults() {
  for (const d of DEFAULTS) {
    await prisma.notificationTemplate.upsert({
      where: { type_channel: { type: d.type as any, channel: d.channel as any } },
      create: { type: d.type as any, channel: d.channel as any, subject: d.subject, body: d.body },
      update: {},
    });
  }
}

const updateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().min(1),
  isActive: z.boolean().optional(),
});

export async function notificationTemplateRoutes(app: FastifyInstance) {
  // List all templates (admin) — seed defaults if missing
  app.get("/notification-templates", { preHandler: requireRole("ADMIN") }, async (_req, reply) => {
    await ensureDefaults();
    const templates = await prisma.notificationTemplate.findMany({ orderBy: [{ type: "asc" }, { channel: "asc" }] });
    return reply.send({ templates });
  });

  // Update a template (admin)
  app.patch("/notification-templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" });
    }
    const template = await prisma.notificationTemplate.update({ where: { id }, data: parsed.data });
    return reply.send({ template });
  });

  // Preview a template with sample data
  app.post("/notification-templates/preview", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { body, subject } = request.body as { body: string; subject?: string };
    const vars: Record<string, string> = {
      name: "Jane Smith",
      treatment: "Lip Filler",
      date: "Monday, 20 March 2026",
      time: "14:00",
      practitioner: "Dr Smith",
      clinic: "Dr Skin Central",
      amount: "120.00",
    };
    const render = (text: string) =>
      text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
    return reply.send({ body: render(body), subject: subject ? render(subject) : undefined });
  });
}
