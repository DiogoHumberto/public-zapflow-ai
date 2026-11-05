# Arquitetura

> Fonte completa: `especificacao-tecnica-MVP.md`. Este documento é um resumo operacional.

## Visão geral

```
Usuário → Next.js (App Router) → Route Handlers / Server Actions
        → Serviços de domínio → Repositories → PostgreSQL (RLS)
        → Adapters → Meta Cloud API / OpenAI API → Webhooks → Route Handlers
```

## Camadas

| Camada | Local | Responsabilidade |
|---|---|---|
| Frontend | `src/app`, `src/components` | Dashboard e UX |
| Auth | Supabase Auth | Login, sessão, recuperação |
| Route Handlers | `src/app/api` | APIs e webhooks |
| Services | `src/server/services` | Regras de negócio |
| Repositories | `src/server/repositories` | Acesso ao banco |
| Adapters | `src/server/integrations` | Integrações externas |
| Features | `src/features` | Módulos de produto |
| Banco | `supabase/migrations` | Dados + RLS |

## Decisões-chave

1. **Integrações externas somente no servidor** — o frontend nunca acessa Meta/OpenAI com segredos.
2. **Isolamento por RLS** — `organization_id` validado no servidor + políticas no PostgreSQL.
3. **Multi-tenant desde o dia 1** — chaves estrangeiras compostas impedem relacionamentos cruzados.
4. **Spec-Driven Development** — mudanças passam por `openspec/changes/` antes do código.

## Next 16

Este projeto usa **Next.js 16**: o antigo `middleware` foi renomeado para **Proxy** (`src/proxy.ts`). A doc de referência local fica em `node_modules/next/dist/docs/`.
