"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";
import { buttonClass } from "./index";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  pendingText = "Salvando...",
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || props.disabled} className={buttonClass(variant, size, className)} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}

/** Formulário com confirmação nativa antes de submeter (ações destrutivas). */
export function ConfirmForm({
  action,
  message,
  children,
  className,
  hidden,
}: {
  action: (fd: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
    </form>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (state.error)
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div>;
  if (state.ok && state.message)
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</div>
    );
  return null;
}

// ─────────── Masks ───────────

const masks = {
  cpf: (d: string) =>
    d
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
  cnpj: (d: string) =>
    d
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2"),
  phone: (d: string) => {
    d = d.slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
  },
  cep: (d: string) => d.slice(0, 8).replace(/(\d{5})(\d{1,3})$/, "$1-$2"),
};

export function MaskedInput({
  mask,
  className,
  invalid,
  ...props
}: ComponentProps<"input"> & { mask: keyof typeof masks; invalid?: boolean }) {
  return (
    <input
      inputMode="numeric"
      className={cn("input", invalid && "input-error", className)}
      {...props}
      onInput={(e) => {
        const el = e.currentTarget;
        el.value = masks[mask](el.value.replace(/\D/g, ""));
      }}
    />
  );
}

export function maskValue(mask: keyof typeof masks, v: string | null | undefined) {
  if (!v) return "";
  return masks[mask](v.replace(/\D/g, ""));
}

// ─────────── Toast (feedback via query string ?ok=...) ───────────

export function Toast({ message, tone = "green" }: { message?: string | null; tone?: "green" | "red" }) {
  const [open, setOpen] = useState(Boolean(message));
  useEffect(() => {
    setOpen(Boolean(message));
    if (!message) return;
    const t = setTimeout(() => setOpen(false), 4000);
    return () => clearTimeout(t);
  }, [message]);
  if (!open || !message) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg",
          tone === "green" ? "bg-ink-900" : "bg-red-600",
        )}
        role="status"
      >
        {message}
        <button onClick={() => setOpen(false)} aria-label="Fechar" className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PrintButton({ label = "Imprimir / Salvar PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className={buttonClass("primary", "md")}>
      {label}
    </button>
  );
}
