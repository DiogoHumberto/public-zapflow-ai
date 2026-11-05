/**
 * Testes de autorização — migrations 004/005 (Épico 3 + CRUD de membros).
 *
 *  - escrita direta em organization_members é bloqueada
 *  - change_member_role: exclusivo de owner, último owner e autopromoção
 *  - add_member_by_email: hierarquia, uma organização por usuário e isolamento
 *  - update_member_profile: admin só edita member; nome validado; e-mail intacto
 *  - remove_member: admin só remove member; último owner protegido
 *  - list_organization_members: e-mail apenas para owner/admin + convite pendente
 *  - colunas protegidas de profiles e organizations
 *  - create_organization continua funcionando (onboarding)
 *
 * Requer Supabase local rodando (npm run db:start) e migrations aplicadas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/types/database";

import {
  createAuthenticatedClient,
  createTestAdminClient,
  deleteUserByEmail,
  type TestClient,
} from "./helpers";
import { runSeed, SEED, type SeedResult } from "./seed";

const PASSWORD = "TestPassword123!";

let seed: SeedResult;
let ownerA: SupabaseClient<Database>;

/** Cria usuário, adiciona como membro com papel e devolve cliente autenticado. */
async function createMember(
  orgId: string,
  role: "owner" | "admin" | "member",
  email: string
): Promise<{ client: TestClient; userId: string; membershipId: string }> {
  const admin = createTestAdminClient();

  await deleteUserByEmail(email);

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Nome ${role} ${email}` },
  });
  if (error || !created.user) throw new Error(`createMember: ${error?.message}`);

  const { data: membership, error: mErr } = await admin
    .from("organization_members")
    .insert({ organization_id: orgId, user_id: created.user.id, role })
    .select("id")
    .single();
  if (mErr) throw new Error(`createMember membership: ${mErr.message}`);

  const client = await createAuthenticatedClient(email, PASSWORD);
  return { client, userId: created.user.id, membershipId: membership.id };
}

/** Cria um usuário sem organização (alvo de add_member_by_email). */
async function createUnassignedUser(
  email: string,
  emailConfirmed = true
): Promise<string> {
  const admin = createTestAdminClient();

  await deleteUserByEmail(email);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: emailConfirmed,
    user_metadata: { full_name: `Nome ${email}` },
  });
  if (error || !data.user) throw new Error(`createUnassigned: ${error?.message}`);

  return data.user.id;
}

async function membershipOf(orgId: string, userId: string) {
  const admin = createTestAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function profileNameOf(userId: string): Promise<string | null> {
  const admin = createTestAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name ?? null;
}

async function emailOf(userId: string): Promise<string | undefined> {
  const admin = createTestAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? undefined;
}

beforeAll(async () => {
  seed = await runSeed();
  ownerA = await createAuthenticatedClient(SEED.userA.email, SEED.userA.password);
});

describe("organization_members — escrita direta bloqueada", () => {
  it("owner não consegue inserir membership diretamente", async () => {
    const userId = await createUnassignedUser("direct.insert@test.local");

    const { error } = await ownerA.from("organization_members").insert({
      organization_id: seed.orgAId,
      user_id: userId,
      role: "owner",
    });
    expect(error).not.toBeNull();

    const admin = createTestAdminClient();
    await admin.auth.admin.deleteUser(userId);
  });

  it("owner não consegue alterar papel diretamente", async () => {
    const self = await membershipOf(seed.orgAId, seed.userAId);
    const { data, error } = await ownerA
      .from("organization_members")
      .update({ role: "member" })
      .eq("id", self!.id)
      .select();
    // Sem privilégio de UPDATE: erro de permissão, ou nenhuma linha afetada.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
    expect((await membershipOf(seed.orgAId, seed.userAId))?.role).toBe("owner");
  });

  it("owner não consegue editar o nome de outro membro direto em profiles", async () => {
    const member = await createMember(
      seed.orgAId,
      "member",
      "direct.profile@test.local"
    );

    const { data, error } = await ownerA
      .from("profiles")
      .update({ full_name: "Invasão" })
      .eq("id", member.userId)
      .select();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
    expect(await profileNameOf(member.userId)).not.toBe("Invasão");
  });
});

describe("change_member_role — exclusivo de owner", () => {
  it("admin não consegue promover member para admin", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.h1@test.local");
    const member = await createMember(seed.orgAId, "member", "member.h1@test.local");

    const { error } = await admin.client.rpc("change_member_role", {
      p_member_id: member.membershipId,
      p_new_role: "admin",
    });
    expect(error?.message).toContain("Forbidden");
    expect((await membershipOf(seed.orgAId, member.userId))?.role).toBe("member");
  });

  it("admin não consegue promover a owner", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.h2@test.local");
    const member = await createMember(seed.orgAId, "member", "member.h2@test.local");

    const { error } = await admin.client.rpc("change_member_role", {
      p_member_id: member.membershipId,
      p_new_role: "owner",
    });
    expect(error?.message).toContain("Forbidden");
    expect((await membershipOf(seed.orgAId, member.userId))?.role).toBe("member");
  });

  it("admin não consegue alterar um owner", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.h3@test.local");
    const owner = await membershipOf(seed.orgAId, seed.userAId);

    const { error } = await admin.client.rpc("change_member_role", {
      p_member_id: owner!.id,
      p_new_role: "admin",
    });
    expect(error?.message).toContain("Forbidden");
    expect((await membershipOf(seed.orgAId, seed.userAId))?.role).toBe("owner");
  });

  it("member não consegue alterar papel", async () => {
    const member = await createMember(seed.orgAId, "member", "member.h3@test.local");
    const other = await createMember(seed.orgAId, "member", "member.h4@test.local");

    const { error } = await member.client.rpc("change_member_role", {
      p_member_id: other.membershipId,
      p_new_role: "admin",
    });
    expect(error?.message).toContain("Forbidden");
    expect((await membershipOf(seed.orgAId, other.userId))?.role).toBe("member");
  });

  it("papel inválido é rejeitado", async () => {
    const member = await createMember(seed.orgAId, "member", "member.h5@test.local");
    const { error } = await ownerA.rpc("change_member_role", {
      p_member_id: member.membershipId,
      p_new_role: "superuser",
    });
    expect(error?.message).toContain("Invalid role");
    expect((await membershipOf(seed.orgAId, member.userId))?.role).toBe("member");
  });

  it("owner promove member a admin", async () => {
    const member = await createMember(seed.orgAId, "member", "member.h6@test.local");
    const { error } = await ownerA.rpc("change_member_role", {
      p_member_id: member.membershipId,
      p_new_role: "admin",
    });
    expect(error).toBeNull();
    expect((await membershipOf(seed.orgAId, member.userId))?.role).toBe("admin");
  });

  it("owner rebaixa admin para member", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.h4@test.local");
    const { error } = await ownerA.rpc("change_member_role", {
      p_member_id: admin.membershipId,
      p_new_role: "member",
    });
    expect(error).toBeNull();
    expect((await membershipOf(seed.orgAId, admin.userId))?.role).toBe("member");
  });

  it("owner único não consegue se rebaixar (Last owner, nada muda)", async () => {
    // userA é o único owner da Org A neste ponto do fluxo.
    const self = await membershipOf(seed.orgAId, seed.userAId);
    const { error } = await ownerA.rpc("change_member_role", {
      p_member_id: self!.id,
      p_new_role: "admin",
    });
    expect(error?.message).toContain("Last owner");
    expect((await membershipOf(seed.orgAId, seed.userAId))?.role).toBe("owner");
  });

  it("owner com outro owner na organização não se rebaixa (Forbidden)", async () => {
    const admin = createTestAdminClient();
    const { data: orgE } = await admin
      .from("organizations")
      .insert({ name: "Org E", slug: "org-e-selfdemote" })
      .select("id")
      .single();
    const first = await createMember(orgE!.id, "owner", "self.owner1@test.local");
    await createMember(orgE!.id, "owner", "self.owner2@test.local");

    const self = await membershipOf(orgE!.id, first.userId);
    const { error } = await first.client.rpc("change_member_role", {
      p_member_id: self!.id,
      p_new_role: "admin",
    });
    expect(error?.message).toContain("Forbidden");
    expect((await membershipOf(orgE!.id, first.userId))?.role).toBe("owner");

    await admin.from("organizations").delete().eq("id", orgE!.id);
  });

  it("admin não consegue se promover a owner", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.h5@test.local");
    const { error } = await admin.client.rpc("change_member_role", {
      p_member_id: admin.membershipId,
      p_new_role: "owner",
    });
    expect(error?.message).toContain("Forbidden");
    expect((await membershipOf(seed.orgAId, admin.userId))?.role).toBe("admin");
  });
});

describe("add_member_by_email", () => {
  it("owner adiciona usuário existente como admin", async () => {
    const userId = await createUnassignedUser("add.owner.admin@test.local");

    const { data, error } = await ownerA.rpc("add_member_by_email", {
      p_email: "add.owner.admin@test.local",
      p_role: "admin",
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect((await membershipOf(seed.orgAId, userId))?.role).toBe("admin");
  });

  it("admin adiciona usuário existente como member", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.add1@test.local");
    const userId = await createUnassignedUser("add.admin.member@test.local");

    const { error } = await admin.client.rpc("add_member_by_email", {
      p_email: "add.admin.member@test.local",
      p_role: "member",
    });
    expect(error).toBeNull();
    expect((await membershipOf(seed.orgAId, userId))?.role).toBe("member");
  });

  it("admin não adiciona como admin (nada é criado)", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.add2@test.local");
    const userId = await createUnassignedUser("add.admin.rejected@test.local");

    const { error } = await admin.client.rpc("add_member_by_email", {
      p_email: "add.admin.rejected@test.local",
      p_role: "admin",
    });
    expect(error?.message).toContain("Forbidden");
    expect(await membershipOf(seed.orgAId, userId)).toBeNull();
  });

  it("owner não adiciona com papel owner (Invalid role)", async () => {
    const userId = await createUnassignedUser("add.owner.role@test.local");

    const { error } = await ownerA.rpc("add_member_by_email", {
      p_email: "add.owner.role@test.local",
      p_role: "owner",
    });
    expect(error?.message).toContain("Invalid role");
    expect(await membershipOf(seed.orgAId, userId)).toBeNull();
  });

  it("e-mail inexistente retorna User not found", async () => {
    const { error } = await ownerA.rpc("add_member_by_email", {
      p_email: "nao.existe@test.local",
      p_role: "member",
    });
    expect(error?.message).toContain("User not found");
  });

  it("e-mail já membro retorna Member already exists", async () => {
    const { error } = await ownerA.rpc("add_member_by_email", {
      p_email: SEED.userA.email,
      p_role: "member",
    });
    expect(error?.message).toContain("Member already exists");
  });

  it("auto-adição é rejeitada", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.add3@test.local");
    const { error } = await admin.client.rpc("add_member_by_email", {
      p_email: "admin.add3@test.local",
      p_role: "member",
    });
    expect(error?.message).toContain("Member already exists");
  });

  it("usuário de outra organização é rejeitado", async () => {
    const { error } = await ownerA.rpc("add_member_by_email", {
      p_email: SEED.userB.email,
      p_role: "member",
    });
    expect(error?.message).toContain("User already belongs to an organization");
    expect((await membershipOf(seed.orgAId, seed.userBId))).toBeNull();
    expect((await membershipOf(seed.orgBId, seed.userBId))?.role).toBe("owner");
  });

  it("member não adiciona ninguém", async () => {
    const member = await createMember(seed.orgAId, "member", "member.add1@test.local");
    const userId = await createUnassignedUser("add.member.rejected@test.local");

    const { error } = await member.client.rpc("add_member_by_email", {
      p_email: "add.member.rejected@test.local",
      p_role: "member",
    });
    expect(error?.message).toContain("Forbidden");
    expect(await membershipOf(seed.orgAId, userId)).toBeNull();
  });
});

describe("update_member_profile", () => {
  it("owner edita o nome de qualquer membro", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.u1@test.local");

    const { error } = await ownerA.rpc("update_member_profile", {
      p_member_id: admin.membershipId,
      p_full_name: "  Admin Renomeado  ",
    });
    expect(error).toBeNull();
    expect(await profileNameOf(admin.userId)).toBe("Admin Renomeado");
  });

  it("admin edita o nome de um member", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.u2@test.local");
    const member = await createMember(seed.orgAId, "member", "member.u1@test.local");

    const { error } = await admin.client.rpc("update_member_profile", {
      p_member_id: member.membershipId,
      p_full_name: "Membro Editado",
    });
    expect(error).toBeNull();
    expect(await profileNameOf(member.userId)).toBe("Membro Editado");
  });

  it("admin não edita outro admin", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.u3@test.local");
    const other = await createMember(seed.orgAId, "admin", "admin.u4@test.local");
    const before = await profileNameOf(other.userId);

    const { error } = await admin.client.rpc("update_member_profile", {
      p_member_id: other.membershipId,
      p_full_name: "Tentativa Admin",
    });
    expect(error?.message).toContain("Forbidden");
    expect(await profileNameOf(other.userId)).toBe(before);
  });

  it("admin não edita um owner", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.u5@test.local");
    const owner = await membershipOf(seed.orgAId, seed.userAId);
    const before = await profileNameOf(seed.userAId);

    const { error } = await admin.client.rpc("update_member_profile", {
      p_member_id: owner!.id,
      p_full_name: "Tentativa Owner",
    });
    expect(error?.message).toContain("Forbidden");
    expect(await profileNameOf(seed.userAId)).toBe(before);
  });

  it("member não edita ninguém", async () => {
    const member = await createMember(seed.orgAId, "member", "member.u2@test.local");
    const other = await createMember(seed.orgAId, "member", "member.u3@test.local");

    const { error } = await member.client.rpc("update_member_profile", {
      p_member_id: other.membershipId,
      p_full_name: "Tentativa Member",
    });
    expect(error?.message).toContain("Forbidden");
  });

  it("nome inválido é rejeitado e o nome anterior permanece", async () => {
    const member = await createMember(seed.orgAId, "member", "member.u4@test.local");
    const before = await profileNameOf(member.userId);

    const { error } = await ownerA.rpc("update_member_profile", {
      p_member_id: member.membershipId,
      p_full_name: " A ",
    });
    expect(error?.message).toContain("Invalid name");
    expect(await profileNameOf(member.userId)).toBe(before);
  });

  it("não altera o e-mail da conta", async () => {
    const member = await createMember(seed.orgAId, "member", "member.u5@test.local");
    const before = await emailOf(member.userId);

    const { error } = await ownerA.rpc("update_member_profile", {
      p_member_id: member.membershipId,
      p_full_name: "Somente Nome",
    });
    expect(error).toBeNull();
    expect(await emailOf(member.userId)).toBe(before);
    expect(await profileNameOf(member.userId)).toBe("Somente Nome");
  });

  it("alvo de outra organização é tratado como inexistente", async () => {
    const { data: orgB } = await createTestAdminClient()
      .from("organizations")
      .select("id")
      .eq("id", seed.orgBId)
      .single();

    const other = await membershipOf(orgB!.id, seed.userBId);
    const before = await profileNameOf(seed.userBId);

    const { error } = await ownerA.rpc("update_member_profile", {
      p_member_id: other!.id,
      p_full_name: "Invasão Cross Tenant",
    });
    expect(error?.message).toContain("Member not found");
    expect(await profileNameOf(seed.userBId)).toBe(before);
  });
});

describe("remove_member — hierarquia", () => {
  it("admin remove member", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.r1@test.local");
    const member = await createMember(seed.orgAId, "member", "member.r1@test.local");

    const { error } = await admin.client.rpc("remove_member", {
      p_member_id: member.membershipId,
    });
    expect(error).toBeNull();
    expect(await membershipOf(seed.orgAId, member.userId)).toBeNull();
  });

  it("admin não remove outro admin", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.r2@test.local");
    const other = await createMember(seed.orgAId, "admin", "admin.r3@test.local");

    const { error } = await admin.client.rpc("remove_member", {
      p_member_id: other.membershipId,
    });
    expect(error?.message).toContain("Forbidden");
    expect(await membershipOf(seed.orgAId, other.userId)).not.toBeNull();
  });

  it("admin não remove owner", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.r4@test.local");
    const owner = await membershipOf(seed.orgAId, seed.userAId);
    const { error } = await admin.client.rpc("remove_member", {
      p_member_id: owner!.id,
    });
    expect(error?.message).toContain("Forbidden");
    expect((await membershipOf(seed.orgAId, seed.userAId))?.role).toBe("owner");
  });

  it("member não remove ninguém", async () => {
    const member = await createMember(seed.orgAId, "member", "member.r2@test.local");
    const other = await createMember(seed.orgAId, "member", "member.r3@test.local");
    const { error } = await member.client.rpc("remove_member", {
      p_member_id: other.membershipId,
    });
    expect(error?.message).toContain("Forbidden");
    expect(await membershipOf(seed.orgAId, other.userId)).not.toBeNull();
  });

  it("owner remove admin", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.r5@test.local");
    const { error } = await ownerA.rpc("remove_member", {
      p_member_id: admin.membershipId,
    });
    expect(error).toBeNull();
    expect(await membershipOf(seed.orgAId, admin.userId)).toBeNull();
  });

  it("alvo de outra organização é tratado como inexistente", async () => {
    const other = await membershipOf(seed.orgBId, seed.userBId);

    const { error } = await ownerA.rpc("remove_member", {
      p_member_id: other!.id,
    });
    expect(error?.message).toContain("Member not found");
    expect((await membershipOf(seed.orgBId, seed.userBId))?.role).toBe("owner");
  });

  it("auto-remoção do owner é permitida quando há outro owner", async () => {
    const admin = createTestAdminClient();
    const { data: orgF } = await admin
      .from("organizations")
      .insert({ name: "Org F", slug: "org-f-selfremove" })
      .select("id")
      .single();
    const first = await createMember(orgF!.id, "owner", "self.remove1@test.local");
    await createMember(orgF!.id, "owner", "self.remove2@test.local");

    const { error } = await first.client.rpc("remove_member", {
      p_member_id: first.membershipId,
    });
    expect(error).toBeNull();
    expect(await membershipOf(orgF!.id, first.userId)).toBeNull();

    await admin.from("organizations").delete().eq("id", orgF!.id);
  });
});

describe("último owner", () => {
  it("rebaixar o único owner retorna Last owner e nada muda", async () => {
    // Org B tem apenas um owner (userB).
    const ownerB = await createAuthenticatedClient(SEED.userB.email, SEED.userB.password);
    const self = await membershipOf(seed.orgBId, seed.userBId);

    const { error } = await ownerB.rpc("change_member_role", {
      p_member_id: self!.id,
      p_new_role: "admin",
    });
    expect(error?.message).toContain("Last owner");
    expect((await membershipOf(seed.orgBId, seed.userBId))?.role).toBe("owner");
  });

  it("owner rebaixa outro owner quando há mais de um", async () => {
    const admin = createTestAdminClient();
    const { data: orgD } = await admin
      .from("organizations")
      .insert({ name: "Org D", slug: "org-d-twoowners" })
      .select("id")
      .single();
    const first = await createMember(orgD!.id, "owner", "two.owner1@test.local");
    const second = await createMember(orgD!.id, "owner", "two.owner2@test.local");

    const { error } = await first.client.rpc("change_member_role", {
      p_member_id: second.membershipId,
      p_new_role: "member",
    });
    expect(error).toBeNull();
    expect((await membershipOf(orgD!.id, second.userId))?.role).toBe("member");

    await admin.from("organizations").delete().eq("id", orgD!.id);
  });

  it("remover o único owner é rejeitado com Last owner", async () => {
    const admin = createTestAdminClient();
    const { data: orgC } = await admin
      .from("organizations")
      .insert({ name: "Org C", slug: "org-c-lastowner" })
      .select("id")
      .single();
    const sole = await createMember(orgC!.id, "owner", "sole.owner@test.local");
    const helper = await createMember(orgC!.id, "admin", "helper.c@test.local");

    const { error } = await helper.client.rpc("remove_member", {
      p_member_id: sole.membershipId,
    });
    expect(error?.message).toContain("Forbidden"); // admin não remove owner

    // Owner tentando remover a si mesmo como único owner
    const { error: e2 } = await sole.client.rpc("remove_member", {
      p_member_id: sole.membershipId,
    });
    expect(e2?.message).toContain("Last owner");
    expect((await membershipOf(orgC!.id, sole.userId))?.role).toBe("owner");

    await admin.from("organizations").delete().eq("id", orgC!.id);
  });
});

describe("list_organization_members — isolamento e privacidade", () => {
  it("retorna somente membros da organização do chamador", async () => {
    const { data, error } = await ownerA.rpc("list_organization_members");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.user_id);
    expect(ids).toContain(seed.userAId);
    expect(ids).not.toContain(seed.userBId);
  });

  it("owner vê o e-mail e o status do convite", async () => {
    const { data } = await ownerA.rpc("list_organization_members");
    const row = (data ?? []).find((r) => r.user_id === seed.userAId);
    expect(row?.email).toBe(SEED.userA.email);
    expect(row?.invitation_pending).toBe(false);
  });

  it("admin vê o e-mail dos membros da própria organização", async () => {
    const admin = await createMember(seed.orgAId, "admin", "admin.list@test.local");
    const { data } = await admin.client.rpc("list_organization_members");
    const row = (data ?? []).find((r) => r.user_id === admin.userId);
    expect(row?.email).toBe("admin.list@test.local");
  });

  it("member não recebe e-mails", async () => {
    const member = await createMember(seed.orgAId, "member", "member.list@test.local");
    const { data } = await member.client.rpc("list_organization_members");
    expect(data?.length).toBeGreaterThan(0);
    expect((data ?? []).every((r) => r.email === null)).toBe(true);
  });

  it("marca convite pendente quando o e-mail não foi confirmado", async () => {
    const userId = await createUnassignedUser("pending.invite@test.local", false);
    const admin = createTestAdminClient();
    await admin.from("organization_members").insert({
      organization_id: seed.orgAId,
      user_id: userId,
      role: "member",
    });

    const { data } = await ownerA.rpc("list_organization_members");
    const row = (data ?? []).find((r) => r.user_id === userId);
    expect(row?.invitation_pending).toBe(true);
    expect(row?.email).toBe("pending.invite@test.local");
  });
});

describe("colunas protegidas", () => {
  it("profiles: alterar full_name é permitido", async () => {
    const { error } = await ownerA
      .from("profiles")
      .update({ full_name: "User A Renomeado" })
      .eq("id", seed.userAId);
    expect(error).toBeNull();
  });

  it("profiles: alterar id é rejeitado", async () => {
    // Cast intencional: o teste envia coluna proibida pelo tipo para provar o bloqueio no banco.
    const forbidden = { id: "00000000-0000-0000-0000-000000000099" } as unknown as Partial<
      Database["public"]["Tables"]["profiles"]["Update"]
    >;
    const { error } = await ownerA
      .from("profiles")
      .update(forbidden)
      .eq("id", seed.userAId);
    expect(error).not.toBeNull();
  });

  it("profiles: alterar created_at é rejeitado", async () => {
    // Cast intencional: coluna proibida pelo tipo, enviada para provar o bloqueio no banco.
    const forbidden = { created_at: "2000-01-01T00:00:00Z" } as unknown as Partial<
      Database["public"]["Tables"]["profiles"]["Update"]
    >;
    const { error } = await ownerA
      .from("profiles")
      .update(forbidden)
      .eq("id", seed.userAId);
    expect(error).not.toBeNull();
  });

  it("organizations: alterar name é permitido para owner", async () => {
    const { error } = await ownerA
      .from("organizations")
      .update({ name: "Org A Editada" })
      .eq("id", seed.orgAId);
    expect(error).toBeNull();
  });

  it("organizations: alterar slug é rejeitado", async () => {
    const { error } = await ownerA
      .from("organizations")
      .update({ slug: "novo-slug" })
      .eq("id", seed.orgAId);
    expect(error).not.toBeNull();
  });

  it("organizations: alterar status é rejeitado", async () => {
    const { error } = await ownerA
      .from("organizations")
      .update({ status: "suspended" })
      .eq("id", seed.orgAId);
    expect(error).not.toBeNull();
  });
});

describe("onboarding após migration 005", () => {
  it("create_organization cria membership owner e assinatura trialing", async () => {
    const admin = createTestAdminClient();
    const email = "onboard.new@test.local";
    const slug = "salao-novo-onboard";
    await deleteUserByEmail(email);
    // Limpa a org de execuções anteriores (slug é único).
    await admin.from("organizations").delete().eq("slug", slug);

    const { data: u, error: uErr } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (uErr || !u.user) throw new Error(uErr?.message);

    const client = await createAuthenticatedClient(email, PASSWORD);
    const { data: orgId, error } = await client.rpc("create_organization", {
      p_name: "Salão Novo",
      p_slug: "salao-novo-onboard",
      p_business_type: "salao",
    });
    expect(error).toBeNull();
    expect(orgId).toBeTruthy();

    const membership = await membershipOf(orgId as string, u.user.id);
    expect(membership?.role).toBe("owner");

    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan, status")
      .eq("organization_id", orgId as string)
      .single();
    expect(sub).toEqual({ plan: "starter", status: "trialing" });
  });
});
