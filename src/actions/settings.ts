"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { money, onlyDigits, str } from "@/lib/utils";

const settingsSchema = z.object({
  name: z.string({ required_error: "Informe o nome" }).min(2, "Informe o nome da clínica"),
  legalName: z.string().nullable(),
  cnpj: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email("E-mail inválido").nullable(),
  website: z.string().nullable(),
  zipCode: z.string().nullable(),
  street: z.string().nullable(),
  number: z.string().nullable(),
  complement: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  sessionMinutes: z.number().int().min(10).max(240),
  sessionPrice: z.number().min(0),
  openingHour: z.number().int().min(0).max(23),
  closingHour: z.number().int().min(1).max(24),
});

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = settingsSchema.safeParse({
    name: str(form, "name") ?? undefined,
    legalName: str(form, "legalName"),
    cnpj: onlyDigits(str(form, "cnpj")) || null,
    phone: onlyDigits(str(form, "phone")) || null,
    email: str(form, "email"),
    website: str(form, "website"),
    zipCode: onlyDigits(str(form, "zipCode")) || null,
    street: str(form, "street"),
    number: str(form, "number"),
    complement: str(form, "complement"),
    district: str(form, "district"),
    city: str(form, "city"),
    state: str(form, "state"),
    sessionMinutes: Number(str(form, "sessionMinutes") ?? 50),
    sessionPrice: money(form, "sessionPrice") ?? 0,
    openingHour: Number(str(form, "openingHour") ?? 7),
    closingHour: Number(str(form, "closingHour") ?? 21),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  if (parsed.data.closingHour <= parsed.data.openingHour) {
    return { fieldErrors: { closingHour: "Deve ser após a abertura" }, error: "Horário de funcionamento inválido." };
  }
  const current = await prisma.clinicSettings.findFirst();
  if (current) await prisma.clinicSettings.update({ where: { id: current.id }, data: parsed.data });
  else await prisma.clinicSettings.create({ data: parsed.data });
  await audit(user.id, "ATUALIZAR", "settings", current?.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Configurações salvas." };
}

export async function addRoomAction(form: FormData) {
  const user = await requireRole("ADMIN");
  const name = str(form, "name");
  if (!name) redirect("/configuracoes?tab=salas&erro=Informe o nome da sala");
  const r = await prisma.room.create({ data: { name, description: str(form, "description") } });
  await audit(user.id, "CRIAR", "room", r.id, name);
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=salas&ok=Sala adicionada");
}

export async function toggleRoomAction(form: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(form.get("id"));
  const r = await prisma.room.findUniqueOrThrow({ where: { id } });
  await prisma.room.update({ where: { id }, data: { active: !r.active } });
  await audit(user.id, r.active ? "DESATIVAR" : "ATIVAR", "room", id);
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=salas&ok=Sala atualizada");
}

export async function addInsuranceAction(form: FormData) {
  const user = await requireRole("ADMIN");
  const name = str(form, "name");
  if (!name) redirect("/configuracoes?tab=convenios&erro=Informe o nome do convênio");
  try {
    const i = await prisma.healthInsurance.create({
      data: { name, ansCode: str(form, "ansCode"), phone: onlyDigits(str(form, "phone")) || null, price: money(form, "price") },
    });
    await audit(user.id, "CRIAR", "insurance", i.id, name);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      redirect("/configuracoes?tab=convenios&erro=Convênio já cadastrado");
    }
    throw e;
  }
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=convenios&ok=Convênio adicionado");
}

export async function toggleInsuranceAction(form: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(form.get("id"));
  const i = await prisma.healthInsurance.findUniqueOrThrow({ where: { id } });
  await prisma.healthInsurance.update({ where: { id }, data: { active: !i.active } });
  await audit(user.id, i.active ? "DESATIVAR" : "ATIVAR", "insurance", id);
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=convenios&ok=Convênio atualizado");
}
