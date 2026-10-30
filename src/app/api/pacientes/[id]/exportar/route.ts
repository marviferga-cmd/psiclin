import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Portabilidade de dados (LGPD art. 18, V): exporta todos os dados do titular em JSON. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  const patient = await prisma.patient
    .findUnique({
      where: { id },
      include: {
        anamnesis: true,
        insurance: { select: { name: true } },
        psychologist: { select: { name: true, crp: true } },
        appointments: { orderBy: { startsAt: "asc" }, select: { startsAt: true, endsAt: true, status: true, mode: true, sessionType: true, price: true } },
        sessionNotes: { orderBy: { sessionDate: "asc" }, include: { psychologist: { select: { name: true, crp: true } } } },
        transactions: { orderBy: { dueDate: "asc" } },
        documents: { orderBy: { createdAt: "asc" } },
      },
    })
    .catch(() => null);
  if (!patient) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  await audit(user.id, "EXPORTAR_LGPD", "patient", id);
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), patient }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="paciente-${id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
