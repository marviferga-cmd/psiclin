import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Avatar, Card, CardHeader, PageHeader } from "@/components/ui";
import { PasswordForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const me = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  return (
    <>
      <PageHeader title="Meu perfil" description="Gerencie seus dados de acesso." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-6 text-center">
          <div className="flex justify-center">
            <Avatar name={user.name} color={user.color} size="lg" />
          </div>
          <p className="mt-3 font-semibold text-ink-900">{user.name}</p>
          <p className="text-sm text-ink-500">{user.email}</p>
          <p className="mt-2 text-sm text-brand-700">{ROLE_LABEL[user.role]}</p>
          {user.crp && <p className="text-xs text-ink-500">CRP {user.crp}</p>}
          <p className="mt-4 text-xs text-ink-400">Último acesso: {formatDate(user.lastLoginAt, "dd/MM/yyyy HH:mm")}</p>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Dados pessoais" />
            <div className="p-5">
              <ProfileForm name={user.name} phone={user.phone ?? ""} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Alterar senha" description="Use ao menos 8 caracteres, com letras e números." />
            <div className="p-5">
              <PasswordForm />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
