# Spec Delta: organizations

## Purpose

Onboarding e isolamento multi-tenant: criação controlada da organização via RPC e garantia de que dados de uma empresa jamais vazam para outra.

## ADDED Requirements

### Requirement: Criação de organização via RPC controlada
A organização SHALL ser criada exclusivamente via RPC `create_organization()` — nunca por inserção direta — validando nome (2–100 caracteres) e slug (`^[a-z0-9-]{3,50}$`).

#### Scenario: Criação bem-sucedida
- **WHEN** usuário autenticado sem organização submete nome e slug válidos
- **THEN** a organização é criada e o usuário recebe seu identificador

#### Scenario: Dados inválidos
- **WHEN** nome fora do intervalo 2–100 ou slug em formato inválido
- **THEN** a RPC rejeita com erro de validação e nada é persistido

#### Scenario: Usuário não autenticado
- **WHEN** chamada sem sessão válida
- **THEN** a RPC falha com exigência de autenticação

### Requirement: Membership e assinatura atômicas
Na criação, o sistema SHALL criar atomicamente o membership do criador com papel `owner` e a assinatura `starter` em status `trialing`.

#### Scenario: Estado pós-criação
- **WHEN** a RPC `create_organization()` conclui com sucesso
- **THEN** existem exatamente um membership `owner` para o criador e uma assinatura `trialing` vinculados à nova organização

### Requirement: Uma organização por usuário (MVP)
O sistema SHALL impedir que um usuário já associado a uma organização crie outra.

#### Scenario: Segunda organização rejeitada
- **WHEN** usuário que já é membro de uma organização chama a RPC de criação
- **THEN** a RPC rejeita informando que o usuário já pertence a uma organização

### Requirement: Onboarding obrigatório
Usuário autenticado sem organização SHALL ser direcionado ao fluxo de criação da empresa antes de acessar o dashboard.

#### Scenario: Login sem organização
- **WHEN** usuário autenticado sem membership acessa qualquer rota de `(dashboard)`
- **THEN** é redirecionado à página de onboarding da organização

### Requirement: Isolamento multi-tenant por RLS
Um membro de uma organização SHALL NOT ler, criar, alterar ou excluir dados de outra organização — o bloqueio MUST ocorrer no PostgreSQL via RLS, independentemente de IDs ou URLs forjados.

#### Scenario: Leitura cross-tenant bloqueada
- **WHEN** membro da Org A consulta registros (contacts, conversations, messages, knowledge_base) da Org B
- **THEN** o banco retorna vazio, como se os dados não existissem

#### Scenario: Escrita cross-tenant bloqueada
- **WHEN** membro da Org A tenta inserir ou alterar registro com `organization_id` da Org B
- **THEN** o banco rejeita a operação por violação de policy

#### Scenario: Gestão restrita a admins
- **WHEN** membro com papel `member` tenta operação administrativa (ex.: gerenciar knowledge base)
- **THEN** o banco rejeita; apenas `owner`/`admin` da organização têm permissão
