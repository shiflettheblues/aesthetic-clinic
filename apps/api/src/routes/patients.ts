import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

export async function patientRoutes(app: FastifyInstance) {
  // Search patients (admin/practitioner only)
  app.get("/patients", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const { search, page = "1", limit = "20", treatmentId, lastVisitFrom, lastVisitTo, minVisits } = request.query as {
      search?: string;
      page?: string;
      limit?: string;
      treatmentId?: string;
      lastVisitFrom?: string;
      lastVisitTo?: string;
      minVisits?: string;
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: Record<string, unknown> = { role: "CLIENT", isArchived: false };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    if (treatmentId) {
      where.clientAppointments = { some: { treatmentId } };
    }

    const [patients, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: { select: { clientAppointments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    // Get last visit for each patient
    const patientIds = patients.map((p) => p.id);
    const lastVisits = await prisma.appointment.groupBy({
      by: ["clientId"],
      where: {
        clientId: { in: patientIds },
        status: "COMPLETED",
      },
      _max: { startsAt: true },
    });

    const lastVisitMap = new Map(lastVisits.map((v) => [v.clientId, v._max.startsAt]));

    const result = patients.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone,
      createdAt: p.createdAt,
      totalVisits: p._count.clientAppointments,
      lastVisit: lastVisitMap.get(p.id) ?? null,
    }));

    let filtered = result;

    if (lastVisitFrom) {
      filtered = filtered.filter((p) => p.lastVisit && new Date(p.lastVisit) >= new Date(lastVisitFrom));
    }
    if (lastVisitTo) {
      filtered = filtered.filter((p) => p.lastVisit && new Date(p.lastVisit) <= new Date(lastVisitTo));
    }
    if (minVisits) {
      filtered = filtered.filter((p) => p.totalVisits >= Number(minVisits));
    }

    return reply.send({ patients: filtered, total: filtered.length, page: Number(page), limit: Number(limit) });
  });

  // Get patient detail with history
  app.get("/patients/:id", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const patient = await prisma.user.findFirst({
      where: { id, role: "CLIENT" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        intakeFormCompleted: true,
        createdAt: true,
      },
    });

    if (!patient) {
      return reply.status(404).send({ error: "Patient not found", code: "NOT_FOUND" });
    }

    const [appointments, forms, payments] = await Promise.all([
      prisma.appointment.findMany({
        where: { clientId: id },
        include: {
          treatment: { select: { name: true, priceCents: true } },
          practitioner: { select: { firstName: true, lastName: true } },
        },
        orderBy: { startsAt: "desc" },
      }),
      prisma.intakeForm.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return reply.send({ patient, appointments, forms, payments });
  });

  // Archive / unarchive patient
  app.patch("/patients/:id/archive", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { archived } = request.body as { archived: boolean };
    const patient = await prisma.user.findFirst({ where: { id, role: "CLIENT" } });
    if (!patient) return reply.status(404).send({ error: "Not found" });
    await prisma.user.update({ where: { id }, data: { isArchived: archived } });
    return reply.send({ message: archived ? "Archived" : "Restored" });
  });

  // List archived patients
  app.get("/patients/archived", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { search } = request.query as { search?: string };
    const where: Record<string, unknown> = { role: "CLIENT", isArchived: true };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const patients = await prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ patients });
  });

  // Import patients from CSV data
  app.post("/patients/import", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const schema = z.object({
      patients: z.array(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        dateOfBirth: z.string().optional(),
      })),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });

    const defaultPassword = await bcrypt.hash("Welcome123!", 10);
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const p of parsed.data.patients) {
      try {
        const existing = await prisma.user.findUnique({ where: { email: p.email } });
        if (existing) { results.skipped++; continue; }
        await prisma.user.create({
          data: {
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            phone: p.phone,
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
            passwordHash: defaultPassword,
            role: "CLIENT",
          },
        });
        results.created++;
      } catch {
        results.errors.push(p.email);
      }
    }

    return reply.send(results);
  });
}
