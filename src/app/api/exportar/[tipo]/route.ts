import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canManageFinance } from "@/lib/permissions";
import { APPT_MODE, APPT_STATUS, PATIENT_STATUS, PAYMENT_METHOD, SESSION_TYPE, TX_STATUS, TX_TYPE } from "@/lib/constants";
import { formatCPF, formatDateOnly, formatPhone, parseDateOnly, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function csv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM + ";" para abrir corretamente no Excel em pt-BR
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

const money = (v: unknown) => toNumber(v).toFixed(2).replace(".", ",");

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { tipo } = await params;
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? format(new Date(), "yyyy-MM-01");
  const to = sp.get("to") ?? format(new Date(), "yyyy-MM-dd");
  let body: string;

  if (tipo === "sessoes") {
    const appts = await prisma.appointment.findMany({
      where: {
        startsAt: { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59.999`) },
        ...(user.role === "PSICOLOGO" ? { psychologistId: user.id } : {}),
      },
      orderBy: { startsAt: "asc" },
      include: { patient: { select: { fullName: true } }, psychologist: { select: { name: true } }, room: { select: { name: true } } },
    });
    body = csv([
      ["Data", "Início", "Fim", "Paciente", "Profissional", "Tipo", "Modalidade", "Sala", "Status", "Valor"],
      ...appts.map((a) => [
        format(a.startsAt, "dd/MM/yyyy"),
        format(a.startsAt, "HH:mm"),
        format(a.endsAt, "HH:mm"),
        a.patient.fullName,
        a.psychologist.name,
        SESSION_TYPE[a.sessionType],
        APPT_MODE[a.mode],
        a.room?.name,
        APPT_STATUS[a.status].label,
        money(a.price),
      ]),
    ]);
  } else if (tipo === "financeiro") {
    if (!canManageFinance(user)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const txs = await prisma.transaction.findMany({
      where: { dueDate: { gte: parseDateOnly(from)!, lte: parseDateOnly(to)! } },
      orderBy: { dueDate: "asc" },
      include: { patient: { select: { fullName: true } } },
    });
    body = csv([
      ["Vencimento", "Tipo", "Categoria", "Descrição", "Paciente", "Valor", "Status", "Pago em", "Forma"],
      ...txs.map((t) => [
        formatDateOnly(t.dueDate),
        TX_TYPE[t.type],
        t.category,
        t.description,
        t.patient?.fullName,
        money(t.amount),
        TX_STATUS[t.status].label,
        t.paidAt ? format(t.paidAt, "dd/MM/yyyy") : "",
        t.method ? PAYMENT_METHOD[t.method] : "",
      ]),
    ]);
  } else if (tipo === "pacientes") {
    if (user.role === "PSICOLOGO") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    const patients = await prisma.patient.findMany({
      orderBy: { fullName: "asc" },
      include: { psychologist: { select: { name: true } }, insurance: { select: { name: true } } },
    });
    body = csv([
      ["Nome", "Nome social", "CPF", "Nascimento", "Celular", "E-mail", "Cidade", "UF", "Profissional", "Convênio", "Situação", "Cadastro"],
      ...patients.map((p) => [
        p.fullName,
        p.socialName,
        p.cpf ? formatCPF(p.cpf) : "",
        p.birthDate ? formatDateOnly(p.birthDate) : "",
        formatPhone(p.phone),
        p.email,
        p.city,
        p.state,
        p.psychologist?.name,
        p.insurance?.name ?? "Particular",
        PATIENT_STATUS[p.status].label,
        format(p.createdAt, "dd/MM/yyyy"),
      ]),
    ]);
  } else {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 404 });
  }

  await audit(user.id, "EXPORTAR", tipo, null, `${from} a ${to}`);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="psiclin-${tipo}-${format(new Date(), "yyyyMMdd-HHmm")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
