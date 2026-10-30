import "server-only";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import type { PatientOption } from "./appointment-form";

export async function getPatientOptions(includeId?: string): Promise<PatientOption[]> {
  const patients = await prisma.patient.findMany({
    where: { OR: [{ status: { in: ["ATIVO", "LISTA_ESPERA"] } }, ...(includeId ? [{ id: includeId }] : [])] },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      socialName: true,
      cpf: true,
      sessionPrice: true,
      psychologistId: true,
      insurance: { select: { price: true } },
    },
  });
  return patients.map((p) => ({
    id: p.id,
    name: p.socialName ? `${p.socialName} (${p.fullName})` : p.fullName,
    doc: p.cpf ?? "",
    price: p.sessionPrice !== null ? toNumber(p.sessionPrice) : p.insurance?.price ? toNumber(p.insurance.price) : null,
    psychologistId: p.psychologistId,
  }));
}
