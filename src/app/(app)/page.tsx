import type { Metadata } from "next";
import Link from "next/link";
import { addDays, endOfDay, format, startOfDay, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarCheck, Cake, CalendarClock, NotebookPen, TrendingUp, UserPlus, Users, Video, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageFinance, isClinician } from "@/lib/permissions";
import { APPT_STATUS } from "@/lib/constants";
import { displayName, formatCurrency, toNumber } from "@/lib/utils";
import { Avatar, Badge, ButtonLink, Card, CardHeader, EmptyState, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Painel" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));
  const mine = user.role === "PSICOLOGO" ? { psychologistId: user.id } : {};
  const finance = canManageFinance(user);
  const utcMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const utcMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  const utcToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const [activePatients, newPatients, waiting, today, monthStats, history, revenue, overdue, pendingNotes, birthdays, upcoming] = await Promise.all([
    prisma.patient.count({ where: { status: "ATIVO", ...(user.role === "PSICOLOGO" ? { psychologistId: user.id } : {}) } }),
    prisma.patient.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.patient.count({ where: { status: "LISTA_ESPERA" } }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: todayStart, lte: todayEnd }, ...mine },
      orderBy: { startsAt: "asc" },
      include: {
        patient: { select: { id: true, fullName: true, socialName: true } },
        psychologist: { select: { name: true, color: true } },
        room: { select: { name: true } },
        sessionNote: { select: { id: true } },
      },
    }),
    prisma.appointment.groupBy({ by: ["status"], where: { startsAt: { gte: monthStart, lte: todayEnd }, ...mine }, _count: true }),
    prisma.appointment.findMany({
      where: { startsAt: { gte: sixMonthsAgo, lte: todayEnd }, status: "REALIZADO", ...mine },
      select: { startsAt: true },
    }),
    finance
      ? prisma.transaction.findMany({
          where: { type: "RECEITA", status: "PAGO", dueDate: { gte: new Date(Date.UTC(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1)) } },
          select: { amount: true, dueDate: true },
        })
      : Promise.resolve([]),
    finance
      ? prisma.transaction.aggregate({ where: { type: "RECEITA", status: "PENDENTE", dueDate: { lt: utcToday } }, _sum: { amount: true }, _count: true })
      : Promise.resolve(null),
    isClinician(user)
      ? prisma.appointment.findMany({
          where: { status: "REALIZADO", sessionNote: null, psychologistId: user.id },
          orderBy: { startsAt: "desc" },
          take: 5,
          include: { patient: { select: { id: true, fullName: true, socialName: true } } },
        })
      : Promise.resolve([]),
    prisma.$queryRaw<{ id: string; fullName: string; birthDate: Date }[]>`
      SELECT id, "fullName", "birthDate" FROM patients
      WHERE status = 'ATIVO' AND "birthDate" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthDate") = ${now.getMonth() + 1}
      ORDER BY EXTRACT(DAY FROM "birthDate") ASC LIMIT 8`,
    prisma.appointment.count({ where: { startsAt: { gt: todayEnd, lte: endOfDay(addDays(now, 7)) }, status: { in: ["AGENDADO", "CONFIRMADO"] }, ...mine } }),
  ]);

  const count = (s: string) => monthStats.find((m) => m.status === s)?._count ?? 0;
  const done = count("REALIZADO");
  const missed = count("FALTOU");
  const attendance = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : null;

  const months = Array.from({ length: 6 }, (_, i) => subMonths(monthStart, 5 - i));
  const sessionsByMonth = months.map((m) => ({
    label: format(m, "MMM", { locale: ptBR }),
    value: history.filter((h) => h.startsAt.getMonth() === m.getMonth() && h.startsAt.getFullYear() === m.getFullYear()).length,
  }));
  const revenueByMonth = months.map((m) => ({
    label: format(m, "MMM", { locale: ptBR }),
    value: revenue
      .filter((r) => r.dueDate.getUTCMonth() === m.getMonth() && r.dueDate.getUTCFullYear() === m.getFullYear())
      .reduce((s, r) => s + toNumber(r.amount), 0),
  }));
  const monthRevenue = finance
    ? toNumber(
        (
          await prisma.transaction.aggregate({
            where: { type: "RECEITA", status: "PAGO", dueDate: { gte: utcMonthStart, lt: utcMonthEnd } },
            _sum: { amount: true },
          })
        )._sum.amount,
      )
    : 0;

  const todayActive = today.filter((a) => a.status !== "CANCELADO");
  const nextAppt = todayActive.find((a) => a.startsAt >= now && (a.status === "AGENDADO" || a.status === "CONFIRMADO"));

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm capitalize text-ink-500">{format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
            {greeting()}, {user.name.split(" ")[0]}!
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Você tem {todayActive.length} {todayActive.length === 1 ? "sessão" : "sessões"} hoje
            {nextAppt && ` · próxima às ${format(nextAppt.startsAt, "HH:mm")} com ${displayName(nextAppt.patient).split(" ")[0]}`}.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/pacientes/novo" variant="secondary">
            <UserPlus className="h-4 w-4" /> Paciente
          </ButtonLink>
          <ButtonLink href="/agenda/novo">
            <CalendarClock className="h-4 w-4" /> Agendar
          </ButtonLink>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Pacientes ativos" value={activePatients} hint={`+${newPatients} novos no mês · ${waiting} em espera`} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Sessões no mês" value={done} hint={`${upcoming} agendadas nos próximos 7 dias`} icon={<CalendarCheck className="h-5 w-5" />} tone="blue" />
        <StatCard
          label="Taxa de presença"
          value={attendance !== null ? `${attendance}%` : "—"}
          hint={`${missed} falta(s) no mês`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        {finance ? (
          <StatCard label="Receita do mês" value={formatCurrency(monthRevenue)} hint={overdue && overdue._count > 0 ? `${formatCurrency(overdue._sum.amount)} em atraso` : "Nenhum atraso"} icon={<Wallet className="h-5 w-5" />} tone="amber" />
        ) : (
          <StatCard label="Evoluções pendentes" value={pendingNotes.length} hint="Sessões realizadas sem registro" icon={<NotebookPen className="h-5 w-5" />} tone="violet" />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Agenda de hoje"
            description={`${todayActive.length} sessões · ${today.filter((a) => a.status === "REALIZADO").length} realizadas`}
            action={<Link href="/agenda?view=day" className="text-sm font-medium text-brand-700 hover:underline">Ver agenda</Link>}
          />
          {today.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="Nenhuma sessão hoje" description="Aproveite para organizar prontuários e documentos." />
          ) : (
            <ul className="divide-y divide-ink-100">
              {today.map((a) => {
                const past = a.endsAt < now;
                return (
                  <li key={a.id}>
                    <Link href={`/agenda/${a.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-ink-50">
                      <div className="w-14 shrink-0 text-center">
                        <p className={`text-base font-semibold ${past ? "text-ink-400" : "text-ink-900"}`}>{format(a.startsAt, "HH:mm")}</p>
                        <p className="text-[11px] text-ink-400">{format(a.endsAt, "HH:mm")}</p>
                      </div>
                      <span className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: a.psychologist.color }} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-medium ${a.status === "CANCELADO" ? "text-ink-400 line-through" : "text-ink-900"}`}>{displayName(a.patient)}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-ink-500">
                          {a.mode === "ONLINE" && <Video className="h-3 w-3" />}
                          {a.psychologist.name}
                          {a.room && ` · ${a.room.name}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={APPT_STATUS[a.status].tone}>{APPT_STATUS[a.status].label}</Badge>
                        {a.status === "REALIZADO" && !a.sessionNote && <span className="text-[11px] text-amber-600">Evolução pendente</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {finance && overdue && overdue._count > 0 && (
            <Link href="/financeiro?status=VENCIDO&type=RECEITA" className="block">
              <Card className="flex items-center gap-3 border-red-200 bg-red-50/60 p-4">
                <AlertCircle className="h-6 w-6 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{overdue._count} pagamento(s) em atraso</p>
                  <p className="text-xs text-red-700">Total de {formatCurrency(overdue._sum.amount)} · clique para ver</p>
                </div>
              </Card>
            </Link>
          )}

          {pendingNotes.length > 0 && (
            <Card>
              <CardHeader title="Evoluções pendentes" description="Sessões realizadas sem registro no prontuário" />
              <ul className="divide-y divide-ink-100">
                {pendingNotes.map((a) => (
                  <li key={a.id}>
                    <Link href={`/pacientes/${a.patient.id}/evolucoes/nova?appointmentId=${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-ink-50">
                      <span className="truncate font-medium text-ink-800">{displayName(a.patient)}</span>
                      <span className="whitespace-nowrap text-xs text-ink-500">{format(a.startsAt, "dd/MM HH:mm")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Aniversariantes do mês" action={<Cake className="h-5 w-5 text-pink-500" />} />
            {birthdays.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-500">Nenhum aniversariante este mês.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {birthdays.map((b) => {
                  const isToday = b.birthDate.getUTCDate() === now.getDate();
                  return (
                    <li key={b.id}>
                      <Link href={`/pacientes/${b.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-ink-50">
                        <Avatar name={b.fullName} size="sm" color={isToday ? "#db2777" : "#94a3b8"} />
                        <span className="flex-1 truncate text-sm text-ink-800">{b.fullName}</span>
                        <span className={`text-xs ${isToday ? "font-semibold text-pink-600" : "text-ink-500"}`}>
                          {isToday ? "Hoje! 🎉" : `${String(b.birthDate.getUTCDate()).padStart(2, "0")}/${String(b.birthDate.getUTCMonth() + 1).padStart(2, "0")}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className={`mt-6 grid gap-6 ${finance ? "lg:grid-cols-2" : ""}`}>
        <BarChart title="Sessões realizadas" subtitle="Últimos 6 meses" data={sessionsByMonth} format={(v) => String(v)} />
        {finance && <BarChart title="Receita recebida" subtitle="Últimos 6 meses" data={revenueByMonth} format={(v) => formatCurrency(v)} color="bg-emerald-500" />}
      </div>
    </>
  );
}

function BarChart({
  title,
  subtitle,
  data,
  format: fmt,
  color = "bg-brand-500",
}: {
  title: string;
  subtitle: string;
  data: { label: string; value: number }[];
  format: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHeader title={title} description={subtitle} action={<span className="text-sm font-semibold text-ink-900">{fmt(total)}</span>} />
      <div className="flex h-56 items-end gap-3 px-5 pb-4 pt-6 sm:gap-6">
        {data.map((d, i) => (
          <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[11px] font-medium text-ink-600 opacity-0 transition group-hover:opacity-100 sm:opacity-100">{d.value > 0 ? fmt(d.value) : ""}</span>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-[48px] rounded-t-md ${i === data.length - 1 ? color : `${color} opacity-50`} transition-all`}
                style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
                title={`${d.label}: ${fmt(d.value)}`}
              />
            </div>
            <span className="text-xs capitalize text-ink-500">{d.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
