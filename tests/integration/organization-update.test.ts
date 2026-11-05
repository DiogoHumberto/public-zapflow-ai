/**
 * Edição dos dados da empresa — autorização e isolamento (specs/organizations).
 *
 *  - admin/owner da organização atualiza os dados cadastrais
 *  - member não altera nada
 *  - admin da Org A não altera a Org B
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

const PASSWORD = "TestPassword123!";

let seed: SeedResult;
let ownerA: SupabaseClient<Database>;
let adminA: SupabaseClient<Database>;
let memberA: SupabaseClient<Database>;

/** Cria (ou recria) um usuário de auth e o associa à Org A com o papel dado. */
async function createOrgAUser(email: string, role: "admin" | "member") {
  const admin = createTestAdminClient();

  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.deleteUser(found.id);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: email },
  });
  if (error || !data.user) {
    throw new Error(`seed ${email}: ${error?.message}`);
  }

  await admin.from("organization_members").insert({
    organization_id: seed.orgAId,
    user_id: data.user.id,
    role,
  });
}

beforeAll(async () => {
  seed = await runSeed();

  await createOrgAUser("admin.a@test.local", "admin");
  await createOrgAUser("member.a@test.local", "member");

  ownerA = await createAuthenticatedClient(SEED.userA.email, SEED.userA.password);
  adminA = await createAuthenticatedClient("admin.a@test.local", PASSWORD);
  memberA = await createAuthenticatedClient("member.a@test.local", PASSWORD);
});

describe("Dados da empresa — edição por owner/admin", () => {
  it("owner da Org A atualiza os dados cadastrais", async () => {
    const { data, error } = await ownerA
      .from("organizations")
      .update({ name: "Org A Owner" })
      .eq("id", seed.orgAId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("admin da Org A atualiza os dados cadastrais", async () => {
    const { data, error } = await adminA
      .from("organizations")
      .update({
        name: "Org A Admin",
        business_type: "Salão de beleza",
        email: "contato@orga.test",
        phone: "+5511999990000",
        timezone: "America/Manaus",
      })
      .eq("id", seed.orgAId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const admin = createTestAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("name, business_type, email, phone, timezone")
      .eq("id", seed.orgAId)
      .single();

    expect(org).toEqual({
      name: "Org A Admin",
      business_type: "Salão de beleza",
      email: "contato@orga.test",
      phone: "+5511999990000",
      timezone: "America/Manaus",
    });
  });
});

describe("Dados da empresa — restrições", () => {
  it("member não altera a organização e nada é persistido", async () => {
    const admin = createTestAdminClient();
    const { data: before } = await admin
      .from("organizations")
      .select("name, email, phone, timezone")
      .eq("id", seed.orgAId)
      .single();

    const { data, error } = await memberA
      .from("organizations")
      .update({ name: "Invadida pelo member" })
      .eq("id", seed.orgAId)
      .select("id");

    // RLS filtra a linha no USING: nenhuma linha afetada, sem erro.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: after } = await admin
      .from("organizations")
      .select("name, email, phone, timezone")
      .eq("id", seed.orgAId)
      .single();

    expect(after).toEqual(before);
  });

  it("admin da Org A não altera a Org B e a linha de B permanece intacta", async () => {
    const admin = createTestAdminClient();
    const { data: before } = await admin
      .from("organizations")
      .select("name, business_type, email, phone, timezone, status")
      .eq("id", seed.orgBId)
      .single();

    const { data, error } = await adminA
      .from("organizations")
      .update({ name: "Org B invadida" })
      .eq("id", seed.orgBId)
      .select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: after } = await admin
      .from("organizations")
      .select("name, business_type, email, phone, timezone, status")
      .eq("id", seed.orgBId)
      .single();

    expect(after).toEqual(before);
  });
});
