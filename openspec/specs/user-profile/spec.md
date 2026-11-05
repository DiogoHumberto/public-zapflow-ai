# user-profile Specification

## Purpose

Permite que cada usuário autenticado visualize e edite as próprias informações de perfil (nome e avatar), sem acesso aos dados de outros usuários.

## Requirements

### Requirement: Visualização do próprio perfil
O sistema SHALL exibir na página de configurações os dados do perfil do usuário autenticado (nome completo e avatar).

#### Scenario: Perfil carregado
- **WHEN** usuário autenticado acessa a página de configuração de perfil
- **THEN** o formulário é preenchido com `full_name` e `avatar_url` do próprio usuário

### Requirement: Edição do próprio perfil
O sistema SHALL permitir ao usuário autenticado alterar seu nome completo e URL do avatar, validando as entradas no servidor. O nome completo MUST ter entre 2 e 100 caracteres após remoção de espaços nas extremidades.

#### Scenario: Atualização bem-sucedida
- **WHEN** usuário submete nome válido e URL de avatar válida
- **THEN** o perfil é atualizado e a página exibe confirmação

#### Scenario: Nome inválido
- **WHEN** usuário submete nome com menos de 2 ou mais de 100 caracteres
- **THEN** o sistema rejeita a alteração com mensagem de validação e nada é persistido

#### Scenario: URL de avatar inválida
- **WHEN** usuário submete avatar que não é uma URL `https` válida
- **THEN** o sistema rejeita a alteração com mensagem de validação e nada é persistido

### Requirement: Isolamento do perfil
Um usuário SHALL NOT ler ou alterar o perfil de outro usuário, mesmo informando outro identificador na requisição. O bloqueio MUST ocorrer no PostgreSQL via RLS.

#### Scenario: Alteração de perfil alheio bloqueada
- **WHEN** usuário autenticado tenta atualizar o perfil de outro usuário
- **THEN** o banco rejeita a operação e nenhum dado é alterado

#### Scenario: Campos sensíveis não editáveis
- **WHEN** usuário tenta alterar seu identificador ou `created_at` do perfil
- **THEN** a alteração é rejeitada e os valores permanecem inalterados
