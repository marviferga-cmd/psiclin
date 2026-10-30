import "server-only";
import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { formatCPF } from "@/lib/utils";

/** Pacientes para os quais o usuário pode emitir documentos clínicos. */
export async function getDocumentPatients(user: CurrentUser) {
  const patients = await prisma.patient.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : { OR: [{ psychologistId: user.id }, { appointments: { some: { psychologistId: user.id } } }] },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, cpf: true },
  });
  return patients.map((p) => ({ id: p.id, name: p.fullName, cpf: p.cpf ? formatCPF(p.cpf) : "" }));
}
