"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { zodErrors, type ActionState } from "@/lib/action-state";
import { money, parseDateOnly, str } from "@/lib/utils";

const METHODS = ["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "TRANSFERENCIA", "BOLETO", "CONVENIO"] as const;

const txSchema = z.object({
  type: z.enum(["RECEITA", "DESPESA"]),
  category: z.string({ error: "Informe a categoria" }).min(1, "Informe a categoria"),
  description: z.string({ error: "Informe a descrição" }).min(2, "Informe a descrição"),
  amount: z.number({ error: "Informe o valor" }).positive("Valor deve ser maior que zero"),
  dueDate: z.date({ error: "Informe o vencimento" }),
  status: z.enum(["PENDENTE", "PAGO", "CANCELADO"]),
  method: z.enum(METHODS).nullable(),
  patientId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
});

function readTx(form: FormData) {
  return {
    type: (str(form, "type") ?? "RECEITA") as "RECEITA",
    category: str(form, "category") ?? undefined,
    description: str(form, "description") ?? undefined,
    amount: money(form, "amount") ?? undefined,
    dueDate: parseDateOnly(str(form, "dueDate")) ?? undefined,
    status: (str(form, "status") ?? "PENDENTE") as "PENDENTE",
    method: str(form, "method") as (typeof METHODS)[number] | null,
    patientId: str(form, "patientId"),
    notes: str(form, "notes"),
  };
}

export async function saveTransactionAction(id: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPCAO");
  const parsed = txSchema.safeParse(readTx(form));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const paidAt = d.status === "PAGO" ? (parseDateOnly(str(form, "paidAt")) ?? new Date()) : null;
  if (id) {
    await prisma.transaction.update({ where: { id }, data: { ...d, paidAt } });
    await audit(user.id, "ATUALIZAR", "transaction", id);
  } else {
    const tx = await prisma.transaction.create({ data: { ...d, paidAt } });
    await audit(user.id, "CRIAR", "transaction", tx.id, `${d.type} ${d.amount}`);
  }
  revalidatePath("/financeiro");
  const back = str(form, "back") ?? "/financeiro";
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent("Lançamento salvo")}`);
}

export async function payTransactionAction(form: FormData) {
  const user = await requireRole("ADMIN", "RECEPCAO");
  const id = String(form.get("id"));
  const method = z.enum(METHODS).parse(form.get("method") ?? "PIX");
  await prisma.transaction.update({ where: { id }, data: { status: "PAGO", method, paidAt: new Date() } });
  await audit(user.id, "BAIXA", "transaction", id, method);
  revalidatePath("/financeiro");
  revalidatePath("/");
  const back = String(form.get("back") ?? "/financeiro");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent("Pagamento registrado")}`);
}

export async function cancelTransactionAction(form: FormData) {
  const user = await requireRole("ADMIN", "RECEPCAO");
  const id = String(form.get("id"));
  await prisma.transaction.update({ where: { id }, data: { status: "CANCELADO" } });
  await audit(user.id, "CANCELAR", "transaction", id);
  revalidatePath("/financeiro");
  const back = String(form.get("back") ?? "/financeiro");
  redirect(`${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent("Lançamento cancelado")}`);
}

export async function deleteTransactionAction(form: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(form.get("id"));
  await prisma.transaction.delete({ where: { id } });
  await audit(user.id, "EXCLUIR", "transaction", id);
  revalidatePath("/financeiro");
  redirect("/financeiro?ok=Lançamento excluído");
}
