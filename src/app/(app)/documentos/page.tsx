import type { Metadata } from "next";
import Link from "next/link";
import type { DocumentType, Prisma } from "@prisma/client";
import { FilePlus2, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DOC_TYPE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Pagination, Select, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Documentos" };

const PAGE = 25;

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; page?: string }> }) {
  const user = await requireRole("ADMIN", "PSICOLOGO");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const type = sp.type && sp.type in DOC_TYPE ? (sp.type as DocumentType) : undefined;
  const where: Prisma.DocumentWhereInput = {
    ...(user.role === "ADMIN" ? {} : { psychologistId: user.id }),
    ...(type ? { type } : {}),
    ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { patient: { fullName: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const [total, docs] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { patient: { select: { fullName: true } }, psychologist: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Declarações, atestados, relatórios, laudos e contratos emitidos."
        actions={
          <ButtonLink href="/documentos/novo">
            <FilePlus2 className="h-4 w-4" /> Novo documento
          </ButtonLink>
        }
      />
      <Card>
        <form className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row" action="/documentos">
          <input name="q" defaultValue={sp.q} placeholder="Buscar por título ou paciente" className="input flex-1" />
          <Select name="type" defaultValue={type ?? ""} className="sm:w-60">
            <option value="">Todos os tipos</option>
            {Object.entries(DOC_TYPE).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
          <button className={buttonClass("secondary")}>Filtrar</button>
        </form>
        {docs.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="Nenhum documento encontrado" />
        ) : (
          <>
            <ul className="divide-y divide-ink-100">
              {docs.map((d) => (
                <li key={d.id}>
                  <Link href={`/documentos/${d.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-ink-50 sm:px-5">
                    <span className="hidden rounded-lg bg-brand-50 p-2 text-brand-600 sm:block">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900">{d.title}</p>
                      <p className="truncate text-xs text-ink-500">
                        {d.patient.fullName} · {d.psychologist.name}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <Badge tone="violet">{DOC_TYPE[d.type]}</Badge>
                      <p className="mt-1 text-xs text-ink-400">{formatDate(d.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              totalPages={Math.ceil(total / PAGE)}
              makeHref={(n) => `/documentos?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(type ? { type } : {}), page: String(n) })}`}
            />
          </>
        )}
      </Card>
    </>
  );
}
