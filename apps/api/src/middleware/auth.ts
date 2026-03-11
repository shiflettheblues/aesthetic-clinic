import { FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload | { sub: string; type: string };
    user: JwtPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: "Forbidden", code: "FORBIDDEN" });
    }
  };
}
