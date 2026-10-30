import { differenceInYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(v: unknown) {
  return currency.format(toNumber(v));
}

export function formatDate(d: Date | string | null | undefined, pattern = "dd/MM/yyyy") {
  if (!d) return "—";
  return format(typeof d === "string" ? new Date(d) : d, pattern, { locale: ptBR });
}

/** Datas armazenadas como @db.Date chegam em UTC 00:00 — formatamos sem deslocamento de fuso. */
export function formatDateOnly(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}

export function dateOnlyToInput(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function parseDateOnly(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

/** Data/hora local → valor de <input type="datetime-local"> */
export function toDateTimeInput(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function todayInput() {
  return format(new Date(), "yyyy-MM-dd");
}

export function age(birth: Date | null | undefined) {
  if (!birth) return null;
  const local = new Date(birth.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
  return differenceInYears(new Date(), local);
}

export function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

export function formatCPF(s: string | null | undefined) {
  const d = onlyDigits(s);
  if (d.length !== 11) return s ?? "";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(s: string | null | undefined) {
  const d = onlyDigits(s);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return s ?? "";
}

export function isValidCPF(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function whatsappLink(phone: string | null | undefined, text?: string) {
  const d = onlyDigits(phone);
  if (!d) return null;
  const num = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function displayName(p: { fullName: string; socialName?: string | null }) {
  return p.socialName?.trim() ? p.socialName : p.fullName;
}

export function str(form: FormData, key: string) {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function money(form: FormData, key: string) {
  const v = str(form, key);
  if (!v) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
