import type { Metadata } from "next";
import Link from "next/link";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Prisma } from "@prisma/client";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Plus, Receipt, Scale, Wallet } from "lucide-react";
import { payTransactionAction } from "@/actions/finance";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PAYMENT_METHOD, TX_STATUS } from "@/lib/constants";
import { cn, formatCurrency, formatDateOnly, toNumber } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, StatCard, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; type?: string; status?: string }>;
}) {
  await requireRole("ADMIN", "RECEPCAO");
  const sp = await searchParams;
  const now = new Date();
  const [y, m] = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const monthKey = `${y}-${String(m).padStart(2, "0")}`;
  const local = new Date(y, m - 1, 1);
  const type = sp.type === "RECEITA" || sp.type === "DESPESA" ? sp.type : undefined;
  const status = sp.status === "PENDENTE" || sp.status === "PAGO" || sp.status === "CANCELADO" ? sp.status : sp.status === "VENCIDO" ? "VENCIDO" : undefined;
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // "Vencidos" considera todos os meses; demais filtros respeitam o mês selecionado.
  const where: Prisma.TransactionWhereInput =
    status === "VENCIDO"
      ? { status: "PENDENTE", dueDate: { lt: todayUtc }, ...(type ? { type } : {}) }
      : { dueDate: { gte: start, lt: end }, ...(type ? { type } : {}), ...(status ? { status } : {}) };

  const [txs, monthAll, overdue] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { patient: { select: { id: true, fullName: true } } },
    }),
    prisma.transaction.findMany({ where: { dueDate: { gte: start, lt: end }, status: { not: "CANCELADO" } }, select: { type: true, status: true, amount: true } }),
    prisma.transaction.aggregate({ where: { type: "RECEITA", status: "PENDENTE", dueDate: { lt: todayUtc } }, _sum: { amount: true }, _count: true }),
  ]);

  const sum = (f: (t: (typeof monthAll)[number]) => boolean) => monthAll.filter(f).reduce((s, t) => s + toNumber(t.amount), 0);
  const received = sum((t) => t.type === "RECEITA" && t.status === "PAGO");
  const toReceive = sum((t) => t.type === "RECEITA" && t.status === "PENDENTE");
  const paidOut = sum((t) => t.type === "DESPESA" && t.status === "PAGO");
  const toPay = sum((t) => t.type === "DESPESA" && t.status === "PENDENTE");
  const balance = received - paidOut;

  const link = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { month: monthKey, type, status, ...params };
    Object.entries(merged).forEach(([k, v]) => v && u.set(k, v));
    return `/financeiro?${u}`;
  };
  const back = link({});

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Fluxo de caixa, contas a receber e a pagar."
        actions={
          <>
            <ButtonLink href="/financeiro/novo?type=DESPESA" variant="secondary">
              <ArrowDownCircle className="h-4 w-4" /> Despesa
            </ButtonLink>
            <ButtonLink href="/financeiro/novo?type=RECEITA">
              <Plus className="h-4 w-4" /> Receita
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-lg border border-ink-200 bg-white shadow-sm">
          <Link href={link({ month: format(addMonths(local, -1), "yyyy-MM") })} className="rounded-l-lg p-2 text-ink-600 hover:bg-ink-50" aria-label="Mês anterior">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="min-w-[150px] border-x border-ink-200 px-3 py-2 text-center text-sm font-medium capitalize text-ink-800">
            {format(local, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Link href={link({ month: format(addMonths(local, 1), "yyyy-MM") })} className="rounded-r-lg p-2 text-ink-600 hover:bg-ink-50" aria-label="Próximo mês">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
        {overdue._count > 0 && (
          <Link href={link({ status: "VENCIDO", type: "RECEITA", month: undefined })} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            <AlertTriangle className="h-4 w-4" /> {overdue._count} recebimento(s) vencido(s) · {formatCurrency(overdue._sum.amount)}
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Recebido" value={formatCurrency(received)} icon={<ArrowUpCircle className="h-5 w-5" />} tone="green" />
        <StatCard label="A receber" value={formatCurrency(toReceive)} icon={<Wallet className="h-5 w-5" />} tone="amber" />
        <StatCard label="Pago" value={formatCurrency(paidOut)} icon={<ArrowDownCircle className="h-5 w-5" />} tone="red" />
        <StatCard label="A pagar" value={formatCurrency(toPay)} icon={<Receipt className="h-5 w-5" />} tone="violet" />
        <div className="col-span-2 xl:col-span-1">
          <StatCard label="Saldo do mês" value={<span className={balance < 0 ? "text-red-600" : ""}>{formatCurrency(balance)}</span>} icon={<Scale className="h-5 w-5" />} tone="blue" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-ink-100 p-4">
          {[
            { label: "Todos", t: undefined },
            { label: "Receitas", t: "RECEITA" },
            { label: "Despesas", t: "DESPESA" },
          ].map((o) => (
            <Link key={o.label} href={link({ type: o.t })} className={buttonClass(type === o.t ? "primary" : "secondary", "sm")}>
              {o.label}
            </Link>
          ))}
          <span className="mx-1 w-px bg-ink-200" />
          {[
            { label: "Qualquer status", s: undefined },
            { label: "Pendentes", s: "PENDENTE" },
            { label: "Vencidos", s: "VENCIDO" },
            { label: "Pagos", s: "PAGO" },
            { label: "Cancelados", s: "CANCELADO" },
          ].map((o) => (
            <Link key={o.label} href={link({ status: o.s })} className={buttonClass(status === o.s ? "primary" : "secondary", "sm")}>
              {o.label}
            </Link>
          ))}
        </div>

        {txs.length === 0 ? (
          <EmptyState icon={<Wallet className="h-6 w-6" />} title="Nenhum lançamento neste período" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th className="hidden lg:table-cell">Categoria</th>
                    <th className="text-right">Valor</th>
                    <th>Status</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => {
                    const late = t.status === "PENDENTE" && t.dueDate < todayUtc;
                    return (
                      <tr key={t.id}>
                        <td className={cn("whitespace-nowrap", late && "font-medium text-red-600")}>{formatDateOnly(t.dueDate)}</td>
                        <td className="min-w-[220px]">
                          <Link href={`/financeiro/${t.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                            {t.description}
                          </Link>
                          {t.patient && (
                            <Link href={`/pacientes/${t.patient.id}?tab=financeiro`} className="block text-xs text-ink-500 hover:text-brand-700">
                              {t.patient.fullName}
                            </Link>
                          )}
                        </td>
                        <td className="hidden text-ink-600 lg:table-cell">{t.category}</td>
                        <td className={cn("whitespace-nowrap text-right font-semibold", t.type === "RECEITA" ? "text-emerald-700" : "text-red-600")}>
                          {t.type === "DESPESA" && "− "}
                          {formatCurrency(t.amount)}
                        </td>
                        <td>
                          {late ? <Badge tone="red">Vencido</Badge> : <Badge tone={TX_STATUS[t.status].tone}>{TX_STATUS[t.status].label}</Badge>}
                          {t.method && t.status === "PAGO" && <span className="ml-2 text-xs text-ink-500">{PAYMENT_METHOD[t.method]}</span>}
                        </td>
                        <td className="whitespace-nowrap text-right">
                          {t.status === "PENDENTE" ? (
                            <form action={payTransactionAction} className="inline-flex items-center gap-1">
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="back" value={back} />
                              <select name="method" className="input h-8 w-auto py-0 text-xs" defaultValue="PIX" aria-label="Forma de pagamento">
                                {Object.entries(PAYMENT_METHOD).map(([k, l]) => (
                                  <option key={k} value={k}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                              <button className={buttonClass("success", "sm")}>{t.type === "RECEITA" ? "Receber" : "Pagar"}</button>
                            </form>
                          ) : t.status === "PAGO" && t.type === "RECEITA" ? (
                            <Link href={`/imprimir/recibo/${t.id}`} target="_blank" className={buttonClass("secondary", "sm")}>
                              Recibo
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-ink-100 md:hidden">
              {txs.map((t) => {
                const late = t.status === "PENDENTE" && t.dueDate < todayUtc;
                return (
                  <li key={t.id}>
                    <Link href={`/financeiro/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-ink-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">{t.description}</p>
                        <p className={cn("text-xs", late ? "text-red-600" : "text-ink-500")}>
                          {formatDateOnly(t.dueDate)} · {late ? "Vencido" : TX_STATUS[t.status].label}
                        </p>
                      </div>
                      <span className={cn("whitespace-nowrap text-sm font-semibold", t.type === "RECEITA" ? "text-emerald-700" : "text-red-600")}>
                        {t.type === "DESPESA" && "− "}
                        {formatCurrency(t.amount)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
