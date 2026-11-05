-- =====================================================
-- ZAPFLOW AI
-- MIGRATION 004: DASHBOARD, MEMBERS AND COLUMN GRANTS
-- Épico 3 (openspec/changes/epico-3-dashboard)
--
-- - Remove escrita direta em organization_members (policies de 002
--   + privilégios de tabela). Alterações passam pelas RPCs abaixo.
-- - change_member_role / remove_member / list_organization_members.
-- - Restringe UPDATE de profiles e organizations por coluna.
--
-- ROLLBACK (executar manualmente se necessário, nesta ordem):
--   drop function if exists public.list_organization_members();
--   drop function if exists public.remove_member(uuid);
--   drop function if exists public.change_member_role(uuid, text);
--   grant insert, update, delete on public.organization_members to authenticated;
--   create policy "Admins add organization members" on public.organization_members
--     for insert to authenticated with check (public.is_org_admin(organization_id));
--   create policy "Admins update organization members" on public.organization_members
--     for update to authenticated
--     using (public.is_org_admin(organization_id))
--     with check (public.is_org_admin(organization_id));
--   create policy "Admins remove organization members" on public.organization_members
--     for delete to authenticated using (public.is_org_admin(organization_id));
--   revoke update (full_name, avatar_url) on public.profiles from authenticated;
--   grant update on public.profiles to authenticated;
--   revoke update (name, business_type, email, phone, timezone) on public.organizations from authenticated;
--   grant update on public.organizations to authenticated;
-- =====================================================

-- =====================================================
-- 1. ORGANIZATION MEMBERS: sem escrita direta
-- =====================================================

drop policy if exists "Admins add organization members" on public.organization_members;
drop policy if exists "Admins update organization members" on public.organization_members;
drop policy if exists "Admins remove organization members" on public.organization_members;

revoke insert, update, delete on public.organization_members from authenticated;
revoke insert, update, delete on public.organization_members from anon;

-- =====================================================
-- 2. CHANGE MEMBER ROLE
-- =====================================================
-- Regras (specs/members):
--  - chamador precisa ser owner/admin da mesma organização;
--  - ninguém altera a própria linha;
--  - só owner concede ou revoga owner; admin não age sobre owner;
--  - não pode deixar a organização sem owner.
-- Todas as linhas da organização são bloqueadas (for update) para
-- serializar alterações concorrentes e proteger o último owner.

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
    v_owner_count integer;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_new_role not in ('owner', 'admin', 'member') then
        raise exception 'Invalid role';
    end if;

    select om.organization_id
      into v_org_id
      from public.organization_members om
     where om.id = p_member_id;

    if v_org_id is null then
        raise exception 'Forbidden';
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

    if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
        raise exception 'Forbidden';
    end if;

    select om.user_id, om.role
      into v_target_user, v_target_role
      from public.organization_members om
     where om.id = p_member_id;

    if v_caller_role = 'admin'
       and (v_target_role = 'owner' or p_new_role = 'owner') then
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
-- 3. REMOVE MEMBER
-- =====================================================
-- Mesmas regras de hierarquia de change_member_role. Auto-remoção
-- é permitida desde que não deixe a organização sem owner.

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
    v_target_user uuid;
    v_target_role text;
    v_owner_count integer;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    select om.organization_id
      into v_org_id
      from public.organization_members om
     where om.id = p_member_id;

    if v_org_id is null then
        raise exception 'Forbidden';
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

    select om.user_id, om.role
      into v_target_user, v_target_role
      from public.organization_members om
     where om.id = p_member_id;

    if v_caller_role = 'admin' and v_target_role = 'owner' then
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
-- 4. LIST ORGANIZATION MEMBERS
-- =====================================================
-- profiles não é legível entre usuários; esta RPC expõe apenas o
-- nome dos membros da organização do chamador (sem e-mail/avatar).

create or replace function public.list_organization_members()
returns table (
    member_id uuid,
    user_id uuid,
    full_name text,
    role text,
    created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_org_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    v_org_id := public.current_organization_id();

    if v_org_id is null then
        return;
    end if;

    return query
        select om.id,
               om.user_id,
               p.full_name,
               om.role,
               om.created_at
          from public.organization_members om
          left join public.profiles p on p.id = om.user_id
         where om.organization_id = v_org_id
         order by om.created_at;
end;
$$;

-- =====================================================
-- 5. GRANTS DAS FUNÇÕES
-- =====================================================

revoke all on function public.change_member_role(uuid, text) from public, anon;
grant execute on function public.change_member_role(uuid, text) to authenticated;

revoke all on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;

revoke all on function public.list_organization_members() from public, anon;
grant execute on function public.list_organization_members() to authenticated;

-- =====================================================
-- 6. COLUNAS PROTEGIDAS (privilégio de coluna)
-- =====================================================
-- A RLS continua restringindo a linha; aqui restringimos as colunas.
-- Adicionar campos editáveis exige revisar estes grants.

revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

revoke update on public.organizations from authenticated;
grant update (name, business_type, email, phone, timezone)
    on public.organizations to authenticated;

-- =====================================================
-- END MIGRATION 004
-- =====================================================
