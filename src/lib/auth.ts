import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type Role } from "./session-token";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  crp: string | null;
  color: string;
};

export async function createSession(user: { id: string; name: string; role: Role }) {
  const token = await signSession({ userId: user.id, name: user.name, role: user.role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Usuário logado (validado no banco a cada requisição, deduplicado por request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, crp: true, color: true, active: true },
  });
  if (!user || !user.active) return null;
  const { active: _active, ...rest } = user;
  return rest;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/?erro=acesso-negado");
  return user;
}
