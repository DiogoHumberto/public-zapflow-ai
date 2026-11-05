-- =====================================================
-- ZAPFLOW AI
-- MIGRATION 002: RLS AND ACCESS CONTROL
-- =====================================================

-- Retorna a organização à qual o usuário pertence.
-- Se o usuário pertencer a várias empresas, retorna
-- somente quando houver exatamente uma associação.

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
    select (
        select organization_id
        from public.organization_members
        where user_id = (select auth.uid())
        order by organization_id
        limit 1
    )
    where (
        select count(*)
        from public.organization_members
        where user_id = (select auth.uid())
    ) = 1;
$$;

-- Verifica associação com uma organização.

create or replace function public.is_org_member(
    target_org uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.organization_members
        where organization_id = target_org
          and user_id = (select auth.uid())
    );
$$;

-- Verifica permissão administrativa.

create or replace function public.is_org_admin(
    target_org uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.organization_members
        where organization_id = target_org
          and user_id = (select auth.uid())
          and role in ('owner', 'admin')
    );
$$;

-- =====================================================
-- ENABLE RLS
-- =====================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.whatsapp_accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_records enable row level security;

-- =====================================================
-- PROFILES
-- =====================================================

create policy "Users read own profile"
on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy "Users update own profile"
on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- =====================================================
-- ORGANIZATIONS
-- =====================================================

create policy "Members read own organizations"
on public.organizations
for select to authenticated
using (public.is_org_member(id));

create policy "Admins update organizations"
on public.organizations
for update to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

-- Organization creation will be handled through
-- a controlled onboarding RPC, not direct insertion.

-- =====================================================
-- ORGANIZATION MEMBERS
-- =====================================================

create policy "Members read organization members"
on public.organization_members
for select to authenticated
using (public.is_org_member(organization_id));

create policy "Admins add organization members"
on public.organization_members
for insert to authenticated
with check (public.is_org_admin(organization_id));

create policy "Admins update organization members"
on public.organization_members
for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy "Admins remove organization members"
on public.organization_members
for delete to authenticated
using (public.is_org_admin(organization_id));

-- =====================================================
-- WHATSAPP ACCOUNTS
-- =====================================================

create policy "Members read whatsapp accounts"
on public.whatsapp_accounts
for select to authenticated
using (public.is_org_member(organization_id));

create policy "Admins manage whatsapp accounts"
on public.whatsapp_accounts
for all to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- =====================================================
-- CONTACTS
-- =====================================================

create policy "Members read contacts"
on public.contacts
for select to authenticated
using (public.is_org_member(organization_id));

create policy "Members create contacts"
on public.contacts
for insert to authenticated
with check (public.is_org_member(organization_id));

create policy "Members update contacts"
on public.contacts
for update to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "Admins delete contacts"
on public.contacts
for delete to authenticated
using (public.is_org_admin(organization_id));

-- =====================================================
-- CONVERSATIONS
-- =====================================================

create policy "Members read conversations"
on public.conversations
for select to authenticated
using (public.is_org_member(organization_id));

create policy "Members create conversations"
on public.conversations
for insert to authenticated
with check (public.is_org_member(organization_id));

create policy "Members update conversations"
on public.conversations
for update to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

-- =====================================================
-- MESSAGES
-- =====================================================

create policy "Members read messages"
on public.messages
for select to authenticated
using (public.is_org_member(organization_id));

create policy "Members create messages"
on public.messages
for insert to authenticated
with check (public.is_org_member(organization_id));

-- =====================================================
-- KNOWLEDGE BASE
-- =====================================================

create policy "Members read knowledge"
on public.knowledge_base
for select to authenticated
using (public.is_org_member(organization_id));

create policy "Admins manage knowledge"
on public.knowledge_base
for all to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================

create policy "Members read subscription"
on public.subscriptions
for select to authenticated
using (public.is_org_member(organization_id));

-- Subscription writes are restricted to backend.

-- =====================================================
-- USAGE RECORDS
-- =====================================================

create policy "Admins read usage"
on public.usage_records
for select to authenticated
using (public.is_org_admin(organization_id));

-- Usage writes are restricted to backend.

-- =====================================================
-- END MIGRATION 002
-- =====================================================
