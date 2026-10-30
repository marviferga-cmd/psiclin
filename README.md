# PsiClin — Gestão para clínicas de psicologia

Sistema web completo para clínicas e consultórios de psicologia: agenda, prontuário eletrônico, financeiro, documentos e relatórios.

## Stack
- Next.js 15 (App Router, Server Actions) + React 19 + TypeScript
- Prisma ORM + PostgreSQL (todas as chaves em **UUID**)
- Tailwind CSS — layout responsivo (desktop, tablet e celular)
- Autenticação JWT (cookie httpOnly) com perfis: Administrador, Psicólogo(a), Recepção

## Módulos
- **Painel**: indicadores, agenda do dia, evoluções pendentes, inadimplência, aniversariantes, gráficos
- **Pacientes**: cadastro completo (CEP automático, responsável legal, convênio, LGPD), ficha com abas
- **Agenda**: visão semanal / diária por profissional, recorrência (semanal/quinzenal/mensal), detecção de conflito de horário e sala, confirmação via WhatsApp
- **Prontuário**: anamnese e evoluções por sessão, acesso restrito ao psicólogo responsável (sigilo CFP)
- **Financeiro**: receitas/despesas, baixa de pagamentos, vencidos, cobrança automática ao concluir sessão, recibo com valor por extenso
- **Documentos**: declarações, atestados, relatórios, laudos, encaminhamentos e contratos (modelos CFP 06/2019) com impressão/PDF
- **Relatórios**: produtividade por profissional, presença, financeiro; exportação CSV
- **Administração**: equipe, salas, convênios, configurações e trilha de auditoria

## Desenvolvimento
```bash
cp .env.example .env   # configure DATABASE_URL e AUTH_SECRET
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Deploy (Railway)
`railway.json` já configura build (`npm run build`) e start (`migrate deploy` + seed + `next start`).
Variáveis: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TZ=America/Sao_Paulo`, `SEED_DEMO` (opcional).
