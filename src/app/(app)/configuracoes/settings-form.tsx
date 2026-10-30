"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/actions/settings";
import { initialState } from "@/lib/action-state";
import { UF } from "@/lib/constants";
import { Field, FormSection, Input, Select } from "@/components/ui";
import { FormAlert, MaskedInput, SubmitButton, maskValue } from "@/components/ui/client";

export function SettingsForm({ values }: { values: Record<string, string | number | null> }) {
  const [state, action] = useActionState(saveSettingsAction, initialState);
  const fe = state.fieldErrors ?? {};
  const v = (k: string) => (values[k] ?? "") as string;
  return (
    <form action={action}>
      <div className="mb-4">
        <FormAlert state={state} />
      </div>
      <FormSection title="Dados da clínica" description="Aparecem no cabeçalho de documentos e recibos.">
        <Field label="Nome fantasia" required error={fe.name} className="sm:col-span-2 xl:col-span-3">
          <Input name="name" defaultValue={v("name")} required />
        </Field>
        <Field label="Razão social" className="sm:col-span-2 xl:col-span-3">
          <Input name="legalName" defaultValue={v("legalName")} />
        </Field>
        <Field label="CNPJ" className="xl:col-span-2">
          <MaskedInput mask="cnpj" name="cnpj" defaultValue={maskValue("cnpj", v("cnpj"))} />
        </Field>
        <Field label="Telefone" className="xl:col-span-2">
          <MaskedInput mask="phone" name="phone" defaultValue={maskValue("phone", v("phone"))} />
        </Field>
        <Field label="E-mail" error={fe.email} className="xl:col-span-2">
          <Input name="email" type="email" defaultValue={v("email")} />
        </Field>
        <Field label="Site / Instagram" className="sm:col-span-2 xl:col-span-6">
          <Input name="website" defaultValue={v("website")} />
        </Field>
      </FormSection>
      <FormSection title="Endereço">
        <Field label="CEP" className="xl:col-span-2">
          <MaskedInput mask="cep" name="zipCode" defaultValue={maskValue("cep", v("zipCode"))} />
        </Field>
        <Field label="Logradouro" className="sm:col-span-2 xl:col-span-3">
          <Input name="street" defaultValue={v("street")} />
        </Field>
        <Field label="Número" className="xl:col-span-1">
          <Input name="number" defaultValue={v("number")} />
        </Field>
        <Field label="Complemento" className="xl:col-span-2">
          <Input name="complement" defaultValue={v("complement")} />
        </Field>
        <Field label="Bairro" className="xl:col-span-2">
          <Input name="district" defaultValue={v("district")} />
        </Field>
        <Field label="Cidade" className="xl:col-span-1">
          <Input name="city" defaultValue={v("city")} />
        </Field>
        <Field label="UF" className="xl:col-span-1">
          <Select name="state" defaultValue={v("state")}>
            <option value="">—</option>
            {UF.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
        </Field>
      </FormSection>
      <FormSection title="Atendimento" description="Valores padrão usados em novos agendamentos.">
        <Field label="Duração padrão (min)" className="xl:col-span-2">
          <Input name="sessionMinutes" type="number" min={10} max={240} defaultValue={v("sessionMinutes")} />
        </Field>
        <Field label="Valor padrão da sessão (R$)" className="xl:col-span-2">
          <Input name="sessionPrice" inputMode="decimal" defaultValue={v("sessionPrice")} />
        </Field>
        <Field label="Abertura" className="xl:col-span-1">
          <Select name="openingHour" defaultValue={v("openingHour")}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fechamento" error={fe.closingHour} className="xl:col-span-1">
          <Select name="closingHour" defaultValue={v("closingHour")}>
            {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </Select>
        </Field>
      </FormSection>
      <div className="flex justify-end pt-4">
        <SubmitButton>Salvar configurações</SubmitButton>
      </div>
    </form>
  );
}
