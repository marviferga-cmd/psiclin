"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canViewClinical } from "@/lib/permissions";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { str } from "@/lib/utils";

const docSchema = z.object({
  patientId: z.string({ required_error: "Selecione o paciente" }).uuid("Selecione o paciente"),
  type: z.enum(["ATESTADO", "DECLARACAO", "RECIBO", "RELATORIO", "LAUDO", "ENCAMINHAMENTO", "CONTRATO"]),
  title: z.string({ required_error: "Informe o título" }).min(3, "Informe o título"),
  content: z.string({ required_error: "Informe o conteúdo" }).min(10, "Conteúdo muito curto"),
});

export async function saveDocumentAction(id: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN", "PSICOLOGO");
  const parsed = docSchema.safeParse({
    patientId: str(form, "patientId") ?? undefined,
    type: str(form, "type") ?? "DECLARACAO",
    title: str(form, "title") ?? undefined,
    content: str(form, "content") ?? undefined,
  });
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  const patient = await prisma.patient.findUnique({ where: { id: d.patientId }, select: { psychologistId: true } });
  if (!patient) return { error: "Paciente não encontrado." };
  const link = await prisma.appointment.count({ where: { patientId: d.patientId, psychologistId: user.id } });
  if (!canViewClinical(user, patient, link > 0)) return { error: "Você não é o(a) psicólogo(a) responsável por este paciente." };

  let docId = id;
  if (id) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc || (doc.psychologistId !== user.id && user.role !== "ADMIN")) return { error: "Sem permissão para editar." };
    await prisma.document.update({ where: { id }, data: d });
    await audit(user.id, "ATUALIZAR", "document", id);
  } else {
    const doc = await prisma.document.create({ data: { ...d, psychologistId: user.id } });
    docId = doc.id;
    await audit(user.id, "CRIAR", "document", doc.id, d.type);
  }
  revalidatePath("/documentos");
  redirect(`/documentos/${docId}?ok=Documento salvo`);
}

export async function deleteDocumentAction(form: FormData) {
  const user = await requireRole("ADMIN", "PSICOLOGO");
  const id = String(form.get("id"));
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) redirect("/documentos");
  if (doc.psychologistId !== user.id && user.role !== "ADMIN") redirect(`/documentos/${id}?erro=Sem permissão`);
  await prisma.document.delete({ where: { id } });
  await audit(user.id, "EXCLUIR", "document", id);
  revalidatePath("/documentos");
  redirect("/documentos?ok=Documento excluído");
}
