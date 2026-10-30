"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/action-state";
import { initialState } from "@/lib/action-state";
import { MOODS } from "@/lib/constants";
import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/ui/client";

export function NoteForm({
  action,
  values,
  cancelHref,
  appointments,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: { sessionDate: string; mood?: string | null; content?: string; interventions?: string | null; plan?: string | null; appointmentId?: string | null };
  cancelHref: string;
  appointments?: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(action, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Data e hora da sessão" required error={fe.sessionDate}>
          <Input type="datetime-local" name="sessionDate" defaultValue={values.sessionDate} required />
        </Field>
        {appointments && (
          <Field label="Vincular ao agendamento" hint="Marca a sessão como realizada">
            <Select name="appointmentId" defaultValue={values.appointmentId ?? ""}>
              <option value="">Sem vínculo</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Estado emocional observado">
          <Select name="mood" defaultValue={values.mood ?? ""}>
            <option value="">Não informado</option>
            {MOODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Evolução / relato da sessão" required error={fe.content} hint="Descreva de forma objetiva o conteúdo e a evolução observada.">
        <Textarea name="content" rows={10} defaultValue={values.content ?? ""} required invalid={!!fe.content} />
      </Field>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Intervenções e técnicas utilizadas">
          <Textarea name="interventions" rows={4} defaultValue={values.interventions ?? ""} />
        </Field>
        <Field label="Encaminhamentos / plano para próximas sessões">
          <Textarea name="plan" rows={4} defaultValue={values.plan ?? ""} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancelar
        </Link>
        <SubmitButton>Salvar evolução</SubmitButton>
      </div>
    </form>
  );
}
