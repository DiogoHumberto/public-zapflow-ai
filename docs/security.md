# Segurança

## Princípios

1. **Nunca confiar no frontend** — permissões são validadas no servidor e reforçadas por RLS.
2. **Segredos server-only** — `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `WHATSAPP_*` jamais com prefixo `NEXT_PUBLIC_`.
3. **Menor privilégio** — cliente admin (service role) ignora RLS e é usado apenas quando estritamente necessário.

## RLS (Row Level Security)

- Habilitado em **todas** as 10 tabelas.
- Funções auxiliares `security definer`:
  - `current_organization_id()` — organização do usuário (quando exatamente uma associação)
  - `is_org_member(target_org)` — associação
  - `is_org_admin(target_org)` — papel `owner`/`admin`
- Padrão de policies: leitura para membros, escrita para membros, gestão para admins.

## Onboarding controlado

- Perfil criado automaticamente por `handle_new_user()` (trigger em `auth.users`).
- Empresa criada apenas via RPC `create_organization()` — valida nome/slug, impede segunda organização e cria membership `owner` + assinatura `trialing`.

## Gestão de membros e convites

Toda escrita em `organization_members` e em `profiles` de terceiros passa por RPCs
`security definer` (migration 005), nunca por `insert/update/delete` direto do
cliente `authenticated`:

| RPC | Regra principal |
|---|---|
| `list_organization_members()` | E-mail só para `owner`/`admin`; `member` recebe `null` |
| `add_member_by_email(p_email, p_role)` | `admin` só `member`; `owner` adiciona `member`/`admin`; um usuário por organização |
| `update_member_profile(p_member_id, p_full_name)` | Só `full_name` (2–100); `admin` só edita linhas `member` |
| `change_member_role(p_member_id, p_new_role)` | Exclusivo de `owner`; sem autopromoção; preserva o último owner |
| `remove_member(p_member_id)` | `admin` só remove `member`; remover `owner` exige mais de um |

- **Cliente admin (`service role`)**: no fluxo de membros é usado exclusivamente
  para `auth.admin.inviteUserByEmail` e para remover a conta recém-convidada na
  compensação. O membership NUNCA é escrito com service role — continua sendo
  criado pela RPC autenticada. O módulo fica em
  `src/server/integrations/supabase-auth/invite.ts` com `import "server-only"`.
- **Uma organização por usuário (MVP)**: `add_member_by_email` rejeita usuário que
  já pertence a outra organização. Um advisory lock por `user_id` serializa
  convites concorrentes entre tenants.
- **Ciclo de vida do convite pendente**: o convite cria a conta em `auth.users`
  com `email_confirmed_at` nulo; o membership é criado em seguida. Enquanto
  pendente, a listagem marca `invitation_pending = true` e o GoTrue impede o
  login. Após confirmar o e-mail e definir a senha, o acesso é liberado. Não há
  expiração automática: o vínculo pendente pode ser removido por `owner`/`admin`.
- **Remoção** exclui somente o vínculo (`organization_members`); a conta em
  `auth.users` é preservada e pode ser convidada novamente no futuro.
- **Link do convite**: o template `supabase/templates/invite.html` aponta para
  `/auth/confirm?token_hash=...&type=invite&next=/auth/reset`. O `verifyOtp` roda
  no servidor e grava a sessão em cookies, funcionando em qualquer dispositivo.
  O parâmetro `next` é sanitizado por `src/lib/auth/safe-path.ts` (sem open
  redirect).
- **Compensação**: se a associação falhar após o convite, a conta recém-criada é
  removida (best-effort) para não deixar convite órfão.

## Webhook do WhatsApp (Épico 4 — regras já definidas)

- Validar assinatura `X-Hub-Signature-256` com `WHATSAPP_APP_SECRET`.
- Identificar a organização pelo `phone_number_id` registrado — **nunca** confiar em `organization_id` vindo no corpo.
- Idempotência via `messages.external_message_id`.

## Checklist pré-produção

Concluído na implementação atual:

- [x] Revogar escrita direta em `organization_members` (convites e gestão via RPCs controladas — migrations 004/005)
- [x] Impedir autopromoção a `owner` (ninguém altera o próprio papel)
- [x] Impedir remoção/rebaixamento do último `owner`
- [x] Cliente admin limitado ao convite (`inviteUserByEmail`) e à compensação, sem escrita de membership

Pendente:

- [ ] Bloquear alteração de cobrança por `admin`
- [ ] Validar `assigned_user_id` pertencente à organização da conversa
- [ ] Restringir execução das funções auxiliares (`current_organization_id`, `is_org_member`, `is_org_admin`) aos papéis necessários
- [ ] Configurar SMTP próprio em produção (`Authentication → Emails → SMTP Settings`)
- [ ] Configurar `Site URL` e `Redirect URLs` do projeto de produção
- [ ] Revisar no Dashboard o template **Invite** apontando para `/auth/confirm`
- [ ] Configurar SPF/DKIM do domínio remetente
