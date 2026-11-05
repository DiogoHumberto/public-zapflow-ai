# Proposal: Épico 3 — Dashboard

## Why

O Épico 2 entregou login, onboarding e guards de sessão, mas o dashboard ainda é uma página placeholder ("indicadores chegam no Épico 3"). Sem layout de navegação, indicadores, gestão da empresa, perfil editável e gestão de membros, o cliente não consegue operar a conta após o onboarding. A gestão de membros também é o ponto onde a regra "ninguém promove a si mesmo a owner" (spec §5.3, pendência de `docs/security.md`) precisa ser garantida antes de produção.

## What Changes

- **D01 — Layout principal:** sidebar e navegação no grupo `(dashboard)` (Dashboard, Conversas, Contatos, Base de conhecimento, Configurações), com itens de seções ainda não implementadas marcados como indisponíveis.
- **D02 — Dashboard inicial:** indicadores básicos da organização (total de contatos, conversas abertas, conversas com IA pausada e mensagens recebidas nos últimos 7 dias), lidos via RLS.
- **D03 — Cadastro da empresa:** formulário para admins/owners editarem nome, tipo de negócio, e-mail, telefone e fuso horário da organização, persistido via Server Action.
- **D04 — Configuração de perfil:** página para o usuário editar `full_name` e `avatar_url` do próprio perfil.
- **D05 — Gestão de membros:** listagem de membros e alteração/remoção de papéis (`owner`, `admin`, `member`) respeitando hierarquia. Alterações passam por RPCs controladas; escrita direta em `organization_members` pelo cliente é revogada.
- **BREAKING (interno):** a policy direta "Admins add organization members" e as de update/delete em `organization_members` são substituídas por RPCs. Nenhum cliente existente depende delas (não há UI de membros).
- **Testes:** cobertura de autorização para as novas RPCs e para o acesso de `member` às telas administrativas (complementa A09 do Épico 2).

## Capabilities

### New Capabilities

- `dashboard`: layout principal com navegação protegida e indicadores básicos da organização do usuário (D01, D02).
- `user-profile`: visualização e edição do próprio perfil, sem acesso a dados de outros usuários (D04).
- `members`: listagem de membros da organização e gestão de papéis com regras de hierarquia, impedindo autopromoção a `owner` e remoção ou rebaixamento do último `owner` (D05).

### Modified Capabilities

- `organizations`: adiciona requisito de edição dos dados cadastrais da empresa por `owner`/`admin` (D03). Os requisitos existentes não mudam.

## Impact

- **Código:** `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/settings/**`, `src/components/layout/**`, `src/components/dashboard/**`, `src/features/organizations/` (edição), `src/features/members/`, `src/lib/validation/` (schemas de perfil, empresa e papel).
- **Banco:** nova migration `004_dashboard_members.sql` com RPCs de gestão de membros (`change_member_role`, `remove_member`), revogação de escrita direta em `organization_members` e função/consulta de indicadores. Mantém as FKs compostas e o `is_org_member()` / `is_org_admin()` existentes.
- **Specs de segurança:** resolve parcialmente a pendência de `docs/security.md` (autopromoção a owner, último owner, escrita direta em `organization_members`). A restrição de `admin` alterar cobrança fica para o Épico 6.
- **Dependências:** nenhuma nova prevista.

## Riscos

- Revogar escrita direta em `organization_members` pode quebrar o onboarding se a RPC `create_organization()` depender de policy de insert — mitigado porque ela é `security definer` e a migration 004 deve testar esse caminho.
- Indicadores agregados sobre `messages` e `conversations` podem ficar lentos com volume alto — mitigado pelos índices existentes (`organization_id`, `created_at`); nenhuma materialização no MVP.
- Assumido: itens de navegação de épicos futuros aparecem desabilitados, e não ocultos, para manter a sidebar estável.
</content>
