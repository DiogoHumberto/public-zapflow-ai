# Spec Delta: dashboard

## Purpose

Painel principal da organização autenticada: navegação lateral protegida e indicadores básicos de atendimento, sempre restritos aos dados da organização do usuário.

## ADDED Requirements

### Requirement: Layout principal com navegação
O sistema SHALL apresentar, em todas as rotas de `(dashboard)`, uma sidebar com os itens Dashboard, Conversas, Contatos, Base de conhecimento e Configurações. Itens de seções ainda não disponíveis MUST aparecer desabilitados, sem ocultar a navegação.

#### Scenario: Navegação exibida para usuário com organização
- **WHEN** usuário autenticado com organização acessa qualquer rota de `(dashboard)`
- **THEN** a sidebar é exibida com os cinco itens de navegação e o nome da organização

#### Scenario: Item indisponível
- **WHEN** usuário visualiza a sidebar e um item corresponde a um épico ainda não entregue
- **THEN** o item é exibido desabilitado e não leva a uma rota ativa

### Requirement: Navegação restrita a sessão válida
O layout de `(dashboard)` SHALL ser renderizado somente após verificação de sessão e de organização no servidor, e MUST NOT expor dados da organização a visitantes sem sessão.

#### Scenario: Visitante sem sessão
- **WHEN** visitante sem sessão acessa `/dashboard`
- **THEN** é redirecionado ao login e nenhum item da sidebar ou nome de organização é renderizado

### Requirement: Indicadores básicos da organização
O dashboard SHALL exibir indicadores agregados da organização do usuário: total de contatos, conversas abertas, conversas com IA desativada e mensagens recebidas nos últimos 7 dias.

#### Scenario: Indicadores com dados
- **WHEN** usuário com organização acessa o dashboard e a organização possui contatos, conversas e mensagens
- **THEN** cada indicador exibe a contagem correspondente à organização do usuário

#### Scenario: Organização sem dados
- **WHEN** usuário acessa o dashboard de uma organização recém-criada
- **THEN** todos os indicadores exibem zero, sem erro

#### Scenario: Indicadores isolados por tenant
- **WHEN** usuário da Org A acessa o dashboard enquanto a Org B possui contatos e conversas
- **THEN** os indicadores contabilizam somente registros da Org A

### Requirement: Falha ao carregar indicadores
Se a consulta de indicadores falhar, o dashboard SHALL exibir mensagem genérica de indisponibilidade sem expor detalhes internos, e MUST manter a navegação funcional.

#### Scenario: Erro na consulta
- **WHEN** a consulta de indicadores retorna erro
- **THEN** a área de indicadores mostra mensagem genérica e a sidebar permanece utilizável
