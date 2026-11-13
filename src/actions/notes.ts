"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canViewClinical } from "@/lib/permissions";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { str } from "@/lib/utils";

const noteSchema = z.object({
  sessionDate: z.date({ error: "Data inválida" }),
  mood: z.string().nullable(),
  content: z.string({ error: "Descreva a evolução" }).min(10, "Descreva a evolução (mín. 10 caracteres)"),
  interventions: z.string().nullable(),
  plan: z.string().nullable(),
  appointmentId: z.string().uuid().nullable(),
});

function readNote(form: FormData) {
  const d = str(form, "sessionDate");
  return {
    sessionDate: d ? new Date(d) : undefined,
    mood: str(form, "mood"),
    content: str(form, "content") ?? undefined,
    interventions: str(form, "interventions"),
    plan: str(form, "plan"),
    appointmentId: str(form, "appointmentId"),
  };
}

async function assertAccess(userId: string, role: "ADMIN" | "PSICOLOGO" | "RECEPCAO", patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { psychologistId: true } });
  if (!patient) return false;
  const link = await prisma.appointment.count({ where: { patientId, psychologistId: userId } });
  return canViewClinical({ id: userId, role }, patient, link > 0);
}

export async function createNoteAction(patientId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await assertAccess(user.id, user.role, patientId))) return { error: "Acesso restrito ao psicólogo responsável." };
  const parsed = noteSchema.safeParse(readNote(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const data = parsed.data;

  if (data.appointmentId) {
    const exists = await prisma.sessionNote.findUnique({ where: { appointmentId: data.appointmentId } });
    if (exists) return { error: "Esta sessão já possui evolução registrada." };
  }
  const count = await prisma.sessionNote.count({ where: { patientId } });
  const note = await prisma.sessionNote.create({
    data: { ...data, patientId, psychologistId: user.id, sessionNumber: count + 1 },
  });
  if (data.appointmentId) {
    await prisma.appointment.updateMany({
      where: { id: data.appointmentId, status: { in: ["AGENDADO", "CONFIRMADO"] } },
      data: { status: "REALIZADO" },
    });
  }
  await audit(user.id, "CRIAR", "session_note", note.id, `paciente ${patientId}`);
  revalidatePath(`/pacientes/${patientId}`);
  redirect(`/pacientes/${patientId}?tab=evolucoes&ok=Evolução registrada`);
}

export async function updateNoteAction(noteId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const note = await prisma.sessionNote.findUnique({ where: { id: noteId } });
  if (!note) return { error: "Registro não encontrado." };
  if (note.psychologistId !== user.id && user.role !== "ADMIN") {
    return { error: "Somente o(a) autor(a) pode editar esta evolução." };
  }
  const parsed = noteSchema.safeParse({ ...readNote(form), appointmentId: note.appointmentId });
  if (!parsed.success) return zodErrors(parsed.error);
  const { appointmentId: _a, ...data } = parsed.data;
  await prisma.sessionNote.update({ where: { id: noteId }, data });
  await audit(user.id, "ATUALIZAR", "session_note", noteId);
  revalidatePath(`/pacientes/${note.patientId}`);
  redirect(`/pacientes/${note.patientId}?tab=evolucoes&ok=Evolução atualizada`);
}

export async function deleteNoteAction(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const note = await prisma.sessionNote.findUnique({ where: { id } });
  if (!note) redirect("/pacientes");
  if (note.psychologistId !== user.id && user.role !== "ADMIN") {
    redirect(`/pacientes/${note.patientId}?tab=evolucoes&erro=Sem permissão para excluir`);
  }
  await prisma.sessionNote.delete({ where: { id } });
  await audit(user.id, "EXCLUIR", "session_note", id);
  revalidatePath(`/pacientes/${note.patientId}`);
  redirect(`/pacientes/${note.patientId}?tab=evolucoes&ok=Evolução excluída`);
}
