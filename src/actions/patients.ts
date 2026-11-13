"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canViewClinical } from "@/lib/permissions";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { isValidCPF, money, onlyDigits, parseDateOnly, str } from "@/lib/utils";

const uuid = z.string().uuid().nullable();

const patientSchema = z.object({
  fullName: z.string({ error: "Informe o nome" }).min(3, "Informe o nome completo"),
  socialName: z.string().nullable(),
  cpf: z
    .string()
    .nullable()
    .refine((v) => !v || isValidCPF(v), "CPF inválido"),
  rg: z.string().nullable(),
  birthDate: z.date().nullable(),
  gender: z.enum(["FEMININO", "MASCULINO", "NAO_BINARIO", "OUTRO", "NAO_INFORMADO"]),
  maritalStatus: z.string().nullable(),
  profession: z.string().nullable(),
  education: z.string().nullable(),
  email: z.string().email("E-mail inválido").nullable(),
  phone: z.string().nullable(),
  phone2: z.string().nullable(),
  zipCode: z.string().nullable(),
  street: z.string().nullable(),
  number: z.string().nullable(),
  complement: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().max(2).nullable(),
  emergencyName: z.string().nullable(),
  emergencyPhone: z.string().nullable(),
  emergencyRelation: z.string().nullable(),
  guardianName: z.string().nullable(),
  guardianCpf: z
    .string()
    .nullable()
    .refine((v) => !v || isValidCPF(v), "CPF inválido"),
  guardianPhone: z.string().nullable(),
  guardianRelation: z.string().nullable(),
  insuranceId: uuid,
  insuranceNumber: z.string().nullable(),
  referralSource: z.string().nullable(),
  sessionPrice: z.number().min(0, "Valor inválido").nullable(),
  status: z.enum(["ATIVO", "INATIVO", "ALTA", "LISTA_ESPERA"]),
  notes: z.string().nullable(),
  psychologistId: uuid,
  lgpdConsent: z.boolean(),
});

function readPatient(form: FormData) {
  const digits = (k: string) => {
    const v = onlyDigits(str(form, k));
    return v || null;
  };
  const birth = str(form, "birthDate");
  return {
    fullName: str(form, "fullName") ?? "",
    socialName: str(form, "socialName"),
    cpf: digits("cpf"),
    rg: str(form, "rg"),
    birthDate: birth ? parseDateOnly(birth) : null,
    gender: (str(form, "gender") ?? "NAO_INFORMADO") as "NAO_INFORMADO",
    maritalStatus: str(form, "maritalStatus"),
    profession: str(form, "profession"),
    education: str(form, "education"),
    email: str(form, "email")?.toLowerCase() ?? null,
    phone: digits("phone"),
    phone2: digits("phone2"),
    zipCode: digits("zipCode"),
    street: str(form, "street"),
    number: str(form, "number"),
    complement: str(form, "complement"),
    district: str(form, "district"),
    city: str(form, "city"),
    state: str(form, "state")?.toUpperCase() ?? null,
    emergencyName: str(form, "emergencyName"),
    emergencyPhone: digits("emergencyPhone"),
    emergencyRelation: str(form, "emergencyRelation"),
    guardianName: str(form, "guardianName"),
    guardianCpf: digits("guardianCpf"),
    guardianPhone: digits("guardianPhone"),
    guardianRelation: str(form, "guardianRelation"),
    insuranceId: str(form, "insuranceId"),
    insuranceNumber: str(form, "insuranceNumber"),
    referralSource: str(form, "referralSource"),
    sessionPrice: money(form, "sessionPrice"),
    status: (str(form, "status") ?? "ATIVO") as "ATIVO",
    notes: str(form, "notes"),
    psychologistId: str(form, "psychologistId"),
    lgpdConsent: form.get("lgpdConsent") === "on",
  };
}

function uniqueError(e: unknown): ActionState | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { error: "Já existe um paciente com este CPF.", fieldErrors: { cpf: "CPF já cadastrado" } };
  }
  return null;
}

export async function createPatientAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = patientSchema.safeParse(readPatient(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const data = parsed.data;
  if (!data.psychologistId && user.role === "PSICOLOGO") data.psychologistId = user.id;

  let id: string;
  try {
    const p = await prisma.patient.create({
      data: { ...data, lgpdConsentAt: data.lgpdConsent ? new Date() : null },
    });
    id = p.id;
  } catch (e) {
    const u = uniqueError(e);
    if (u) return u;
    throw e;
  }
  await audit(user.id, "CRIAR", "patient", id, data.fullName);
  revalidatePath("/pacientes");
  redirect(`/pacientes/${id}?ok=Paciente cadastrado com sucesso`);
}

export async function updatePatientAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = patientSchema.safeParse(readPatient(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const current = await prisma.patient.findUnique({ where: { id }, select: { lgpdConsent: true, lgpdConsentAt: true } });
  if (!current) return { error: "Paciente não encontrado." };
  const data = parsed.data;
  try {
    await prisma.patient.update({
      where: { id },
      data: {
        ...data,
        lgpdConsentAt: data.lgpdConsent ? (current.lgpdConsentAt ?? new Date()) : null,
      },
    });
  } catch (e) {
    const u = uniqueError(e);
    if (u) return u;
    throw e;
  }
  await audit(user.id, "ATUALIZAR", "patient", id, data.fullName);
  revalidatePath(`/pacientes/${id}`);
  redirect(`/pacientes/${id}?ok=Dados atualizados`);
}

export async function deletePatientAction(form: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(form.get("id"));
  const p = await prisma.patient.delete({ where: { id } });
  await audit(user.id, "EXCLUIR", "patient", id, p.fullName);
  revalidatePath("/pacientes");
  redirect("/pacientes?ok=Paciente excluído");
}

export async function setPatientStatusAction(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const status = z.enum(["ATIVO", "INATIVO", "ALTA", "LISTA_ESPERA"]).parse(form.get("status"));
  await prisma.patient.update({ where: { id }, data: { status } });
  await audit(user.id, "STATUS", "patient", id, status);
  revalidatePath(`/pacientes/${id}`);
  redirect(`/pacientes/${id}?ok=Status atualizado`);
}

const ANAMNESIS_FIELDS = [
  "chiefComplaint",
  "historyOfIllness",
  "personalHistory",
  "familyHistory",
  "medicalHistory",
  "medications",
  "previousTreatments",
  "substanceUse",
  "sleepAndDiet",
  "socialAndWork",
  "expectations",
  "observations",
] as const;

export async function saveAnamnesisAction(patientId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { psychologistId: true } });
  if (!patient) return { error: "Paciente não encontrado." };
  const link = await prisma.appointment.count({ where: { patientId, psychologistId: user.id } });
  if (!canViewClinical(user, patient, link > 0)) return { error: "Acesso restrito ao psicólogo responsável." };

  const data = Object.fromEntries(ANAMNESIS_FIELDS.map((k) => [k, str(form, k)])) as Record<
    (typeof ANAMNESIS_FIELDS)[number],
    string | null
  >;
  await prisma.anamnesis.upsert({
    where: { patientId },
    create: { patientId, ...data, updatedById: user.id },
    update: { ...data, updatedById: user.id },
  });
  await audit(user.id, "ATUALIZAR", "anamnesis", patientId);
  revalidatePath(`/pacientes/${patientId}`);
  return { ok: true, message: "Anamnese salva com sucesso." };
}
