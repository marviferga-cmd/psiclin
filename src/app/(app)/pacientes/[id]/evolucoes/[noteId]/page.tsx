import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { updateNoteAction } from "@/actions/notes";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayName, toDateTimeInput } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { NoteForm } from "../note-form";

export const metadata: Metadata = { title: "Editar evolução" };

export default async function EditNotePage({ params }: { params: Promise<{ id: string; noteId: string }> }) {
  const user = await requireUser();
  const { id, noteId } = await params;
  const note = await prisma.sessionNote.findUnique({ where: { id: noteId }, include: { patient: true } }).catch(() => null);
  if (!note || note.patientId !== id) notFound();
  if (note.psychologistId !== user.id && user.role !== "ADMIN") redirect(`/pacientes/${id}?tab=evolucoes&erro=Somente o autor pode editar`);

  return (
    <>
      <PageHeader
        title={`Editar evolução · Sessão nº ${note.sessionNumber ?? ""}`}
        description={displayName(note.patient)}
        back={{ href: `/pacientes/${id}?tab=evolucoes`, label: "Prontuário" }}
      />
      <Card className="p-4 sm:p-6">
        <NoteForm
          action={updateNoteAction.bind(null, noteId)}
          cancelHref={`/pacientes/${id}?tab=evolucoes`}
          values={{
            sessionDate: toDateTimeInput(note.sessionDate),
            mood: note.mood,
            content: note.content,
            interventions: note.interventions,
            plan: note.plan,
          }}
        />
      </Card>
    </>
  );
}
