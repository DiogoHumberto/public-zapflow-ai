import { io } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { MemberRole, OrganizationRow } from "@/types/database";

/**
 * Helpers de sessão/autorização para Server Components, Route Handlers
 * e Server Actions. Sempre consultam o Supabase — nunca confiam no proxy.
 *
 * `cache()` do React deduplica as consultas dentro da mesma requisição: uma
 * página com vários pontos que precisam do usuário/organização (cada um em seu
 * `<Suspense>`) conversa com o Supabase uma única vez.
 */

/** Retorna o usuário autenticado ou `null`. */
export const getUser = cache(async () => {
  // Cache Components: o Supabase Auth usa `Date.now()` ao validar a sessão.
  // Sem `io()`, o prerender falha com `blocking-prerender-current-time`.
  // A verificação depende da requisição (cookies), então roda em request time.
  await io();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Exige usuário autenticado; redireciona ao login caso contrário. */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Retorna a organização do usuário autenticado (MVP: 1 org por usuário),
 * ou `null` quando não há associação.
 */
export const getCurrentOrganization = cache(
  async (): Promise<OrganizationRow | null> => {
    // Mesmo motivo do `getUser()`: a leitura depende da requisição (cookies e
    // `Date.now()` interno do Supabase). Sem este `io()`, o prerender da casca
    // falha com `blocking-prerender-current-time` quando este helper é o
    // primeiro a rodar dentro de um `<Suspense>`.
    await io();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("current_organization_id");

    if (error || !data) return null;

    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", data)
      .single();

    return org;
  }
);

/** Exige organização; redireciona ao onboarding quando não há. */
export async function requireOrganization(): Promise<OrganizationRow> {
  await requireUser();
  const org = await getCurrentOrganization();
  if (!org) {
    redirect("/onboarding");
  }
  return org;
}

/**
 * Papel do usuário autenticado na organização atual (`owner`, `admin` ou
 * `member`), ou `null` quando não há sessão/organização.
 *
 * Usado apenas para esconder ações na UI: a autorização real é aplicada pelo
 * PostgreSQL (RLS e RPCs da migration 004).
 */
export const getCurrentMemberRole = cache(
  async (): Promise<MemberRole | null> => {
    const [user, org] = await Promise.all([
      getUser(),
      getCurrentOrganization(),
    ]);

    if (!user || !org) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle();

    return data?.role ?? null;
  }
);
