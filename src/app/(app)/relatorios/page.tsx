import type { Metadata } from "next";
import { format, startOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageFinance } from "@/lib/permissions";
import { APPT_STATUS, PAYMENT_METHOD, SESSION_TYPE } from "@/lib/constants";
import { formatCurrency, parseDateOnly, toNumber } from "@/lib/utils";
import { Card, CardHeader, Field, Input, PageHeader, StatCard, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Relatórios" };

function Bar({ value, max, color = "bg-brand-500" }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const from = sp.from ?? format(startOfMonth(new Date()), "yyyy-MM-dd");
  const to = sp.to ?? format(new Date(), "yyyy-MM-dd");
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  const finance = canManageFinance(user);
  const mine = user.role === "PSICOLOGO" ? { psychologistId: user.id } : {};

  const [appts, users, newPatients, discharged, txs] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: start, lte: end }, ...mine },
      select: { status: true, psychologistId: true, sessionType: true, mode: true, price: true, patientId: true },
    }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "PSICOLOGO"] } }, select: { id: true, name: true, color: true } }),
    prisma.patient.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.patient.count({ where: { status: "ALTA", updatedAt: { gte: start, lte: end } } }),
    finance
      ? prisma.transaction.findMany({
          where: { dueDate: { gte: parseDateOnly(from)!, lte: parseDateOnly(to)! }, status: { not: "CANCELADO" } },
          select: { type: true, status: true, amount: true, category: true, method: true },
        })
      : Promise.resolve([]),
  ]);

  const byStatus = Object.keys(APPT_STATUS).map((s) => ({ s, n: appts.filter((a) => a.status === s).length }));
  const done = appts.filter((a) => a.status === "REALIZADO").length;
  const missed = appts.filter((a) => a.status === "FALTOU").length;
  const cancelled = appts.filter((a) => a.status === "CANCELADO").length;
  const attendance = done + missed ? Math.round((done / (done + missed)) * 100) : 0;
  const uniquePatients = new Set(appts.filter((a) => a.status === "REALIZADO").map((a) => a.patientId)).size;

  const byPsy = users
    .map((u) => {
      const list = appts.filter((a) => a.psychologistId === u.id);
      const d = list.filter((a) => a.status === "REALIZADO");
      const m = list.filter((a) => a.status === "FALTOU").length;
      return {
        ...u,
        total: list.length,
        done: d.length,
        missed: m,
        revenue: d.reduce((s, a) => s + toNumber(a.price), 0),
        rate: d.length + m ? Math.round((d.length / (d.length + m)) * 100) : 0,
      };
    })
    .filter((u) => u.total > 0)
    .sort((a, b) => b.done - a.done);
  const maxPsy = Math.max(1, ...byPsy.map((p) => p.done));

  const byType = Object.entries(SESSION_TYPE)
    .map(([k, l]) => ({ l, n: appts.filter((a) => a.sessionType === k && a.status === "REALIZADO").length }))
    .filter((x) => x.n > 0);
  const online = appts.filter((a) => a.mode === "ONLINE" && a.status === "REALIZADO").length;

  const income = txs.filter((t) => t.type === "RECEITA");
  const expense = txs.filter((t) => t.type === "DESPESA");
  const sum = (l: typeof txs) => l.reduce((s, t) => s + toNumber(t.amount), 0);
  const received = sum(income.filter((t) => t.status === "PAGO"));
  const pendingIncome = sum(income.filter((t) => t.status === "PENDENTE"));
  const paidExpense = sum(expense.filter((t) => t.status === "PAGO"));
  const expenseByCat = Object.entries(
    expense.reduce<Record<string, number>>((acc, t) => ((acc[t.category] = (acc[t.category] ?? 0) + toNumber(t.amount)), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  const byMethod = Object.entries(
    income
      .filter((t) => t.status === "PAGO")
      .reduce<Record<string, number>>((acc, t) => {
        const k = t.method ? PAYMENT_METHOD[t.method] : "Não informado";
        acc[k] = (acc[k] ?? 0) + toNumber(t.amount);
        return acc;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...expenseByCat.map((e) => e[1]));
  const maxMethod = Math.max(1, ...byMethod.map((e) => e[1]));
  const qs = `from=${from}&to=${to}`;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Indicadores clínicos, operacionais e financeiros do período."
        actions={
          <>
            <a href={`/api/exportar/sessoes?${qs}`} className={buttonClass("secondary", "sm")}>
              <Download className="h-4 w-4" /> Sessões (CSV)
            </a>
            {finance && (
              <a href={`/api/exportar/financeiro?${qs}`} className={buttonClass("secondary", "sm")}>
                <Download className="h-4 w-4" /> Financeiro (CSV)
              </a>
            )}
            {user.role !== "PSICOLOGO" && (
              <a href={`/api/exportar/pacientes`} className={buttonClass("secondary", "sm")}>
                <Download className="h-4 w-4" /> Pacientes (CSV)
              </a>
            )}
          </>
        }
      />

      <Card className="mb-6 p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="De" className="sm:w-48">
            <Input type="date" name="from" defaultValue={from} />
          </Field>
          <Field label="Até" className="sm:w-48">
            <Input type="date" name="to" defaultValue={to} />
          </Field>
          <button className={buttonClass("primary")}>Aplicar</button>
        </form>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Sessões realizadas" value={done} />
        <StatCard label="Pacientes atendidos" value={uniquePatients} tone="blue" />
        <StatCard label="Taxa de presença" value={`${attendance}%`} tone="green" />
        <StatCard label="Faltas" value={missed} tone="red" />
        <StatCard label="Cancelamentos" value={cancelled} tone="amber" />
        <StatCard label="Novos pacientes" value={newPatients} hint={`${discharged} alta(s)`} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Produtividade por profissional" />
          {byPsy.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">Sem sessões no período.</p>
          ) : (
            <ul className="space-y-4 p-5">
              {byPsy.map((p) => (
                <li key={p.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span className="text-ink-500">
                      {p.done} sessões · {p.rate}% presença{finance ? ` · ${formatCurrency(p.revenue)}` : ""}
                    </span>
                  </div>
                  <Bar value={p.done} max={maxPsy} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Sessões por status e tipo" />
          <div className="grid gap-6 p-5 sm:grid-cols-2">
            <ul className="space-y-3">
              {byStatus.map(({ s, n }) => (
                <li key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink-700">{APPT_STATUS[s as keyof typeof APPT_STATUS].label}</span>
                    <span className="font-medium text-ink-900">{n}</span>
                  </div>
                  <Bar value={n} max={Math.max(1, appts.length)} color={s === "FALTOU" ? "bg-red-400" : s === "CANCELADO" ? "bg-ink-400" : s === "REALIZADO" ? "bg-emerald-500" : "bg-blue-400"} />
                </li>
              ))}
            </ul>
            <ul className="space-y-3">
              {byType.length === 0 && <li className="text-sm text-ink-500">—</li>}
              {byType.map((t) => (
                <li key={t.l} className="flex justify-between text-sm">
                  <span className="text-ink-700">{t.l}</span>
                  <span className="font-medium text-ink-900">{t.n}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-ink-100 pt-3 text-sm">
                <span className="text-ink-700">Online</span>
                <span className="font-medium text-ink-900">
                  {online} ({done ? Math.round((online / done) * 100) : 0}%)
                </span>
              </li>
            </ul>
          </div>
        </Card>

        {finance && (
          <>
            <Card>
              <CardHeader title="Resultado financeiro" />
              <dl className="grid grid-cols-2 gap-5 p-5">
                <div>
                  <dt className="text-xs uppercase text-ink-500">Receitas recebidas</dt>
                  <dd className="mt-1 text-xl font-semibold text-emerald-700">{formatCurrency(received)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-ink-500">A receber</dt>
                  <dd className="mt-1 text-xl font-semibold text-amber-600">{formatCurrency(pendingIncome)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-ink-500">Despesas pagas</dt>
                  <dd className="mt-1 text-xl font-semibold text-red-600">{formatCurrency(paidExpense)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-ink-500">Resultado</dt>
                  <dd className={`mt-1 text-xl font-semibold ${received - paidExpense < 0 ? "text-red-600" : "text-ink-900"}`}>{formatCurrency(received - paidExpense)}</dd>
                </div>
                <div className="col-span-2 border-t border-ink-100 pt-4">
                  <dt className="text-xs uppercase text-ink-500">Ticket médio por sessão</dt>
                  <dd className="mt-1 text-lg font-semibold text-ink-900">{formatCurrency(done ? received / done : 0)}</dd>
                </div>
              </dl>
            </Card>
            <Card>
              <CardHeader title="Recebimentos por forma de pagamento" />
              <ul className="space-y-3 p-5">
                {byMethod.length === 0 && <li className="text-sm text-ink-500">Sem recebimentos no período.</li>}
                {byMethod.map(([k, v]) => (
                  <li key={k}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink-700">{k}</span>
                      <span className="font-medium">{formatCurrency(v)}</span>
                    </div>
                    <Bar value={v} max={maxMethod} color="bg-emerald-500" />
                  </li>
                ))}
              </ul>
              <CardHeader title="Despesas por categoria" className="border-t" />
              <ul className="space-y-3 p-5">
                {expenseByCat.length === 0 && <li className="text-sm text-ink-500">Sem despesas no período.</li>}
                {expenseByCat.map(([k, v]) => (
                  <li key={k}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink-700">{k}</span>
                      <span className="font-medium">{formatCurrency(v)}</span>
                    </div>
                    <Bar value={v} max={maxCat} color="bg-red-400" />
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
