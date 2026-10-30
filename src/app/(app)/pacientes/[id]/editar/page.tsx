import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updatePatientAction } from "@/actions/patients";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInsurances, getPsychologists, patientToFormValues } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import { PatientForm } from "../../patient-form";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } }).catch(() => null);
  if (!patient) notFound();
  const [psychologists, insurances] = await Promise.all([getPsychologists(), getInsurances()]);
  return (
    <>
      <PageHeader title="Editar paciente" description={patient.fullName} back={{ href: `/pacientes/${id}`, label: "Voltar ao paciente" }} />
      <Card className="p-4 pb-0 sm:p-6 sm:pb-0">
        <PatientForm
          action={updatePatientAction.bind(null, id)}
          values={patientToFormValues(patient)}
          psychologists={psychologists}
          insurances={insurances}
          cancelHref={`/pacientes/${id}`}
        />
      </Card>
    </>
  );
}
