/**
 * Testes RLS — escrita cross-tenant e permissões por papel.
 *
 *  - insert/update cross-tenant deve ser rejeitado (policy violation)
 *  - `member` NÃO pode gerenciar knowledge_base (somente owner/admin)
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

describe("RLS — escrita cross-tenant rejeitada", () => {
  it("insert em contacts da Org B é rejeitado para user A", async () => {
    const { data, error } = await clientA
      .from("contacts")
      .insert({
        organization_id: seed.orgBId,
        phone: "+5511888880001",
        name: "intruso",
      })
      .select();

    expect(error).not.toBeNull();
    // PostgREST pode retornar erro 42501 (insufficient_privilege / RLS)
    // ou retornar vazio quando a policy WITH CHECK rejeita.
    expect(data).toBeNull();
  });

  it("update em contact da Org B é no-op (linha invisível para user A)", async () => {
    const { data, error } = await clientA
      .from("contacts")
      .update({ name: "alterado" })
      .eq("id", seed.contactBId)
      .select();

    // Sem erro, mas zero linhas afetadas (a linha não é visível para A)
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("insert em conversations da Org B é rejeitado para user A", async () => {
    const { error } = await clientA.from("conversations").insert({
      organization_id: seed.orgBId,
      contact_id: seed.contactBId,
    });

    expect(error).not.toBeNull();
  });

  it("insert em messages da Org B é rejeitado para user A", async () => {
    const { error } = await clientA.from("messages").insert({
      organization_id: seed.orgBId,
      conversation_id: seed.conversationBId,
      direction: "inbound",
      sender_type: "customer",
      message_type: "text",
      content: "x",
      delivery_status: "received",
      metadata: {},
    });

    expect(error).not.toBeNull();
  });
});

describe("RLS — papel 'member' não gerencia knowledge_base", () => {
  it("member da Org A não consegue inserir em knowledge_base", async () => {
    const admin = createTestAdminClient();

    // Cria um terceiro usuário com papel 'member' na Org A
    const memberEmail = "member.a@test.local";
    const memberPassword = "TestPassword123!";

    const { data: existing } = await admin.auth.admin.listUsers();
    const existingMember = existing?.users?.find((u) => u.email === memberEmail);
    if (existingMember) {
      await admin.auth.admin.deleteUser(existingMember.id);
    }

    const { data: memberAuth, error: eMember } =
      await admin.auth.admin.createUser({
        email: memberEmail,
        password: memberPassword,
        email_confirm: true,
      });
    if (eMember || !memberAuth.user) {
      throw new Error(`seed member: ${eMember?.message}`);
    }

    await admin.from("organization_members").insert({
      organization_id: seed.orgAId,
      user_id: memberAuth.user.id,
      role: "member",
    });

    const memberClient = await createAuthenticatedClient(
      memberEmail,
      memberPassword
    );

    const { error } = await memberClient.from("knowledge_base").insert({
      organization_id: seed.orgAId,
      title: "não deveria",
      content: "não deveria",
    });

    expect(error).not.toBeNull();
    // Mensagem de policy violation do PostgREST
    expect(error?.code === "42501" || error?.message?.toLowerCase().includes("policy")).toBe(true);
  });

  it("owner da Org A consegue inserir em knowledge_base (sanity check)", async () => {
    const { error } = await clientA.from("knowledge_base").insert({
      organization_id: seed.orgAId,
      title: "permitido",
      content: "permitido",
    });

    expect(error).toBeNull();
  });
});
