import type { Metadata } from "next";
import { createPatientAction } from "@/actions/patients";
import { requireUser } from "@/lib/auth";
import { getInsurances, getPsychologists } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import { PatientForm } from "../patient-form";

export const metadata: Metadata = { title: "Novo paciente" };

export default async function NewPatientPage() {
  const user = await requireUser();
  const [psychologists, insurances] = await Promise.all([getPsychologists(), getInsurances()]);
  return (
    <>
      <PageHeader title="Novo paciente" description="Preencha os dados de cadastro." back={{ href: "/pacientes", label: "Pacientes" }} />
      <Card className="p-4 pb-0 sm:p-6 sm:pb-0">
        <PatientForm
          action={createPatientAction}
          psychologists={psychologists}
          insurances={insurances}
          values={user.role === "PSICOLOGO" ? { psychologistId: user.id } : {}}
          cancelHref="/pacientes"
        />
      </Card>
    </>
  );
}
