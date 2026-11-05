# Tasks: Épico 3 — Dashboard

## 1. Migration de segurança e gestão de membros (base)

- [x] 1.1 Criar `supabase/migrations/004_dashboard_members.sql` removendo as policies de insert/update/delete de `organization_members` e revogando os privilégios de escrita de `authenticated`, verificando com `npm run db:reset` que a migration aplica sem erro
- [x] 1.2 Implementar `change_member_role(p_member_id, p_new_role)` como `security definer` com `set search_path = ''`, `for update` nas linhas envolvidas e validação de papel, verificando via SQL que `member` recebe erro `Forbidden` e papel inválido é rejeitado
- [x] 1.3 Aplicar hierarquia em `change_member_role`: somente `owner` concede/revoga `owner`, `admin` não age sobre `owner`, e autoalteração é rejeitada, verificando cada cenário de `specs/members` por teste SQL
- [x] 1.4 Implementar proteção do último owner em `change_member_role`, verificando que rebaixar o único `owner` retorna `Last owner` e nada é alterado
- [x] 1.5 Implementar `remove_member(p_member_id)` com as mesmas regras de hierarquia e de último owner, verificando remoção por admin, bloqueio de remoção de owner e de remoção do último owner
- [x] 1.6 Implementar `list_organization_members()` retornando `member_id`, `user_id`, `full_name`, `role`, `created_at` da organização do chamador, verificando que membros de outra organização não aparecem
- [x] 1.7 Revogar `update` completo de `profiles` e `organizations` e conceder `update` apenas nas colunas permitidas (`full_name`, `avatar_url`; `name`, `business_type`, `email`, `phone`, `timezone`), verificando que alterar `slug`, `status`, `id` ou `created_at` falha no banco
- [x] 1.8 Documentar no cabeçalho da migration 004 o script de rollback (policies de 002 e grants completos), verificando que o script executa em banco de teste
- [x] 1.9 Adicionar testes de autorização em `tests/integration/` cobrindo: escrita direta em `organization_members` bloqueada, hierarquia, último owner, colunas protegidas e isolamento de `list_organization_members`, verificando `npm run test` verde contra o Supabase local
- [x] 1.10 Verificar que `create_organization()` continua criando membership `owner` e assinatura `trialing` após a migration 004, com teste de onboarding no `tests/integration/`

## 2. Schemas de validação

- [x] 2.1 Criar `src/lib/validation/profile.ts` (`updateProfileSchema`: nome 2–100 após trim, avatar `https` opcional) e `src/lib/validation/members.ts` (`changeMemberRoleSchema`: papel em `owner|admin|member`), verificando com testes unitários que entradas inválidas retornam mensagens pt-BR
- [x] 2.2 Estender `src/lib/validation/organizations.ts` com `updateOrganizationSchema` (nome, business type, e-mail, telefone, fuso IANA), descartando `slug`, `status` e `id` do schema, verificando por teste unitário que esses campos não passam na validação

## 3. Layout e dashboard (D01, D02)

- [x] 3.1 Criar `src/components/layout/sidebar.tsx` com Dashboard, Conversas, Contatos, Base de conhecimento e Configurações; itens de épicos futuros renderizados com `aria-disabled` e sem `href`, verificando visualmente em `npm run dev`
- [x] 3.2 Integrar a sidebar em `src/app/(dashboard)/layout.tsx` mantendo o guard existente, verificando que acesso sem sessão continua redirecionando ao login
- [x] 3.3 Implementar consultas de indicadores (contatos, conversas abertas, conversas com IA desativada, mensagens inbound em 7 dias) com o cliente SSR, verificando por teste de integração que a contagem de uma org não inclui dados de outra
- [x] 3.4 Substituir o placeholder de `src/app/(dashboard)/dashboard/page.tsx` pelos indicadores, com mensagem genérica em caso de erro na consulta, verificando com organização vazia (zeros) e com erro simulado
- [x] 3.5 Testar a navegação e o dashboard em desktop e mobile, verificando que a sidebar não quebra o layout em viewport estreita

## 4. Perfil do usuário (D04)

- [x] 4.1 Criar `src/features/profile/` com leitura do perfil do usuário autenticado e Server Action `updateProfile` validada com Zod, verificando que a alteração persiste apenas `full_name` e `avatar_url`
- [x] 4.2 Implementar `src/app/(dashboard)/settings/page.tsx` com formulário de perfil, verificando que o formulário carrega os valores atuais e exibe erros de validação
- [x] 4.3 Testar isolamento do perfil: usuário A não consegue atualizar o perfil de B via cliente SSR, verificando por teste de integração que a linha de B permanece inalterada

## 5. Empresa (D03)

- [x] 5.1 Criar Server Action `updateOrganization` em `src/features/organizations/` usando o cliente SSR (RLS), sem aceitar `slug`/`status`, verificando que admin atualiza e member recebe erro do banco
- [x] 5.2 Implementar formulário de dados da empresa em `src/app/(dashboard)/settings/organization/page.tsx`, visível somente para `owner`/`admin`, verificando que `member` é redirecionado ou vê a página sem o formulário
- [x] 5.3 Testar edição cross-tenant: admin da Org A não atualiza a Org B, verificando por teste de integração que a linha da Org B permanece inalterada

## 6. Membros (D05)

- [x] 6.1 Criar `src/features/members/` com `listMembers` (chama `list_organization_members`), `changeMemberRole` e `removeMember` (chamam as RPCs), mapeando `Forbidden`, `Last owner` e `Invalid role` para `AppError` com mensagem pt-BR, verificando por teste unitário do mapeador
- [x] 6.2 Implementar `src/app/(dashboard)/settings/members/page.tsx` listando membros, com ações de alteração/remoção somente para `owner`/`admin`, verificando que `member` não vê ações
- [x] 6.3 Verificar que invocar a Server Action de alteração de papel como `member` é rejeitado no servidor, com teste de integração, verificando que o papel não muda
- [x] 6.4 Testar autopromoção e último owner via Server Action (não só via SQL), verificando que o fluxo da UI reproduz as mesmas rejeições das RPCs

## 7. Verificação

- [x] 7.1 Executar `npm run typecheck` e `npm run lint` sem erros
- [x] 7.2 Executar `npm run build` com sucesso
- [x] 7.3 Executar `npm run test` com todos os testes de autorização (Épico 2 e Épico 3) verdes contra o Supabase local
- [x] 7.4 Teste manual: owner promove member a admin, admin tenta promover a owner (recusado), owner tenta rebaixar a si mesmo como último owner (recusado), edição de empresa e perfil persistidos

## Workflow follow-up

- Revisar `docs/security.md` e marcar como resolvidas as pendências de autopromoção a owner, último owner e escrita direta em `organization_members`.
- Atualizar `README.md` com o novo fluxo de gestão de membros, se necessário.
- Arquivar o change após revisão (`/opsx-archive`).
- Verificar que as specs `dashboard`, `user-profile`, `members` e a delta de `organizations` foram sincronizadas em `openspec/specs/` após o archive.
