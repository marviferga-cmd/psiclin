import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, Printer, Trash2 } from "lucide-react";
import { deleteDocumentAction } from "@/actions/documents";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DOC_TYPE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge, ButtonLink, Card, PageHeader, buttonClass } from "@/components/ui";
import { ConfirmForm } from "@/components/ui/client";

export const metadata: Metadata = { title: "Documento" };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN", "PSICOLOGO");
  const { id } = await params;
  const doc = await prisma.document
    .findUnique({ where: { id }, include: { patient: { select: { id: true, fullName: true } }, psychologist: { select: { name: true, crp: true } } } })
    .catch(() => null);
  if (!doc) notFound();
  if (doc.psychologistId !== user.id && user.role !== "ADMIN") redirect("/documentos?erro=Sem permissão");

  return (
    <>
      <PageHeader
        title={doc.title}
        description={
          <>
            <Link href={`/pacientes/${doc.patient.id}?tab=documentos`} className="text-brand-700 hover:underline">
              {doc.patient.fullName}
            </Link>{" "}
            · {doc.psychologist.name} · {formatDate(doc.createdAt, "dd/MM/yyyy HH:mm")}
          </>
        }
        back={{ href: "/documentos", label: "Documentos" }}
        actions={
          <>
            <Badge tone="violet">{DOC_TYPE[doc.type]}</Badge>
            <ButtonLink href={`/documentos/${id}/editar`} variant="secondary" size="sm">
              <Pencil className="h-4 w-4" /> Editar
            </ButtonLink>
            <Link href={`/imprimir/documento/${id}`} target="_blank" className={buttonClass("primary", "sm")}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Link>
            <ConfirmForm action={deleteDocumentAction} hidden={{ id }} message="Excluir este documento?">
              <button className={buttonClass("ghost", "sm", "text-red-600 hover:bg-red-50")} aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            </ConfirmForm>
          </>
        }
      />
      <Card className="mx-auto max-w-3xl p-6 sm:p-10">
        <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink-800">{doc.content}</div>
      </Card>
    </>
  );
}
