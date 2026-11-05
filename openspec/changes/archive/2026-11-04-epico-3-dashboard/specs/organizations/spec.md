# Spec Delta: organizations

## ADDED Requirements

### Requirement: Edição dos dados cadastrais da organização
O sistema SHALL permitir que membros com papel `owner` ou `admin` alterem nome, tipo de negócio, e-mail, telefone e fuso horário da própria organização, validando as entradas no servidor. O nome MUST ter entre 2 e 100 caracteres e o fuso horário MUST ser um identificador IANA válido.

#### Scenario: Atualização por admin
- **WHEN** usuário com papel `admin` submete dados válidos da organização
- **THEN** os dados são persistidos e a página exibe confirmação

#### Scenario: Atualização por owner
- **WHEN** usuário com papel `owner` submete dados válidos da organização
- **THEN** os dados são persistidos e a página exibe confirmação

#### Scenario: Dados inválidos
- **WHEN** usuário submete nome fora do intervalo 2–100 ou fuso horário inexistente
- **THEN** o sistema rejeita a alteração com mensagem de validação e nada é persistido

### Requirement: Edição restrita a administradores
Membros com papel `member` SHALL NOT alterar os dados cadastrais da organização. A restrição MUST ser aplicada pelo PostgreSQL via RLS, não apenas pela interface.

#### Scenario: Member tenta editar a organização
- **WHEN** usuário com papel `member` tenta atualizar a organização
- **THEN** o banco rejeita a operação e os dados permanecem inalterados

#### Scenario: Edição cross-tenant bloqueada
- **WHEN** admin da Org A tenta atualizar a Org B
- **THEN** o banco rejeita a operação por violação de policy

### Requirement: Organização não altera identificador ou status
A edição de dados cadastrais SHALL NOT alterar `id`, `slug` ou `status` da organização. Alterações de `slug` e `status` ficam fora deste épico.

#### Scenario: Tentativa de alterar slug
- **WHEN** usuário submete alteração de `slug` ou `status` pela tela de empresa
- **THEN** o sistema rejeita a alteração com mensagem de validação e os campos permanecem inalterados
