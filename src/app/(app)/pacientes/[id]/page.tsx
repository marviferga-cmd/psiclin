import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarPlus,
  Download,
  FilePlus2,
  Lock,
  MessageCircle,
  NotebookPen,
  Pencil,
  Trash2,
} from "lucide-react";
import { deletePatientAction, saveAnamnesisAction } from "@/actions/patients";
import { deleteNoteAction } from "@/actions/notes";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canManageFinance, canViewClinical, isAdmin } from "@/lib/permissions";
import {
  APPT_MODE,
  APPT_STATUS,
  DOC_TYPE,
  GENDER_LABEL,
  PATIENT_STATUS,
  PAYMENT_METHOD,
  SESSION_TYPE,
  TX_STATUS,
} from "@/lib/constants";
import {
  age,
  displayName,
  formatCPF,
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatPhone,
  toNumber,
  whatsappLink,
} from "@/lib/utils";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  InfoRow,
  StatCard,
  Tabs,
  buttonClass,
} from "@/components/ui";
import { ConfirmForm } from "@/components/ui/client";
import { AnamnesisForm } from "./anamnesis-form";

export const metadata: Metadata = { title: "Paciente" };

type Tab = "resumo" | "anamnese" | "evolucoes" | "sessoes" | "financeiro" | "documentos";

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { tab: tabParam } = await searchParams;

  const patient = await prisma.patient
    .findUnique({
      where: { id },
      include: { psychologist: { select: { id: true, name: true, color: true, crp: true } }, insurance: true },
    })
    .catch(() => null);
  if (!patient) notFound();

  const link = await prisma.appointment.count({ where: { patientId: id, psychologistId: user.id } });
  const clinical = canViewClinical(user, patient, link > 0);
  const finance = canManageFinance(user);

  const tabs: { key: Tab; label: string; count?: number }[] = [{ key: "resumo", label: "Resumo" }];
  const [apptCount, noteCount, docCount, txCount] = await Promise.all([
    prisma.appointment.count({ where: { patientId: id } }),
    clinical ? prisma.sessionNote.count({ where: { patientId: id } }) : 0,
    clinical ? prisma.document.count({ where: { patientId: id } }) : 0,
    finance ? prisma.transaction.count({ where: { patientId: id } }) : 0,
  ]);
  if (clinical) tabs.push({ key: "anamnese", label: "Anamnese" }, { key: "evolucoes", label: "Evoluções", count: noteCount });
  tabs.push({ key: "sessoes", label: "Sessões", count: apptCount });
  if (finance) tabs.push({ key: "financeiro", label: "Financeiro", count: txCount });
  if (clinical) tabs.push({ key: "documentos", label: "Documentos", count: docCount });

  const tab: Tab = tabs.some((t) => t.key === tabParam) ? (tabParam as Tab) : "resumo";
  if (tab === "evolucoes" || tab === "anamnese") await audit(user.id, "VISUALIZAR", "prontuario", id, tab);

  const a = age(patient.birthDate);
  const wa = whatsappLink(patient.phone, `Olá, ${displayName(patient).split(" ")[0]}!`);

  return (
    <>
      <Link href="/pacientes" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700">
        ← Pacientes
      </Link>

      <Card className="mb-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={patient.fullName} size="lg" color={patient.psychologist?.color ?? "#64748b"} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-ink-900 sm:text-2xl">{displayName(patient)}</h1>
              {patient.socialName && <p className="truncate text-sm text-ink-500">Nome civil: {patient.fullName}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={PATIENT_STATUS[patient.status].tone}>{PATIENT_STATUS[patient.status].label}</Badge>
                <Badge tone="violet">{patient.insurance?.name ?? "Particular"}</Badge>
                {a !== null && <Badge>{a} anos</Badge>}
                {a !== null && a < 18 && <Badge tone="amber">Menor de idade</Badge>}
                {!patient.lgpdConsent && <Badge tone="red">Sem consentimento LGPD</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/agenda/novo?patientId=${id}`} size="sm">
              <CalendarPlus className="h-4 w-4" /> Agendar
            </ButtonLink>
            {clinical && (
              <ButtonLink href={`/pacientes/${id}/evolucoes/nova`} variant="secondary" size="sm">
                <NotebookPen className="h-4 w-4" /> Evolução
              </ButtonLink>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            <ButtonLink href={`/pacientes/${id}/editar`} variant="secondary" size="sm">
              <Pencil className="h-4 w-4" /> Editar
            </ButtonLink>
            {isAdmin(user) && (
              <a href={`/api/pacientes/${id}/exportar`} className={buttonClass("secondary", "sm")} title="Exportar dados (LGPD)">
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportar</span>
              </a>
            )}
          </div>
        </div>
      </Card>

      <Tabs active={tab} items={tabs.map((t) => ({ ...t, href: `/pacientes/${id}?tab=${t.key}` }))} />

      {tab === "resumo" && <Summary patientId={id} clinical={clinical} finance={finance} adminUser={isAdmin(user)} />}
      {tab === "anamnese" && <AnamnesisTab patientId={id} />}
      {tab === "evolucoes" && <NotesTab patientId={id} userId={user.id} admin={isAdmin(user)} />}
      {tab === "sessoes" && <SessionsTab patientId={id} />}
      {tab === "financeiro" && <FinanceTab patientId={id} />}
      {tab === "documentos" && <DocumentsTab patientId={id} />}
    </>
  );

  async function Summary({ patientId, clinical, finance, adminUser }: { patientId: string; clinical: boolean; finance: boolean; adminUser: boolean }) {
    const p = patient!;
    const [next, stats, balance, lastNote] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId, startsAt: { gte: new Date() }, status: { in: ["AGENDADO", "CONFIRMADO"] } },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { psychologist: { select: { name: true } } },
      }),
      prisma.appointment.groupBy({ by: ["status"], where: { patientId }, _count: true }),
      finance
        ? prisma.transaction.aggregate({ where: { patientId, type: "RECEITA", status: "PENDENTE" }, _sum: { amount: true } })
        : null,
      clinical ? prisma.sessionNote.findFirst({ where: { patientId }, orderBy: { sessionDate: "desc" } }) : null,
    ]);
    const count = (s: string) => stats.find((x) => x.status === s)?._count ?? 0;
    const done = count("REALIZADO");
    const missed = count("FALTOU");
    const attendance = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : null;
    const address = [p.street, p.number, p.complement, p.district, p.city && `${p.city}${p.state ? `/${p.state}` : ""}`]
      .filter(Boolean)
      .join(", ");

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Sessões realizadas" value={done} />
          <StatCard label="Faltas" value={missed} tone="red" />
          <StatCard label="Frequência" value={attendance !== null ? `${attendance}%` : "—"} tone="green" />
          {finance ? (
            <StatCard label="Em aberto" value={formatCurrency(balance?._sum.amount)} tone="amber" />
          ) : (
            <StatCard label="Próximas" value={next.length} tone="blue" />
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Dados cadastrais" />
            <dl className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="CPF" value={p.cpf && formatCPF(p.cpf)} />
              <InfoRow label="RG" value={p.rg} />
              <InfoRow label="Nascimento" value={p.birthDate && `${formatDateOnly(p.birthDate)}${a !== null ? ` (${a} anos)` : ""}`} />
              <InfoRow label="Gênero" value={GENDER_LABEL[p.gender]} />
              <InfoRow label="Estado civil" value={p.maritalStatus} />
              <InfoRow label="Escolaridade" value={p.education} />
              <InfoRow label="Profissão" value={p.profession} />
              <InfoRow label="Celular" value={formatPhone(p.phone)} />
              <InfoRow label="Telefone 2" value={formatPhone(p.phone2)} />
              <InfoRow label="E-mail" value={p.email} />
              <InfoRow label="Endereço" value={address} />
              <InfoRow label="CEP" value={p.zipCode} />
              <InfoRow label="Encaminhamento" value={p.referralSource} />
              <InfoRow label="Profissional" value={p.psychologist?.name} />
              <InfoRow label="Convênio" value={p.insurance ? `${p.insurance.name}${p.insuranceNumber ? ` · ${p.insuranceNumber}` : ""}` : "Particular"} />
              <InfoRow label="Valor da sessão" value={p.sessionPrice !== null ? formatCurrency(p.sessionPrice) : "Padrão da clínica"} />
              <InfoRow label="Cadastro" value={formatDate(p.createdAt)} />
              <InfoRow label="Consentimento LGPD" value={p.lgpdConsent ? `Sim, em ${formatDate(p.lgpdConsentAt)}` : "Não registrado"} />
            </dl>
            {(p.emergencyName || p.guardianName) && (
              <dl className="grid grid-cols-1 gap-5 border-t border-ink-100 p-5 sm:grid-cols-2">
                {p.emergencyName && (
                  <InfoRow
                    label="Contato de emergência"
                    value={`${p.emergencyName}${p.emergencyRelation ? ` (${p.emergencyRelation})` : ""} · ${formatPhone(p.emergencyPhone)}`}
                  />
                )}
                {p.guardianName && (
                  <InfoRow
                    label="Responsável legal"
                    value={`${p.guardianName}${p.guardianRelation ? ` (${p.guardianRelation})` : ""}${p.guardianCpf ? ` · CPF ${formatCPF(p.guardianCpf)}` : ""}${p.guardianPhone ? ` · ${formatPhone(p.guardianPhone)}` : ""}`}
                  />
                )}
              </dl>
            )}
            {p.notes && (
              <div className="border-t border-ink-100 p-5">
                <InfoRow label="Observações" value={<span className="whitespace-pre-wrap">{p.notes}</span>} />
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Próximas sessões" action={<Link href={`/agenda/novo?patientId=${patientId}`} className="text-sm font-medium text-brand-700">Agendar</Link>} />
              {next.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-500">Nenhuma sessão futura agendada.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {next.map((s) => (
                    <li key={s.id}>
                      <Link href={`/agenda/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink-50">
                        <div>
                          <p className="text-sm font-medium capitalize text-ink-900">{formatDate(s.startsAt, "EEE, dd/MM 'às' HH:mm")}</p>
                          <p className="text-xs text-ink-500">{s.psychologist.name} · {APPT_MODE[s.mode]}</p>
                        </div>
                        <Badge tone={APPT_STATUS[s.status].tone}>{APPT_STATUS[s.status].label}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {clinical && (
              <Card>
                <CardHeader title="Última evolução" />
                <div className="p-5 text-sm">
                  {lastNote ? (
                    <>
                      <p className="text-xs text-ink-500">{formatDate(lastNote.sessionDate, "dd/MM/yyyy")} · Sessão nº {lastNote.sessionNumber}</p>
                      <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-ink-700">{lastNote.content}</p>
                      <Link href={`/pacientes/${patientId}?tab=evolucoes`} className="mt-3 inline-block text-sm font-medium text-brand-700">
                        Ver prontuário →
                      </Link>
                    </>
                  ) : (
                    <p className="text-ink-500">Nenhuma evolução registrada.</p>
                  )}
                </div>
              </Card>
            )}
            {adminUser && (
              <Card className="border-red-200">
                <CardHeader title="Zona de perigo" description="A exclusão remove todo o histórico do paciente." />
                <div className="p-5">
                  <ConfirmForm
                    action={deletePatientAction}
                    hidden={{ id: patientId }}
                    message="Excluir definitivamente este paciente e todo o seu histórico (sessões, prontuário, documentos)? Esta ação não pode ser desfeita."
                  >
                    <button className={buttonClass("danger", "sm")}>
                      <Trash2 className="h-4 w-4" /> Excluir paciente
                    </button>
                  </ConfirmForm>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function AnamnesisTab({ patientId }: { patientId: string }) {
    const an = await prisma.anamnesis.findUnique({ where: { patientId }, include: { updatedBy: { select: { name: true } } } });
    return (
      <Card>
        <CardHeader
          title="Anamnese"
          description={an ? `Última atualização em ${formatDate(an.updatedAt, "dd/MM/yyyy HH:mm")} por ${an.updatedBy?.name ?? "—"}` : "Nenhuma anamnese registrada ainda."}
          action={<Badge tone="violet"><Lock className="mr-1 h-3 w-3" /> Sigiloso</Badge>}
        />
        <div className="p-5">
          <AnamnesisForm action={saveAnamnesisAction.bind(null, patientId)} values={an ?? {}} />
        </div>
      </Card>
    );
  }

  async function NotesTab({ patientId, userId, admin }: { patientId: string; userId: string; admin: boolean }) {
    const notes = await prisma.sessionNote.findMany({
      where: { patientId },
      orderBy: { sessionDate: "desc" },
      include: { psychologist: { select: { name: true, crp: true, color: true } } },
    });
    return (
      <Card>
        <CardHeader
          title="Evoluções de sessão"
          description="Registro documental do processo psicológico (Resolução CFP nº 01/2009)."
          action={
            <ButtonLink href={`/pacientes/${patientId}/evolucoes/nova`} size="sm">
              <NotebookPen className="h-4 w-4" /> Nova evolução
            </ButtonLink>
          }
        />
        {notes.length === 0 ? (
          <EmptyState icon={<NotebookPen className="h-6 w-6" />} title="Nenhuma evolução registrada" description="Registre a evolução após cada sessão." />
        ) : (
          <ol className="relative space-y-0 p-5">
            {notes.map((n) => (
              <li key={n.id} className="relative border-l-2 border-ink-100 pb-8 pl-6 last:pb-0">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full ring-4 ring-white" style={{ backgroundColor: n.psychologist.color }} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold capitalize text-ink-900">
                      {formatDate(n.sessionDate, "EEEE, dd 'de' MMMM 'de' yyyy")}
                    </p>
                    <p className="text-xs text-ink-500">
                      Sessão nº {n.sessionNumber ?? "—"} · {n.psychologist.name}
                      {n.psychologist.crp && ` (CRP ${n.psychologist.crp})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.mood && <Badge tone="blue">{n.mood}</Badge>}
                    {(n.psychologistId === userId || admin) && (
                      <>
                        <Link href={`/pacientes/${patientId}/evolucoes/${n.id}`} className={buttonClass("ghost", "sm")}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Link>
                        <ConfirmForm action={deleteNoteAction} hidden={{ id: n.id }} message="Excluir esta evolução do prontuário?">
                          <button className={buttonClass("ghost", "sm", "text-red-600 hover:bg-red-50")} aria-label="Excluir">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </ConfirmForm>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-ink-50/70 p-4 text-sm leading-relaxed text-ink-700">
                  <p className="whitespace-pre-wrap">{n.content}</p>
                  {n.interventions && (
                    <p className="mt-3 whitespace-pre-wrap">
                      <span className="font-medium text-ink-900">Intervenções: </span>
                      {n.interventions}
                    </p>
                  )}
                  {n.plan && (
                    <p className="mt-3 whitespace-pre-wrap">
                      <span className="font-medium text-ink-900">Encaminhamentos / plano: </span>
                      {n.plan}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    );
  }

  async function SessionsTab({ patientId }: { patientId: string }) {
    const appts = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { startsAt: "desc" },
      take: 200,
      include: { psychologist: { select: { name: true } }, room: { select: { name: true } }, sessionNote: { select: { id: true } } },
    });
    if (appts.length === 0)
      return (
        <Card>
          <EmptyState
            icon={<CalendarPlus className="h-6 w-6" />}
            title="Nenhuma sessão"
            action={<ButtonLink href={`/agenda/novo?patientId=${patientId}`}>Agendar sessão</ButtonLink>}
          />
        </Card>
      );
    return (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Data</th>
                <th>Profissional</th>
                <th className="hidden md:table-cell">Tipo</th>
                <th className="hidden md:table-cell">Local</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Evolução</th>
              </tr>
            </thead>
            <tbody>
              {appts.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/agenda/${s.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                      {formatDate(s.startsAt, "dd/MM/yyyy HH:mm")}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{s.psychologist.name}</td>
                  <td className="hidden md:table-cell">{SESSION_TYPE[s.sessionType]}</td>
                  <td className="hidden md:table-cell">{s.mode === "ONLINE" ? "Online" : (s.room?.name ?? "Presencial")}</td>
                  <td>
                    <Badge tone={APPT_STATUS[s.status].tone}>{APPT_STATUS[s.status].label}</Badge>
                  </td>
                  <td className="hidden sm:table-cell">
                    {s.sessionNote ? <Badge tone="green">Registrada</Badge> : s.status === "REALIZADO" ? <Badge tone="amber">Pendente</Badge> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  async function FinanceTab({ patientId }: { patientId: string }) {
    const txs = await prisma.transaction.findMany({ where: { patientId }, orderBy: { dueDate: "desc" } });
    const paid = txs.filter((t) => t.status === "PAGO").reduce((s, t) => s + toNumber(t.amount), 0);
    const open = txs.filter((t) => t.status === "PENDENTE").reduce((s, t) => s + toNumber(t.amount), 0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total pago" value={formatCurrency(paid)} tone="green" />
          <StatCard label="Em aberto" value={formatCurrency(open)} tone="amber" />
        </div>
        <Card className="overflow-hidden">
          <CardHeader
            title="Lançamentos"
            action={
              <ButtonLink href={`/financeiro/novo?patientId=${patientId}`} size="sm" variant="secondary">
                Novo lançamento
              </ButtonLink>
            }
          />
          {txs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-500">Nenhum lançamento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Forma</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap">{formatDateOnly(t.dueDate)}</td>
                      <td className="min-w-[200px]">{t.description}</td>
                      <td className="whitespace-nowrap font-medium">{formatCurrency(t.amount)}</td>
                      <td>
                        <Badge tone={TX_STATUS[t.status].tone}>{TX_STATUS[t.status].label}</Badge>
                      </td>
                      <td className="hidden sm:table-cell">{t.method ? PAYMENT_METHOD[t.method] : "—"}</td>
                      <td className="whitespace-nowrap text-right">
                        {t.status === "PAGO" && (
                          <Link href={`/imprimir/recibo/${t.id}`} target="_blank" className="text-sm font-medium text-brand-700">
                            Recibo
                          </Link>
                        )}
                        {t.status === "PENDENTE" && (
                          <Link href={`/financeiro/${t.id}`} className="text-sm font-medium text-brand-700">
                            Receber
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  async function DocumentsTab({ patientId }: { patientId: string }) {
    const docs = await prisma.document.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: { psychologist: { select: { name: true } } },
    });
    return (
      <Card>
        <CardHeader
          title="Documentos emitidos"
          action={
            <ButtonLink href={`/documentos/novo?patientId=${patientId}`} size="sm">
              <FilePlus2 className="h-4 w-4" /> Novo documento
            </ButtonLink>
          }
        />
        {docs.length === 0 ? (
          <EmptyState icon={<FilePlus2 className="h-6 w-6" />} title="Nenhum documento emitido" description="Emita atestados, declarações, relatórios e laudos." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {docs.map((d) => (
              <li key={d.id}>
                <Link href={`/documentos/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{d.title}</p>
                    <p className="text-xs text-ink-500">
                      {DOC_TYPE[d.type]} · {d.psychologist.name} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm text-brand-700">Abrir</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }
}
