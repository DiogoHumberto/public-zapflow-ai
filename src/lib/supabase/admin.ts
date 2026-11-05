import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase ADMINISTRATIVO (Service Role).
 *
 * ⚠️ IGNORA RLS. Usar exclusivamente no servidor, para tarefas que
 * legitimamente precisam contornar RLS (ex.: webhooks, jobs, escrita de
 * assinaturas/uso). NUNCA importar em código que chegue ao navegador.
 *
 * Lança erro se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada.
 */
export function createAdminClient() {
  const env = getPublicEnv();
  const server = getServerEnv();

  if (!server.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente — cliente admin indisponível. " +
        "Configure no .env.local (server-only)."
    );
  }

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    server.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
