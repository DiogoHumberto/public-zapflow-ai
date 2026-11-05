# Tasks

## 1. Banco de dados e autorização

- [x] 1.1 Criar `supabase/migrations/005_members_crud.sql` com `add_member_by_email`, `update_member_profile`, as novas definições de `change_member_role` (exclusivo de `owner`), `remove_member` (`admin` só remove `member`) e `list_organization_members` (e-mail + pendência), incluindo `drop`/recriação da função de listagem, grants para `authenticated`, revokes de `public`/`anon` e bloco de rollback; verificar que `npm run db:reset` aplica 001→005 sem erro
- [x] 1.2 Regenerar `src/types/database.ts` a partir do Supabase local (`npx supabase gen types typescript --local > src/types/database.ts`) e verificar que as assinaturas das cinco RPCs e as novas colunas de retorno aparecem no arquivo
- [x] 1.3 Cobrir `change_member_role` com testes de integração: `admin` rejeitado ao promover `member`→`admin`, autopromoção, promoção/rebaixamento por `owner`, papel inválido e último `owner`; verificar com `npx vitest run tests/integration/members-rpc.test.ts` que os papéis persistidos não mudam nas rejeições
- [x] 1.4 Cobrir `add_member_by_email` com testes de integração: `admin` só adiciona `member`, `owner` adiciona `admin`, e-mail inexistente retorna `not_found`, e-mail já membro, usuário de outra organização, auto-adição e alvo de outro tenant; verificar que nenhum vínculo é criado nas rejeições
- [x] 1.5 Cobrir `update_member_profile` com testes de integração: `owner` edita qualquer membro, `admin` edita somente `member`, `admin` rejeitado sobre `admin`/`owner`, nome inválido, e-mail inalterado e alvo de outro tenant; verificar o valor persistido em `profiles`
- [x] 1.6 Cobrir `remove_member` com testes de integração: `admin` remove `member`, `admin` rejeitado sobre `admin`/`owner`, `owner` remove `admin`, último `owner` protegido, auto-remoção permitida com outro `owner` e alvo de outro tenant; verificar o estado final de `organization_members`
- [x] 1.7 Cobrir `list_organization_members` com testes de integração: e-mail `null` para `member`, e-mail visível para `owner`/`admin`, marcação de convite pendente e ausência de membros de outro tenant; verificar os campos retornados pela RPC

## 2. Backend — validação e serviço

- [x] 2.1 Adicionar `addMemberSchema` (e-mail, nome opcional de 2–100 caracteres e papel `member`/`admin`) e `updateMemberNameSchema` em `src/lib/validation/members.ts`; verificar com testes unitários em `tests/unit/members-validation.test.ts`
- [x] 2.2 Evoluir `src/features/members/service.ts` com `addMemberByEmail`, `updateMemberProfile`, os campos `email`/`invitationPending` em `OrganizationMember` e o mapeamento das novas mensagens (`User not found`, `Member already exists`, `User already belongs to an organization`, `Invalid name`, `Member not found`); verificar com testes unitários do mapeador em `tests/unit/members-errors.test.ts`
- [x] 2.3 Criar testes de integração do serviço que chamam as mesmas funções das Server Actions (`addMemberByEmail`, `updateMemberProfile`, `changeMemberRole`, `removeMember`, `listMembers`); verificar autorização, persistência e isolamento com `npx vitest run tests/integration/members-service.test.ts`

## 3. Convite e Server Actions

- [x] 3.1 Criar `src/server/integrations/supabase-auth/invite.ts` com `import "server-only"`, validação da `SUPABASE_SERVICE_ROLE_KEY` e `inviteUserByEmail(email, { data: { full_name }, redirectTo })` apontando para `/auth/callback?next=/dashboard`; verificar com `npm run typecheck` e teste de integração que o usuário convidado é criado no Supabase local
- [x] 3.2 Implementar `addMemberAction` em `src/features/members/actions.ts` com o fluxo RPC → convite → RPC, validação de papel no servidor e compensação (remoção do usuário convidado quando a associação falhar); verificar com teste de integração que o membership pendente é criado e que falhas não deixam membership órfão
- [x] 3.3 Implementar `updateMemberAction` e ajustar `removeMemberAction`/`changeMemberRoleAction` para a nova matriz, mantendo `revalidatePath("/settings/members")`; verificar com teste de serviço que `admin` não altera papel e que a edição de nome respeita a hierarquia
- [x] 3.4 Mapear os erros do convite e das RPCs para mensagens pt-BR acionáveis (SMTP/convite, e-mail já cadastrado, usuário de outra organização, último owner, permissão); verificar que nenhuma mensagem interna do Supabase vaza para a UI
- [x] 3.5 Adicionar teste de integração do caminho de convite e do caminho de usuário existente (sem novo convite), usando o cliente admin local; verificar que o convite pendente aparece na listagem e que o usuário já cadastrado é associado imediatamente

## 4. Frontend

- [x] 4.1 Atualizar `src/app/(dashboard)/settings/members/page.tsx` para exibir e-mail (somente `owner`/`admin`), situação do convite e ações por permissão (owner: papel/editar/remover; admin: editar/remover só `member`; member: leitura); verificar via requisição autenticada que o HTML de cada papel contém apenas as ações permitidas
- [x] 4.2 Criar `src/app/(dashboard)/settings/members/new/page.tsx` e formulário cliente com e-mail, nome opcional e papel (para `admin`, papel fixo em `member`), com estados de erro/sucesso; verificar que o convite submetido cria o membro pendente e que a página renderiza sem erro
- [x] 4.3 Criar `src/app/(dashboard)/settings/members/[memberId]/page.tsx` e formulário de nome, buscando o membro pela RPC de listagem e aplicando `notFound()`/bloqueio para alvo de outro tenant ou linha não gerida pelo `admin`; verificar que membro de outra organização retorna 404 e que a edição persiste
- [x] 4.4 Atualizar `src/features/members/member-row.tsx` com link de edição, seletor de papel somente para `owner` e confirmação inline (“Confirmar remoção?”) antes de submeter a remoção; verificar que cancelar a confirmação não dispara a action
- [x] 4.5 Ajustar o card “Membros” em `src/app/(dashboard)/settings/page.tsx` para refletir adicionar/editar/remover e a matriz de papéis; verificar o texto renderizado em `/settings`
- [x] 4.6 Garantir o padrão de Cache Components nas novas rotas (casca estática + `<Suspense>`, sem `await` de I/O no corpo da página) e verificar que o stderr do dev server permanece vazio ao navegar por `/settings/members`, `/settings/members/new` e `/settings/members/[memberId]`

## 5. Documentação e configuração

- [x] 5.1 Atualizar `docs/security.md` com o fluxo de convite, o uso restrito do cliente admin, a restrição de uma organização por usuário e o ciclo de vida do convite pendente; verificar que o checklist pré-produção reflete o estado implementado
- [x] 5.2 Atualizar `AGENTS.md` para registrar que o cliente admin também pode ser usado para convidar membros (somente `inviteUserByEmail`, nunca para escrever membership); verificar que a regra continua explícita sobre segredos server-only
- [x] 5.3 Documentar `SUPABASE_SERVICE_ROLE_KEY`, SMTP de produção e Inbucket local (`http://127.0.0.1:54324`) em `.env.example`/`README.md`; verificar que os comandos e URLs documentados funcionam no ambiente local
- [x] 5.4 Documentar em `docs/database.md` (ou comentário da migration) as novas RPCs, grants e o procedimento de rollback; verificar que o rollback descrito restaura as definições da migration 004

## 6. Verificação integrada

- [x] 6.1 Executar `npm run typecheck` e `npm run lint` sem erros
- [x] 6.2 Executar `npm run build` com sucesso e confirmar que as rotas de membros continuam como Partial Prerender (`◐`) ou dinâmicas, sem erro de prerender
- [x] 6.3 Executar `npm run test` com toda a suíte (Épicos 2 e 3 + CRUD de membros) verde contra o Supabase local
- [x] 6.4 Teste manual completo: owner convida novo e-mail (ver link no Mailpit), convidado define senha e entra, owner edita nome e papel, admin adiciona/edita/remove apenas `member`, admin não vê seletor de papel, member não vê ações, remoção do último owner é recusada e o stderr do dev server permanece vazio

## Workflow follow-up

- Arquivar `epico-3-dashboard` antes deste change (pré-requisito dos requisitos `MODIFIED` de `members`).
- Arquivar este change após a revisão e aprovação da implementação.
- Evolução futura: reenviar/cancelar convite e expiração automática de convites pendentes.
