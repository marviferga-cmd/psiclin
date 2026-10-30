"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Search } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { initialState } from "@/lib/action-state";
import { SESSION_TYPE } from "@/lib/constants";
import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { FormAlert, SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

export type PatientOption = { id: string; name: string; doc: string; price: number | null; psychologistId: string | null };

export type AppointmentValues = {
  patientId?: string;
  psychologistId?: string;
  roomId?: string | null;
  date?: string;
  time?: string;
  duration?: number;
  mode?: string;
  sessionType?: string;
  price?: number;
  onlineLink?: string | null;
  notes?: string | null;
};

function PatientPicker({
  patients,
  value,
  onChange,
  error,
}: {
  patients: PatientOption[];
  value: string;
  onChange: (p: PatientOption) => void;
  error?: string;
}) {
  const selected = patients.find((p) => p.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? patients.filter((p) => p.name.toLowerCase().includes(q) || p.doc.includes(q.replace(/\D/g, "") || "~")) : patients;
    return list.slice(0, 50);
  }, [patients, query]);

  return (
    <div className="relative">
      <input type="hidden" name="patientId" value={value} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          ref={inputRef}
          className={cn("input pl-9", error && "input-error")}
          placeholder={selected ? selected.name : "Digite para buscar o paciente..."}
          value={open ? query : (selected?.name ?? "")}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-ink-500">Nenhum paciente encontrado</li>}
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                  inputRef.current?.blur();
                }}
              >
                <span>{p.name}</span>
                {p.id === value && <Check className="h-4 w-4 text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AppointmentForm({
  action,
  values,
  patients,
  psychologists,
  rooms,
  defaultPrice,
  defaultDuration,
  isEdit,
  cancelHref,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  values: AppointmentValues;
  patients: PatientOption[];
  psychologists: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  defaultPrice: number;
  defaultDuration: number;
  isEdit?: boolean;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const fe = state.fieldErrors ?? {};
  const [patientId, setPatientId] = useState(values.patientId ?? "");
  const [psychologistId, setPsychologistId] = useState(values.psychologistId ?? psychologists[0]?.id ?? "");
  const [mode, setMode] = useState(values.mode ?? "PRESENCIAL");
  const [price, setPrice] = useState(
    (values.price ?? patients.find((p) => p.id === values.patientId)?.price ?? defaultPrice).toFixed(2).replace(".", ","),
  );
  const [repeat, setRepeat] = useState("none");

  return (
    <form action={formAction} className="space-y-6">
      <FormAlert state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paciente" required error={fe.patientId} className="sm:col-span-2">
          <PatientPicker
            patients={patients}
            value={patientId}
            error={fe.patientId}
            onChange={(p) => {
              setPatientId(p.id);
              if (p.price !== null) setPrice(p.price.toFixed(2).replace(".", ","));
              if (p.psychologistId && !isEdit) setPsychologistId(p.psychologistId);
            }}
          />
          {patients.length === 0 && (
            <p className="mt-1 text-xs text-ink-500">
              Nenhum paciente ativo. <Link className="text-brand-700 underline" href="/pacientes/novo">Cadastre um paciente</Link>.
            </p>
          )}
        </Field>

        <Field label="Profissional" required error={fe.psychologistId}>
          <Select name="psychologistId" value={psychologistId} onChange={(e) => setPsychologistId(e.target.value)}>
            {psychologists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo de sessão">
          <Select name="sessionType" defaultValue={values.sessionType ?? "INDIVIDUAL"}>
            {Object.entries(SESSION_TYPE).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Data" required error={fe.date}>
          <Input type="date" name="date" defaultValue={values.date} required />
        </Field>
        <Field label="Horário" required error={fe.time}>
          <Input type="time" name="time" defaultValue={values.time} required step={300} />
        </Field>
        <Field label="Duração (min)" error={fe.duration}>
          <Input type="number" name="duration" min={10} max={480} step={5} defaultValue={values.duration ?? defaultDuration} />
        </Field>
        <Field label="Valor (R$)" error={fe.price}>
          <Input name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Modalidade">
          <div className="grid grid-cols-2 gap-2">
            {(["PRESENCIAL", "ONLINE"] as const).map((m) => (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition",
                  mode === m ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
                )}
              >
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                {m === "PRESENCIAL" ? "Presencial" : "Online"}
              </label>
            ))}
          </div>
        </Field>
        {mode === "PRESENCIAL" ? (
          <Field label="Sala">
            <Select name="roomId" defaultValue={values.roomId ?? ""}>
              <option value="">Sem sala definida</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Link da videochamada" error={fe.onlineLink}>
            <Input name="onlineLink" type="url" placeholder="https://meet.google.com/..." defaultValue={values.onlineLink ?? ""} />
          </Field>
        )}
      </div>

      {!isEdit && (
        <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repetir">
              <Select name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
                <option value="none">Não repetir</option>
                <option value="weekly">Semanalmente</option>
                <option value="biweekly">Quinzenalmente</option>
                <option value="monthly">Mensalmente</option>
              </Select>
            </Field>
            {repeat !== "none" && (
              <Field label="Quantidade de sessões" error={fe.occurrences} hint="Incluindo a primeira">
                <Input type="number" name="occurrences" min={2} max={52} defaultValue={8} />
              </Field>
            )}
          </div>
        </div>
      )}

      <Field label="Observações" hint="Visível para a equipe (não use para conteúdo clínico).">
        <Textarea name="notes" rows={3} defaultValue={values.notes ?? ""} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input type="checkbox" name="force" className="h-4 w-4 rounded border-ink-300 text-brand-600" />
        Ignorar conflitos de horário (encaixe)
      </label>

      <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancelar
        </Link>
        <SubmitButton>{isEdit ? "Salvar alterações" : "Agendar"}</SubmitButton>
      </div>
    </form>
  );
}
