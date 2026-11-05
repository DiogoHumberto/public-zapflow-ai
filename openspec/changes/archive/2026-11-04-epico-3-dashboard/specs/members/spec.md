# Spec Delta: members

## Purpose

Gestão dos membros de uma organização: listagem e alteração de papéis (`owner`, `admin`, `member`) com hierarquia de permissões, impedindo autopromoção e a perda do último proprietário.

## ADDED Requirements

### Requirement: Listagem de membros
O sistema SHALL listar os membros da organização do usuário autenticado, exibindo nome, papel e data de entrada. Todos os membros da organização MAY visualizar a lista.

#### Scenario: Listagem por membro comum
- **WHEN** usuário com papel `member` acessa a página de membros
- **THEN** a lista de membros da própria organização é exibida sem ações de alteração

#### Scenario: Listagem isolada por tenant
- **WHEN** usuário da Org A consulta a lista de membros
- **THEN** somente membros da Org A são retornados

### Requirement: Alteração de papel por RPC controlada
A alteração de papel de um membro SHALL ocorrer exclusivamente pela função `change_member_role`, e MUST NOT ser feita por escrita direta na tabela `organization_members`. A função MUST validar o papel informado contra `owner`, `admin` e `member`.

#### Scenario: Escrita direta bloqueada
- **WHEN** usuário autenticado tenta inserir, alterar ou remover linha em `organization_members` diretamente
- **THEN** o banco rejeita a operação

#### Scenario: Papel inválido
- **WHEN** a função é chamada com papel fora de `owner`, `admin` ou `member`
- **THEN** a função rejeita a chamada e nada é alterado

### Requirement: Hierarquia de permissões na alteração de papéis
Somente `owner` SHALL conceder ou revogar o papel `owner`. `admin` SHALL alterar papéis apenas entre `admin` e `member`, e MUST NOT alterar membros com papel `owner`.

#### Scenario: Owner promove membro a admin
- **WHEN** owner altera o papel de um `member` para `admin`
- **THEN** a alteração é persistida

#### Scenario: Admin tenta promover a owner
- **WHEN** admin tenta alterar o papel de qualquer membro para `owner`
- **THEN** a função rejeita a operação e o papel não muda

#### Scenario: Admin tenta alterar owner
- **WHEN** admin tenta alterar o papel de um membro que é `owner`
- **THEN** a função rejeita a operação e o papel não muda

#### Scenario: Member tenta alterar papel
- **WHEN** usuário com papel `member` chama `change_member_role`
- **THEN** a função rejeita a operação por falta de permissão

### Requirement: Proibição de autopromoção
Nenhum usuário SHALL alterar o próprio papel. A tentativa MUST ser rejeitada independentemente do papel atual do usuário.

#### Scenario: Admin tenta se promover a owner
- **WHEN** admin chama `change_member_role` apontando o próprio membership para `owner`
- **THEN** a função rejeita a operação e o papel permanece `admin`

#### Scenario: Owner tenta rebaixar a si mesmo
- **WHEN** owner chama `change_member_role` apontando o próprio membership
- **THEN** a função rejeita a operação e o papel permanece `owner`

### Requirement: Preservação do último proprietário
A organização SHALL manter ao menos um membro com papel `owner`. Remoção ou rebaixamento que deixe a organização sem `owner` MUST ser rejeitado.

#### Scenario: Rebaixamento do último owner bloqueado
- **WHEN** a alteração removeria o único `owner` da organização
- **THEN** a função rejeita a operação com erro de último proprietário

#### Scenario: Remoção do último owner bloqueada
- **WHEN** `remove_member` seria aplicado ao único `owner` da organização
- **THEN** a função rejeita a operação e o membro permanece

### Requirement: Remoção de membro
O sistema SHALL permitir que `owner` e `admin` removam membros via função `remove_member`, aplicando as mesmas regras de hierarquia da alteração de papel.

#### Scenario: Admin remove member
- **WHEN** admin remove um membro com papel `member`
- **THEN** o membership é excluído e o usuário perde acesso aos dados da organização

#### Scenario: Admin tenta remover owner
- **WHEN** admin tenta remover um membro com papel `owner`
- **THEN** a função rejeita a operação

#### Scenario: Member tenta remover membro
- **WHEN** usuário com papel `member` chama `remove_member`
- **THEN** a função rejeita a operação por falta de permissão

### Requirement: Controle de acesso à tela de membros
A página de gestão de membros SHALL mostrar ações de alteração e remoção somente para `owner` e `admin`, e MUST NOT depender apenas dessa ocultação visual para proteger a operação.

#### Scenario: Member sem ações administrativas
- **WHEN** usuário com papel `member` visualiza a página de membros
- **THEN** nenhuma ação de alteração ou remoção é exibida

#### Scenario: Ação forjada por member
- **WHEN** usuário com papel `member` invoca a Server Action de alteração de papel manualmente
- **THEN** a operação é rejeitada no servidor e no banco
