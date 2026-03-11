import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { authenticate } from "../middleware/auth.js";
import type { JwtPayload } from "../middleware/auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { email, password, firstName, lastName, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({
        error: "Email already registered",
        code: "EMAIL_EXISTS",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: "CLIENT",
      },
    });

    const accessToken = app.jwt.sign(
      { sub: user.id, role: user.role, email: user.email } satisfies JwtPayload,
      { expiresIn: "15m" }
    );

    const refreshToken = app.jwt.sign(
      { sub: user.id, type: "refresh" },
      { expiresIn: "30d" }
    );

    // Store refresh token in Redis (30 days TTL)
    await redis.set(`refresh:${user.id}:${refreshToken}`, "1", "EX", 30 * 24 * 60 * 60);

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  });

  // Login
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    const accessToken = app.jwt.sign(
      { sub: user.id, role: user.role, email: user.email } satisfies JwtPayload,
      { expiresIn: "15m" }
    );

    const refreshToken = app.jwt.sign(
      { sub: user.id, type: "refresh" },
      { expiresIn: "30d" }
    );

    await redis.set(`refresh:${user.id}:${refreshToken}`, "1", "EX", 30 * 24 * 60 * 60);

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  });

  // Refresh token
  app.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.status(400).send({
        error: "Refresh token required",
        code: "MISSING_REFRESH_TOKEN",
      });
    }

    try {
      const decoded = app.jwt.verify<{ sub: string; type: string }>(refreshToken);
      if (decoded.type !== "refresh") {
        return reply.status(401).send({ error: "Invalid token type", code: "INVALID_TOKEN" });
      }

      // Check if refresh token is still valid in Redis
      const stored = await redis.get(`refresh:${decoded.sub}:${refreshToken}`);
      if (!stored) {
        return reply.status(401).send({ error: "Token revoked", code: "TOKEN_REVOKED" });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        return reply.status(401).send({ error: "User not found", code: "USER_NOT_FOUND" });
      }

      const accessToken = app.jwt.sign(
        { sub: user.id, role: user.role, email: user.email } satisfies JwtPayload,
        { expiresIn: "15m" }
      );

      return reply.send({ accessToken });
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token", code: "INVALID_TOKEN" });
    }
  });

  // Logout
  app.post("/auth/logout", { preHandler: authenticate }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (refreshToken) {
      await redis.del(`refresh:${request.user.sub}:${refreshToken}`);
    }
    return reply.send({ message: "Logged out" });
  });

  // Get current user
  app.get("/auth/me", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        dateOfBirth: true,
        intakeFormCompleted: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found", code: "USER_NOT_FOUND" });
    }

    return reply.send({ user });
  });
}
