-- =====================================================
-- ZAPFLOW AI
-- MIGRATION 005: CRUD DE MEMBROS
-- openspec/changes/adicionar-crud-membros
--
-- - add_member_by_email / update_member_profile (novas RPCs).
-- - change_member_role passa a ser exclusivo de owner.
-- - remove_member: admin só remove role 'member'.
-- - list_organization_members retorna e-mail (owner/admin) e
--   situação do convite.
--
-- Nenhuma política de RLS é alterada: toda escrita continua
-- passando por RPC security definer, sem acesso direto a
-- organization_members ou profiles de terceiros.
--
-- ROLLBACK (executar manualmente, nesta ordem):
--   drop function if exists public.add_member_by_email(text, text);
--   drop function if exists public.update_member_profile(uuid, text);
--   drop function if exists public.list_organization_members();
--   -- reaplicar supabase/migrations/004_dashboard_members.sql para
--   -- recriar change_member_role, remove_member e a listagem sem
--   -- e-mail/invitation_pending na assinatura original.
--   -- O drop acima é obrigatório: create or replace não altera o
--   -- tipo de retorno de list_organization_members.
-- =====================================================

-- =====================================================
-- 1. LIST ORGANIZATION MEMBERS
-- =====================================================
-- O e-mail só é exposto para owner/admin. Membros comuns recebem
-- NULL. `invitation_pending` reflete um convite ainda não confirmado
-- (auth.users.email_confirmed_at nulo).

drop function if exists public.list_organization_members();

create function public.list_organization_members()
returns table (
    member_id uuid,
    user_id uuid,
    full_name text,
    email text,
    role text,
    created_at timestamptz,
    invitation_pending boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_org_id uuid;
    v_caller_role text;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    v_org_id := public.current_organization_id();

    if v_org_id is null then
        return;
    end if;

    select om.role
      into v_caller_role
      from public.organization_members om
     where om.organization_id = v_org_id
       and om.user_id = auth.uid();

    return query
        select om.id,
               om.user_id,
               p.full_name,
               case
                   when v_caller_role in ('owner', 'admin')
                   then u.email::text
                   else null
               end,
               om.role,
               om.created_at,
               (u.email_confirmed_at is null)
          from public.organization_members om
          left join public.profiles p on p.id = om.user_id
          left join auth.users u on u.id = om.user_id
         where om.organization_id = v_org_id
         order by om.created_at;
end;
$$;

-- =====================================================
-- 2. ADD MEMBER BY EMAIL
-- =====================================================
-- Regras (specs/members):
--  - chamador precisa ser owner/admin da organização;
--  - admin só adiciona role 'member'; owner adiciona 'member'/'admin';
--  - e-mail precisa existir em auth.users (o convite é feito pela
--    Server Action; esta RPC nunca cria usuários);
--  - um usuário por organização no MVP;
--  - advisory lock por usuário evita corrida entre organizações.
-- Retorna o id do membership criado.

create or replace function public.add_member_by_email(
    p_email text,
    p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_caller_role text;
    v_email text;
    v_target_user uuid;
    v_member_id uuid;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_role is null or p_role not in ('member', 'admin') then
        raise exception 'Invalid role';
    end if;

    v_email := lower(trim(coalesce(p_email, '')));

    if v_email = '' then
        raise exception 'Invalid email';
    end if;

    v_org_id := public.current_organization_id();

    if v_org_id is null then
        raise exception 'Forbidden';
    end if;

    select om.role
      into v_caller_role
      from public.organization_members om
     where om.organization_id = v_org_id
       and om.user_id = v_user_id;

    if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
        raise exception 'Forbidden';
    end if;

    if v_caller_role = 'admin' and p_role <> 'member' then
        raise exception 'Forbidden';
    end if;

    select u.id
      into v_target_user
      from auth.users u
     where lower(u.email) = v_email;

    if v_target_user is null then
        raise exception 'User not found';
    end if;

    -- Serializa a associação do mesmo usuário entre organizações.
    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_target_user::text, 0)
    );

    if exists (
        select 1
          from public.organization_members om
         where om.organization_id = v_org_id
           and om.user_id = v_target_user
    ) then
        raise exception 'Member already exists';
    end if;

    if exists (
        select 1
          from public.organization_members om
         where om.user_id = v_target_user
           and om.organization_id <> v_org_id
    ) then
        raise exception 'User already belongs to an organization';
    end if;

    insert into public.organization_members (organization_id, user_id, role)
    values (v_org_id, v_target_user, p_role)
    returning id into v_member_id;

    return v_member_id;
end;
$$;

-- =====================================================
-- 3. UPDATE MEMBER PROFILE
-- =====================================================
-- Atualiza apenas o nome. E-mail/senha seguem o fluxo de identidade
-- do Supabase Auth e não são editáveis aqui.
--  - admin edita somente linhas com role 'member';
--  - owner edita qualquer membro da organização;
--  - alvo de outra organização é tratado como inexistente.

create or replace function public.update_member_profile(
    p_member_id uuid,
    p_full_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_caller_role text;
    v_target_org uuid;
    v_target_user uuid;
    v_target_role text;
    v_name text;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    v_name := trim(coalesce(p_full_name, ''));

    if v_name = '' or length(v_name) < 2 or length(v_name) > 100 then
        raise exception 'Invalid name';
    end if;

    select om.organization_id, om.user_id, om.role
      into v_target_org, v_target_user, v_target_role
      from public.organization_members om
     where om.id = p_member_id;

    if v_target_org is null then
        raise exception 'Member not found';
    end if;

    v_org_id := public.current_organization_id();

    if v_org_id is null or v_target_org <> v_org_id then
        raise exception 'Member not found';
    end if;

    select om.role
      into v_caller_role
      from public.organization_members om
     where om.organization_id = v_org_id
       and om.user_id = v_user_id;

    if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
        raise exception 'Forbidden';
    end if;

    if v_caller_role = 'admin' and v_target_role <> 'member' then
        raise exception 'Forbidden';
    end if;

    insert into public.profiles (id, full_name)
    values (v_target_user, v_name)
    on conflict (id) do update
        set full_name = excluded.full_name,
            updated_at = pg_catalog.now();
end;
$$;

-- =====================================================
-- 4. CHANGE MEMBER ROLE
-- =====================================================
-- Alterado em relação à 004: SOMENTE owner altera papéis.
-- Admin não promove, não rebaixa e não altera papel de ninguém.
-- Mantidas as regras de autoalteração e de último owner.

create or replace function public.change_member_role(
    p_member_id uuid,
    p_new_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_caller_role text;
    v_target_user uuid;
    v_target_role text;
    v_target_org uuid;
    v_owner_count integer;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_new_role not in ('owner', 'admin', 'member') then
        raise exception 'Invalid role';
    end if;

    select om.organization_id, om.user_id, om.role
      into v_target_org, v_target_user, v_target_role
      from public.organization_members om
     where om.id = p_member_id;

    if v_target_org is null then
        raise exception 'Member not found';
    end if;

    v_org_id := public.current_organization_id();

    if v_org_id is null or v_target_org <> v_org_id then
        raise exception 'Member not found';
    end if;

    -- Serializa mudanças de membership da organização.
    perform 1
      from public.organization_members
     where organization_id = v_org_id
     for update;

    select om.role
      into v_caller_role
      from public.organization_members om
     where om.organization_id = v_org_id
       and om.user_id = v_user_id;

    if v_caller_role is null or v_caller_role <> 'owner' then
        raise exception 'Forbidden';
    end if;

    if v_target_role = p_new_role then
        return;
    end if;

    if v_target_role = 'owner' and p_new_role <> 'owner' then
        select count(*)
          into v_owner_count
          from public.organization_members
         where organization_id = v_org_id
           and role = 'owner';

        -- Único owner rebaixando a si mesmo: a regra de último owner
        -- prevalece sobre a de autoalteração (retorna 'Last owner').
        if v_owner_count <= 1 then
            raise exception 'Last owner';
        end if;
    end if;

    if v_target_user = v_user_id then
        raise exception 'Forbidden';
    end if;

    update public.organization_members
       set role = p_new_role
     where id = p_member_id;
end;
$$;

-- =====================================================
-- 5. REMOVE MEMBER
-- =====================================================
--  - admin remove somente role 'member';
--  - owner remove 'admin'/'member' e outro owner (se houver mais de um);
--  - auto-remoção permitida, exceto quando deixaria a organização
--    sem owner;
--  - alvo de outra organização é tratado como inexistente.

create or replace function public.remove_member(
    p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_org_id uuid;
    v_caller_role text;
    v_target_role text;
    v_target_org uuid;
    v_owner_count integer;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    select om.organization_id, om.role
      into v_target_org, v_target_role
      from public.organization_members om
     where om.id = p_member_id;

    if v_target_org is null then
        raise exception 'Member not found';
    end if;

    v_org_id := public.current_organization_id();

    if v_org_id is null or v_target_org <> v_org_id then
        raise exception 'Member not found';
    end if;

    perform 1
      from public.organization_members
     where organization_id = v_org_id
     for update;

    select om.role
      into v_caller_role
      from public.organization_members om
     where om.organization_id = v_org_id
       and om.user_id = v_user_id;

    if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
        raise exception 'Forbidden';
    end if;

    if v_caller_role = 'admin' and v_target_role <> 'member' then
        raise exception 'Forbidden';
    end if;

    if v_target_role = 'owner' then
        select count(*)
          into v_owner_count
          from public.organization_members
         where organization_id = v_org_id
           and role = 'owner';

        if v_owner_count <= 1 then
            raise exception 'Last owner';
        end if;
    end if;

    delete from public.organization_members
     where id = p_member_id;
end;
$$;

-- =====================================================
-- 6. GRANTS DAS FUNÇÕES
-- =====================================================

revoke all on function public.list_organization_members() from public, anon;
grant execute on function public.list_organization_members() to authenticated;

revoke all on function public.add_member_by_email(text, text) from public, anon;
grant execute on function public.add_member_by_email(text, text) to authenticated;

revoke all on function public.update_member_profile(uuid, text) from public, anon;
grant execute on function public.update_member_profile(uuid, text) to authenticated;

revoke all on function public.change_member_role(uuid, text) from public, anon;
grant execute on function public.change_member_role(uuid, text) to authenticated;

revoke all on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;

-- =====================================================
-- END MIGRATION 005
-- =====================================================
