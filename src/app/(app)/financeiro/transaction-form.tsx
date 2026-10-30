"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/action-state";
import { initialState } from "@/lib/action-state";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHOD } from "@/lib/constants";
import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

export type TxValues = {
  type: "RECEITA" | "DESPESA";
  category?: string;
  description?: string;
  amount?: string;
  dueDate?: string;
  status?: string;
  method?: string | null;
  paidAt?: string;
  patientId?: string | null;
  notes?: string | null;
};

export function TransactionForm({
  action,
  values,
  patients,
  cancelHref,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: TxValues;
  patients: { id: string; name: string }[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const fe = state.fieldErrors ?? {};
  const [type, setType] = useState(values.type);
  const [status, setStatus] = useState(values.status ?? "PENDENTE");
  const categories = type === "RECEITA" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <input type="hidden" name="back" value={cancelHref} />
      <div className="grid grid-cols-2 gap-2">
        {(["RECEITA", "DESPESA"] as const).map((t) => (
          <label
            key={t}
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition",
              type === t
                ? t === "RECEITA"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-red-500 bg-red-50 text-red-700"
                : "border-ink-200 text-ink-600 hover:bg-ink-50",
            )}
          >
            <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
            {t === "RECEITA" ? "Receita" : "Despesa"}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" required error={fe.description} className="sm:col-span-2">
          <Input name="description" defaultValue={values.description} required />
        </Field>
        <Field label="Categoria" required error={fe.category}>
          <Select name="category" defaultValue={values.category ?? categories[0]} key={type}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
            {values.category && !categories.includes(values.category) && <option>{values.category}</option>}
          </Select>
        </Field>
        <Field label="Valor (R$)" required error={fe.amount}>
          <Input name="amount" inputMode="decimal" defaultValue={values.amount} placeholder="0,00" required />
        </Field>
        <Field label="Vencimento" required error={fe.dueDate}>
          <Input type="date" name="dueDate" defaultValue={values.dueDate} required />
        </Field>
        <Field label="Status">
          <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="CANCELADO">Cancelado</option>
          </Select>
        </Field>
        {status === "PAGO" && (
          <>
            <Field label="Data do pagamento">
              <Input type="date" name="paidAt" defaultValue={values.paidAt} />
            </Field>
            <Field label="Forma de pagamento">
              <Select name="method" defaultValue={values.method ?? "PIX"}>
                {Object.entries(PAYMENT_METHOD).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        {type === "RECEITA" && (
          <Field label="Paciente" className="sm:col-span-2">
            <Select name="patientId" defaultValue={values.patientId ?? ""}>
              <option value="">Não vinculado</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Observações" className="sm:col-span-2">
          <Textarea name="notes" rows={2} defaultValue={values.notes ?? ""} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancelar
        </Link>
        <SubmitButton>Salvar lançamento</SubmitButton>
      </div>
    </form>
  );
}
