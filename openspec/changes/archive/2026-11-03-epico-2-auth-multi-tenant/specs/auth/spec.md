# Spec Delta: auth

## Purpose

Autenticação de usuários via Supabase Auth com e-mail/senha, sessão em cookies seguros e proteção de rotas — porta de entrada do produto.

## ADDED Requirements

### Requirement: Registro de usuário
O sistema SHALL permitir registro com e-mail e senha, exigindo confirmação de e-mail antes do primeiro acesso, e MUST criar o perfil automaticamente via trigger `handle_new_user()`.

#### Scenario: Registro com sucesso
- **WHEN** usuário submete e-mail e senha válidos no formulário de registro
- **THEN** a conta é criada, um e-mail de confirmação é enviado e o usuário é orientado a verificar a caixa de entrada

#### Scenario: Registro com dados inválidos
- **WHEN** usuário submete e-mail malformado ou senha fora da política
- **THEN** o sistema rejeita com mensagem de validação clara, sem criar a conta

#### Scenario: E-mail já cadastrado
- **WHEN** usuário tenta registrar um e-mail já existente
- **THEN** o sistema retorna erro sem revelar detalhes internos

### Requirement: Login e logout
O sistema SHALL autenticar por e-mail e senha, persistindo a sessão em cookies seguros, e SHALL permitir encerrar a sessão (logout).

#### Scenario: Login com sucesso
- **WHEN** usuário com e-mail confirmado submete credenciais válidas
- **THEN** a sessão é criada e o usuário é redirecionado ao dashboard (ou ao onboarding, se não tiver organização)

#### Scenario: Credenciais inválidas
- **WHEN** usuário submete e-mail/senha incorretos
- **THEN** o sistema retorna erro genérico, sem distinguir qual campo falhou

#### Scenario: Logout
- **WHEN** usuário aciona logout
- **THEN** a sessão é encerrada e o usuário é redirecionado à página de login

### Requirement: Recuperação de senha
O sistema SHALL enviar e-mail de recuperação e permitir redefinir a senha, usando `NEXT_PUBLIC_APP_URL` como base dos redirects.

#### Scenario: Solicitação de recuperação
- **WHEN** usuário informa o e-mail no formulário "esqueci a senha"
- **THEN** um e-mail com link de redefinição é enviado (resposta idêntica para e-mail inexistente, evitando enumeração)

#### Scenario: Redefinição de senha
- **WHEN** usuário acessa o link válido e submete nova senha conforme a política
- **THEN** a senha é atualizada e o usuário consegue autenticar-se com ela

### Requirement: Proteção de rotas autenticadas
Rotas sob `(dashboard)` SHALL ser inacessíveis sem sessão válida, com verificação no servidor (não apenas no proxy).

#### Scenario: Acesso sem sessão
- **WHEN** visitante sem sessão acessa qualquer rota de `(dashboard)`
- **THEN** é redirecionado ao login

#### Scenario: Usuário autenticado acessa rotas de auth
- **WHEN** usuário com sessão válida acessa login/register
- **THEN** é redirecionado ao dashboard (ou onboarding)
