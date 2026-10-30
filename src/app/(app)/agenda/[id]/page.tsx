import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarX2, Check, CheckCheck, Clock, MessageCircle, NotebookPen, Pencil, Trash2, UserX, Video } from "lucide-react";
import { cancelSeriesAction, deleteAppointmentAction, setAppointmentStatusAction } from "@/actions/appointments";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageFinance, canViewClinical } from "@/lib/permissions";
import { APPT_MODE, APPT_STATUS, SESSION_TYPE, TX_STATUS } from "@/lib/constants";
import { displayName, formatCurrency, formatPhone, whatsappLink } from "@/lib/utils";
import { Badge, ButtonLink, Card, CardHeader, InfoRow, PageHeader, buttonClass } from "@/components/ui";
import { ConfirmForm } from "@/components/ui/client";

export const metadata: Metadata = { title: "Agendamento" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const appt = await prisma.appointment
    .findUnique({
      where: { id },
      include: {
        patient: true,
        psychologist: { select: { id: true, name: true, crp: true, color: true } },
        room: true,
        sessionNote: { select: { id: true } },
        transactions: true,
        createdBy: { select: { name: true } },
      },
    })
    .catch(() => null);
  if (!appt) notFound();

  const clinical = canViewClinical(user, appt.patient, appt.psychologistId === user.id);
  const seriesCount = appt.recurrenceId
    ? await prisma.appointment.count({ where: { recurrenceId: appt.recurrenceId, startsAt: { gte: appt.startsAt }, status: { in: ["AGENDADO", "CONFIRMADO"] } } })
    : 0;
  const name = displayName(appt.patient);
  const confirmText = `Olá, ${name.split(" ")[0]}! Confirmando sua sessão em ${format(appt.startsAt, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}${appt.mode === "ONLINE" && appt.onlineLink ? ` (online: ${appt.onlineLink})` : ""}. Podemos confirmar?`;
  const wa = whatsappLink(appt.patient.phone, confirmText);
  const back = `/agenda/${id}`;

  const StatusButton = ({ status, label, icon, variant = "secondary" }: { status: string; label: string; icon: React.ReactNode; variant?: "secondary" | "success" | "danger" | "primary" }) => (
    <form action={setAppointmentStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="back" value={back} />
      <button className={buttonClass(variant, "md", "w-full")} disabled={appt.status === status}>
        {icon} {label}
      </button>
    </form>
  );

  return (
    <>
      <PageHeader
        title={name}
        description={<span className="capitalize">{format(appt.startsAt, "EEEE, dd 'de' MMMM 'de' yyyy · HH:mm", { locale: ptBR })} – {format(appt.endsAt, "HH:mm")}</span>}
        back={{ href: `/agenda?date=${format(appt.startsAt, "yyyy-MM-dd")}`, label: "Agenda" }}
        actions={
          <>
            <Badge tone={APPT_STATUS[appt.status].tone} className="px-3 py-1 text-sm">
              {APPT_STATUS[appt.status].label}
            </Badge>
            <ButtonLink href={`/agenda/${id}/editar`} variant="secondary" size="sm">
              <Pencil className="h-4 w-4" /> Editar / remarcar
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Atualizar status" description="Ao marcar como realizada, a cobrança é gerada automaticamente no financeiro." />
            <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-4">
              <StatusButton status="CONFIRMADO" label="Confirmar" icon={<Check className="h-4 w-4" />} />
              <StatusButton status="REALIZADO" label="Realizada" icon={<CheckCheck className="h-4 w-4" />} variant="success" />
              <StatusButton status="FALTOU" label="Faltou" icon={<UserX className="h-4 w-4" />} />
              <StatusButton status="CANCELADO" label="Cancelar" icon={<CalendarX2 className="h-4 w-4" />} />
            </div>
            {appt.status !== "AGENDADO" && (
              <div className="border-t border-ink-100 px-5 py-3">
                <form action={setAppointmentStatusAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="status" value="AGENDADO" />
                  <input type="hidden" name="back" value={back} />
                  <button className="text-sm text-ink-500 underline hover:text-ink-800">Voltar para “Agendado”</button>
                </form>
              </div>
            )}
            {appt.status === "FALTOU" && canManageFinance(user) && appt.transactions.length === 0 && Number(appt.price) > 0 && (
              <div className="border-t border-ink-100 px-5 py-3">
                <form action={setAppointmentStatusAction} className="flex flex-wrap items-center gap-3 text-sm">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="status" value="FALTOU" />
                  <input type="hidden" name="back" value={back} />
                  <input type="hidden" name="chargeNoShow" value="on" />
                  <span className="text-ink-600">Falta sem aviso prévio?</span>
                  <button className={buttonClass("secondary", "sm")}>Gerar cobrança da falta</button>
                </form>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Detalhes da sessão" />
            <dl className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3">
              <InfoRow label="Profissional" value={`${appt.psychologist.name}${appt.psychologist.crp ? ` · CRP ${appt.psychologist.crp}` : ""}`} />
              <InfoRow label="Tipo" value={SESSION_TYPE[appt.sessionType]} />
              <InfoRow label="Modalidade" value={APPT_MODE[appt.mode]} />
              <InfoRow label="Sala" value={appt.room?.name} />
              <InfoRow label="Valor" value={formatCurrency(appt.price)} />
              <InfoRow label="Duração" value={`${Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000)} min`} />
              {appt.onlineLink && (
                <InfoRow
                  label="Link"
                  value={
                    <a href={appt.onlineLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline">
                      <Video className="h-4 w-4" /> Entrar na chamada
                    </a>
                  }
                />
              )}
              <InfoRow label="Agendado por" value={appt.createdBy?.name} />
              {appt.recurrenceId && <InfoRow label="Recorrência" value={`${seriesCount} sessões futuras na série`} />}
            </dl>
            {appt.notes && (
              <div className="border-t border-ink-100 p-5">
                <InfoRow label="Observações" value={<span className="whitespace-pre-wrap">{appt.notes}</span>} />
              </div>
            )}
          </Card>

          {canManageFinance(user) && appt.transactions.length > 0 && (
            <Card>
              <CardHeader title="Financeiro" />
              <ul className="divide-y divide-ink-100">
                {appt.transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span>{formatCurrency(t.amount)}</span>
                    <Badge tone={TX_STATUS[t.status].tone}>{TX_STATUS[t.status].label}</Badge>
                    <Link href={`/financeiro/${t.id}`} className="font-medium text-brand-700">
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Paciente" />
            <div className="space-y-3 p-5 text-sm">
              <Link href={`/pacientes/${appt.patientId}`} className="block font-medium text-brand-700 hover:underline">
                {appt.patient.fullName}
              </Link>
              <p className="text-ink-600">{formatPhone(appt.patient.phone) || "Sem telefone"}</p>
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md", "w-full")}>
                  <MessageCircle className="h-4 w-4" /> Enviar confirmação (WhatsApp)
                </a>
              )}
            </div>
          </Card>

          {clinical && (
            <Card>
              <CardHeader title="Prontuário" />
              <div className="p-5">
                {appt.sessionNote ? (
                  <ButtonLink href={`/pacientes/${appt.patientId}/evolucoes/${appt.sessionNote.id}`} variant="secondary" className="w-full">
                    <NotebookPen className="h-4 w-4" /> Ver evolução
                  </ButtonLink>
                ) : (
                  <ButtonLink href={`/pacientes/${appt.patientId}/evolucoes/nova?appointmentId=${id}`} className="w-full">
                    <NotebookPen className="h-4 w-4" /> Registrar evolução
                  </ButtonLink>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Outras ações" />
            <div className="space-y-2 p-5">
              {appt.recurrenceId && seriesCount > 0 && (
                <ConfirmForm action={cancelSeriesAction} hidden={{ id }} message={`Cancelar esta e as próximas ${seriesCount} sessões da série?`}>
                  <button className={buttonClass("secondary", "md", "w-full")}>
                    <Clock className="h-4 w-4" /> Cancelar série a partir desta
                  </button>
                </ConfirmForm>
              )}
              <ConfirmForm action={deleteAppointmentAction} hidden={{ id }} message="Excluir este agendamento definitivamente?">
                <button className={buttonClass("ghost", "md", "w-full text-red-600 hover:bg-red-50")}>
                  <Trash2 className="h-4 w-4" /> Excluir agendamento
                </button>
              </ConfirmForm>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
