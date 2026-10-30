import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cancelTransactionAction, deleteTransactionAction, saveTransactionAction } from "@/actions/finance";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateOnlyToInput, formatDate, toNumber } from "@/lib/utils";
import { isAdmin } from "@/lib/permissions";
import { Card, CardHeader, PageHeader, buttonClass } from "@/components/ui";
import { ConfirmForm } from "@/components/ui/client";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Lançamento" };

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN", "RECEPCAO");
  const { id } = await params;
  const tx = await prisma.transaction.findUnique({ where: { id } }).catch(() => null);
  if (!tx) notFound();
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } });

  return (
    <>
      <PageHeader
        title="Lançamento financeiro"
        description={`Criado em ${formatDate(tx.createdAt, "dd/MM/yyyy HH:mm")}`}
        back={{ href: "/financeiro", label: "Financeiro" }}
        actions={
          tx.status === "PAGO" && tx.type === "RECEITA" ? (
            <Link href={`/imprimir/recibo/${tx.id}`} target="_blank" className={buttonClass("secondary", "sm")}>
              Emitir recibo
            </Link>
          ) : null
        }
      />
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-4 sm:p-6">
          <TransactionForm
            action={saveTransactionAction.bind(null, id)}
            values={{
              type: tx.type,
              category: tx.category,
              description: tx.description,
              amount: toNumber(tx.amount).toFixed(2).replace(".", ","),
              dueDate: dateOnlyToInput(tx.dueDate),
              status: tx.status,
              method: tx.method,
              paidAt: tx.paidAt ? formatDate(tx.paidAt, "yyyy-MM-dd") : "",
              patientId: tx.patientId,
              notes: tx.notes,
            }}
            patients={patients.map((p) => ({ id: p.id, name: p.fullName }))}
            cancelHref="/financeiro"
          />
        </Card>
        <Card>
          <CardHeader title="Ações" />
          <div className="flex flex-wrap gap-2 p-5">
            {tx.status !== "CANCELADO" && (
              <ConfirmForm action={cancelTransactionAction} hidden={{ id, back: "/financeiro" }} message="Cancelar este lançamento?">
                <button className={buttonClass("secondary", "sm")}>Cancelar lançamento</button>
              </ConfirmForm>
            )}
            {isAdmin(user) && (
              <ConfirmForm action={deleteTransactionAction} hidden={{ id }} message="Excluir definitivamente este lançamento?">
                <button className={buttonClass("ghost", "sm", "text-red-600 hover:bg-red-50")}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </ConfirmForm>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
