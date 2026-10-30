import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/queries";
import { PAYMENT_METHOD } from "@/lib/constants";
import { valorPorExtenso } from "@/lib/extenso";
import { formatCPF, formatCurrency, formatDateOnly, toNumber } from "@/lib/utils";
import { PrintSheet } from "../../print-sheet";

export const metadata: Metadata = { title: "Recibo" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN", "RECEPCAO");
  const { id } = await params;
  const tx = await prisma.transaction
    .findUnique({
      where: { id },
      include: { patient: true, appointment: { include: { psychologist: true } } },
    })
    .catch(() => null);
  if (!tx || tx.type !== "RECEITA") notFound();
  const settings = await getSettings();
  const amount = toNumber(tx.amount);
  const payer = tx.patient?.guardianName && tx.patient.guardianCpf ? { name: tx.patient.guardianName, cpf: tx.patient.guardianCpf, ref: tx.patient.fullName } : tx.patient ? { name: tx.patient.fullName, cpf: tx.patient.cpf, ref: null } : null;
  const psy = tx.appointment?.psychologist ?? (tx.patient?.psychologistId ? await prisma.user.findUnique({ where: { id: tx.patient.psychologistId } }) : null);
  const number = tx.id.slice(0, 8).toUpperCase();

  return (
    <PrintSheet
      settings={settings}
      title={`Recibo nº ${number}`}
      signer={psy ? { name: psy.name, crp: psy.crp } : { name: settings.legalName ?? settings.name, label: "Responsável" }}
      date={tx.paidAt ?? new Date()}
    >
      <div className="mb-8 rounded-lg border-2 border-ink-800 px-6 py-4 text-center font-sans text-2xl font-bold">{formatCurrency(amount)}</div>
      {`Recebi${payer ? ` de ${payer.name}${payer.cpf ? `, CPF ${formatCPF(payer.cpf)},` : ""}` : ""} a importância de ${formatCurrency(amount)} (${valorPorExtenso(amount)}), referente a ${tx.description.replace(/\s—\s.*$/, "").toLowerCase()}${payer?.ref ? `, prestada a ${payer.ref}` : ""}.

Forma de pagamento: ${tx.method ? PAYMENT_METHOD[tx.method] : "—"}.
Data do pagamento: ${tx.paidAt ? tx.paidAt.toLocaleDateString("pt-BR") : formatDateOnly(tx.dueDate)}.

Para clareza, firmo o presente recibo, dando plena quitação do valor acima.`}
    </PrintSheet>
  );
}
