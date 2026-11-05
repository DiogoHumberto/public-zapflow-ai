# Design: Épico 1 — Fundação

## Decisões

### D1. Tipos do banco manuais
`src/types/database.ts` escrito à mão refletindo as migrations 001/002 (10 tabelas + tipo `Database` no formato `@supabase/supabase-js`). Quando o projeto for linkado (`supabase link`), passar a gerar com `supabase gen types typescript`.

### D2. Validação de ambiente com Zod
`src/lib/env.ts` centraliza `process.env`:
- `publicEnv`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` — obrigatórias, validadas como URL.
- `serverEnv`: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `WHATSAPP_*` — opcionais nesta fase (Épicos 4/5), validadas quando presentes.
- Falha rápida com mensagem clara. Elimina `process.env.X!`.

### D3. Clientes Supabase SSR
- `client.ts`: `createBrowserClient` (componentes cliente).
- `server.ts`: `createServerClient` com `cookies()` do `next/headers` (Next 16, assíncrono).
- `admin.ts`: service-role com `import "server-only"` — ignora RLS, uso restrito ao backend.
- `middleware.ts` + `src/proxy.ts`: refresh de sessão (Next 16 renomeou middleware → Proxy).

### D4. Migration 003 — funções de onboarding
`003_onboarding_functions.sql` adiciona (sem alterar 001/002):
- `handle_new_user()` + trigger `on_auth_user_created` (spec §5.1)
- `create_organization(p_name, p_slug, p_business_type)` RPC `security definer` com validações + `revoke`/`grant` (spec §5.2)

### D5. Tratamento de erros
- `src/lib/errors.ts`: `AppError` tipada com códigos (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `INTERNAL`).
- `app/error.tsx` (boundary de rota), `app/global-error.tsx` (boundary raiz com `<html>/<body>`), `app/not-found.tsx`.

### D6. Estrutura modular
Pastas da spec §2 criadas como skeletons com `.gitkeep`, sem implementação de domínio.

## Não-decisões
- Sem framework de testes ainda (Vitest/Playwright em épico futuro).
- Sem ORM — acesso via Supabase client + repositories (Épico 2+).
