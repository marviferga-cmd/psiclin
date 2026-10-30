import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { updateAppointmentAction } from "@/actions/appointments";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPsychologists, getRooms, getSettings } from "@/lib/queries";
import { toNumber } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { AppointmentForm } from "../../appointment-form";
import { getPatientOptions } from "../../data";

export const metadata: Metadata = { title: "Editar agendamento" };

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const appt = await prisma.appointment.findUnique({ where: { id } }).catch(() => null);
  if (!appt) notFound();
  const [settings, psychologists, rooms, patients] = await Promise.all([
    getSettings(),
    getPsychologists(),
    getRooms(),
    getPatientOptions(appt.patientId),
  ]);
  return (
    <>
      <PageHeader title="Editar agendamento" back={{ href: `/agenda/${id}`, label: "Voltar" }} />
      <Card className="mx-auto max-w-3xl p-4 sm:p-6">
        <AppointmentForm
          isEdit
          action={updateAppointmentAction.bind(null, id)}
          patients={patients}
          psychologists={psychologists}
          rooms={rooms}
          defaultPrice={toNumber(settings.sessionPrice)}
          defaultDuration={settings.sessionMinutes}
          cancelHref={`/agenda/${id}`}
          values={{
            patientId: appt.patientId,
            psychologistId: appt.psychologistId,
            roomId: appt.roomId,
            date: format(appt.startsAt, "yyyy-MM-dd"),
            time: format(appt.startsAt, "HH:mm"),
            duration: Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60000),
            mode: appt.mode,
            sessionType: appt.sessionType,
            price: toNumber(appt.price),
            onlineLink: appt.onlineLink,
            notes: appt.notes,
          }}
        />
      </Card>
    </>
  );
}
