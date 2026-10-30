import type { Metadata } from "next";
import Link from "next/link";
import { addDays, format, isSameDay, isToday, startOfDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Video } from "lucide-react";
import type { Appointment } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPsychologists, getSettings } from "@/lib/queries";
import { APPT_STATUS } from "@/lib/constants";
import { cn, displayName } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, buttonClass } from "@/components/ui";
import { AgendaFilters } from "./filters";

export const metadata: Metadata = { title: "Agenda" };

const HOUR_PX = 64;

type Appt = Appointment & {
  patient: { fullName: string; socialName: string | null };
  psychologist: { id: string; name: string; color: string };
  room: { name: string } | null;
};

function parseDate(s?: string) {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return startOfDay(new Date());
}

/** Distribui eventos sobrepostos em colunas (lanes). */
function layout(events: Appt[]) {
  const sorted = [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const result: { e: Appt; lane: number; lanes: number }[] = [];
  let cluster: { e: Appt; lane: number }[] = [];
  let clusterEnd = 0;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => result.push({ ...c, lanes }));
    cluster = [];
  };
  for (const e of sorted) {
    if (cluster.length && e.startsAt.getTime() >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.e.endsAt > e.startsAt).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ e, lane });
    clusterEnd = Math.max(clusterEnd, e.endsAt.getTime());
  }
  if (cluster.length) flush();
  return result;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; prof?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const base = parseDate(sp.date);
  const view = sp.view === "day" ? "day" : "week";
  const [settings, psychologists] = await Promise.all([getSettings(), getPsychologists()]);
  const prof = sp.prof === "all" ? undefined : (sp.prof ?? (user.role === "PSICOLOGO" ? user.id : undefined));

  const rangeStart = view === "week" ? startOfWeek(base, { weekStartsOn: 1 }) : base;
  const rangeEnd = addDays(rangeStart, view === "week" ? 7 : 1);

  const appts = (await prisma.appointment.findMany({
    where: {
      startsAt: { gte: rangeStart, lt: rangeEnd },
      ...(prof ? { psychologistId: prof } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: {
      patient: { select: { fullName: true, socialName: true } },
      psychologist: { select: { id: true, name: true, color: true } },
      room: { select: { name: true } },
    },
  })) as Appt[];

  // Faixa de horário exibida
  let startHour = settings.openingHour;
  let endHour = settings.closingHour;
  for (const a of appts) {
    startHour = Math.min(startHour, a.startsAt.getHours());
    endHour = Math.max(endHour, a.endsAt.getHours() + (a.endsAt.getMinutes() > 0 ? 1 : 0));
  }
  const hours = Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => startHour + i);

  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => addDays(rangeStart, i));
  const shownPsy = prof ? psychologists.filter((p) => p.id === prof) : psychologists;
  const columns =
    view === "week"
      ? days.map((d) => ({ key: format(d, "yyyy-MM-dd"), day: d, title: format(d, "EEE", { locale: ptBR }), sub: format(d, "dd/MM"), psyId: undefined as string | undefined }))
      : shownPsy.map((p) => ({ key: p.id, day: base, title: p.name.split(" ")[0], sub: p.name.split(" ").slice(1, 2).join(" "), psyId: p.id as string | undefined }));

  const step = view === "week" ? 7 : 1;
  const q = (d: Date, extra: Record<string, string> = {}) => {
    const u = new URLSearchParams({ date: format(d, "yyyy-MM-dd"), view, ...(sp.prof ? { prof: sp.prof } : {}), ...extra });
    return `/agenda?${u}`;
  };

  const title =
    view === "week"
      ? `${format(rangeStart, "dd MMM", { locale: ptBR })} – ${format(addDays(rangeEnd, -1), "dd MMM yyyy", { locale: ptBR })}`
      : format(base, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const totals = {
    total: appts.filter((a) => a.status !== "CANCELADO").length,
    confirmed: appts.filter((a) => a.status === "CONFIRMADO").length,
    done: appts.filter((a) => a.status === "REALIZADO").length,
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">Agenda</h1>
          <p className="mt-1 text-sm capitalize text-ink-500">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-ink-200 bg-white shadow-sm">
            <Link href={q(addDays(base, -step))} className="rounded-l-lg p-2 text-ink-600 hover:bg-ink-50" aria-label="Anterior">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <Link href={q(new Date())} className="border-x border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50">
              Hoje
            </Link>
            <Link href={q(addDays(base, step))} className="rounded-r-lg p-2 text-ink-600 hover:bg-ink-50" aria-label="Próximo">
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="flex rounded-lg border border-ink-200 bg-white p-0.5 shadow-sm">
            {(["day", "week"] as const).map((v) => (
              <Link
                key={v}
                href={`/agenda?${new URLSearchParams({ date: format(base, "yyyy-MM-dd"), view: v, ...(sp.prof ? { prof: sp.prof } : {}) })}`}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium", view === v ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50")}
              >
                {v === "day" ? "Dia" : "Semana"}
              </Link>
            ))}
          </div>
          <AgendaFilters psychologists={psychologists.map((p) => ({ id: p.id, name: p.name }))} value={prof ?? "all"} date={format(base, "yyyy-MM-dd")} />
          <ButtonLink href={`/agenda/novo?date=${format(base, "yyyy-MM-dd")}`} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> Novo
          </ButtonLink>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-ink-500">
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-ink-200">{totals.total} sessões</span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-ink-200">{totals.confirmed} confirmadas</span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-ink-200">{totals.done} realizadas</span>
      </div>

      {/* ───────── Grade (tablet/desktop) ───────── */}
      <Card className="hidden overflow-hidden md:block">
        {columns.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Nenhum profissional cadastrado" />
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(640, columns.length * 130 + 64) }}>
              <div className="sticky top-0 z-10 grid border-b border-ink-200 bg-white" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0,1fr))` }}>
                <div />
                {columns.map((c) => {
                  const today = view === "week" && isToday(c.day);
                  return (
                    <Link
                      key={c.key}
                      href={view === "week" ? `/agenda?${new URLSearchParams({ date: c.key, view: "day", ...(sp.prof ? { prof: sp.prof } : {}) })}` : `/agenda?${new URLSearchParams({ date: format(base, "yyyy-MM-dd"), view: "day", prof: c.psyId! })}`}
                      className="border-l border-ink-100 px-2 py-3 text-center hover:bg-ink-50"
                    >
                      <p className={cn("text-xs font-medium uppercase", today ? "text-brand-700" : "text-ink-500")}>{c.title}</p>
                      <p className={cn("mt-0.5 text-sm font-semibold", today ? "mx-auto w-fit rounded-full bg-brand-600 px-2 text-white" : "text-ink-900")}>
                        {c.sub || " "}
                      </p>
                    </Link>
                  );
                })}
              </div>

              <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0,1fr))` }}>
                <div>
                  {hours.map((h) => (
                    <div key={h} className="relative border-b border-ink-100 pr-2 text-right text-[11px] text-ink-400" style={{ height: HOUR_PX }}>
                      <span className="relative -top-2">{String(h).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>
                {columns.map((c) => {
                  const events = appts.filter((a) =>
                    view === "week" ? isSameDay(a.startsAt, c.day) : a.psychologistId === c.psyId,
                  );
                  const placed = layout(events);
                  const showNow = isToday(c.day);
                  const now = new Date();
                  const nowTop = ((now.getHours() - startHour) * 60 + now.getMinutes()) * (HOUR_PX / 60);
                  return (
                    <div key={c.key} className={cn("relative border-l border-ink-100", isToday(c.day) && view === "week" && "bg-brand-50/30")}>
                      {hours.map((h) => (
                        <Link
                          key={h}
                          href={`/agenda/novo?date=${format(c.day, "yyyy-MM-dd")}&time=${String(h).padStart(2, "0")}:00${c.psyId ? `&psychologistId=${c.psyId}` : prof ? `&psychologistId=${prof}` : ""}`}
                          className="group block border-b border-ink-100 hover:bg-brand-50/60"
                          style={{ height: HOUR_PX }}
                          aria-label={`Agendar às ${h}h`}
                        >
                          <span className="hidden p-1 text-[11px] text-brand-700 group-hover:block">+ {String(h).padStart(2, "0")}:00</span>
                        </Link>
                      ))}
                      {showNow && nowTop > 0 && nowTop < hours.length * HOUR_PX && (
                        <div className="pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-red-500" style={{ top: nowTop }}>
                          <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                        </div>
                      )}
                      {placed.map(({ e, lane, lanes }) => {
                        const top = ((e.startsAt.getHours() - startHour) * 60 + e.startsAt.getMinutes()) * (HOUR_PX / 60);
                        const height = Math.max(24, ((e.endsAt.getTime() - e.startsAt.getTime()) / 60000) * (HOUR_PX / 60) - 2);
                        const muted = e.status === "CANCELADO" || e.status === "FALTOU";
                        return (
                          <Link
                            key={e.id}
                            href={`/agenda/${e.id}`}
                            className={cn(
                              "absolute z-[6] overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-xs shadow-sm transition hover:z-10 hover:shadow-md",
                              muted && "opacity-60",
                            )}
                            style={{
                              top,
                              height,
                              left: `calc(${(lane / lanes) * 100}% + 2px)`,
                              width: `calc(${100 / lanes}% - 4px)`,
                              borderColor: e.psychologist.color,
                              backgroundColor: `${e.psychologist.color}1a`,
                            }}
                            title={`${displayName(e.patient)} · ${format(e.startsAt, "HH:mm")}–${format(e.endsAt, "HH:mm")} · ${APPT_STATUS[e.status].label}`}
                          >
                            <p className={cn("truncate font-semibold text-ink-900", e.status === "CANCELADO" && "line-through")}>
                              {displayName(e.patient)}
                            </p>
                            <p className="truncate text-[11px] text-ink-600">
                              {format(e.startsAt, "HH:mm")}–{format(e.endsAt, "HH:mm")}
                              {e.mode === "ONLINE" ? " · Online" : e.room ? ` · ${e.room.name}` : ""}
                            </p>
                            {height > 48 && (
                              <span className="mt-1 inline-block rounded bg-white/70 px-1 text-[10px] font-medium text-ink-700">
                                {APPT_STATUS[e.status].label}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ───────── Lista (celular) ───────── */}
      <div className="md:hidden">
        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(base, { weekStartsOn: 1 }), i)).map((d) => {
            const active = view === "day" ? isSameDay(d, base) : false;
            return (
              <Link
                key={d.toISOString()}
                href={`/agenda?${new URLSearchParams({ date: format(d, "yyyy-MM-dd"), view: "day", ...(sp.prof ? { prof: sp.prof } : {}) })}`}
                className={cn(
                  "flex min-w-[52px] flex-col items-center rounded-xl border px-2 py-2",
                  active ? "border-brand-600 bg-brand-600 text-white" : isToday(d) ? "border-brand-300 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-700",
                )}
              >
                <span className="text-[10px] font-medium uppercase">{format(d, "EEE", { locale: ptBR })}</span>
                <span className="text-lg font-semibold">{format(d, "dd")}</span>
              </Link>
            );
          })}
        </div>

        {days.map((d) => {
          const events = appts.filter((a) => isSameDay(a.startsAt, d));
          if (view === "week" && events.length === 0) return null;
          return (
            <section key={d.toISOString()} className="mb-5">
              <h2 className="mb-2 text-sm font-semibold capitalize text-ink-700">{format(d, "EEEE, dd/MM", { locale: ptBR })}</h2>
              {events.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<CalendarDays className="h-6 w-6" />}
                    title="Nenhuma sessão neste dia"
                    action={<ButtonLink href={`/agenda/novo?date=${format(d, "yyyy-MM-dd")}`} size="sm">Agendar</ButtonLink>}
                  />
                </Card>
              ) : (
                <ul className="space-y-2">
                  {events.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/agenda/${e.id}`}
                        className={cn("card flex items-center gap-3 border-l-4 p-3 active:bg-ink-50", (e.status === "CANCELADO" || e.status === "FALTOU") && "opacity-60")}
                        style={{ borderLeftColor: e.psychologist.color }}
                      >
                        <div className="w-14 shrink-0 text-center">
                          <p className="text-base font-semibold text-ink-900">{format(e.startsAt, "HH:mm")}</p>
                          <p className="text-[11px] text-ink-500">{format(e.endsAt, "HH:mm")}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate font-medium text-ink-900", e.status === "CANCELADO" && "line-through")}>{displayName(e.patient)}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-ink-500">
                            {e.mode === "ONLINE" && <Video className="h-3 w-3" />}
                            {e.psychologist.name}
                            {e.room && ` · ${e.room.name}`}
                          </p>
                        </div>
                        <Badge tone={APPT_STATUS[e.status].tone}>{APPT_STATUS[e.status].label}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {view === "week" && appts.length === 0 && (
          <Card>
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Nenhuma sessão nesta semana"
              action={<Link href="/agenda/novo" className={buttonClass("primary", "sm")}>Agendar sessão</Link>}
            />
          </Card>
        )}
      </div>
    </>
  );
}
