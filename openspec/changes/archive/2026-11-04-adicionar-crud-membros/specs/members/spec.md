# Spec Delta: members

## MODIFIED Requirements

### Requirement: Listagem de membros
O sistema SHALL listar os membros da organização do usuário autenticado, exibindo nome, papel, data de entrada e situação do convite. O e-mail SHALL ser exibido apenas para `owner`/`admin`; para `member`, MUST ser omitido. Todos os membros da organização MAY visualizar a lista.

#### Scenario: Listagem por membro comum
- **WHEN** usuário com papel `member` acessa a página de membros
- **THEN** a lista de membros da própria organização é exibida sem ações de alteração e sem e-mails

#### Scenario: Listagem isolada por tenant
- **WHEN** usuário da Org A consulta a lista de membros
- **THEN** somente membros da Org A são retornados

#### Scenario: E-mail visível apenas para gestores
- **WHEN** owner ou admin consulta a lista de membros
- **THEN** os e-mails dos membros da própria organização são exibidos

#### Scenario: Convite pendente sinalizado
- **WHEN** um membro convidado ainda não confirmou o e-mail
- **THEN** a listagem o apresenta com indicação de convite pendente

### Requirement: Alteração de papel por RPC controlada
A gestão de membros (adicionar, editar nome, alterar papel e remover) SHALL ocorrer exclusivamente por funções RPC controladas, e MUST NOT usar escrita direta em `organization_members` nem edição de `profiles` de outro usuário. O papel informado MUST ser validado contra `owner`, `admin` e `member`.

#### Scenario: Escrita direta bloqueada
- **WHEN** usuário autenticado tenta inserir, alterar ou remover linha em `organization_members` diretamente
- **THEN** o banco rejeita a operação

#### Scenario: Papel inválido
- **WHEN** a função é chamada com papel fora de `owner`, `admin` ou `member`
- **THEN** a função rejeita a chamada e nada é alterado

#### Scenario: Edição direta de perfil alheio bloqueada
- **WHEN** um gestor tenta alterar o `full_name` de outro membro por escrita direta em `profiles`
- **THEN** o banco rejeita a operação e o nome permanece inalterado

### Requirement: Hierarquia de permissões na alteração de papéis
Somente `owner` SHALL alterar papéis. `admin` MUST NOT alterar o papel de nenhum membro, nem promover alguém a `admin` ou `owner`. `owner` MAY promover `member` a `admin`/`owner` e rebaixar `admin`/`owner`, respeitando a proibição de autopromoção e a preservação do último proprietário.

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

#### Scenario: Admin tenta alterar member para admin
- **WHEN** admin chama `change_member_role` promovendo um `member` a `admin`
- **THEN** a função rejeita a operação e o papel permanece `member`

### Requirement: Remoção de membro
`owner` SHALL remover membros com papel `admin` ou `member`. `admin` SHALL remover somente membros com papel `member`. Remover um `owner` SHALL exigir mais de um proprietário. Auto-remoção MAY ocorrer, exceto quando deixaria a organização sem `owner`.

#### Scenario: Admin remove member
- **WHEN** admin remove um membro com papel `member`
- **THEN** o membership é excluído e o usuário perde acesso aos dados da organização

#### Scenario: Admin tenta remover owner
- **WHEN** admin tenta remover um membro com papel `owner`
- **THEN** a função rejeita a operação

#### Scenario: Member tenta remover membro
- **WHEN** usuário com papel `member` chama `remove_member`
- **THEN** a função rejeita a operação por falta de permissão

#### Scenario: Admin tenta remover outro admin
- **WHEN** admin tenta remover um membro com papel `admin`
- **THEN** a função rejeita a operação e o vínculo permanece

#### Scenario: Auto-remoção do owner com outro owner
- **WHEN** owner remove o próprio vínculo existindo outro `owner` na organização
- **THEN** o vínculo é excluído e a organização mantém um proprietário

### Requirement: Controle de acesso à tela de membros
A página SHALL exibir ações de adicionar, editar e remover para `owner` e `admin`, restringindo `admin` a membros com papel `member`. A alteração de papel SHALL ser exibida somente para `owner`. A ocultação visual MUST NOT ser a única proteção das operações.

#### Scenario: Member sem ações administrativas
- **WHEN** usuário com papel `member` visualiza a página de membros
- **THEN** nenhuma ação de adicionar, alterar, editar ou remover é exibida

#### Scenario: Ação forjada por member
- **WHEN** usuário com papel `member` invoca uma Server Action de gestão de membros manualmente
- **THEN** a operação é rejeitada no servidor e no banco

#### Scenario: Admin sem controle de papel
- **WHEN** admin visualiza a página de membros
- **THEN** não vê o seletor de papel, mas vê adicionar, editar e remover apenas para membros com papel `member`

#### Scenario: Admin sem ações sobre privilégios especiais
- **WHEN** admin visualiza a linha de um `owner` ou de outro `admin`
- **THEN** nenhuma ação de edição ou remoção é oferecida para essa linha

## ADDED Requirements

### Requirement: Adicionar membro por convite
O sistema SHALL permitir que `owner` e `admin` adicionem membros por e-mail. `admin` MUST adicionar somente com papel `member`; `owner` MAY adicionar como `member` ou `admin`. E-mail sem conta SHALL receber convite do Supabase Auth; e-mail já cadastrado e sem organização SHALL ser associado sem novo convite.

#### Scenario: Owner adiciona admin por e-mail novo
- **WHEN** owner informa um e-mail sem conta e papel `admin`
- **THEN** o convite é enviado, o membership é criado como `admin` e a listagem mostra o convite como pendente

#### Scenario: Admin adiciona member
- **WHEN** admin informa um e-mail sem conta e papel `member`
- **THEN** o convite é enviado, o membership é criado como `member` e a listagem mostra o convite como pendente

#### Scenario: E-mail já cadastrado e sem organização
- **WHEN** owner ou admin informa o e-mail de um usuário cadastrado que não pertence a organização alguma
- **THEN** o membership é criado imediatamente, sem enviar novo convite

#### Scenario: Admin tenta adicionar admin
- **WHEN** admin tenta adicionar um e-mail com papel `admin` ou `owner`
- **THEN** a função rejeita a operação e nenhum membership ou convite é criado

#### Scenario: E-mail já pertence à organização
- **WHEN** owner ou admin tenta adicionar um e-mail que já é membro da organização
- **THEN** a operação é rejeitada com erro de membro já existente e nada é alterado

#### Scenario: Falha no envio do convite
- **WHEN** o envio do convite falha após a validação
- **THEN** nenhum membership pendente permanece e o gestor recebe uma mensagem de erro

#### Scenario: Member tenta adicionar membro
- **WHEN** usuário com papel `member` invoca a operação de adicionar membro
- **THEN** a operação é rejeitada por falta de permissão

### Requirement: Convite pendente e confirmação
Um membro convidado SHALL permanecer vinculado à organização como convite pendente até confirmar o e-mail e definir a senha. Enquanto pendente, MUST NOT acessar dados da organização. Após a confirmação, SHALL ser tratado como membro ativo.

#### Scenario: Pendente até a confirmação
- **WHEN** um convite é criado e o convidado ainda não confirmou o e-mail
- **THEN** o membership existe e a listagem o marca como pendente

#### Scenario: Ativação após definir senha
- **WHEN** o convidado aceita o convite e define a senha
- **THEN** o acesso à organização é liberado e a listagem deixa de marcar o convite como pendente

#### Scenario: Pendente sem acesso
- **WHEN** um usuário com convite pendente tenta autenticar antes da confirmação
- **THEN** o Supabase Auth impede o acesso e nenhum dado da organização é retornado

### Requirement: Edição de dados do membro
O sistema SHALL permitir que `owner` e `admin` editem o nome (`full_name`) de membros da própria organização. `admin` MUST editar somente membros com papel `member`. O nome MUST ter entre 2 e 100 caracteres após remoção de espaços. O e-mail MUST NOT ser editável por esta operação.

#### Scenario: Owner edita nome
- **WHEN** owner altera o nome de um membro da própria organização para um valor válido
- **THEN** o novo nome é persistido e exibido na listagem

#### Scenario: Admin edita nome de member
- **WHEN** admin altera o nome de um membro com papel `member`
- **THEN** o novo nome é persistido

#### Scenario: Admin tenta editar owner ou admin
- **WHEN** admin tenta alterar o nome de um `owner` ou de outro `admin`
- **THEN** a operação é rejeitada e o nome permanece inalterado

#### Scenario: Nome inválido
- **WHEN** a edição recebe nome vazio ou com menos de 2 caracteres após `trim`
- **THEN** a operação é rejeitada e o nome anterior permanece

#### Scenario: E-mail não editável
- **WHEN** um gestor tenta enviar um novo e-mail na edição de membro
- **THEN** o campo é descartado e o e-mail da conta permanece inalterado

#### Scenario: Member tenta editar membro
- **WHEN** usuário com papel `member` invoca a edição de outro membro
- **THEN** a operação é rejeitada por falta de permissão

### Requirement: Restrição de uma organização por usuário no convite
O sistema SHALL NOT adicionar a uma organização um usuário que já pertença a outra organização, preservando a premissa de uma organização por usuário do MVP.

#### Scenario: Usuário de outra organização
- **WHEN** owner ou admin tenta adicionar o e-mail de um usuário que já pertence a outra organização
- **THEN** a operação é rejeitada, nenhum convite é enviado e o vínculo existente permanece intacto

#### Scenario: Usuário sem organização
- **WHEN** owner ou admin adiciona um usuário cadastrado que não possui organização
- **THEN** o membership é criado e o usuário passa a pertencer somente a essa organização

### Requirement: Isolamento de tenant nas operações de gestão
Toda operação de gestão de membros SHALL validar que o alvo pertence à organização do chamador. Identificadores de outra organização MUST ser tratados como inexistentes ou proibidos, sem revelar dados e sem alterar vínculos.

#### Scenario: Alvo de outra organização
- **WHEN** owner de uma organização tenta editar, alterar papel ou remover um membership de outra organização
- **THEN** a operação é rejeitada e nenhum dado ou vínculo é alterado

#### Scenario: Listagem não vaza e-mail de outro tenant
- **WHEN** um gestor consulta a listagem da própria organização
- **THEN** nenhum e-mail ou membro de outra organização é retornado
