"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/action-state";
import { initialState } from "@/lib/action-state";
import { DOC_TYPE } from "@/lib/constants";
import { DOC_TEMPLATES, type TemplateCtx } from "@/lib/doc-templates";
import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/ui/client";

type DocKey = keyof typeof DOC_TEMPLATES;

export function DocumentForm({
  action,
  patients,
  ctx,
  values,
  cancelHref,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  patients: { id: string; name: string; cpf: string }[];
  ctx: Omit<TemplateCtx, "patient" | "cpf">;
  values: { patientId?: string; type?: DocKey; title?: string; content?: string };
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const fe = state.fieldErrors ?? {};
  const [patientId, setPatientId] = useState(values.patientId ?? "");
  const [type, setType] = useState<DocKey>(values.type ?? "DECLARACAO");
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const isEdit = Boolean(values.content);

  function applyTemplate(nextType: DocKey, nextPatient: string) {
    const p = patients.find((x) => x.id === nextPatient);
    const t = DOC_TEMPLATES[nextType];
    if (titleRef.current) titleRef.current.value = t.title;
    if (contentRef.current) contentRef.current.value = t.body({ ...ctx, patient: p?.name ?? "[nome do paciente]", cpf: p?.cpf || undefined });
  }

  const initialContent =
    values.content ??
    DOC_TEMPLATES[type].body({
      ...ctx,
      patient: patients.find((x) => x.id === patientId)?.name ?? "[nome do paciente]",
      cpf: patients.find((x) => x.id === patientId)?.cpf || undefined,
    });

  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paciente" required error={fe.patientId}>
          <Select
            name="patientId"
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value);
              if (!isEdit) applyTemplate(type, e.target.value);
            }}
          >
            <option value="">Selecione...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo de documento" hint={isEdit ? undefined : "Ao trocar, o modelo é recarregado"}>
          <Select
            name="type"
            value={type}
            onChange={(e) => {
              const t = e.target.value as DocKey;
              setType(t);
              if (!isEdit || window.confirm("Substituir o conteúdo atual pelo modelo?")) applyTemplate(t, patientId);
            }}
          >
            {Object.entries(DOC_TYPE).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Título" required error={fe.title} className="sm:col-span-2">
          <Input ref={titleRef} name="title" defaultValue={values.title ?? DOC_TEMPLATES[type].title} />
        </Field>
      </div>
      <Field label="Conteúdo" required error={fe.content} hint="Substitua os campos entre [colchetes]. O cabeçalho da clínica, a data e a assinatura são adicionados na impressão.">
        <Textarea ref={contentRef} name="content" rows={18} defaultValue={initialContent} className="font-mono text-[13px]" />
      </Field>
      <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancelar
        </Link>
        <SubmitButton>Salvar documento</SubmitButton>
      </div>
    </form>
  );
}
