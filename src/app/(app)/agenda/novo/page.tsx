import type { Metadata } from "next";
import { format } from "date-fns";
import { createAppointmentAction } from "@/actions/appointments";
import { requireUser } from "@/lib/auth";
import { getPsychologists, getRooms, getSettings } from "@/lib/queries";
import { toNumber } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { AppointmentForm } from "../appointment-form";
import { getPatientOptions } from "../data";

export const metadata: Metadata = { title: "Novo agendamento" };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; patientId?: string; psychologistId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const [settings, psychologists, rooms, patients] = await Promise.all([getSettings(), getPsychologists(), getRooms(), getPatientOptions(sp.patientId)]);
  const patient = patients.find((p) => p.id === sp.patientId);
  const psychologistId =
    sp.psychologistId ?? patient?.psychologistId ?? (user.role !== "RECEPCAO" && psychologists.some((p) => p.id === user.id) ? user.id : psychologists[0]?.id);

  return (
    <>
      <PageHeader title="Novo agendamento" back={{ href: "/agenda", label: "Agenda" }} />
      <Card className="mx-auto max-w-3xl p-4 sm:p-6">
        <AppointmentForm
          action={createAppointmentAction}
          patients={patients}
          psychologists={psychologists}
          rooms={rooms}
          defaultPrice={toNumber(settings.sessionPrice)}
          defaultDuration={settings.sessionMinutes}
          cancelHref="/agenda"
          values={{
            patientId: sp.patientId,
            psychologistId,
            date: sp.date ?? format(new Date(), "yyyy-MM-dd"),
            time: sp.time ?? "",
          }}
        />
      </Card>
    </>
  );
}
