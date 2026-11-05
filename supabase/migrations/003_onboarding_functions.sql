-- =====================================================
-- ZAPFLOW AI
-- MIGRATION 003: ONBOARDING FUNCTIONS
-- handle_new_user (spec §5.1) + create_organization RPC (spec §5.2)
-- Não altera 001/002 — apenas adiciona funções e triggers.
-- =====================================================

-- =====================================================
-- 1. CRIAÇÃO AUTOMÁTICA DE PERFIL
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', '')
    );

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =====================================================
-- 2. CRIAÇÃO SEGURA DA EMPRESA (onboarding)
-- =====================================================
-- O primeiro usuário ainda não é membro de organização alguma,
-- portanto não pode usar a policy que exige admin. Esta RPC
-- controlada resolve o bootstrap.

create or replace function public.create_organization(
    p_name text,
    p_slug text,
    p_business_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_org_id uuid;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if length(trim(p_name)) < 2
       or length(trim(p_name)) > 100 then
        raise exception 'Invalid organization name';
    end if;

    if p_slug !~ '^[a-z0-9-]{3,50}$' then
        raise exception 'Invalid organization slug';
    end if;

    if exists (
        select 1
        from public.organization_members
        where user_id = v_user_id
    ) then
        raise exception 'User already belongs to an organization';
    end if;

    insert into public.organizations (
        name,
        slug,
        business_type
    )
    values (
        trim(p_name),
        p_slug,
        p_business_type
    )
    returning id into v_org_id;

    insert into public.organization_members (
        organization_id,
        user_id,
        role
    )
    values (
        v_org_id,
        v_user_id,
        'owner'
    );

    insert into public.subscriptions (
        organization_id,
        plan,
        status
    )
    values (
        v_org_id,
        'starter',
        'trialing'
    );

    return v_org_id;
end;
$$;

revoke all on function public.create_organization(text,text,text)
from public, anon;

grant execute on function public.create_organization(text,text,text)
to authenticated;

-- =====================================================
-- END MIGRATION 003
-- =====================================================
