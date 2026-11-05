# Tasks: Épico 1 — Fundação

## A. OpenSpec
- [x] A1. Instalar CLI standalone
- [x] A2. `openspec init` (tools: opencode, idioma: pt-br)
- [x] A3. Criar change `epico-1-fundacao` (proposal/design/tasks)

## F1. Ambiente
- [x] F1.1 `.env.example` documentado
- [x] F1.2 `.env.local` (gitignored, vazio)
- [x] F1.3 `src/lib/env.ts` com validação Zod

## F2. Supabase SSR
- [x] F2.1 `src/lib/supabase/client.ts`
- [x] F2.2 `src/lib/supabase/server.ts`
- [x] F2.3 `src/lib/supabase/admin.ts`
- [x] F2.4 `src/lib/supabase/middleware.ts` + `src/proxy.ts`
- [x] F2.5 `src/types/database.ts`

## F3. Migrations
- [x] F3.1 `supabase/migrations/003_onboarding_functions.sql`

## F4. Estrutura
- [x] F4.1 Pastas da spec §2 com `.gitkeep`

## F5. Erros
- [x] F5.1 `src/lib/errors.ts`
- [x] F5.2 `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`

## F6. App
- [x] F6.1 `src/app/layout.tsx` (pt-BR + metadata)
- [x] F6.2 `src/app/page.tsx` (landing)
- [x] F6.3 `src/app/api/health/route.ts`
- [x] F6.4 `src/app/api/webhooks/whatsapp/route.ts` (stub 501)

## F7. Docs e qualidade
- [x] F7.1 `README.md`
- [x] F7.2 `docs/{architecture,database,security}.md`
- [x] F7.3 `AGENTS.md` (convenções do projeto)
- [x] F7.4 Scripts npm (`typecheck`, `db:reset`, `db:types`)

## Verificação
- [x] V1. `npm run typecheck` sem erros
- [x] V2. `npm run lint` sem erros
- [x] V3. `npm run build` com sucesso
- [x] V4. `dev` + `curl /api/health` retorna `{ status: "ok" }`
