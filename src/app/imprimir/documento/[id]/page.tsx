import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/queries";
import { PrintSheet } from "../../print-sheet";

export const metadata: Metadata = { title: "Imprimir documento" };

export default async function PrintDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN", "PSICOLOGO");
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id }, include: { psychologist: true } }).catch(() => null);
  if (!doc) notFound();
  if (doc.psychologistId !== user.id && user.role !== "ADMIN") redirect("/documentos?erro=Sem permissão");
  const settings = await getSettings();
  await audit(user.id, "IMPRIMIR", "document", id);
  return (
    <PrintSheet settings={settings} title={doc.title} signer={{ name: doc.psychologist.name, crp: doc.psychologist.crp }} date={doc.createdAt}>
      {doc.content}
    </PrintSheet>
  );
}
