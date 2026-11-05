/**
 * Testes RLS — leitura cross-tenant.
 *
 * Cenário: membro da Org A autenticado consulta dados da Org B
 * → o banco deve retornar VAZIO (como se não existissem).
 *
 * Requer Supabase local rodando (npm run db:start).
 */
import { beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedClient } from "./helpers";
import { runSeed, SEED, type SeedResult } from "./seed";

let seed: SeedResult;

beforeAll(async () => {
  seed = await runSeed();
});

describe("RLS — leitura cross-tenant (membro da Org A consultando dados da Org B)", () => {
  it("contacts da Org B retorna vazio para user A", async () => {
    const client = await createAuthenticatedClient(
      SEED.userA.email,
      SEED.userA.password
    );
    const { data, error } = await client
      .from("contacts")
      .select("*")
      .eq("organization_id", seed.orgBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("conversations da Org B retorna vazio para user A", async () => {
    const client = await createAuthenticatedClient(
      SEED.userA.email,
      SEED.userA.password
    );
    const { data, error } = await client
      .from("conversations")
      .select("*")
      .eq("organization_id", seed.orgBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("messages da Org B retorna vazio para user A", async () => {
    const client = await createAuthenticatedClient(
      SEED.userA.email,
      SEED.userA.password
    );
    const { data, error } = await client
      .from("messages")
      .select("*")
      .eq("organization_id", seed.orgBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("knowledge_base da Org B retorna vazio para user A", async () => {
    const client = await createAuthenticatedClient(
      SEED.userA.email,
      SEED.userA.password
    );
    const { data, error } = await client
      .from("knowledge_base")
      .select("*")
      .eq("organization_id", seed.orgBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user A ainda vê os próprios dados (sanity check)", async () => {
    const client = await createAuthenticatedClient(
      SEED.userA.email,
      SEED.userA.password
    );
    const { data, error } = await client
      .from("organizations")
      .select("id, slug")
      .eq("id", seed.orgAId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.slug).toBe(SEED.orgA.slug);
  });
});
