"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { ActionState } from "@/lib/action-state";
import { initialState } from "@/lib/action-state";
import { EDUCATION, GENDER_LABEL, MARITAL, PATIENT_STATUS, UF } from "@/lib/constants";
import { Field, FormSection, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { FormAlert, MaskedInput, SubmitButton, maskValue } from "@/components/ui/client";

export type PatientFormValues = Partial<Record<string, string | boolean | null>>;

type Option = { id: string; name: string };

export function PatientForm({
  action,
  values = {},
  psychologists,
  insurances,
  cancelHref,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values?: PatientFormValues;
  psychologists: Option[];
  insurances: Option[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [isMinor, setIsMinor] = useState(() => {
    const b = values.birthDate as string | undefined;
    if (!b) return false;
    const age = (Date.now() - new Date(b).getTime()) / (365.25 * 24 * 3600 * 1000);
    return age < 18;
  });
  const fe = state.fieldErrors ?? {};
  const v = (k: string) => (values[k] as string | null | undefined) ?? "";

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8 || !formRef.current) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) return;
      const set = (name: string, value: string) => {
        const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        if (el && value) el.value = value;
      };
      set("street", data.logradouro);
      set("district", data.bairro);
      set("city", data.localidade);
      set("state", data.uf);
      (formRef.current.elements.namedItem("number") as HTMLInputElement | null)?.focus();
    } catch {
      // Sem conexão com o ViaCEP: preenchimento manual.
    } finally {
      setCepLoading(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2" noValidate>
      {state.error && (
        <div className="mb-4">
          <FormAlert state={state} />
        </div>
      )}

      <FormSection title="Identificação" description="Dados pessoais do paciente.">
        <Field label="Nome completo" required error={fe.fullName} className="sm:col-span-2 xl:col-span-4">
          <Input name="fullName" defaultValue={v("fullName")} required invalid={!!fe.fullName} />
        </Field>
        <Field label="Nome social" className="xl:col-span-2" hint="Como prefere ser chamado(a)">
          <Input name="socialName" defaultValue={v("socialName")} />
        </Field>
        <Field label="CPF" error={fe.cpf} className="xl:col-span-2">
          <MaskedInput mask="cpf" name="cpf" defaultValue={maskValue("cpf", v("cpf"))} placeholder="000.000.000-00" invalid={!!fe.cpf} />
        </Field>
        <Field label="RG" className="xl:col-span-2">
          <Input name="rg" defaultValue={v("rg")} />
        </Field>
        <Field label="Data de nascimento" className="xl:col-span-2">
          <Input
            name="birthDate"
            type="date"
            defaultValue={v("birthDate")}
            onChange={(e) => {
              const age = (Date.now() - new Date(e.target.value).getTime()) / (365.25 * 24 * 3600 * 1000);
              setIsMinor(age < 18);
            }}
          />
        </Field>
        <Field label="Gênero" className="xl:col-span-2">
          <Select name="gender" defaultValue={v("gender") || "NAO_INFORMADO"}>
            {Object.entries(GENDER_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado civil" className="xl:col-span-2">
          <Select name="maritalStatus" defaultValue={v("maritalStatus")}>
            <option value="">Selecione</option>
            {MARITAL.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Escolaridade" className="xl:col-span-2">
          <Select name="education" defaultValue={v("education")}>
            <option value="">Selecione</option>
            {EDUCATION.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Profissão" className="sm:col-span-2 xl:col-span-3">
          <Input name="profession" defaultValue={v("profession")} />
        </Field>
        <Field label="Como conheceu a clínica / encaminhamento" className="sm:col-span-2 xl:col-span-3">
          <Input name="referralSource" defaultValue={v("referralSource")} placeholder="Indicação, Instagram, médico..." />
        </Field>
      </FormSection>

      <FormSection title="Contato" description="Telefones, e-mail e endereço.">
        <Field label="Celular / WhatsApp" className="xl:col-span-2">
          <MaskedInput mask="phone" name="phone" defaultValue={maskValue("phone", v("phone"))} placeholder="(00) 00000-0000" />
        </Field>
        <Field label="Telefone alternativo" className="xl:col-span-2">
          <MaskedInput mask="phone" name="phone2" defaultValue={maskValue("phone", v("phone2"))} />
        </Field>
        <Field label="E-mail" error={fe.email} className="sm:col-span-2 xl:col-span-2">
          <Input name="email" type="email" defaultValue={v("email")} invalid={!!fe.email} />
        </Field>
        <Field label="CEP" hint={cepLoading ? "Buscando endereço..." : "Preenche o endereço automaticamente"} className="xl:col-span-2">
          <MaskedInput mask="cep" name="zipCode" defaultValue={maskValue("cep", v("zipCode"))} onBlur={(e) => lookupCep(e.target.value)} placeholder="00000-000" />
        </Field>
        <Field label="Logradouro" className="sm:col-span-2 xl:col-span-4">
          <Input name="street" defaultValue={v("street")} />
        </Field>
        <Field label="Número" className="xl:col-span-1">
          <Input name="number" defaultValue={v("number")} />
        </Field>
        <Field label="Complemento" className="xl:col-span-2">
          <Input name="complement" defaultValue={v("complement")} />
        </Field>
        <Field label="Bairro" className="xl:col-span-3">
          <Input name="district" defaultValue={v("district")} />
        </Field>
        <Field label="Cidade" className="xl:col-span-4">
          <Input name="city" defaultValue={v("city")} />
        </Field>
        <Field label="UF" className="xl:col-span-2">
          <Select name="state" defaultValue={v("state")}>
            <option value="">—</option>
            {UF.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
        </Field>
      </FormSection>

      <FormSection title="Contato de emergência">
        <Field label="Nome" className="sm:col-span-2 xl:col-span-3">
          <Input name="emergencyName" defaultValue={v("emergencyName")} />
        </Field>
        <Field label="Telefone" className="xl:col-span-2">
          <MaskedInput mask="phone" name="emergencyPhone" defaultValue={maskValue("phone", v("emergencyPhone"))} />
        </Field>
        <Field label="Parentesco" className="xl:col-span-1">
          <Input name="emergencyRelation" defaultValue={v("emergencyRelation")} />
        </Field>
      </FormSection>

      <FormSection
        title="Responsável legal"
        description={isMinor ? "Paciente menor de idade — preenchimento recomendado." : "Obrigatório para menores de idade."}
      >
        <Field label="Nome do responsável" className="sm:col-span-2 xl:col-span-3">
          <Input name="guardianName" defaultValue={v("guardianName")} />
        </Field>
        <Field label="CPF do responsável" error={fe.guardianCpf} className="xl:col-span-3">
          <MaskedInput mask="cpf" name="guardianCpf" defaultValue={maskValue("cpf", v("guardianCpf"))} invalid={!!fe.guardianCpf} />
        </Field>
        <Field label="Telefone" className="xl:col-span-3">
          <MaskedInput mask="phone" name="guardianPhone" defaultValue={maskValue("phone", v("guardianPhone"))} />
        </Field>
        <Field label="Parentesco" className="xl:col-span-3">
          <Input name="guardianRelation" defaultValue={v("guardianRelation")} placeholder="Mãe, pai, tutor..." />
        </Field>
      </FormSection>

      <FormSection title="Atendimento" description="Profissional responsável, convênio e valores.">
        <Field label="Psicólogo(a) responsável" className="sm:col-span-2 xl:col-span-3">
          <Select name="psychologistId" defaultValue={v("psychologistId")}>
            <option value="">Não definido</option>
            {psychologists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Situação" className="xl:col-span-3">
          <Select name="status" defaultValue={v("status") || "ATIVO"}>
            {Object.entries(PATIENT_STATUS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Convênio" className="xl:col-span-2">
          <Select name="insuranceId" defaultValue={v("insuranceId")}>
            <option value="">Particular</option>
            {insurances.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nº da carteirinha" className="xl:col-span-2">
          <Input name="insuranceNumber" defaultValue={v("insuranceNumber")} />
        </Field>
        <Field label="Valor da sessão (R$)" error={fe.sessionPrice} hint="Em branco: valor padrão da clínica" className="xl:col-span-2">
          <Input name="sessionPrice" inputMode="decimal" defaultValue={v("sessionPrice")} placeholder="0,00" />
        </Field>
        <Field label="Observações administrativas" className="sm:col-span-2 xl:col-span-6" hint="Não registre informações clínicas aqui — use o prontuário.">
          <Textarea name="notes" defaultValue={v("notes")} rows={3} />
        </Field>
      </FormSection>

      <FormSection title="LGPD" description="Consentimento para tratamento de dados pessoais sensíveis (Lei 13.709/2018).">
        <label className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50/50 p-4 text-sm sm:col-span-2 xl:col-span-6">
          <input
            type="checkbox"
            name="lgpdConsent"
            defaultChecked={Boolean(values.lgpdConsent)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            O paciente (ou responsável legal) autorizou o tratamento de seus dados pessoais e de saúde para fins de
            prestação de serviços psicológicos, mantidos sob sigilo profissional.
          </span>
        </label>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancelar
        </Link>
        <SubmitButton>Salvar paciente</SubmitButton>
      </div>
    </form>
  );
}
