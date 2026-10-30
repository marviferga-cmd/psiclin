"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { zodErrors, type ActionState } from "@/lib/action-state";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Informe o usuário ou e-mail"),
  password: z.string().min(1, "Informe a senha"),
});

// Proteção simples contra força bruta (por processo).
const attempts = new Map<string, { count: number; until: number }>();

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return zodErrors(parsed.error);
  const { email, password } = parsed.data;

  const lock = attempts.get(email);
  if (lock && lock.count >= 5 && lock.until > Date.now()) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !valid || !user.active) {
    const cur = attempts.get(email);
    attempts.set(email, { count: (cur?.count ?? 0) + 1, until: Date.now() + 10 * 60 * 1000 });
    await audit(user?.id ?? null, "LOGIN_FALHOU", "auth", null, email);
    return { error: user && !user.active ? "Usuário desativado. Procure o administrador." : "Usuário ou senha inválidos." };
  }

  attempts.delete(email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ id: user.id, name: user.name, role: user.role });
  await audit(user.id, "LOGIN", "auth", user.id);

  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "LOGOUT", "auth", user.id);
  await destroySession();
  redirect("/login");
}

const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo"),
  phone: z.string().trim().optional(),
});

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: form.get("name"), phone: form.get("phone") ?? "" });
  if (!parsed.success) return zodErrors(parsed.error);
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });
  return { ok: true, message: "Perfil atualizado." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual"),
    password: z
      .string()
      .min(8, "Mínimo de 8 caracteres")
      .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
      .regex(/\d/, "Inclua ao menos um número"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" });

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const db = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(parsed.data.current, db.passwordHash))) {
    return { fieldErrors: { current: "Senha atual incorreta" }, error: "Verifique os campos destacados." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
  });
  await audit(user.id, "SENHA_ALTERADA", "user", user.id);
  return { ok: true, message: "Senha alterada com sucesso." };
}
