# Tasks: Épico 2 — Autenticação e Multi-tenant

## 1. Validação e helpers de auth (base)

- [x] 1.1 Criar schemas Zod em `src/lib/validation/auth.ts` (`registerSchema`, `loginSchema`, `resetPasswordSchema`) e `src/lib/validation/organizations.ts` (`createOrganizationSchema` — nome 2–100, slug `^[a-z0-9-]{3,50}$`), verificando que entradas inválidas retornam mensagens pt-BR
- [x] 1.2 Criar `src/lib/auth/index.ts` com `getUser()`, `requireUser()` e `getCurrentOrganization()` sobre o cliente SSR, verificando que `requireUser()` redireciona ao login sem sessão
- [x] 1.3 Criar mapeador de erros Supabase Auth → `AppError`/`toPublicMessage` em `src/lib/auth/errors.ts`, verificando que credenciais inválidas expõem mensagem genérica (anti-enumeração)

## 2. Fluxo de autenticação (A01–A04)

- [x] 2.1 Implementar `(auth)/register/page.tsx` + Server Action `register` (valida com Zod, chama `signUp`, orienta confirmação de e-mail), verificando registro com sucesso e rejeição de dados inválidos
- [x] 2.2 Implementar `src/app/auth/callback/route.ts` (confirmação de e-mail via `exchangeCodeForSession`), verificando que o link de confirmação autentica e redireciona
- [x] 2.3 Implementar `(auth)/login/page.tsx` + Server Action `login` (redirect: dashboard se com org, onboarding se sem org), verificando login válido e erro genérico para credenciais inválidas
- [x] 2.4 Implementar Server Action `logout` + botão no dashboard, verificando sessão encerrada e redirect ao login
- [x] 2.5 Implementar `(auth)/forgot-password/page.tsx` + action de recuperação e `src/app/auth/reset/page.tsx` (redefinição com `NEXT_PUBLIC_APP_URL`), verificando envio do e-mail (Inbucket local) e redefinição efetiva

## 3. Onboarding da organização (A05–A06)

- [x] 3.1 Criar `src/features/organizations/` (form de criação) + `(dashboard)/onboarding/page.tsx`, chamando a RPC `create_organization()` via Server Action, verificando criação com membership `owner` + assinatura `trialing` no banco
- [x] 3.2 Criar `POST /api/organizations` (route handler, valida sessão + Zod + RPC), verificando 401 sem sessão, 400 com payload inválido e 200 com `organization_id`
- [x] 3.3 Rejeitar segunda organização: verificar que usuário com membership recebe erro da RPC "User already belongs to an organization"

## 4. Proteção de rotas e redirects (A07–A08)

- [x] 4.1 Adicionar guard em `(dashboard)/layout.tsx` com `requireUser()` + `requireOrganization()` (redirect ao onboarding sem org), verificando acesso bloqueado sem sessão e redirect ao onboarding sem org
- [x] 4.2 Atualizar `src/lib/supabase/middleware.ts` com redirects (autenticado fora de `(auth)` → dashboard; anônimo em `(dashboard)` → login), mantendo refresh de sessão intacto, verificando os 4 casos de redirect

## 5. Testes de autorização cross-tenant (A09)

- [x] 5.1 Adicionar Vitest (dev) + config, script `npm run test`, e seed determinístico (2 usuários, 2 orgs) via `createAdminClient` — apenas em testes, verificando que o seed roda contra `db:reset`
- [x] 5.2 Testes RLS de leitura: membro da Org A consultando contacts/conversations/messages/knowledge_base da Org B retorna vazio, verificando com cliente SSR autenticado como cada usuário
- [x] 5.3 Testes RLS de escrita e permissões: insert/update cross-tenant rejeitado; `member` não gerencia knowledge_base, verificando violações de policy
- [x] 5.4 Documentar fluxo de teste local em `README.md` (`db:start`, `db:reset`, Inbucket, `npm run test`), verificando que os comandos documentados executam como escritos

## 6. Verificação

- [x] 6.1 `npm run typecheck` e `npm run lint` sem erros
- [x] 6.2 `npm run build` com sucesso
- [ ] 6.3 E2E manual: registrar → confirmar e-mail (Inbucket) → login → criar org → dashboard; logout; acesso direto a `/dashboard` sem sessão redireciona ao login
- [x] 6.4 `npm run test` com testes de autorização verdes contra Supabase local

## Workflow follow-up

- Arquivar o change após revisão (`/opsx-archive`).
- Verificar specs sincronizadas em `openspec/specs/` após o archive.
