import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader, Pagination, Select, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Auditoria" };

const PAGE = 50;

const ENTITY_LABEL: Record<string, string> = {
  auth: "Acesso",
  patient: "Paciente",
  anamnesis: "Anamnese",
  prontuario: "Prontuário",
  session_note: "Evolução",
  appointment: "Agendamento",
  transaction: "Financeiro",
  document: "Documento",
  user: "Usuário",
  settings: "Configurações",
  room: "Sala",
  insurance: "Convênio",
  sessoes: "Exportação",
  financeiro: "Exportação",
  pacientes: "Exportação",
};

const tone = (a: string) =>
  a.startsWith("EXCLUIR") || a === "LOGIN_FALHOU" ? "red" : a === "CRIAR" ? "green" : a.startsWith("VISUALIZAR") || a.startsWith("EXPORTAR") ? "violet" : a === "LOGIN" || a === "LOGOUT" ? "gray" : "blue";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; user?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.entity ? { entity: sp.entity } : {}),
    ...(sp.user ? { userId: sp.user } : {}),
  };
  const [total, logs, users] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { user: { select: { name: true } } } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Auditoria" description="Trilha de acessos e alterações (LGPD art. 37 — registro das operações de tratamento)." />
      <Card>
        <form className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row">
          <Select name="entity" defaultValue={sp.entity ?? ""} className="sm:w-56">
            <option value="">Todas as áreas</option>
            {Object.entries(ENTITY_LABEL)
              .filter(([k]) => !["sessoes", "financeiro"].includes(k))
              .map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
          </Select>
          <Select name="user" defaultValue={sp.user ?? ""} className="sm:w-56">
            <option value="">Todos os usuários</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <button className={buttonClass("secondary")}>Filtrar</button>
        </form>
        {logs.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Nenhum registro" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Data/hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Área</th>
                  <th className="hidden md:table-cell">Detalhes</th>
                  <th className="hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-ink-600">{formatDate(l.createdAt, "dd/MM/yy HH:mm:ss")}</td>
                    <td className="whitespace-nowrap">{l.user?.name ?? "—"}</td>
                    <td>
                      <Badge tone={tone(l.action)}>{l.action.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="whitespace-nowrap">{ENTITY_LABEL[l.entity] ?? l.entity}</td>
                    <td className="hidden max-w-xs truncate text-xs text-ink-500 md:table-cell">{l.details ?? (l.entityId ? l.entityId.slice(0, 8) : "")}</td>
                    <td className="hidden text-xs text-ink-400 lg:table-cell">{l.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          totalPages={Math.ceil(total / PAGE)}
          makeHref={(n) => `/auditoria?${new URLSearchParams({ ...(sp.entity ? { entity: sp.entity } : {}), ...(sp.user ? { user: sp.user } : {}), page: String(n) })}`}
        />
      </Card>
    </>
  );
}
