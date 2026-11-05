# Proposal: Épico 1 — Fundação

## Por quê

O ZapFlow AI precisa de uma fundação técnica sólida antes de qualquer funcionalidade de negócio: estrutura modular, clientes Supabase SSR, validação de ambiente, tratamento de erros e documentação. Sem isso, os Épicos 2+ (auth, dashboard, WhatsApp, IA) não têm base segura.

## O que muda

- Estrutura de pastas conforme `especificacao-tecnica-MVP.md` §2
- Clientes Supabase (browser/server/admin) + Proxy de sessão (Next 16)
- Validação de variáveis de ambiente com Zod
- Tipos TypeScript do banco (manuais, alinhados às migrations 001/002)
- Migration 003 com `handle_new_user()` e `create_organization()`
- Tratamento de erros (AppError + boundaries)
- Layout raiz pt-BR, landing page, `api/health`, stub de webhook
- Documentação: README, docs/{architecture,database,security}, AGENTS.md

## Fora de escopo

- Autenticação completa (Épico 2)
- WhatsApp / Meta Cloud API (Épico 4)
- IA / OpenAI (Épico 5)
- Testes automatizados (unit/integration)

## Riscos

- Next 16 tem breaking changes (Proxy ≠ middleware) — mitigado lendo `node_modules/next/dist/docs`.
- Tipos manuais podem divergir do banco — mitigado documentando geração via `supabase gen types` após `supabase link`.
