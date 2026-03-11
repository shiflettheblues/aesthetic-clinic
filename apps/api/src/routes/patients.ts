import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

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

    const where: Record<string, unknown> = { role: "CLIENT" };
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
}
