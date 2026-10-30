import type { Metadata } from "next";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { saveDocumentAction } from "@/actions/documents";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import { DocumentForm } from "../document-form";
import { getDocumentPatients } from "../data";

export const metadata: Metadata = { title: "Novo documento" };

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ patientId?: string; type?: string }> }) {
  const user = await requireRole("ADMIN", "PSICOLOGO");
  const sp = await searchParams;
  const [patients, settings] = await Promise.all([getDocumentPatients(user), getSettings()]);
  const back = sp.patientId ? `/pacientes/${sp.patientId}?tab=documentos` : "/documentos";
  return (
    <>
      <PageHeader title="Novo documento" description="Gere a partir de um modelo e personalize o conteúdo." back={{ href: back, label: "Voltar" }} />
      <Card className="mx-auto max-w-4xl p-4 sm:p-6">
        <DocumentForm
          action={saveDocumentAction.bind(null, null)}
          patients={patients}
          ctx={{ psychologist: user.name, crp: user.crp, city: settings.city, date: format(new Date(), "dd/MM/yyyy", { locale: ptBR }) }}
          values={{ patientId: sp.patientId }}
          cancelHref={back}
        />
      </Card>
    </>
  );
}
