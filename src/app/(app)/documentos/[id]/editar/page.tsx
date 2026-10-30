import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { saveDocumentAction } from "@/actions/documents";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import { DocumentForm } from "../../document-form";
import { getDocumentPatients } from "../../data";

export const metadata: Metadata = { title: "Editar documento" };

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN", "PSICOLOGO");
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } }).catch(() => null);
  if (!doc) notFound();
  if (doc.psychologistId !== user.id && user.role !== "ADMIN") redirect("/documentos?erro=Sem permissão");
  const [patients, settings] = await Promise.all([getDocumentPatients(user), getSettings()]);
  return (
    <>
      <PageHeader title="Editar documento" back={{ href: `/documentos/${id}`, label: "Voltar" }} />
      <Card className="mx-auto max-w-4xl p-4 sm:p-6">
        <DocumentForm
          action={saveDocumentAction.bind(null, id)}
          patients={patients}
          ctx={{ psychologist: user.name, crp: user.crp, city: settings.city, date: format(new Date(), "dd/MM/yyyy") }}
          values={{ patientId: doc.patientId, type: doc.type, title: doc.title, content: doc.content }}
          cancelHref={`/documentos/${id}`}
        />
      </Card>
    </>
  );
}
