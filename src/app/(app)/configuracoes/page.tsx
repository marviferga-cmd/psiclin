import type { Metadata } from "next";
import { addInsuranceAction, addRoomAction, toggleInsuranceAction, toggleRoomAction } from "@/actions/settings";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/queries";
import { formatCurrency, formatPhone, toNumber } from "@/lib/utils";
import { Badge, Card, CardHeader, Input, PageHeader, Tabs, buttonClass } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("ADMIN");
  const { tab: t } = await searchParams;
  const tab = t === "salas" || t === "convenios" ? t : "clinica";
  const settings = await getSettings();

  return (
    <>
      <PageHeader title="Configurações" description="Dados da clínica, salas de atendimento e convênios." />
      <Tabs
        active={tab}
        items={[
          { key: "clinica", label: "Clínica", href: "/configuracoes" },
          { key: "salas", label: "Salas", href: "/configuracoes?tab=salas" },
          { key: "convenios", label: "Convênios", href: "/configuracoes?tab=convenios" },
        ]}
      />

      {tab === "clinica" && (
        <Card className="p-4 sm:p-6">
          <SettingsForm
            values={{
              ...settings,
              sessionPrice: toNumber(settings.sessionPrice).toFixed(2).replace(".", ","),
              updatedAt: null,
            }}
          />
        </Card>
      )}

      {tab === "salas" && <Rooms />}
      {tab === "convenios" && <Insurances />}
    </>
  );
}

async function Rooms() {
  const rooms = await prisma.room.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { appointments: true } } } });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Salas de atendimento" />
        {rooms.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Nenhuma sala cadastrada.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{r.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {r.description ?? "—"} · {r._count.appointments} agendamentos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.active ? "green" : "gray"}>{r.active ? "Ativa" : "Inativa"}</Badge>
                  <form action={toggleRoomAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className={buttonClass("ghost", "sm")}>{r.active ? "Desativar" : "Ativar"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="h-fit">
        <CardHeader title="Nova sala" />
        <form action={addRoomAction} className="space-y-3 p-5">
          <Input name="name" placeholder="Nome (ex.: Sala 1)" required />
          <Input name="description" placeholder="Descrição (opcional)" />
          <button className={buttonClass("primary", "md", "w-full")}>Adicionar sala</button>
        </form>
      </Card>
    </div>
  );
}

async function Insurances() {
  const list = await prisma.healthInsurance.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { patients: true } } } });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Convênios" />
        {list.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-500">Nenhum convênio cadastrado.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {list.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{i.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {i.ansCode ? `ANS ${i.ansCode} · ` : ""}
                    {i.price ? `${formatCurrency(i.price)}/sessão · ` : ""}
                    {formatPhone(i.phone) ? `${formatPhone(i.phone)} · ` : ""}
                    {i._count.patients} pacientes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={i.active ? "green" : "gray"}>{i.active ? "Ativo" : "Inativo"}</Badge>
                  <form action={toggleInsuranceAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className={buttonClass("ghost", "sm")}>{i.active ? "Desativar" : "Ativar"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="h-fit">
        <CardHeader title="Novo convênio" />
        <form action={addInsuranceAction} className="space-y-3 p-5">
          <Input name="name" placeholder="Nome do convênio" required />
          <Input name="ansCode" placeholder="Registro ANS (opcional)" />
          <Input name="phone" placeholder="Telefone (opcional)" />
          <Input name="price" inputMode="decimal" placeholder="Valor repassado por sessão (R$)" />
          <button className={buttonClass("primary", "md", "w-full")}>Adicionar convênio</button>
        </form>
      </Card>
    </div>
  );
}
