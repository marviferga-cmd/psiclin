import type { Metadata } from "next";
import { CalendarCheck, FileLock2, LineChart } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 font-serif text-2xl font-bold">Ψ</span>
          <span className="text-lg font-semibold">PsiClin</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">Gestão completa para a sua clínica de psicologia.</h1>
          <p className="mt-4 text-brand-100/80">
            Agenda, prontuário eletrônico, financeiro e documentos em um só lugar — com sigilo e segurança em conformidade
            com a LGPD e o Código de Ética do CFP.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-brand-50/90">
            <li className="flex items-center gap-3">
              <CalendarCheck className="h-5 w-5 text-brand-300" /> Agenda inteligente com recorrência e controle de faltas
            </li>
            <li className="flex items-center gap-3">
              <FileLock2 className="h-5 w-5 text-brand-300" /> Prontuário com acesso restrito e trilha de auditoria
            </li>
            <li className="flex items-center gap-3">
              <LineChart className="h-5 w-5 text-brand-300" /> Financeiro, recibos e relatórios gerenciais
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-brand-200/60">© {new Date().getFullYear()} PsiClin</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-serif text-xl font-bold text-white">Ψ</span>
            <span className="text-lg font-semibold text-ink-900">PsiClin</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Bem-vindo(a) de volta</h2>
          <p className="mt-1 text-sm text-ink-500">Acesse sua conta para continuar.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
