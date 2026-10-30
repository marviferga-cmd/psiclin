// Assinatura/verificação do token de sessão (compatível com Edge runtime / middleware).
import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "PSICOLOGO" | "RECEPCAO";

export type SessionPayload = {
  userId: string;
  name: string;
  role: Role;
};

export const SESSION_COOKIE = "psiclin_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 horas

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET não configurado");
    }
    return new TextEncoder().encode("psiclin-dev-secret-nao-usar-em-producao");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      name: String(payload.name ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}
