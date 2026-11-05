# Design: Épico 3 — Dashboard

## Context

O Épico 2 entregou autenticação, guards em `(dashboard)/layout.tsx` (`requireUser` + `requireOrganization`), a RPC `create_organization()` e a página placeholder `dashboard/page.tsx`. Ver `proposal.md` para motivação.

Estado atual relevante no banco (migrations 001–003):
- `002_security_policies.sql` concede a admins `insert`, `update` e `delete` diretos em `organization_members`. Um admin pode, portanto, inserir ou promover a `owner` qualquer membership, o que contraria o requisito de autopromoção proibida em `specs/members`.
- `profiles` tem policy de `update` para o próprio usuário, mas sem restrição de colunas. Hoje é possível alterar `created_at` ou `id`.
- `organizations` tem policy de `update` para admins, sem restrição de colunas. Hoje é possível alterar `slug` e `status`.
- `profiles` só é legível pelo próprio usuário. Listar membros com nome exige acesso que a RLS atual não concede.
- `subscriptions` e `usage_records` já são somente leitura para `authenticated`. Os indicadores de D02 usam apenas tabelas com leitura por membro.

## Goals / Non-Goals

**Goals:**
- Impor no PostgreSQL as regras de `specs/members` e `specs/organizations` (hierarquia, último owner, colunas protegidas), não apenas na interface.
- Manter o padrão de escrita controlada: RPCs `security definer` com validação de `auth.uid()`, como em `create_organization()`.
- Manter a sidebar e os indicadores em Server Components, sem expor chaves ou dados de outros tenants.

**Non-Goals:**
- Convites de membros por e-mail (fora do MVP do épico; D05 cobre listagem e papéis).
- Restrição de cobrança para `admin` (Épico 6).
- Materialização ou cache de indicadores.
- Alteração de `slug` ou `status` de organização.

## Decisions

### D1. Migration 004 revoga escrita direta e cria RPCs de membros
`004_dashboard_members.sql` remove as policies de `insert`, `update` e `delete` em `organization_members` (as de `select` permanecem) e revoga os privilégios de escrita correspondentes de `authenticated`. Alterações passam por duas funções `security definer` com `set search_path = ''`:
- `change_member_role(p_member_id uuid, p_new_role text)`
- `remove_member(p_member_id uuid)`

Ambas: exigem `auth.uid()`, carregam a linha alvo e a do chamador com `for update` (serializa concorrência para o último owner), e aplicam a hierarquia abaixo.

Alternativa considerada: manter as policies e adicionar `with check` que compare `role` com o papel do chamador. Rejeitada: a policy de `update` não enxerga o valor antigo de forma confiável em todos os casos, e o `insert` de admin continuaria livre para criar `owner`. RPCs centralizam a regra em um único lugar testável.

### D2. Hierarquia implementada na RPC
- Chamador não pode alterar a própria linha (`p_member_id` igual ao membership do chamador) → rejeita.
- Somente `owner` concede ou revoga `owner`.
- `admin` só age sobre linhas `admin` e `member`.
- `member` não executa nenhuma das duas RPCs.
- Antes de qualquer alteração, conta `owner`s da organização; se a operação deixaria zero, rejeita com `Last owner`.

Erros são `raise exception` com mensagens estáveis (ex.: `Forbidden`, `Last owner`, `Invalid role`), mapeadas para `AppError` em `src/features/members/` como em `organizations/actions.ts`.

### D3. Listagem de membros via RPC
`list_organization_members()` (`security definer`, retorna `member_id`, `user_id`, `full_name`, `role`, `created_at`) filtra pela organização do chamador (`current_organization_id()`) e exige `is_org_member`. Motivo: `profiles` não é legível entre usuários, e liberar `select` em `profiles` violaria o isolamento de perfil de `specs/user-profile`. A RPC expõe somente `full_name`, não `avatar_url` nem e-mail.

### D4. Colunas protegidas por privilégio de coluna, não por RPC
- `profiles`: `revoke update on public.profiles from authenticated; grant update (full_name, avatar_url) on public.profiles to authenticated;` A policy existente de "Users update own profile" continua valendo para a linha. Tentativa de alterar `id` ou `created_at` resulta em erro de permissão.
- `organizations`: `revoke update on public.organizations from authenticated; grant update (name, business_type, email, phone, timezone) on public.organizations to authenticated;` Tentativa de alterar `slug` ou `status` é rejeitada pelo banco, cumprindo `specs/organizations`.

Alternativa considerada: RPCs `update_profile` e `update_organization`. Rejeitada para estes casos porque o conjunto de colunas é fixo e pequeno; privilégio de coluna é mais simples e a regra de RLS (linha) continua sendo a barreira principal. Se novos campos forem adicionados, a grant precisa ser revista — registrar isso em `docs/security.md`.

### D5. Indicadores de D02 via consultas com RLS
O dashboard usa o cliente SSR (`src/lib/supabase/server.ts`) com contagens `head: true`:
- contatos: `contacts` (count)
- conversas abertas: `conversations` com `status = 'open'`
- conversas com IA desativada: `conversations` com `ai_enabled = false`
- mensagens recebidas em 7 dias: `messages` com `direction = 'inbound'` e `created_at >= now() - interval '7 days'`

Filtro de tenant é aplicado pela RLS, não pela aplicação. Índices existentes (`idx_conversations_status`, `idx_messages_conversation`) cobrem as consultas no volume do MVP. Falha de consulta é tratada com mensagem genérica (`specs/dashboard`, requisito de falha).

Alternativa considerada: RPC `get_dashboard_metrics()`. Rejeitada agora para manter o caminho de leitura simples; migra-se para RPC se as consultas virarem gargalo.

### D6. Edição de organização em Server Action
A ação de empresa valida com Zod (nome 2–100, fuso horário contra a lista IANA aceita pelo runtime, e-mail/telefone opcionais). A autorização de papel é imposta pela RLS (`Admins update organizations`). A ação não recebe `slug`, `status` nem `id` do formulário: são descartados no schema.

### D7. Layout e navegação
`src/components/layout/sidebar.tsx` recebe a lista de itens como constante. Itens de épicos futuros são renderizados como `aria-disabled` sem `href`. O guard de sessão permanece em `(dashboard)/layout.tsx`; a sidebar não faz verificação própria.

### D8. Papéis e visibilidade na UI
A página de membros recebe o papel do chamador via `requireOrganization()` e oculta ações quando o papel é `member`. Esta ocultação é apenas visual; as RPCs D1/D2 são a barreira real (`specs/members`, último requisito).

## Risks / Trade-offs

- **Revogar escrita direta em `organization_members` pode quebrar o onboarding** → `create_organization()` é `security definer` e roda como dono; testar explicitamente o caminho de criação após a migration 004.
- **Concorrência ao rebaixar o último owner** → `for update` nas linhas `owner` antes da contagem; teste com duas transações concorrentes.
- **Privilégio de coluna é fácil de esquecer ao adicionar campos** → registrar em `docs/security.md` e cobrir com teste que tenta alterar cada coluna protegida.
- **`list_organization_members` expõe nomes a todos os membros** → aceitável para o MVP (mesma organização); nome não é dado sensível aqui. Sem e-mail.
- **Ordem de deploy**: migration 004 precisa ir antes do código que chama as RPCs; sem rollback automático de grants → script de reversão documentado no próprio arquivo de migration.

## Migration Plan

1. Aplicar `004_dashboard_members.sql` localmente (`npm run db:reset`).
2. Rodar testes de autorização (`npm run test`) cobrindo hierarquia, último owner, colunas protegidas e isolamento de `list_organization_members`.
3. Deploy do código que usa as RPCs somente após a migration estar aplicada.
4. Rollback: reaplicar as policies de `organization_members` de 002 e restaurar `grant update` completo em `profiles` e `organizations`; registrado no cabeçalho da migration 004.

## Open Questions

Nenhuma. Decisões de UI (ex.: ícones da sidebar, formato de data) ficam para a implementação e não alteram specs nem tasks.
