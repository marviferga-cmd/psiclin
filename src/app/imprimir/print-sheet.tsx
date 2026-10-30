import type { ClinicSettings } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrintButton } from "@/components/ui/client";
import { formatPhone } from "@/lib/utils";

export function PrintSheet({
  settings,
  title,
  children,
  signer,
  date = new Date(),
}: {
  settings: ClinicSettings;
  title: string;
  children: React.ReactNode;
  signer: { name: string; crp?: string | null; label?: string };
  date?: Date;
}) {
  const address = [settings.street, settings.number, settings.complement, settings.district, settings.city && `${settings.city}${settings.state ? `/${settings.state}` : ""}`]
    .filter(Boolean)
    .join(", ");
  const contact = [formatPhone(settings.phone), settings.email, settings.website].filter(Boolean).join(" · ");
  return (
    <div className="min-h-screen bg-ink-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
        <PrintButton />
      </div>
      <article className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col bg-white px-[18mm] py-[16mm] shadow-lg print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-center gap-4 border-b-2 border-brand-700 pb-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-700 font-serif text-3xl font-bold text-white print:[-webkit-print-color-adjust:exact]">
            Ψ
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink-900">{settings.name}</p>
            {settings.legalName && (
              <p className="text-xs text-ink-600">
                {settings.legalName}
                {settings.cnpj && ` · CNPJ ${settings.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}`}
              </p>
            )}
            {address && <p className="text-xs text-ink-500">{address}</p>}
            {contact && <p className="text-xs text-ink-500">{contact}</p>}
          </div>
        </header>

        <h1 className="mb-8 mt-10 text-center text-xl font-bold uppercase tracking-wide text-ink-900">{title}</h1>

        <div className="flex-1 whitespace-pre-wrap text-justify font-serif text-[15px] leading-[1.8] text-ink-900">{children}</div>

        <div className="mt-12 text-right font-serif text-[15px] text-ink-900">
          {settings.city ? `${settings.city}, ` : ""}
          {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
        </div>

        <div className="mx-auto mt-20 w-72 border-t border-ink-800 pt-2 text-center text-sm text-ink-900">
          <p className="font-semibold">{signer.name}</p>
          <p className="text-ink-600">{signer.label ?? "Psicólogo(a)"}{signer.crp ? ` · CRP ${signer.crp}` : ""}</p>
        </div>

        <footer className="mt-12 border-t border-ink-200 pt-3 text-center text-[10px] text-ink-400">
          Documento emitido eletronicamente por PsiClin · Informações protegidas por sigilo profissional (Código de Ética do Psicólogo) e pela LGPD.
        </footer>
      </article>
    </div>
  );
}
