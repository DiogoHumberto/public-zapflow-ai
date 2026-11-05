# Banco de dados

PostgreSQL (Supabase). Schema versionado em `supabase/migrations/`.

## Migrations

| Arquivo | Conteúdo |
|---|---|
| `001_initial_schema.sql` | 10 tabelas, índices, constraints, trigger `set_updated_at()` |
| `002_security_policies.sql` | Funções de segurança + RLS em todas as tabelas |
| `003_onboarding_functions.sql` | `handle_new_user()` + RPC `create_organization()` |
| `004_dashboard_members.sql` | RPCs de membros (`list_organization_members`, `change_member_role`, `remove_member`) e revogação da escrita direta em `organization_members` |
| `005_members_crud.sql` | `add_member_by_email`, `update_member_profile`, listagem com e-mail/pendência e alteração de papel exclusiva de `owner` |

## RPCs de gestão de membros (migration 005)

| RPC | Retorno | Regras principais |
|---|---|---|
| `list_organization_members()` | `member_id, user_id, full_name, email, role, created_at, invitation_pending` | `email` é `null` quando o chamador é `member`; `invitation_pending` = `auth.users.email_confirmed_at is null` |
| `add_member_by_email(p_email, p_role)` | `uuid` do membership | `admin` só adiciona `member`; `owner` adiciona `member`/`admin`; exige usuário existente em `auth.users`; um usuário por organização; advisory lock por `user_id` |
| `update_member_profile(p_member_id, p_full_name)` | `void` | Só `profiles.full_name` (2–100 após `trim`); `admin` só edita linhas `member` |
| `change_member_role(p_member_id, p_new_role)` | `void` | Exclusivo de `owner`; papel válido; ninguém altera o próprio papel; rebaixar `owner` exige mais de um |
| `remove_member(p_member_id)` | `void` | `admin` só remove `member`; remover `owner` exige mais de um; auto-remoção permitida (exceto último owner) |

Todas são `security definer` com `set search_path = ''` e seguem o mesmo padrão de grants:

```sql
revoke all on function public.add_member_by_email(text, text) from public, anon;
grant execute on function public.add_member_by_email(text, text) to authenticated;
-- idem para list_organization_members(), update_member_profile(uuid, text),
-- change_member_role(uuid, text) e remove_member(uuid)
```

A escrita direta em `organization_members` continua revogada de `authenticated`
(desde a 004); `profiles` de terceiros só muda pelas RPCs.

### Rollback da migration 005

```sql
drop function if exists public.add_member_by_email(text, text);
drop function if exists public.update_member_profile(uuid, text);
drop function if exists public.list_organization_members();
```

Em seguida, reaplicar `004_dashboard_members.sql` para recriar
`change_member_role`, `remove_member` e `list_organization_members` com as
definições/assinaturas anteriores. O `drop` da listagem é obrigatório:
`create or replace` não altera o tipo de retorno.

## Tabelas

`profiles` · `organizations` · `organization_members` · `whatsapp_accounts` · `contacts` · `conversations` · `messages` · `knowledge_base` · `subscriptions` · `usage_records`

## Relacionamentos (resumo)

- `auth.users` 1—1 `profiles`
- `profiles` N—N `organizations` via `organization_members` (com `role`)
- `organizations` 1—N `whatsapp_accounts`, `contacts`, `conversations`, `knowledge_base`, `usage_records`
- `contacts` 1—N `conversations`; `conversations` 1—N `messages`
- `organizations` 1—1 `subscriptions`

## Pontos de atenção

- **FKs compostas** (`id`, `organization_id`) impedem vínculos entre empresas diferentes.
- `whatsapp_accounts.credential_ref` guarda **referência** a segredo, não o segredo em texto puro.
- `messages.external_message_id` é único (idempotência de webhooks).
- O e-mail dos membros vive em `auth.users` (não em `profiles`) e só é exposto pela RPC de listagem para `owner`/`admin`.
- `invitation_pending` é derivado de `auth.users.email_confirmed_at is null`; não há tabela de convites.
- **MVP: uma organização por usuário** — `current_organization_id()` só resolve quando existe exatamente uma associação.
- Tipos TypeScript em `src/types/database.ts` (manuais; regerar com `npm run db:types` após `supabase link`).
