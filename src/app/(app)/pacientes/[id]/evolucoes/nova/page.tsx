import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createNoteAction } from "@/actions/notes";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canViewClinical } from "@/lib/permissions";
import { displayName, formatDate, toDateTimeInput } from "@/lib/utils";
import { Badge, Card, PageHeader } from "@/components/ui";
import { NoteForm } from "../note-form";

export const metadata: Metadata = { title: "Nova evolução" };

export default async function NewNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { appointmentId } = await searchParams;
  const patient = await prisma.patient.findUnique({ where: { id } }).catch(() => null);
  if (!patient) notFound();
  const link = await prisma.appointment.count({ where: { patientId: id, psychologistId: user.id } });
  if (!canViewClinical(user, patient, link > 0)) redirect(`/pacientes/${id}?erro=Acesso restrito ao psicólogo responsável`);

  const pending = await prisma.appointment.findMany({
    where: { patientId: id, sessionNote: null, status: { not: "CANCELADO" }, startsAt: { lte: new Date(Date.now() + 86400000) } },
    orderBy: { startsAt: "desc" },
    take: 20,
  });
  const selected = pending.find((a) => a.id === appointmentId) ?? null;

  return (
    <>
      <PageHeader
        title="Nova evolução"
        description={displayName(patient)}
        back={{ href: `/pacientes/${id}?tab=evolucoes`, label: "Prontuário" }}
        actions={<Badge tone="violet">Conteúdo sigiloso</Badge>}
      />
      <Card className="p-4 sm:p-6">
        <NoteForm
          action={createNoteAction.bind(null, id)}
          cancelHref={`/pacientes/${id}?tab=evolucoes`}
          values={{ sessionDate: toDateTimeInput(selected?.startsAt ?? new Date()), appointmentId: selected?.id ?? pending[0]?.id ?? null }}
          appointments={pending.map((a) => ({ id: a.id, label: formatDate(a.startsAt, "dd/MM/yyyy HH:mm") }))}
        />
      </Card>
    </>
  );
}
