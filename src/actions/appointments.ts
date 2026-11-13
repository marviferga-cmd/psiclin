"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMinutes, addMonths, addWeeks, format } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { money, str } from "@/lib/utils";

const apptSchema = z.object({
  patientId: z.string({ error: "Selecione o paciente" }).uuid("Selecione o paciente"),
  psychologistId: z.string({ error: "Selecione o profissional" }).uuid("Selecione o profissional"),
  roomId: z.string().uuid().nullable(),
  date: z.string({ error: "Informe a data" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  time: z.string({ error: "Informe o horário" }).regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  duration: z.number().int().min(10, "Mínimo 10 min").max(480, "Máximo 8h"),
  mode: z.enum(["PRESENCIAL", "ONLINE"]),
  sessionType: z.enum(["INDIVIDUAL", "CASAL", "FAMILIA", "GRUPO", "AVALIACAO", "TRIAGEM"]),
  price: z.number().min(0, "Valor inválido"),
  onlineLink: z.string().url("Link inválido").nullable(),
  notes: z.string().nullable(),
  repeat: z.enum(["none", "weekly", "biweekly", "monthly"]),
  occurrences: z.number().int().min(1).max(52, "Máximo de 52 repetições"),
});

function readAppt(form: FormData) {
  return {
    patientId: str(form, "patientId") ?? undefined,
    psychologistId: str(form, "psychologistId") ?? undefined,
    roomId: str(form, "roomId"),
    date: str(form, "date") ?? undefined,
    time: str(form, "time") ?? undefined,
    duration: Number(str(form, "duration") ?? 50),
    mode: (str(form, "mode") ?? "PRESENCIAL") as "PRESENCIAL",
    sessionType: (str(form, "sessionType") ?? "INDIVIDUAL") as "INDIVIDUAL",
    price: money(form, "price") ?? 0,
    onlineLink: str(form, "onlineLink"),
    notes: str(form, "notes"),
    repeat: (str(form, "repeat") ?? "none") as "none",
    occurrences: Number(str(form, "occurrences") ?? 1),
  };
}

const ACTIVE = { notIn: ["CANCELADO", "FALTOU"] as ("CANCELADO" | "FALTOU")[] };

async function findConflict(slot: { start: Date; end: Date }, psychologistId: string, roomId: string | null, ignoreId?: string) {
  return prisma.appointment.findFirst({
    where: {
      id: ignoreId ? { not: ignoreId } : undefined,
      status: ACTIVE,
      startsAt: { lt: slot.end },
      endsAt: { gt: slot.start },
      OR: [{ psychologistId }, ...(roomId ? [{ roomId }] : [])],
    },
    include: { patient: { select: { fullName: true } }, room: { select: { name: true } } },
  });
}

export async function createAppointmentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = apptSchema.safeParse(readAppt(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  const first = new Date(`${d.date}T${d.time}:00`);
  if (Number.isNaN(first.getTime())) return { fieldErrors: { date: "Data inválida" }, error: "Data inválida." };
  const total = d.repeat === "none" ? 1 : d.occurrences;
  const slots = Array.from({ length: total }, (_, i) => {
    const start =
      d.repeat === "weekly" ? addWeeks(first, i) : d.repeat === "biweekly" ? addWeeks(first, i * 2) : d.repeat === "monthly" ? addMonths(first, i) : first;
    return { start, end: addMinutes(start, d.duration) };
  });

  const force = form.get("force") === "on";
  if (!force) {
    for (const slot of slots) {
      const c = await findConflict(slot, d.psychologistId, d.roomId);
      if (c) {
        const who = c.psychologistId === d.psychologistId ? "o profissional já atende" : `a sala ${c.room?.name ?? ""} está ocupada com`;
        return {
          error: `Conflito em ${format(slot.start, "dd/MM/yyyy 'às' HH:mm")}: ${who} ${c.patient.fullName} (${format(c.startsAt, "HH:mm")}–${format(c.endsAt, "HH:mm")}). Marque "Ignorar conflitos" para agendar mesmo assim.`,
        };
      }
    }
  }

  const recurrenceId = total > 1 ? randomUUID() : null;
  await prisma.appointment.createMany({
    data: slots.map((s) => ({
      patientId: d.patientId,
      psychologistId: d.psychologistId,
      roomId: d.mode === "ONLINE" ? null : d.roomId,
      startsAt: s.start,
      endsAt: s.end,
      mode: d.mode,
      sessionType: d.sessionType,
      price: d.price,
      onlineLink: d.mode === "ONLINE" ? d.onlineLink : null,
      notes: d.notes,
      recurrenceId,
      createdById: user.id,
    })),
  });
  await audit(user.id, "CRIAR", "appointment", recurrenceId, `${total} sessão(ões) para paciente ${d.patientId}`);
  revalidatePath("/agenda");
  revalidatePath("/");
  const msg = total > 1 ? `${total} sessões agendadas` : "Sessão agendada";
  redirect(`/agenda?date=${d.date}&ok=${encodeURIComponent(msg)}`);
}

export async function updateAppointmentAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = apptSchema.safeParse({ ...readAppt(form), repeat: "none", occurrences: 1 });
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const start = new Date(`${d.date}T${d.time}:00`);
  const slot = { start, end: addMinutes(start, d.duration) };

  if (form.get("force") !== "on") {
    const c = await findConflict(slot, d.psychologistId, d.mode === "ONLINE" ? null : d.roomId, id);
    if (c) {
      return {
        error: `Conflito de horário com ${c.patient.fullName} (${format(c.startsAt, "dd/MM HH:mm")}–${format(c.endsAt, "HH:mm")}). Marque "Ignorar conflitos" para salvar mesmo assim.`,
      };
    }
  }
  await prisma.appointment.update({
    where: { id },
    data: {
      patientId: d.patientId,
      psychologistId: d.psychologistId,
      roomId: d.mode === "ONLINE" ? null : d.roomId,
      startsAt: slot.start,
      endsAt: slot.end,
      mode: d.mode,
      sessionType: d.sessionType,
      price: d.price,
      onlineLink: d.mode === "ONLINE" ? d.onlineLink : null,
      notes: d.notes,
    },
  });
  await audit(user.id, "ATUALIZAR", "appointment", id);
  revalidatePath("/agenda");
  redirect(`/agenda/${id}?ok=Agendamento atualizado`);
}

const statusSchema = z.enum(["AGENDADO", "CONFIRMADO", "REALIZADO", "FALTOU", "CANCELADO"]);

export async function setAppointmentStatusAction(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const status = statusSchema.parse(form.get("status"));
  const back = String(form.get("back") ?? `/agenda/${id}`);

  const appt = await prisma.appointment.update({
    where: { id },
    data: { status },
    include: { patient: { select: { fullName: true } }, transactions: true },
  });

  // Integração com o financeiro
  const price = Number(appt.price);
  const hasCharge = appt.transactions.some((t) => t.type === "RECEITA" && t.status !== "CANCELADO");
  const charge = status === "REALIZADO" || (status === "FALTOU" && form.get("chargeNoShow") === "on");
  if (charge && price > 0 && !hasCharge) {
    const due = new Date(Date.UTC(appt.startsAt.getFullYear(), appt.startsAt.getMonth(), appt.startsAt.getDate()));
    await prisma.transaction.create({
      data: {
        type: "RECEITA",
        category: "Sessão",
        description: `${status === "FALTOU" ? "Falta não justificada" : "Sessão"} ${format(appt.startsAt, "dd/MM/yyyy HH:mm")} — ${appt.patient.fullName}`,
        amount: appt.price,
        dueDate: due,
        patientId: appt.patientId,
        appointmentId: appt.id,
      },
    });
  }
  if (status === "CANCELADO") {
    await prisma.transaction.updateMany({
      where: { appointmentId: id, status: "PENDENTE" },
      data: { status: "CANCELADO" },
    });
  }

  await audit(user.id, "STATUS", "appointment", id, status);
  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/financeiro");
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}ok=${encodeURIComponent("Status atualizado")}`);
}

export async function cancelSeriesAction(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const appt = await prisma.appointment.findUniqueOrThrow({ where: { id } });
  if (!appt.recurrenceId) redirect(`/agenda/${id}`);
  const res = await prisma.appointment.updateMany({
    where: { recurrenceId: appt.recurrenceId, startsAt: { gte: appt.startsAt }, status: { in: ["AGENDADO", "CONFIRMADO"] } },
    data: { status: "CANCELADO" },
  });
  await audit(user.id, "CANCELAR_SERIE", "appointment", appt.recurrenceId, `${res.count} sessões`);
  revalidatePath("/agenda");
  redirect(`/agenda?date=${format(appt.startsAt, "yyyy-MM-dd")}&ok=${encodeURIComponent(`${res.count} sessões canceladas`)}`);
}

export async function deleteAppointmentAction(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const appt = await prisma.appointment.delete({ where: { id } });
  await audit(user.id, "EXCLUIR", "appointment", id);
  revalidatePath("/agenda");
  redirect(`/agenda?date=${format(appt.startsAt, "yyyy-MM-dd")}&ok=Agendamento excluído`);
}
