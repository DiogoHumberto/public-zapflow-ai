import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * Lê/escreve cookies de sessão via next/headers (Next 16 — `cookies()` é assíncrono).
 * Usa a chave pública (anon) — sujeito a RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignorado quando chamado a partir de um Server Component
            // (cookies não podem ser modificados nesse contexto).
          }
        },
      },
    }
  );
}
