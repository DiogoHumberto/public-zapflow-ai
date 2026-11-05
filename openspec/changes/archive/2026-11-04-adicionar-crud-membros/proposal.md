# Proposal

## Why

A área **Configurações → Membros** já lista membros, altera papéis e remove vínculos, mas não permite adicionar nem editar pessoas. Além disso, a regra atual deixa `admin` alterar papéis (`member` ↔ `admin`), enquanto o negócio quer reservar essa decisão ao proprietário. Evoluir a área existente — em vez de criar outra — fecha essas lacunas e alinha UI, backend e banco a uma única matriz de permissões antes da produção.

## What Changes

- **Adicionar membro por convite de e-mail** via Supabase Auth (`inviteUserByEmail`). O convidado recebe e-mail para definir a senha e é associado à organização imediatamente, aparecendo como convite pendente até confirmar.
- **Associar usuário já cadastrado** (sem organização) informando apenas o e-mail, sem novo convite.
- **Editar membro**: somente o nome (`full_name`). O e-mail continua sendo a identidade da conta e não é editável por este fluxo.
- **Excluir membro** com confirmação explícita na interface; a exclusão remove o vínculo com a organização (não apaga a conta do usuário).
- **BREAKING**: alteração de papel passa a ser **exclusiva de `owner`**. `admin` deixa de poder alterar papéis, promover ou rebaixar qualquer membro.
- **Hierarquia de gestão**: `admin` adiciona, edita e remove apenas membros com papel `member`; `owner` gerencia todos, exceto alterar o próprio papel e deixar a organização sem proprietário.
- **Listagem** passa a exibir e-mail (visível apenas para `owner`/`admin`) e situação do convite (pendente/ativo).
- **Backend**: novas RPCs `add_member_by_email` e `update_member_profile`; `change_member_role`, `remove_member` e `list_organization_members` revisadas na migration 005. Nenhuma tabela nova.
- **UI**: mantém o layout e os padrões existentes (`/settings/members`, formulários com Server Actions, `<Suspense>` para Cache Components), acrescentando as telas de adicionar/editar e a confirmação de remoção.

## Capabilities

### New Capabilities

Nenhuma — a funcionalidade evolui a capability `members` já introduzida pelo change `epico-3-dashboard`.

### Modified Capabilities

- `members`: adiciona criação por convite, edição de nome, privacidade do e-mail, status de convite pendente, restrição de uma organização por usuário no convite e nova matriz de permissões (papel exclusivo do `owner`, remoção hierárquica).
  - **Pré-requisito de sequência**: `epico-3-dashboard` (que contém `specs/members`) MUST ser arquivado antes de arquivar este change. O delta abaixo usa `MODIFIED` sobre os requisitos existentes e `ADDED` para os novos.

## Impact

**Banco de dados e autorização**
- Nova migration `supabase/migrations/005_members_crud.sql`: RPCs, grants/revokes e comentários de rollback.
- `src/types/database.ts` regenerado.
- RLS das tabelas permanece inalterada; toda escrita continua sem acesso direto a `organization_members` e `profiles`.

**Backend**
- `src/features/members/service.ts`, `actions.ts` e `member-row.tsx`.
- Novo `src/server/integrations/supabase-auth/invite.ts` (server-only).
- `src/lib/validation/members.ts` (schemas de adicionar/editar).
- Cliente admin (`src/lib/supabase/admin.ts`) usado exclusivamente para convidar usuários; membership sempre criado por RPC.

**Frontend**
- `src/app/(dashboard)/settings/members/page.tsx` (listagem e ações por permissão).
- Novas rotas `src/app/(dashboard)/settings/members/new/page.tsx` e `src/app/(dashboard)/settings/members/[memberId]/page.tsx`.
- Ajuste de texto/card em `src/app/(dashboard)/settings/page.tsx`.

**Infra e documentação**
- `SUPABASE_SERVICE_ROLE_KEY` passa a ser necessária para convidar; SMTP de produção precisa estar configurado (local usa Inbucket, porta 54324).
- `docs/security.md` e `AGENTS.md` atualizados com a exceção de uso do cliente admin para convites.
- Testes unitários e de integração contra o Supabase local.
