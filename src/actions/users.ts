"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { onlyDigits, str } from "@/lib/utils";

const baseSchema = z.object({
  name: z.string({ error: "Informe o nome" }).min(3, "Informe o nome completo"),
  email: z
    .string({ error: "Informe o usuário ou e-mail" })
    .min(3, "Mínimo de 3 caracteres")
    .regex(/^[a-z0-9._@+-]+$/, "Use apenas letras minúsculas, números e . _ - @"),
  role: z.enum(["ADMIN", "PSICOLOGO", "RECEPCAO"]),
  crp: z.string().nullable(),
  specialty: z.string().nullable(),
  phone: z.string().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
});

const passwordRule = z
  .string({ error: "Informe a senha" })
  .min(8, "Mínimo de 8 caracteres")
  .regex(/[A-Za-z]/, "Inclua letras")
  .regex(/\d/, "Inclua números");

function readUser(form: FormData) {
  return {
    name: str(form, "name") ?? undefined,
    email: str(form, "email")?.toLowerCase() ?? undefined,
    role: (str(form, "role") ?? "PSICOLOGO") as "PSICOLOGO",
    crp: str(form, "crp"),
    specialty: str(form, "specialty"),
    phone: onlyDigits(str(form, "phone")) || null,
    color: str(form, "color") ?? "#0d9488",
  };
}

export async function saveUserAction(id: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = baseSchema.safeParse(readUser(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const data = parsed.data;
  const pwd = str(form, "password");

  try {
    if (id) {
      if (id === admin.id && data.role !== "ADMIN") return { error: "Você não pode remover seu próprio acesso de administrador." };
      let passwordHash: string | undefined;
      if (pwd) {
        const p = passwordRule.safeParse(pwd);
        if (!p.success) return { fieldErrors: { password: p.error.issues[0].message }, error: "Verifique a senha." };
        passwordHash = await bcrypt.hash(pwd, 10);
      }
      await prisma.user.update({ where: { id }, data: { ...data, ...(passwordHash ? { passwordHash } : {}) } });
      await audit(admin.id, "ATUALIZAR", "user", id, data.email);
    } else {
      const p = passwordRule.safeParse(pwd ?? undefined);
      if (!p.success) return { fieldErrors: { password: p.error.issues[0].message }, error: "Verifique a senha." };
      const u = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(p.data, 10) } });
      await audit(admin.id, "CRIAR", "user", u.id, data.email);
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { email: "Login já cadastrado" }, error: "Já existe um usuário com este login." };
    }
    throw e;
  }
  revalidatePath("/equipe");
  redirect("/equipe?ok=Usuário salvo");
}

export async function toggleUserAction(form: FormData) {
  const admin = await requireRole("ADMIN");
  const id = String(form.get("id"));
  if (id === admin.id) redirect("/equipe?erro=Você não pode desativar a si mesmo");
  const u = await prisma.user.findUniqueOrThrow({ where: { id } });
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  await audit(admin.id, u.active ? "DESATIVAR" : "ATIVAR", "user", id, u.email);
  revalidatePath("/equipe");
  redirect(`/equipe?ok=${encodeURIComponent(u.active ? "Usuário desativado" : "Usuário reativado")}`);
}
