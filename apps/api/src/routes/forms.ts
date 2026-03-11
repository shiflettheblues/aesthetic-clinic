import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sendFormRequest } from "../services/email.js";

const fieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "number", "boolean", "select", "date", "signature"]),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  conditionalOn: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  formType: z.enum(["MEDICAL_QUESTIONNAIRE", "CONSENT", "PHOTO_CONSENT", "AFTERCARE"]),
  treatmentId: z.string().optional(),
  fields: z.array(fieldSchema).min(1),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const submitFormSchema = z.object({
  templateId: z.string(),
  appointmentId: z.string().optional(),
  responses: z.record(z.unknown()),
  signatureUrl: z.string().optional(),
});

export async function formRoutes(app: FastifyInstance) {
  // --- Templates (Admin) ---

  // List templates
  app.get("/forms/templates", { preHandler: authenticate }, async (request, reply) => {
    const { treatmentId, formType, active } = request.query as {
      treatmentId?: string;
      formType?: string;
      active?: string;
    };

    const where: Record<string, unknown> = {};
    if (treatmentId) where.treatmentId = treatmentId;
    if (formType) where.formType = formType;
    if (active === "true") where.isActive = true;

    const templates = await prisma.formTemplate.findMany({
      where,
      include: { treatment: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ templates });
  });

  // Get template
  app.get("/forms/templates/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await prisma.formTemplate.findUnique({
      where: { id },
      include: { treatment: { select: { id: true, name: true } } },
    });

    if (!template) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    return reply.send({ template });
  });

  // Create template (admin only)
  app.post("/forms/templates", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = createTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const template = await prisma.formTemplate.create({
      data: {
        name: parsed.data.name,
        formType: parsed.data.formType,
        treatmentId: parsed.data.treatmentId,
        fields: parsed.data.fields,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return reply.status(201).send({ template });
  });

  // Update template (admin only)
  app.patch("/forms/templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.formTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    // Bump version if fields changed
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.fields) {
      data.version = existing.version + 1;
    }

    const template = await prisma.formTemplate.update({ where: { id }, data });
    return reply.send({ template });
  });

  // Delete template (admin only)
  app.delete("/forms/templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.formTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    await prisma.formTemplate.delete({ where: { id } });
    return reply.send({ message: "Template deleted" });
  });

  // --- Submissions ---

  // Submit form (client)
  app.post("/forms/submissions", { preHandler: authenticate }, async (request, reply) => {
    const parsed = submitFormSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const template = await prisma.formTemplate.findUnique({ where: { id: parsed.data.templateId } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        templateId: parsed.data.templateId,
        clientId: request.user.sub,
        appointmentId: parsed.data.appointmentId,
        responses: parsed.data.responses as object,
        signatureUrl: parsed.data.signatureUrl,
        signedAt: parsed.data.signatureUrl ? new Date() : null,
      },
    });

    return reply.status(201).send({ submission });
  });

  // List submissions for current user or by admin
  app.get("/forms/submissions", { preHandler: authenticate }, async (request, reply) => {
    const { clientId, appointmentId, templateId } = request.query as {
      clientId?: string;
      appointmentId?: string;
      templateId?: string;
    };

    const where: Record<string, unknown> = {};

    if (request.user.role === "CLIENT") {
      where.clientId = request.user.sub;
    } else if (clientId) {
      where.clientId = clientId;
    }

    if (appointmentId) where.appointmentId = appointmentId;
    if (templateId) where.templateId = templateId;

    const submissions = await prisma.formSubmission.findMany({
      where,
      include: {
        template: { select: { id: true, name: true, formType: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ submissions });
  });

  // Get single submission
  app.get("/forms/submissions/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const submission = await prisma.formSubmission.findUnique({
      where: { id },
      include: {
        template: true,
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!submission) {
      return reply.status(404).send({ error: "Submission not found", code: "NOT_FOUND" });
    }

    if (request.user.role === "CLIENT" && submission.clientId !== request.user.sub) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }

    return reply.send({ submission });
  });

  // Request form from client (admin triggers email)
  app.post("/forms/request", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const schema = z.object({
      clientId: z.string(),
      templateId: z.string(),
      appointmentId: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const [client, template] = await Promise.all([
      prisma.user.findUnique({ where: { id: parsed.data.clientId }, select: { email: true, firstName: true } }),
      prisma.formTemplate.findUnique({ where: { id: parsed.data.templateId }, select: { name: true } }),
    ]);

    if (!client || !template) {
      return reply.status(404).send({ error: "Client or template not found", code: "NOT_FOUND" });
    }

    const baseUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const formUrl = `${baseUrl}/forms/${parsed.data.templateId}${parsed.data.appointmentId ? `?appointmentId=${parsed.data.appointmentId}` : ""}`;

    await sendFormRequest({
      to: client.email,
      clientName: client.firstName,
      formName: template.name,
      formUrl,
    });

    return reply.send({ message: "Form request sent" });
  });
}
