import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).optional(),
});

const updateSchema = createSchema.partial().omit({ email: true });

export async function practitionerRoutes(app: FastifyInstance) {
  // List practitioners (public)
  app.get("/practitioners", async (_request, reply) => {
    const practitioners = await prisma.user.findMany({
      where: { role: "PRACTITIONER" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        specialties: true,
        avatarUrl: true,
        workingHoursStart: true,
        workingHoursEnd: true,
        workingDays: true,
      },
      orderBy: { firstName: "asc" },
    });

    return reply.send({ practitioners });
  });

  // Get single practitioner (public)
  app.get("/practitioners/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const practitioner = await prisma.user.findFirst({
      where: { id, role: "PRACTITIONER" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        specialties: true,
        avatarUrl: true,
        workingHoursStart: true,
        workingHoursEnd: true,
        workingDays: true,
      },
    });

    if (!practitioner) {
      return reply.status(404).send({ error: "Practitioner not found", code: "NOT_FOUND" });
    }

    return reply.send({ practitioner });
  });

  // Create practitioner (admin only) — creates a User with PRACTITIONER role
  app.post("/practitioners", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { email, firstName, lastName, phone, bio, specialties, workingHoursStart, workingHoursEnd, workingDays } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered", code: "EMAIL_EXISTS" });
    }

    // Practitioners created by admin get a placeholder password (they'll reset it)
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash("changeme123", 12);

    const practitioner = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: "PRACTITIONER",
        bio,
        specialties: specialties ?? [],
        workingHoursStart: workingHoursStart ?? "09:00",
        workingHoursEnd: workingHoursEnd ?? "18:00",
        workingDays: workingDays ?? [1, 2, 3, 4, 5],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        specialties: true,
        workingHoursStart: true,
        workingHoursEnd: true,
        workingDays: true,
      },
    });

    return reply.status(201).send({ practitioner });
  });

  // Update practitioner (admin only)
  app.patch("/practitioners/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.user.findFirst({ where: { id, role: "PRACTITIONER" } });
    if (!existing) {
      return reply.status(404).send({ error: "Practitioner not found", code: "NOT_FOUND" });
    }

    const practitioner = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        specialties: true,
        workingHoursStart: true,
        workingHoursEnd: true,
        workingDays: true,
      },
    });

    return reply.send({ practitioner });
  });

  // Delete practitioner (admin only)
  app.delete("/practitioners/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.user.findFirst({ where: { id, role: "PRACTITIONER" } });
    if (!existing) {
      return reply.status(404).send({ error: "Practitioner not found", code: "NOT_FOUND" });
    }

    await prisma.user.delete({ where: { id } });
    return reply.send({ message: "Practitioner deleted" });
  });
}
