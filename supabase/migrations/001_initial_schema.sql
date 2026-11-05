-- =====================================================
-- ZAPFLOW AI
-- MIGRATION 001: INITIAL DATABASE
-- PostgreSQL / Supabase
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1. PROFILES
-- =====================================================

create table public.profiles (
    id uuid primary key references auth.users(id)
        on delete cascade,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =====================================================
-- 2. ORGANIZATIONS
-- =====================================================

create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    business_type text,
    email text,
    phone text,
    timezone text not null default 'America/Sao_Paulo',
    status text not null default 'active'
        check (status in ('active', 'suspended', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =====================================================
-- 3. ORGANIZATION MEMBERS
-- =====================================================

create table public.organization_members (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null
        references public.organizations(id) on delete cascade,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    role text not null default 'member'
        check (role in ('owner', 'admin', 'member')),
    created_at timestamptz not null default now(),

    unique (organization_id, user_id),
    unique (id, organization_id)
);

create index idx_members_user
on public.organization_members(user_id);

-- =====================================================
-- 4. WHATSAPP ACCOUNTS
-- =====================================================

create table public.whatsapp_accounts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null
        references public.organizations(id) on delete cascade,

    phone_number text not null,
    phone_number_id text not null,
    business_account_id text,

    credential_ref text,
    display_name text,

    status text not null default 'pending'
        check (status in (
            'pending', 'connected', 'disconnected', 'error'
        )),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (phone_number_id),
    unique (id, organization_id)
);

create index idx_whatsapp_org
on public.whatsapp_accounts(organization_id);

-- =====================================================
-- 5. CONTACTS
-- =====================================================

create table public.contacts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null
        references public.organizations(id) on delete cascade,

    name text,
    phone text not null,
    email text,
    source text default 'whatsapp',

    tags text[] not null default '{}',
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (id, organization_id),
    unique (organization_id, phone)
);

create index idx_contacts_org
on public.contacts(organization_id);

-- =====================================================
-- 6. CONVERSATIONS
-- =====================================================

create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    contact_id uuid not null,
    whatsapp_account_id uuid,

    status text not null default 'open'
        check (status in (
            'open', 'pending', 'closed'
        )),

    assigned_user_id uuid
        references auth.users(id) on delete set null,

    ai_enabled boolean not null default true,
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (id, organization_id),

    foreign key (contact_id, organization_id)
        references public.contacts(id, organization_id)
        on delete cascade,

    foreign key (whatsapp_account_id, organization_id)
        references public.whatsapp_accounts(id, organization_id)
        on delete restrict
);

create index idx_conversations_org
on public.conversations(organization_id);

create index idx_conversations_status
on public.conversations(organization_id, status);

create index idx_conversations_last_message
on public.conversations(organization_id, last_message_at desc);

-- =====================================================
-- 7. MESSAGES
-- =====================================================

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null,
    conversation_id uuid not null,

    external_message_id text,
    direction text not null
        check (direction in ('inbound', 'outbound')),

    sender_type text not null
        check (sender_type in ('customer', 'ai', 'agent', 'system')),

    message_type text not null default 'text',
    content text,

    delivery_status text not null default 'received'
        check (delivery_status in (
            'received', 'queued', 'sent',
            'delivered', 'read', 'failed'
        )),

    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),

    foreign key (conversation_id, organization_id)
        references public.conversations(id, organization_id)
        on delete cascade,

    unique (id, organization_id)
);

create unique index idx_messages_external_id
on public.messages(external_message_id)
where external_message_id is not null;

create index idx_messages_conversation
on public.messages(
    organization_id,
    conversation_id,
    created_at
);

-- =====================================================
-- 8. KNOWLEDGE BASE
-- =====================================================

create table public.knowledge_base (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null
        references public.organizations(id) on delete cascade,

    title text not null,
    content text not null,
    category text,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (id, organization_id)
);

create index idx_knowledge_org
on public.knowledge_base(organization_id, is_active);

-- =====================================================
-- 9. SUBSCRIPTIONS
-- =====================================================

create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null
        references public.organizations(id) on delete cascade,

    plan text not null default 'starter'
        check (plan in ('starter', 'pro', 'business')),

    status text not null default 'trialing'
        check (status in (
            'trialing', 'active', 'past_due',
            'cancelled', 'expired'
        )),

    provider text,
    external_subscription_id text,

    current_period_start timestamptz,
    current_period_end timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (organization_id)
);

-- =====================================================
-- 10. USAGE RECORDS
-- =====================================================

create table public.usage_records (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null
        references public.organizations(id) on delete cascade,

    usage_type text not null
        check (usage_type in (
            'ai_request',
            'whatsapp_message',
            'conversation'
        )),

    quantity integer not null default 1
        check (quantity > 0),

    estimated_cost numeric(12,6) default 0,
    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);

create index idx_usage_org_date
on public.usage_records(organization_id, created_at);

-- =====================================================
-- 11. UPDATED_AT TRIGGER
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_updated
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger whatsapp_updated
before update on public.whatsapp_accounts
for each row execute function public.set_updated_at();

create trigger contacts_updated
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger conversations_updated
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger knowledge_updated
before update on public.knowledge_base
for each row execute function public.set_updated_at();

create trigger subscriptions_updated
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- =====================================================
-- END MIGRATION 001
-- =====================================================
