import type { Metadata } from "next";
import Link from "next/link";
import { Prisma, type PatientStatus } from "@prisma/client";
import { ChevronRight, Phone, Plus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPsychologists } from "@/lib/queries";
import { PATIENT_STATUS } from "@/lib/constants";
import { age, displayName, formatCPF, formatDate, formatPhone, onlyDigits } from "@/lib/utils";
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Pacientes" };

const PAGE_SIZE = 20;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; prof?: string; page?: string; mine?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status && sp.status in PATIENT_STATUS ? (sp.status as PatientStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const prof = sp.prof || undefined;

  const where: Prisma.PatientWhereInput = {
    ...(status ? { status } : {}),
    ...(prof ? { psychologistId: prof } : {}),
  };
  if (q) {
    const digits = onlyDigits(q);
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { socialName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ cpf: { contains: digits } }, { phone: { contains: digits } }] : []),
    ];
  }

  const [total, patients, psychologists, counts] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        psychologist: { select: { name: true, color: true } },
        insurance: { select: { name: true } },
        appointments: {
          where: { startsAt: { gte: new Date() }, status: { in: ["AGENDADO", "CONFIRMADO"] } },
          orderBy: { startsAt: "asc" },
          take: 1,
          select: { startsAt: true },
        },
      },
    }),
    getPsychologists(),
    prisma.patient.groupBy({ by: ["status"], _count: true }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const countOf = (s: PatientStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const allCount = counts.reduce((a, c) => a + c._count, 0);

  const href = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q: q || undefined, status, prof, ...params };
    Object.entries(merged).forEach(([k, v]) => v && u.set(k, String(v)));
    const s = u.toString();
    return `/pacientes${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Pacientes"
        description={`${allCount} pacientes cadastrados`}
        actions={
          <ButtonLink href="/pacientes/novo">
            <Plus className="h-4 w-4" /> Novo paciente
          </ButtonLink>
        }
      />

      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Link href={href({ status: undefined, page: undefined })} className={buttonClass(!status ? "primary" : "secondary", "sm")}>
          Todos <span className="opacity-70">{allCount}</span>
        </Link>
        {(Object.keys(PATIENT_STATUS) as PatientStatus[]).map((s) => (
          <Link key={s} href={href({ status: s, page: undefined })} className={buttonClass(status === s ? "primary" : "secondary", "sm")}>
            {PATIENT_STATUS[s].label} <span className="opacity-70">{countOf(s)}</span>
          </Link>
        ))}
      </div>

      <Card>
        <form className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row" action="/pacientes">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Buscar por nome, CPF, telefone ou e-mail" className="input flex-1" />
          <Select name="prof" defaultValue={prof ?? ""} className="sm:w-60">
            <option value="">Todos os profissionais</option>
            {psychologists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <button className={buttonClass("secondary")}>Filtrar</button>
        </form>

        {patients.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={q ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
            description={q ? "Tente outro termo de busca." : "Cadastre o primeiro paciente da clínica."}
            action={!q && <ButtonLink href="/pacientes/novo">Cadastrar paciente</ButtonLink>}
          />
        ) : (
          <>
            {/* Desktop/tablet: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Contato</th>
                    <th className="hidden xl:table-cell">Profissional</th>
                    <th className="hidden lg:table-cell">Convênio</th>
                    <th>Próxima sessão</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => {
                    const a = age(p.birthDate);
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/pacientes/${p.id}`} className="flex items-center gap-3">
                            <Avatar name={p.fullName} size="sm" color="#64748b" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink-900 hover:text-brand-700">{displayName(p)}</span>
                              <span className="block text-xs text-ink-500">
                                {p.cpf ? formatCPF(p.cpf) : "CPF não informado"}
                                {a !== null && ` · ${a} anos`}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap text-ink-600">{formatPhone(p.phone) || "—"}</td>
                        <td className="hidden xl:table-cell">
                          {p.psychologist ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.psychologist.color }} />
                              {p.psychologist.name}
                            </span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="hidden text-ink-600 lg:table-cell">{p.insurance?.name ?? "Particular"}</td>
                        <td className="whitespace-nowrap text-ink-600">
                          {p.appointments[0] ? formatDate(p.appointments[0].startsAt, "dd/MM 'às' HH:mm") : "—"}
                        </td>
                        <td>
                          <Badge tone={PATIENT_STATUS[p.status].tone}>{PATIENT_STATUS[p.status].label}</Badge>
                        </td>
                        <td className="text-right">
                          <Link href={`/pacientes/${p.id}`} className="text-ink-400 hover:text-brand-700" aria-label="Abrir">
                            <ChevronRight className="h-5 w-5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cartões */}
            <ul className="divide-y divide-ink-100 md:hidden">
              {patients.map((p) => (
                <li key={p.id}>
                  <Link href={`/pacientes/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-ink-50">
                    <Avatar name={p.fullName} size="sm" color="#64748b" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-ink-900">{displayName(p)}</p>
                        <Badge tone={PATIENT_STATUS[p.status].tone}>{PATIENT_STATUS[p.status].label}</Badge>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                        <Phone className="h-3 w-3" /> {formatPhone(p.phone) || "Sem telefone"}
                        {p.appointments[0] && <> · Próx.: {formatDate(p.appointments[0].startsAt, "dd/MM HH:mm")}</>}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} makeHref={(n) => href({ page: String(n) })} />
          </>
        )}
      </Card>
      {user.role === "RECEPCAO" && (
        <p className="mt-4 text-xs text-ink-400">Informações clínicas são visíveis apenas para os psicólogos responsáveis.</p>
      )}
    </>
  );
}
