# Proposal: Épico 2 — Autenticação e Multi-tenant

## Why

O Épico 1 entregou a fundação (clientes Supabase SSR, proxy de sessão, migrations 001–003 com trigger `handle_new_user` e RPC `create_organization`), mas o produto ainda não é utilizável: não há registro, login, logout, recuperação de senha nem onboarding da empresa. Sem autenticação e isolamento multi-tenant validado, nenhum cliente pode usar o sistema com segurança.

## What Changes

- Páginas `(auth)`: `login`, `register`, `forgot-password` (hoje pastas vazias) + rotas de callback e redefinição de senha.
- Server Actions de autenticação (register/login/logout/reset) com validação Zod e erros mapeados via `AppError`.
- Route handler `POST /api/organizations` (spec §6) para onboarding via clientes não-browser.
- `src/lib/auth/`: helpers de sessão `getUser()`, `requireUser()`, `getCurrentOrganization()`.
- `src/features/organizations/`: formulário de onboarding que chama a RPC `create_organization()`.
- Guard server-side em `(dashboard)/layout.tsx`; redirects no proxy (autenticado fora de `(auth)`, sem sessão fora de `(dashboard)`, sem org → onboarding).
- Testes de autorização cross-tenant (A09) executados contra o Supabase local.

## Capabilities

### New Capabilities

- `auth`: registro com confirmação de e-mail, login/logout com sessão em cookies seguros, recuperação de senha e proteção de rotas autenticadas.
- `organizations`: criação de organização exclusivamente via RPC controlada, membership `owner` + assinatura `trialing` atômicas, redirecionamento de usuário sem organização ao onboarding e isolamento de dados entre tenants garantido por RLS.

### Modified Capabilities

(nenhuma — `openspec/specs/` está vazio; estas são as primeiras capabilities do produto)

## Impact

- **Código:** `src/app/(auth)/**`, `src/app/(dashboard)/layout.tsx`, `src/app/api/organizations/route.ts`, `src/app/auth/**` (callback/reset), `src/lib/auth/`, `src/lib/validation/`, `src/features/organizations/`, `src/features/members/`, `src/lib/supabase/middleware.ts` (redirects).
- **Banco:** nenhuma migration nova — usa `handle_new_user()` e `create_organization()` já existentes (migrations 002/003).
- **Testes:** introduz Vitest + testes de autorização RLS (requerem `npm run db:start`/`db:reset`).
- **Dependências:** `vitest` (nova, dev).

## Riscos

- Confirmação de e-mail depende de SMTP local (Inbucket via `supabase start`) — mitigado documentando o fluxo de teste manual.
- Testes RLS exigem banco local rodando — mitigado com script de setup e seeds determinísticos.
- Next 16 (Proxy ≠ middleware) — mitigado mantendo `src/proxy.ts` existente e complementando com guards no servidor.
