import type { Metadata } from "next";
import { saveTransactionAction } from "@/actions/finance";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayInput } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Novo lançamento" };

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string; patientId?: string }> }) {
  await requireRole("ADMIN", "RECEPCAO");
  const sp = await searchParams;
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } });
  const type = sp.type === "DESPESA" ? "DESPESA" : "RECEITA";
  const back = sp.patientId ? `/pacientes/${sp.patientId}?tab=financeiro` : "/financeiro";
  return (
    <>
      <PageHeader title={type === "RECEITA" ? "Nova receita" : "Nova despesa"} back={{ href: back, label: "Voltar" }} />
      <Card className="mx-auto max-w-2xl p-4 sm:p-6">
        <TransactionForm
          action={saveTransactionAction.bind(null, null)}
          values={{ type, dueDate: todayInput(), patientId: sp.patientId }}
          patients={patients.map((p) => ({ id: p.id, name: p.fullName }))}
          cancelHref={back}
        />
      </Card>
    </>
  );
}
