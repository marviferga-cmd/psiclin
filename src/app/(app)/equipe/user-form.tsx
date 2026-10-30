"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/action-state";
import { initialState } from "@/lib/action-state";
import { PROFESSIONAL_COLORS, ROLE_LABEL } from "@/lib/constants";
import { Field, Input, Select, buttonClass } from "@/components/ui";
import { FormAlert, MaskedInput, SubmitButton, maskValue } from "@/components/ui/client";
import { cn } from "@/lib/utils";

export function UserForm({
  action,
  values,
  isEdit,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: { name?: string; email?: string; role?: string; crp?: string | null; specialty?: string | null; phone?: string | null; color?: string };
  isEdit?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const fe = state.fieldErrors ?? {};
  const [color, setColor] = useState(values.color ?? PROFESSIONAL_COLORS[0]);
  const [role, setRole] = useState(values.role ?? "PSICOLOGO");
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" required error={fe.name}>
          <Input name="name" defaultValue={values.name} required />
        </Field>
        <Field label="Login (usuário ou e-mail)" required error={fe.email}>
          <Input name="email" type="text" autoCapitalize="none" defaultValue={values.email} required />
        </Field>
        <Field label="Perfil de acesso" hint={role === "RECEPCAO" ? "Sem acesso ao prontuário" : role === "ADMIN" ? "Acesso total ao sistema" : "Acessa prontuário dos seus pacientes"}>
          <Select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Telefone">
          <MaskedInput mask="phone" name="phone" defaultValue={maskValue("phone", values.phone)} />
        </Field>
        {role !== "RECEPCAO" && (
          <>
            <Field label="CRP" hint="Ex.: 06/123456">
              <Input name="crp" defaultValue={values.crp ?? ""} />
            </Field>
            <Field label="Especialidade / abordagem">
              <Input name="specialty" defaultValue={values.specialty ?? ""} placeholder="TCC, Psicanálise, Neuropsicologia..." />
            </Field>
          </>
        )}
        <Field label={isEdit ? "Nova senha" : "Senha inicial"} required={!isEdit} error={fe.password} hint={isEdit ? "Deixe em branco para manter a atual" : "Mínimo 8 caracteres, com letras e números"}>
          <Input name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label="Cor na agenda">
          <input type="hidden" name="color" value={color} />
          <div className="flex flex-wrap gap-2">
            {PROFESSIONAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn("h-8 w-8 rounded-full ring-offset-2 transition", color === c && "ring-2 ring-ink-900")}
                style={{ backgroundColor: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
        <Link href="/equipe" className={buttonClass("secondary")}>
          Cancelar
        </Link>
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
