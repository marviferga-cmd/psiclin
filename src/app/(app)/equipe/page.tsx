import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { toggleUserAction } from "@/actions/users";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate, formatPhone } from "@/lib/utils";
import { Avatar, Badge, ButtonLink, Card, PageHeader, buttonClass } from "@/components/ui";
import { ConfirmForm } from "@/components/ui/client";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage() {
  const me = await requireRole("ADMIN");
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { patients: { where: { status: "ATIVO" } } } } },
  });
  return (
    <>
      <PageHeader
        title="Equipe"
        description="Profissionais e colaboradores com acesso ao sistema."
        actions={
          <ButtonLink href="/equipe/novo">
            <UserPlus className="h-4 w-4" /> Novo usuário
          </ButtonLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((u) => (
          <Card key={u.id} className={`p-5 ${u.active ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-3">
              <Avatar name={u.name} color={u.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{u.name}</p>
                <p className="truncate text-sm text-ink-500">{u.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={u.role === "ADMIN" ? "violet" : u.role === "PSICOLOGO" ? "teal" : "blue"}>{ROLE_LABEL[u.role]}</Badge>
                  {!u.active && <Badge tone="red">Inativo</Badge>}
                  {u.id === me.id && <Badge>Você</Badge>}
                </div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-ink-400">CRP</dt>
                <dd className="text-ink-700">{u.crp ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Pacientes ativos</dt>
                <dd className="text-ink-700">{u._count.patients}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Telefone</dt>
                <dd className="text-ink-700">{formatPhone(u.phone) || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-400">Último acesso</dt>
                <dd className="text-ink-700">{formatDate(u.lastLoginAt, "dd/MM HH:mm")}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2 border-t border-ink-100 pt-4">
              <Link href={`/equipe/${u.id}`} className={buttonClass("secondary", "sm", "flex-1")}>
                Editar
              </Link>
              {u.id !== me.id && (
                <ConfirmForm action={toggleUserAction} hidden={{ id: u.id }} message={u.active ? `Desativar o acesso de ${u.name}?` : `Reativar ${u.name}?`} className="flex-1">
                  <button className={buttonClass("ghost", "sm", `w-full ${u.active ? "text-red-600 hover:bg-red-50" : ""}`)}>{u.active ? "Desativar" : "Reativar"}</button>
                </ConfirmForm>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
