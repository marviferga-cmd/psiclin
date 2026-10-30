import type { Metadata } from "next";
import { saveUserAction } from "@/actions/users";
import { requireRole } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NewUserPage() {
  await requireRole("ADMIN");
  return (
    <>
      <PageHeader title="Novo usuário" back={{ href: "/equipe", label: "Equipe" }} />
      <Card className="mx-auto max-w-3xl p-4 sm:p-6">
        <UserForm action={saveUserAction.bind(null, null)} values={{}} />
      </Card>
    </>
  );
}
