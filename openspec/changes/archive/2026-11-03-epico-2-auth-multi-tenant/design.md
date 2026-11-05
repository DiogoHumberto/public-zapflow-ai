# Design: Épico 2 — Autenticação e Multi-tenant

## Context

A fundação (Épico 1) já entregou: clientes Supabase SSR (`src/lib/supabase/{client,server,admin,middleware}.ts`), proxy de sessão (`src/proxy.ts`), validação de ambiente (`src/lib/env.ts`), erros tipados (`src/lib/errors.ts`) e migrations 001–003 — incluindo `handle_new_user()` (trigger de perfil) e `create_organization()` (RPC de onboarding). As páginas `(auth)` e os diretórios `src/lib/auth/`, `src/lib/validation/` e `src/features/**` são esqueletos. Ver `proposal.md` para motivação.

## Goals / Non-Goals

**Goals:**
- Fluxo completo de auth (registro → confirmação → login → logout → reset) sobre Supabase Auth SSR.
- Onboarding da organização via RPC existente, com UX dedicada e endpoint de API.
- Guards de autorização em camadas (proxy + servidor) e isolamento RLS validado por testes.

**Non-Goals:**
- Convites/gestão de membros, MFA/SSO, múltiplas orgs por usuário, pendências pré-produção de `docs/security.md` (autopromoção, último owner) — ficam para Épico 3+.

## Decisions

### D1. Server Actions para forms; route handler para API pública
Formulários de auth e onboarding usam **Server Actions** (progressive enhancement, menos boilerplate, cookies SSR automáticos). `POST /api/organizations` existe como route handler para clientes não-browser (spec §6). Alternativa considerada: tudo via route handlers — rejeitada por duplicar validação e piorar a UX dos forms.

### D2. Guards em camadas, nunca só no proxy
- `src/proxy.ts` (existente) só refresca sessão + redirects grossos (autenticado fora de `(auth)`, anônimo fora de `(dashboard)`).
- `src/lib/auth/`: `getUser()`, `requireUser()` (redirect/401), `requireOrganization()` (redirect ao onboarding) — usados em `(dashboard)/layout.tsx` e em todo route handler/action protegido.
Alternativa considerada: confiar no proxy como guarda única — rejeitada; a especificação exige verificação no servidor.

### D3. Schemas Zod espelhando a RPC
`src/lib/validation/`: `registerSchema`, `loginSchema`, `resetPasswordSchema`, `createOrganizationSchema` (nome 2–100, slug `^[a-z0-9-]{3,50}$`) — validação client-side rápida + servidor autoritativo; a RPC continua sendo a última linha de defesa. Mensagens em pt-BR.

### D4. Erros de auth mapeados para `AppError`
Erros do Supabase Auth convertidos para `AppError`/`toPublicMessage` (existentes), sem vazar detalhes (ex.: "credenciais inválidas" genérico, sem distinguir e-mail vs senha; recuperação de senha responde igual para e-mail inexistente — anti-enumeração).

### D5. Estrutura das páginas e rotas
- `(auth)/login|register|forgot-password/page.tsx` — Client Components de form + Server Actions em `src/lib/auth/actions.ts`.
- `src/app/auth/callback/route.ts` — confirmação de e-mail; `src/app/auth/reset/page.tsx` — redefinição de senha (redirect baseado em `NEXT_PUBLIC_APP_URL`).
- `(dashboard)/onboarding/page.tsx` + `src/features/organizations/` — form de criação chamando a RPC via action.

### D6. Testes de autorização com Vitest + Supabase local
Vitest (nova devDependency) + script de seed determinístico: 2 usuários, 2 orgs. Testes contra o banco local (`npm run db:start` + `db:reset`) assertando: leitura cross-tenant retorna vazio; escrita cross-tenant é rejeitada; `member` não executa operações de admin. Alternativa considerada: Playwright E2E — rejeitada neste épico (custo); RLS é testada no nível do banco, que é onde a garantia vive.

## Risks / Trade-offs

- E-mail de confirmação em dev depende do Inbucket (`supabase start`) → documentar fluxo de teste manual e URL do Inbucket no README.
- Testes exigem Docker/banco local → falhar rápido com mensagem clara quando o Supabase local não estiver de pé.
- Cliente admin (`createAdminClient`) não deve vazar para handlers comuns → usar apenas em seeds/testes; código de request usa sempre o cliente SSR (RLS ativo).

## Open Questions

(nenhuma — decisões fechadas; detalhes de UI serão resolvidos na implementação sem alterar specs ou tasks)
