# AGENTS.md — ZapFlow AI

Micro SaaS **multi-tenant** de atendimento WhatsApp com IA (salões/estética). Fonte de verdade: `docs/especificacao-tecnica-MVP.md` (+ `docs/architecture.md`, `docs/database.md`, `docs/security.md`).

## Stack
Next.js **16** (App Router, React 19) · TypeScript · Tailwind v4 · Supabase (PostgreSQL/RLS/Auth via `@supabase/ssr`) · Zod · OpenAI.

## Estrutura
| Diretório | Conteúdo |
|---|---|
| `src/app` | App Router: `(auth)`, `(dashboard)`, `api/` (route handlers e webhooks) |
| `src/features` | Módulos de produto (organizations, members, contacts, conversations, messages, knowledge-base, whatsapp, ai, subscriptions) |
| `src/lib` | `supabase/{client,server,admin,middleware}.ts`, `env.ts`, `errors.ts`, auth/, security/, validation/, utils/ |
| `src/server` | services/ (regras de negócio), repositories/ (acesso ao banco), integrations/{whatsapp,openai}, jobs/ |
| `src/types/database.ts` | Tipos do banco (regerar com `npm run db:types`) |
| `supabase/migrations` | 001 schema (10 tabelas) · 002 RLS · 003 onboarding · 004 dashboard/membros · 005 CRUD de membros |
| `openspec/` | Specs: `changes/` → `archive/` |

## Regras de arquitetura (obrigatórias)

1. **RLS-first multi-tenant** — frontend nunca escolhe `organization_id`; servidor valida associação e PostgreSQL aplica RLS via `is_org_member()` / `is_org_admin()` / `current_organization_id()` (security definer, migration 002).
2. **FKs compostas `(id, organization_id)`** em contacts/conversations/messages/whatsapp_accounts — preservar ao evoluir o schema.
3. **Integrações externas somente no servidor** — Meta/OpenAI jamais no frontend. Tudo em `src/server/integrations/{whatsapp,openai}` (padrão adapter: `client.ts`, `webhook-validator.ts`, `webhook-parser.ts`, `message-sender.ts`, `event-handler.ts`).
4. **Segredos server-only** — `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `WHATSAPP_*` nunca com `NEXT_PUBLIC_`. Acessar via `getServerEnv()` / `getPublicEnv()` de `src/lib/env.ts`; nunca `process.env.X!`.
5. **Cliente admin ignora RLS** — `src/lib/supabase/admin.ts` (`import "server-only"`); uso restrito a webhooks, jobs, escritas de assinatura/uso e **convite de membros** (`auth.admin.inviteUserByEmail` e a compensação que remove a conta recém-convidada). Membership NUNCA é escrito com service role: `organization_members` só muda pelas RPCs autenticadas (migration 005).
6. **Onboarding controlado** — perfil via trigger `handle_new_user()`; empresa somente via RPC `create_organization()` (membership `owner` + assinatura `trialing`). MVP: 1 organização por usuário.
7. **Webhook WhatsApp** — validar `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET`; identificar org pelo `phone_number_id` registrado (nunca pelo corpo); idempotência via `messages.external_message_id`.
8. **`whatsapp_accounts.credential_ref`** — referência a segredo protegido, nunca token em texto puro.
9. **`subscriptions` e `usage_records`** — escrita exclusiva do backend (sem policy de escrita para `authenticated`).
10. **Proxy (Next 16)** — sessão mantida por `src/proxy.ts` + `src/lib/supabase/middleware.ts`; não recriar `middleware.ts`. Complementar sempre com verificação no servidor.
11. **Sem `any`** sem justificativa comentada. Validar entradas com Zod (`src/lib/validation/`).
12. **Spec-driven** — mudanças relevantes começam em `openspec/changes/` (propose → apply → archive).

## Scripts
| Comando | Função |
|---|---|
| `npm run dev` / `build` / `lint` / `typecheck` | Desenvolvimento e verificação (`tsc --noEmit`) |
| `npm run db:start` | Supabase local (requer Docker) |
| `npm run db:reset` | Aplica migrations 001→003 |
| `npm run db:types` | Regera `src/types/database.ts` (requer `supabase link`) |

## Estado atual
- ✅ Épico 1 — Fundação (arquivado: `openspec/changes/archive/2026-11-03-epico-1-fundacao`)
- ✅ Épico 2 — Auth & multi-tenant (arquivado: `openspec/changes/archive/2026-11-03-epico-2-auth-multi-tenant`)
- ✅ Épico 3 — Dashboard (arquivado: `openspec/changes/archive/2026-11-04-epico-3-dashboard`)
- ✅ CRUD de membros (arquivado: `openspec/changes/archive/2026-11-04-adicionar-crud-membros`)
- ⬜ Épicos 4–6 pendentes — seguir o backlog da especificação.
- Pendências de segurança pré-produção em `docs/security.md` (cobrança por admin, `assigned_user_id`, SMTP de produção, etc.).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
