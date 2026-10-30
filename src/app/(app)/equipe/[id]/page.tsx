import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { saveUserAction } from "@/actions/users";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Editar usuário" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id } }).catch(() => null);
  if (!u) notFound();
  return (
    <>
      <PageHeader title="Editar usuário" description={u.email} back={{ href: "/equipe", label: "Equipe" }} />
      <Card className="mx-auto max-w-3xl p-4 sm:p-6">
        <UserForm
          isEdit
          action={saveUserAction.bind(null, id)}
          values={{ name: u.name, email: u.email, role: u.role, crp: u.crp, specialty: u.specialty, phone: u.phone, color: u.color }}
        />
      </Card>
    </>
  );
}
