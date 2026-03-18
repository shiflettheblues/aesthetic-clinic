import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sendFormRequest } from "../services/email.js";
import { sendSms } from "../services/sms.js";

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

// Default form templates to seed
const DEFAULT_TEMPLATES: {
  name: string;
  formType: "MEDICAL_QUESTIONNAIRE" | "CONSENT" | "PHOTO_CONSENT" | "AFTERCARE";
  fields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "number" | "boolean" | "select" | "date" | "signature";
    required?: boolean;
    options?: string[];
  }[];
}[] = [
  {
    name: "Medical History & Health Questionnaire",
    formType: "MEDICAL_QUESTIONNAIRE",
    fields: [
      { key: "allergies", label: "Do you have any known allergies? (medications, latex, anaesthetics, etc.)", type: "textarea", required: true },
      { key: "medications", label: "Please list all current medications, supplements and herbal remedies", type: "textarea", required: true },
      { key: "conditions", label: "Do you have any medical conditions we should be aware of?", type: "textarea", required: true },
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "bloodThinners", label: "Are you taking blood-thinning medications (aspirin, warfarin, clopidogrel)?", type: "boolean", required: true },
      { key: "previousReactions", label: "Have you had any previous adverse reactions to aesthetic treatments?", type: "textarea" },
      { key: "gp_name", label: "GP Name", type: "text" },
      { key: "gp_address", label: "GP Practice Address", type: "text" },
      { key: "notes", label: "Any other relevant health information", type: "textarea" },
    ],
  },
  {
    name: "Botulinum Toxin (Botox) Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "neuromuscular", label: "Do you have any neuromuscular disorders (e.g. myasthenia gravis, Lambert-Eaton syndrome)?", type: "boolean", required: true },
      { key: "medications", label: "Current medications (especially antibiotics, muscle relaxants, blood thinners)", type: "textarea", required: true },
      { key: "allergies", label: "Known allergies (particularly to botulinum toxin or albumin)", type: "textarea", required: true },
      { key: "previousBotox", label: "Have you had botulinum toxin treatment before? If yes, when and where?", type: "textarea" },
      { key: "dentalPlanned", label: "Do you have any dental procedures planned in the next 2 weeks?", type: "boolean" },
      { key: "riskUnderstood", label: "I understand the risks including bruising, swelling, asymmetry, drooping, and that results are temporary (3-6 months)", type: "boolean", required: true },
      { key: "noRefundUnderstood", label: "I understand that cosmetic results are not guaranteed and no refund will be given for aesthetic outcomes", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive botulinum toxin treatment and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
  {
    name: "Dermal Filler Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "allergies", label: "Known allergies (particularly hyaluronic acid, lidocaine, or any injectable products)", type: "textarea", required: true },
      { key: "medications", label: "Current medications (especially blood thinners, NSAIDs, aspirin)", type: "textarea", required: true },
      { key: "autoimmune", label: "Do you have any autoimmune conditions or are you on immunosuppressants?", type: "boolean", required: true },
      { key: "previousFillers", label: "Have you had dermal filler treatment before? If yes, when, where and which product?", type: "textarea" },
      { key: "coldSores", label: "Do you suffer from cold sores or oral herpes? (If yes, antiviral prophylaxis may be required)", type: "boolean" },
      { key: "bleeding", label: "Do you have a bleeding disorder or tendency to bruise easily?", type: "boolean" },
      { key: "previousDissolver", label: "Have you ever had filler dissolved with hyaluronidase?", type: "boolean" },
      { key: "riskUnderstood", label: "I understand the risks including bruising, swelling, lumpiness, asymmetry, infection, vascular occlusion, and migration", type: "boolean", required: true },
      { key: "vasOcclusionUnderstood", label: "I understand that vascular occlusion is a rare but serious complication and I have been informed of the emergency protocol", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive dermal filler treatment and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
  {
    name: "Polynucleotide (PDRN/PN) Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "fishAllergy", label: "Do you have a fish or seafood allergy? (PDRN is derived from salmon DNA)", type: "boolean", required: true },
      { key: "autoimmune", label: "Do you have any autoimmune conditions?", type: "boolean", required: true },
      { key: "medications", label: "Current medications", type: "textarea", required: true },
      { key: "allergies", label: "Known allergies", type: "textarea", required: true },
      { key: "activeSkin", label: "Do you have any active skin infections, cold sores or inflammatory skin conditions in the treatment area?", type: "boolean", required: true },
      { key: "previousPN", label: "Have you had polynucleotide treatment before? If yes, when and where?", type: "textarea" },
      { key: "riskUnderstood", label: "I understand the risks including bruising, swelling, redness, and rarely allergic reaction", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive polynucleotide treatment and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
  {
    name: "Laser Treatment Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "skinType", label: "How would you describe your skin type?", type: "select", options: ["Fair (Type I-II)", "Medium (Type III)", "Olive (Type IV)", "Brown (Type V)", "Dark (Type VI)"], required: true },
      { key: "sunExposure", label: "Have you had significant sun exposure or used a sunbed in the last 4 weeks?", type: "boolean", required: true },
      { key: "photosensitising", label: "Are you taking any photosensitising medications (tetracyclines, isotretinoin, St John's Wort)?", type: "boolean", required: true },
      { key: "accutane", label: "Have you used Roaccutane/isotretinoin in the last 6 months?", type: "boolean", required: true },
      { key: "activeLesions", label: "Do you have any active skin infections, cold sores, eczema or open wounds in the treatment area?", type: "boolean", required: true },
      { key: "historyKeloid", label: "Do you have a history of keloid or hypertrophic scarring?", type: "boolean", required: true },
      { key: "medications", label: "Current medications", type: "textarea", required: true },
      { key: "riskUnderstood", label: "I understand the risks including temporary redness, swelling, blistering, pigmentation changes, and rare scarring", type: "boolean", required: true },
      { key: "sunscreenAgreed", label: "I agree to apply SPF 50 daily and avoid sun exposure post-treatment as advised", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive laser treatment and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
  {
    name: "IV Vitamin Infusion Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "kidneyLiver", label: "Do you have any kidney or liver conditions?", type: "boolean", required: true },
      { key: "heartCondition", label: "Do you have any heart conditions or high blood pressure?", type: "boolean", required: true },
      { key: "diabetes", label: "Do you have diabetes?", type: "boolean" },
      { key: "clottingDisorder", label: "Do you have a blood clotting disorder or are you on anticoagulants?", type: "boolean", required: true },
      { key: "allergies", label: "Known allergies (especially to vitamins, minerals or preservatives)", type: "textarea", required: true },
      { key: "medications", label: "Current medications and supplements", type: "textarea", required: true },
      { key: "previousIV", label: "Have you had IV therapy before? If yes, any reactions?", type: "textarea" },
      { key: "riskUnderstood", label: "I understand the risks including bruising at the site, allergic reaction, air embolism (rare), and infection", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive IV vitamin infusion and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
  {
    name: "Skin Peel Consent Form",
    formType: "CONSENT",
    fields: [
      { key: "pregnant", label: "Are you pregnant or breastfeeding?", type: "boolean", required: true },
      { key: "accutane", label: "Are you currently using or have used Roaccutane/isotretinoin in the last 6 months?", type: "boolean", required: true },
      { key: "retinoids", label: "Are you currently using prescription retinoids (tretinoin, adapalene)?", type: "boolean", required: true },
      { key: "sunExposure", label: "Have you had significant sun exposure or used a sunbed in the last 2 weeks?", type: "boolean", required: true },
      { key: "coldSores", label: "Do you suffer from cold sores or oral herpes in the treatment area?", type: "boolean" },
      { key: "activeSkin", label: "Do you have any active acne cysts, eczema, psoriasis or broken skin in the treatment area?", type: "boolean", required: true },
      { key: "sensitisers", label: "Are you taking any photosensitising medications?", type: "boolean", required: true },
      { key: "keloid", label: "Do you have a history of keloid or abnormal scarring?", type: "boolean", required: true },
      { key: "allergies", label: "Known allergies (especially to acids, salicylates or similar)", type: "textarea", required: true },
      { key: "riskUnderstood", label: "I understand the risks including peeling, redness, sensitivity, temporary darkening/lightening, and rare scarring", type: "boolean", required: true },
      { key: "postCareAgreed", label: "I agree to follow all post-peel care instructions including SPF 50+ and avoiding picking or peeling skin", type: "boolean", required: true },
      { key: "consent", label: "I give my informed consent to receive a skin peel and confirm the information above is accurate", type: "boolean", required: true },
      { key: "signature", label: "Signature (type full name)", type: "text", required: true },
    ],
  },
];

async function seedDefaultTemplates() {
  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await prisma.formTemplate.findFirst({ where: { name: tpl.name } });
    if (!existing) {
      await prisma.formTemplate.create({
        data: {
          name: tpl.name,
          formType: tpl.formType,
          fields: tpl.fields,
          isActive: true,
        },
      });
    }
  }
}

export async function formRoutes(app: FastifyInstance) {
  // --- Templates (Admin) ---

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

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.fields) {
      data.version = existing.version + 1;
    }

    const template = await prisma.formTemplate.update({ where: { id }, data });
    return reply.send({ template });
  });

  app.delete("/forms/templates/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.formTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Template not found", code: "NOT_FOUND" });
    }

    await prisma.formTemplate.delete({ where: { id } });
    return reply.send({ message: "Template deleted" });
  });

  // Seed default templates
  app.post("/forms/seed-defaults", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    await seedDefaultTemplates();
    const count = await prisma.formTemplate.count();
    return reply.send({ message: "Default templates seeded", total: count });
  });

  // --- Submissions ---

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

    // Auto-populate medical history when a medical questionnaire is submitted
    if (template.formType === "MEDICAL_QUESTIONNAIRE") {
      try {
        const r = parsed.data.responses as Record<string, unknown>;
        const str = (v: unknown) => (v != null && v !== false ? String(v) : "");
        await prisma.medicalHistory.upsert({
          where: { clientId: request.user.sub },
          create: {
            clientId: request.user.sub,
            allergies: str(r.allergies ?? r.allergy ?? ""),
            medications: str(r.medications ?? r.currentMedications ?? ""),
            conditions: str(r.conditions ?? r.medicalConditions ?? ""),
            notes: str(r.notes ?? r.additionalNotes ?? ""),
          },
          update: {
            allergies: str(r.allergies ?? r.allergy ?? ""),
            medications: str(r.medications ?? r.currentMedications ?? ""),
            conditions: str(r.conditions ?? r.medicalConditions ?? ""),
            notes: str(r.notes ?? r.additionalNotes ?? ""),
          },
        });
      } catch (e) {
        console.error("[FORMS] Failed to auto-populate medical history:", e);
      }
    }

    return reply.status(201).send({ submission });
  });

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

  // Request form from client (admin sends email and/or SMS)
  app.post("/forms/request", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const schema = z.object({
      clientId: z.string(),
      templateId: z.string(),
      appointmentId: z.string().optional(),
      channel: z.enum(["email", "sms", "both"]).default("email"),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const [client, template] = await Promise.all([
      prisma.user.findUnique({
        where: { id: parsed.data.clientId },
        select: { email: true, firstName: true, phone: true },
      }),
      prisma.formTemplate.findUnique({ where: { id: parsed.data.templateId }, select: { name: true } }),
    ]);

    if (!client || !template) {
      return reply.status(404).send({ error: "Client or template not found", code: "NOT_FOUND" });
    }

    const baseUrl = process.env.WEB_URL ?? "http://localhost:3000";
    const formUrl = `${baseUrl}/forms/${parsed.data.templateId}${parsed.data.appointmentId ? `?appointmentId=${parsed.data.appointmentId}` : ""}`;

    const channel = parsed.data.channel;
    const results: string[] = [];

    if ((channel === "email" || channel === "both") && client.email) {
      await sendFormRequest({
        to: client.email,
        clientName: client.firstName,
        formName: template.name,
        formUrl,
      });
      results.push("email");
    }

    if ((channel === "sms" || channel === "both") && client.phone) {
      await sendSms({
        to: client.phone,
        body: `Hi ${client.firstName}, please complete your ${template.name} before your appointment: ${formUrl}`,
      });
      results.push("sms");
    }

    return reply.send({ message: "Form request sent", channels: results });
  });
}
