"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Toast } from "@/components/ui/client";
import { logoutAction } from "@/actions/auth";
import { HelpCenter, type SupportContact } from "@/components/help/help-center";
import type { Role } from "@/lib/session-token";

const ICONS = {
  dashboard: LayoutDashboard,
  agenda: CalendarDays,
  patients: Users,
  finance: Wallet,
  documents: FileText,
  reports: BarChart3,
  team: UsersRound,
  settings: Settings,
  audit: ShieldCheck,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; section?: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function FlashToast() {
  const params = useSearchParams();
  const ok = params.get("ok");
  const err = params.get("erro");
  const messages: Record<string, string> = { "acesso-negado": "Você não tem permissão para acessar esta área." };
  if (err) return <Toast message={messages[err] ?? err} tone="red" />;
  return <Toast message={ok} />;
}

export function AppShell({
  user,
  clinicName,
  nav,
  help,
  children,
}: {
  user: { name: string; email: string; roleLabel: string; color: string };
  clinicName: string;
  nav: NavItem[];
  help: { role: Role; contact: SupportContact };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  const sections = nav.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.section ?? "";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-serif text-xl font-bold text-white">Ψ</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">PsiClin</p>
          <p className="truncate text-xs text-brand-200/80">{clinicName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            {section && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-300/60">{section}</p>}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        active ? "bg-white/10 text-white" : "text-brand-100/80 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/perfil" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: user.color }}
          >
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{user.name}</span>
            <span className="block truncate text-xs text-brand-200/70">{user.roleLabel}</span>
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-brand-950 lg:block">{sidebar}</aside>

      {/* Drawer mobile/tablet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-brand-950 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-brand-100 hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <form
            className="relative max-w-md flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/pacientes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar paciente por nome, CPF ou telefone..."
              className="h-10 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <HelpCenter role={help.role} contact={help.contact} />
            <Link
              href="/agenda/novo"
              className="hidden h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700 sm:inline-flex"
            >
              <Plus className="h-4 w-4" /> Agendar
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white"
                style={{ backgroundColor: user.color }}
                aria-label="Menu do usuário"
              >
                {initials(user.name)}
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg">
                    <div className="border-b border-ink-100 px-4 py-3">
                      <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
                      <p className="truncate text-xs text-ink-500">{user.email}</p>
                    </div>
                    <Link href="/perfil" className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
                      <UserCircle className="h-4 w-4" /> Meu perfil
                    </Link>
                    <form action={logoutAction}>
                      <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* Ação rápida flutuante no mobile */}
      <Link
        href="/agenda/novo"
        className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 sm:hidden"
        aria-label="Novo agendamento"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <Suspense>
        <FlashToast />
      </Suspense>
    </div>
  );
}
