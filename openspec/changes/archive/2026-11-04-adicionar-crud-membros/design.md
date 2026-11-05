# Design

## Context

Ver `proposal.md` para motivação. Estado atual relevante:

- `organization_members` (`id`, `organization_id`, `user_id`, `role`, `created_at`) tem `unique (organization_id, user_id)` e FK para `auth.users` com `on delete cascade`.
- Desde a migration 004, `authenticated` não tem `insert/update/delete` em `organization_members`; tudo passa por RPCs `security definer` (`change_member_role`, `remove_member`, `list_organization_members`).
- `profiles` tem RLS de leitura/escrita apenas para o próprio usuário e grants de UPDATE somente em `full_name`/`avatar_url`.
- Não existe tabela de convites, nem coluna de e-mail em `profiles`. E-mail vive em `auth.users`.
- O MVP assume **uma organização por usuário**: `current_organization_id()` só resolve quando há exatamente uma associação. Um usuário com duas associações perde acesso multi-tenant.
- `admin` hoje pode alterar papéis entre `admin` e `member`; a nova matriz reserva isso ao `owner`.
- Cache Components (Next 16) exige que I/O de páginas sob `(dashboard)` fique dentro de `<Suspense>`; o padrão já usado em `/settings` e `/settings/members`.

## Goals / Non-Goals

**Goals:**
- CRUD completo na área existente, reutilizando layout, componentes e Server Actions.
- Autorização em três camadas: UI (ocultação), servidor (schemas/regras) e banco (RPCs `security definer`).
- Adicionar membro sem criar tabela nova, usando o convite nativo do Supabase Auth.
- Preservar isolamento por tenant, último proprietário e proibição de autopromoção.

**Non-Goals:**
- Reenviar/cancelar convite, expiração automática de convite e lista de convites separada.
- Excluir a conta do usuário (`auth.users`) ao remover o vínculo; apenas o membership é removido.
- Editar e-mail ou senha de outro usuário.
- Auditoria persistida de operações (não existe tabela de auditoria no projeto).
- Múltiplas organizações por usuário.

## Decisions

### 1. Convite via Supabase Auth, sem tabela `invitations`

**Decisão:** ao adicionar um e-mail inexistente, a Server Action usa o cliente admin para `auth.admin.inviteUserByEmail(email, { data: { full_name }, redirectTo })` e, em seguida, cria o membership por RPC. Se o e-mail já pertence a um usuário, nenhum convite é enviado: o membership é criado diretamente.

**Por quê:** o convite nativo já cria o usuário, dispara o trigger `handle_new_user()` (perfil) e envia o link de definição de senha. Uma tabela de convites exigiria token, expiração, tela de aceite e reenvio — escopo desproporcional ao pedido.

**Alternativas descartadas:**
- Tabela `organization_invitations` + link manual: maior escopo, mais superfície de segurança.
- `supabase.auth.signUp` no navegador: autenticaria o navegador do admin como o convidado — inaceitável.
- Apenas associar usuários já cadastrados: não atende “adicionar novos membros”.

**Consequência:** `SUPABASE_SERVICE_ROLE_KEY` passa a ser necessária nesse fluxo. O cliente admin é usado **exclusivamente** para convidar; o membership nunca é inserido com service role.

### 2. RPCs concentram as regras; nada de escrita direta

Migration `005_members_crud.sql`:

| RPC | Chamador | Regras principais |
|---|---|---|
| `list_organization_members()` | qualquer membro | Mesma função da 004, com retorno ampliado: `email` (NULL para `member`) e `invitation_pending`. `drop` + `create` porque o tipo de retorno muda. |
| `add_member_by_email(p_email, p_role)` | owner/admin | Valida e-mail; localiza `auth.users`; se não existir retorna `not_found`; se já for membro da org → `Member already exists`; se já pertencer a qualquer org → `User already belongs to an organization` (MVP); `admin` só adiciona `member`, `owner` adiciona `member`/`admin`; não permite auto-adição; `pg_advisory_xact_lock` no `user_id` evita corrida entre organizações. |
| `update_member_profile(p_member_id, p_full_name)` | owner/admin | Alvo precisa ser da organização do chamador; `admin` só edita linhas `member`; nome `trim` 2–100; atualiza `profiles.full_name` e `updated_at`; não toca em e-mail. |
| `change_member_role(p_member_id, p_new_role)` | **somente owner** | Rejeita `admin`/`member` antes de qualquer no-op; papel válido; não altera a própria linha; rebaixar `owner` exige mais de um owner; bloqueia linhas da org com `for update`. |
| `remove_member(p_member_id)` | owner/admin | `admin` só remove linhas `member`; `owner` remove `admin`/`member`; remover `owner` exige mais de um; auto-remoção permitida, exceto último owner. |

Mensagens de erro estáveis (usadas pelo mapeador): `Authentication required`, `Forbidden`, `Last owner`, `Invalid role`, `Invalid name`, `Member not found`, `Member already exists`, `User already belongs to an organization`, `User not found`.

**Por quê:** as RPCs já são a barreira real do projeto; manter a regra em um único lugar evita divergência entre actions e banco. Grants: `revoke all ... from public, anon` + `grant execute ... to authenticated`.

### 3. Fluxo de adicionar com compensação

1. Server Action valida sessão/organização, papel do chamador e schema Zod (`email`, `fullName` opcional, `role`).
2. Chama `add_member_by_email`.
3. Se retornar `not_found`, invoca o convite do Supabase com `redirectTo = ${NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard` e metadados `full_name`.
4. Rechama `add_member_by_email` para criar o membership.
5. Se o passo 4 falhar, remove o usuário recém-convidado via admin (compensação best-effort) e devolve erro.

**Por quê:** evita convite órfão sem membership. A ordem “RPC primeiro” também evita enviar e-mail para quem já está na organização ou em outra organização.

**Corrida:** se o convite falhar com “already registered” (usuário criado entre as chamadas), a action tenta a RPC mais uma vez antes de reportar erro.

### 4. Privacidade do e-mail na listagem

`list_organization_members()` retorna `email = null` quando o chamador é `member`. `owner`/`admin` recebem o e-mail para identificar convidados e membros. `invitation_pending` deriva de `auth.users.email_confirmed_at is null` para usuários convidados.

**Por quê:** o CRUD administrativo precisa do e-mail; membros comuns não precisam e não devem receber dados de contato de colegas. A alternância é feita na própria RPC (não em duas funções).

### 5. Edição restrita ao nome

`update_member_profile` atualiza apenas `profiles.full_name`. E-mail/senha continuam sob o fluxo de identidade do Supabase Auth.

**Por quê:** alterar e-mail de terceiros exigiria confirmação em dois endereços e criaria dessincronização com `auth.users`.

### 6. Hierarquia e autoproteção

- `admin` gerencia somente linhas `member` (adicionar sempre como `member`, editar/remover apenas `member`).
- `owner` gerencia `admin` e `member`; pode promover alguém a `owner` (transferência de propriedade) via `change_member_role`.
- Ninguém altera o próprio papel. Auto-remoção é permitida, exceto quando deixaria a organização sem owner.
- Remover o vínculo não apaga a conta; o usuário pode ser convidado novamente no futuro.

**Por quê:** satisfaz a matriz pedida, mantém a proteção do último proprietário e evita `admin` agindo sobre pares ou proprietários.

### 7. Frontend reutiliza o padrão existente

- `/settings/members`: casca estática + `<Suspense>`; colunas Nome, E-mail (owner/admin), Papel, Desde, Ações. `owner` vê `select` de papel; `admin` vê badge. Botão “Adicionar membro” para owner/admin.
- `/settings/members/new`: formulário (`useActionState`) com e-mail, nome opcional e papel. Para `admin`, o campo de papel é fixo em `member` (e o servidor rejeita outro valor).
- `/settings/members/[memberId]`: formulário de nome. A seção busca o membro pela RPC de listagem (não lê `profiles` diretamente), valida que pertence à organização e aplica a hierarquia. `notFound()` para id inexistente/estranho.
- Remoção: confirmação inline na própria linha (“Confirmar remoção?”) antes de submeter a action.
- Todas as páginas usam o guard do layout `(dashboard)` e não fazem `await` no corpo da página fora de `<Suspense>`.

**Por quê:** consistência com `/settings` e `/settings/organization`, e compatibilidade com Cache Components.

### 8. Testes no nível de serviço/RPC

As actions dependem de `cookies()`/`next/headers`; os testes de integração chamam as mesmas funções de serviço que elas usam, como já feito no Épico 3, e cobrem as RPCs diretamente para as regras de banco.

## Risks / Trade-offs

- **Entrega de e-mail depende de SMTP** → local usa Inbucket (`http://127.0.0.1:54324`); produção precisa de SMTP configurado no Supabase. A UI mostra erro claro quando o convite falha.
- **Convite órfão em falha parcial** → compensação remove o usuário recém-criado; se a compensação falhar, o erro é reportado e o admin pode remover o membro pendente depois.
- **Cliente admin ignora RLS** → uso limitado ao `inviteUserByEmail`, em módulo `server-only`; nenhuma escrita de membership com service role.
- **Enumeração de e-mails** → `add_member_by_email` revela a existência de conta apenas para `owner`/`admin` da própria organização, com mensagens acionáveis.
- **Usuário já em outra organização** → convite rejeitado (MVP de uma organização). Documentar para não confundir com erro de permissão.
- **Convite pendente ocupa o e-mail** → o membership é criado no convite; se nunca aceito, o owner pode removê-lo. Não há expiração automática nesta entrega.
- **Leitura de `auth.users` por função `security definer`** → depende do schema de Auth do Supabase; coberto por testes de integração locais.
- **Remoção não apaga a conta** → decisão deliberada para preservar integridade e permitir reconvite; não é “excluir usuário” no sentido de apagar `auth.users`.

## Migration Plan

1. Arquivar `epico-3-dashboard` (pré-requisito dos deltas `MODIFIED` deste change).
2. Criar `supabase/migrations/005_members_crud.sql` com as funções, grants e bloco de rollback.
3. `npm run db:reset` para aplicar 001→005 e regenerar tipos (`npx supabase gen types typescript --local` ou `npm run db:types`).
4. Implementar backend, UI e testes; validar com `typecheck`, `lint`, `build` e `npm run test`.
5. Rollback: restaurar as definições da migration 004 (`change_member_role`, `remove_member`, `list_organization_members`), remover `add_member_by_email`/`update_member_profile` e revogar seus grants.

## Open Questions

Nenhuma pendente que altere escopo, abordagem ou tarefas. Reenvio de convite e expiração ficam registrados como evolução futura.
