/**
 * Perfil do usuário — isolamento por RLS (specs/user-profile).
 *
 *  - leitura retorna apenas a própria linha
 *  - atualização da própria linha funciona
 *  - atualização do perfil de outro usuário não altera nada
 *
 * Requer Supabase local rodando (npm run db:start).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

import {
  createAuthenticatedClient,
  createTestAdminClient,
} from "./helpers";
import { runSeed, SEED, type SeedResult } from "./seed";

let seed: SeedResult;
let clientA: SupabaseClient<Database>;

beforeAll(async () => {
  seed = await runSeed();
  clientA = await createAuthenticatedClient(
    SEED.userA.email,
    SEED.userA.password
  );
});

describe("Perfil — isolamento por RLS", () => {
  it("user A lê apenas o próprio perfil", async () => {
    const { data, error } = await clientA.from("profiles").select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(seed.userAId);
  });

  it("user A atualiza o próprio perfil (nome e avatar)", async () => {
    const { error } = await clientA
      .from("profiles")
      .update({
        full_name: "User A Editado",
        avatar_url: "https://cdn.exemplo.com/a.png",
      })
      .eq("id", seed.userAId);

    expect(error).toBeNull();

    const admin = createTestAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", seed.userAId)
      .single();

    expect(data).toEqual({
      full_name: "User A Editado",
      avatar_url: "https://cdn.exemplo.com/a.png",
    });
  });

  it("user A não altera o perfil de B e a linha de B permanece intacta", async () => {
    const admin = createTestAdminClient();
    const { data: before } = await admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", seed.userBId)
      .single();

    const { data, error } = await clientA
      .from("profiles")
      .update({ full_name: "Invadido", avatar_url: null })
      .eq("id", seed.userBId)
      .select();

    // RLS filtra a linha no USING: nenhuma linha afetada.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: after } = await admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", seed.userBId)
      .single();

    expect(after).toEqual(before);
  });
});
