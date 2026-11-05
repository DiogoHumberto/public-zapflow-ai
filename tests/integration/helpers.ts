/**
 * Helpers compartilhados dos testes de integração.
 *
 * Conecta no Supabase LOCAL (npm run db:start). Cliente admin é usado
 * APENAS para seed e criação de sessões — nunca em código de produção.
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const SUPABASE_URL = process.env.SUPABASE_LOCAL_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_LOCAL_ANON_KEY;

if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error(
    "SUPABASE_LOCAL_SERVICE_ROLE_KEY e SUPABASE_LOCAL_ANON_KEY são obrigatórias.\n" +
      "Obtenha com `npx supabase status -o env` (após `npm run db:start`) e exporte-as."
  );
}

const SERVICE_KEY: string = SERVICE_ROLE_KEY;
const PUBLIC_ANON_KEY: string = ANON_KEY;

export type TestClient = SupabaseClient<Database>;

/** Cliente ADMIN (ignora RLS) — uso restrito a seed. */
export function createTestAdminClient(): TestClient {
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as TestClient;
}

/**
 * Cliente autenticado como um usuário específico — passa por RLS.
 * A sessão é criada via signIn e usada apenas no escopo do teste.
 */
export async function createAuthenticatedClient(
  email: string,
  password: string
): Promise<TestClient> {
  const client = createClient<Database>(SUPABASE_URL, PUBLIC_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as TestClient;

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Falha ao autenticar ${email}: ${error.message}`);
  }
  return client;
}

/**
 * Localiza uma conta de auth pelo e-mail, percorrendo as páginas de
 * `listUsers()` (50 por padrão).
 */
export async function findUserByEmail(
  email: string
): Promise<User | null> {
  const admin = createTestAdminClient();
  const perPage = 200;
  const target = email.toLowerCase();

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);

    const found = data.users.find((user) => user.email?.toLowerCase() === target);
    if (found) return found;

    if (data.users.length < perPage) return null;
  }
}

/**
 * Remove a conta (e memberships, por cascade) de um e-mail, se existir.
 *
 * A suíte cria muitos usuários; `listUsers()` pagina (50 por padrão), então
 * percorremos as páginas para não deixar contas órfãs entre execuções.
 */
export async function deleteUserByEmail(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) return;

  const admin = createTestAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(`deleteUser ${email}: ${error.message}`);
}
