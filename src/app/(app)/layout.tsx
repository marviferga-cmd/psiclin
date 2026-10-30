import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/constants";
import { canManageFinance, isAdmin } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await prisma.clinicSettings.findFirst({ select: { name: true } });

  const nav: NavItem[] = [
    { href: "/", label: "Painel", icon: "dashboard", section: "Atendimento" },
    { href: "/agenda", label: "Agenda", icon: "agenda", section: "Atendimento" },
    { href: "/pacientes", label: "Pacientes", icon: "patients", section: "Atendimento" },
  ];
  if (user.role !== "RECEPCAO") nav.push({ href: "/documentos", label: "Documentos", icon: "documents", section: "Atendimento" });
  if (canManageFinance(user)) nav.push({ href: "/financeiro", label: "Financeiro", icon: "finance", section: "Gestão" });
  nav.push({ href: "/relatorios", label: "Relatórios", icon: "reports", section: "Gestão" });
  if (isAdmin(user)) {
    nav.push(
      { href: "/equipe", label: "Equipe", icon: "team", section: "Administração" },
      { href: "/configuracoes", label: "Configurações", icon: "settings", section: "Administração" },
      { href: "/auditoria", label: "Auditoria", icon: "audit", section: "Administração" },
    );
  }

  return (
    <AppShell
      user={{ name: user.name, email: user.email, roleLabel: ROLE_LABEL[user.role], color: user.color }}
      clinicName={settings?.name ?? "Clínica"}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
