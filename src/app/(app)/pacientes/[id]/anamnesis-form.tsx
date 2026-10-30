"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";
import { initialState } from "@/lib/action-state";
import { Field, Textarea } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/ui/client";

const FIELDS: { name: string; label: string; hint?: string }[] = [
  { name: "chiefComplaint", label: "Queixa principal", hint: "Motivo da busca por atendimento, nas palavras do paciente." },
  { name: "historyOfIllness", label: "Histórico da queixa", hint: "Início, duração, frequência, fatores desencadeantes." },
  { name: "personalHistory", label: "História pessoal", hint: "Desenvolvimento, infância, eventos marcantes." },
  { name: "familyHistory", label: "Histórico familiar", hint: "Composição familiar, dinâmica, histórico de saúde mental." },
  { name: "medicalHistory", label: "Histórico médico", hint: "Doenças, cirurgias, condições crônicas." },
  { name: "medications", label: "Medicações em uso", hint: "Nome, dosagem e prescritor." },
  { name: "previousTreatments", label: "Tratamentos anteriores", hint: "Psicoterapia, psiquiatria, internações." },
  { name: "substanceUse", label: "Uso de substâncias", hint: "Álcool, tabaco, outras substâncias." },
  { name: "sleepAndDiet", label: "Sono e alimentação" },
  { name: "socialAndWork", label: "Vida social, afetiva e profissional" },
  { name: "expectations", label: "Expectativas com o tratamento" },
  { name: "observations", label: "Observações clínicas / hipóteses" },
];

export function AnamnesisForm({
  action,
  values,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: Partial<Record<string, unknown>>;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <div className="grid gap-5 lg:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.name} label={f.label} hint={f.hint}>
            <Textarea name={f.name} rows={4} defaultValue={(values[f.name] as string | null) ?? ""} />
          </Field>
        ))}
      </div>
      <div className="flex justify-end">
        <SubmitButton>Salvar anamnese</SubmitButton>
      </div>
    </form>
  );
}
