"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { initialState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/ui/client";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormAlert state={state} />
      <Field label="Usuário ou e-mail" error={state.fieldErrors?.email} htmlFor="email">
        <Input id="email" name="email" type="text" autoCapitalize="none" autoComplete="username" required autoFocus invalid={!!state.fieldErrors?.email} />
      </Field>
      <Field label="Senha" error={state.fieldErrors?.password} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Entrando...">
        Entrar
      </SubmitButton>
    </form>
  );
}
