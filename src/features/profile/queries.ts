import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

/**
 * Leitura do perfil do usuário autenticado (specs/user-profile).
 * A RLS de `profiles` só permite ler a própria linha, então o filtro por `id`
 * é apenas explicitação — o isolamento é garantido pelo PostgreSQL.
 */
export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
