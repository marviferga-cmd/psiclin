"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ChevronDown, HelpCircle, Mail, MessageCircle, Search, X } from "lucide-react";
import { HELP_ARTICLES, HELP_TOPICS } from "@/lib/help-content";
import type { Role } from "@/lib/session-token";
import { cn } from "@/lib/utils";

export type SupportContact = { whatsapp: string | null; email: string | null };

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Botão "Ajuda" + pop-up da Central de ajuda (busca, perguntas por tema e contato). */
export function HelpCenter({ role, contact }: { role: Role; contact: SupportContact }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const topics = useMemo(() => HELP_TOPICS.filter((t) => !t.roles || t.roles.includes(role)), [role]);
  const articles = useMemo(() => {
    const visible = HELP_ARTICLES.filter(
      (a) => (!a.roles || a.roles.includes(role)) && topics.some((t) => t.key === a.topic),
    );
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return visible.filter((a) => {
      if (topic && a.topic !== topic) return false;
      if (!terms.length) return true;
      const text = normalize(`${a.q} ${a.a.join(" ")} ${a.link?.label ?? ""}`);
      return terms.every((t) => text.includes(t));
    });
  }, [query, topic, role, topics]);

  // Abre com F1; fecha com Esc. Foca a busca ao abrir.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else {
      setQuery("");
      setTopic(null);
      setExpanded(null);
    }
  }, [open]);

  const whatsappHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Olá! Preciso de ajuda com o PsiClin.")}`
    : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
        aria-label="Abrir central de ajuda"
        title="Central de ajuda (F1)"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden md:inline">Ajuda</span>
      </button>

      {/* Portal no <body>: o cabeçalho usa backdrop-blur, que prenderia o position:fixed dentro dele. */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label="Central de ajuda">
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            {/* Cabeçalho + busca */}
            <div className="shrink-0 bg-gradient-to-br from-brand-700 to-brand-900 px-5 pb-5 pt-4 text-white sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-brand-200" />
                  <h2 className="text-lg font-semibold">Central de ajuda</h2>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Fechar ajuda">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-brand-100/80">Como podemos ajudar? Busque uma dúvida ou escolha um tema.</p>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setExpanded(null);
                  }}
                  placeholder="Ex.: recorrência, recibo, senha, evolução…"
                  className="h-11 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-4 focus:ring-white/30"
                />
              </div>
            </div>

            {/* Temas */}
            <div className="scrollbar-none flex shrink-0 gap-1.5 overflow-x-auto border-b border-ink-100 px-5 py-3 sm:px-6">
              <TopicChip active={!topic} onClick={() => setTopic(null)}>
                Todos
              </TopicChip>
              {topics.map((t) => (
                <TopicChip key={t.key} active={topic === t.key} onClick={() => setTopic(topic === t.key ? null : t.key)}>
                  {t.label}
                </TopicChip>
              ))}
            </div>

            {/* Perguntas */}
            <div className="min-h-[160px] flex-1 overflow-y-auto overscroll-contain px-5 py-3 sm:px-6">
              {articles.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-medium text-ink-800">Nenhum resultado para “{query}”</p>
                  <p className="mt-1 text-sm text-ink-500">Tente outras palavras ou fale com o suporte abaixo.</p>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {articles.map((a) => {
                    const isOpen = expanded === a.q || (articles.length === 1 && expanded === null);
                    return (
                      <li key={a.q}>
                        <button
                          onClick={() => setExpanded(isOpen ? "" : a.q)}
                          className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                          aria-expanded={isOpen}
                        >
                          <span className="text-sm font-medium text-ink-900">{a.q}</span>
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-400 transition", isOpen && "rotate-180")} />
                        </button>
                        {isOpen && (
                          <div className="pb-4 pr-6">
                            <ol className={cn("space-y-1.5 text-sm leading-relaxed text-ink-600", a.a.length > 1 && "list-decimal pl-5")}>
                              {a.a.map((p) => (
                                <li key={p}>{p}</li>
                              ))}
                            </ol>
                            {a.link && (
                              <Link
                                href={a.link.href}
                                onClick={() => setOpen(false)}
                                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
                              >
                                {a.link.label} <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Contato */}
            <div className="shrink-0 border-t border-ink-100 bg-ink-50/70 px-5 py-4 sm:px-6">
              <p className="text-sm font-semibold text-ink-900">Não encontrou o que precisava?</p>
              {whatsappHref || contact.email ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 sm:flex-1 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}?subject=${encodeURIComponent("Ajuda com o PsiClin")}`}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-ink-200 sm:flex-1 bg-white px-4 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                    >
                      <Mail className="h-4 w-4" /> Enviar e-mail
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-ink-500">Fale com o administrador da clínica.</p>
              )}
              <p className="mt-3 text-[11px] leading-snug text-ink-400">
                Por sigilo profissional, não envie dados clínicos de pacientes ao pedir suporte. Atalho: tecla F1 abre esta ajuda.
              </p>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}

function TopicChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition",
        active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200",
      )}
    >
      {children}
    </button>
  );
}
