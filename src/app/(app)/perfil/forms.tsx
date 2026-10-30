"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/auth";
import { initialState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui";
import { FormAlert, MaskedInput, SubmitButton, maskValue } from "@/components/ui/client";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action] = useActionState(updateProfileAction, initialState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <Field label="Nome completo" error={state.fieldErrors?.name} required>
        <Input name="name" defaultValue={name} required />
      </Field>
      <Field label="Telefone">
        <MaskedInput mask="phone" name="phone" defaultValue={maskValue("phone", phone)} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <FormAlert state={state} />
      </div>
      <Field label="Senha atual" error={state.fieldErrors?.current}>
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Nova senha" error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirmar nova senha" error={state.fieldErrors?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <div className="sm:col-span-3">
        <SubmitButton>Alterar senha</SubmitButton>
      </div>
    </form>
  );
}
