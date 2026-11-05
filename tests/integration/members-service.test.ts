/**
 * Serviço de membros — mesmas funções que as Server Actions chamam (D05).
 *
 *  - listagem isolada por tenant (todas as RPCs filtram pelo chamador)
 *  - member não altera papel (ação forjada rejeitada no servidor/banco)
 *  - autopromoção e último owner rejeitados via serviço
 *  - owner promove member e admin remove member
 *
 * Requer Supabase local rodando (npm run db:start).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { isAppError } from "@/lib/errors";
import {
  addMemberByEmail,
  changeMemberRole,
  listMembers,
  removeMember,
  updateMemberProfile,
} from "@/features/members/service";
import type { Database } from "@/types/database";

import {
  createAuthenticatedClient,
  createTestAdminClient,
  deleteUserByEmail,
} from "./helpers";
import { runSeed, SEED, type SeedResult } from "./seed";

const PASSWORD = "TestPassword123!";

type Member = {
  client: SupabaseClient<Database>;
  userId: string;
  membershipId: string;
};

let seed: SeedResult;
let ownerA: SupabaseClient<Database>;
let ownerMembershipId: string;
let adminA: Member;
let memberA: Member;
let tempA: Member;

/** Cria (ou recria) um usuário e o associa à Org A com o papel dado. */
async function createOrgAUser(
  email: string,
  role: "admin" | "member"
): Promise<Member> {
  const admin = createTestAdminClient();

  await deleteUserByEmail(email);

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Nome ${email}` },
  });
  if (error || !created.user) {
    throw new Error(`seed ${email}: ${error?.message}`);
  }

  const { data: membership, error: mErr } = await admin
    .from("organization_members")
    .insert({
      organization_id: seed.orgAId,
      user_id: created.user.id,
      role,
    })
    .select("id")
    .single();
  if (mErr) throw new Error(`membership ${email}: ${mErr.message}`);

  const client = await createAuthenticatedClient(email, PASSWORD);
  return { client, userId: created.user.id, membershipId: membership.id };
}

/** Cria um usuário sem organização (alvo de addMemberByEmail). */
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
  if (error || !data.user) throw new Error(`seed ${email}: ${error?.message}`);

  return data.user.id;
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

async function roleOf(userId: string): Promise<string | null> {
  const admin = createTestAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", seed.orgAId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}

async function expectAppError(
  promise: Promise<unknown>,
  code: string
): Promise<void> {
  try {
    await promise;
    throw new Error("esperava uma rejeição");
  } catch (error) {
    expect(isAppError(error)).toBe(true);
    if (isAppError(error)) expect(error.code).toBe(code);
  }
}

beforeAll(async () => {
  seed = await runSeed();

  ownerA = await createAuthenticatedClient(SEED.userA.email, SEED.userA.password);
  adminA = await createOrgAUser("admin.a@test.local", "admin");
  memberA = await createOrgAUser("member.a@test.local", "member");
  tempA = await createOrgAUser("temp.a@test.local", "member");

  const admin = createTestAdminClient();
  const { data: ownerMembership } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", seed.orgAId)
    .eq("user_id", seed.userAId)
    .single();
  ownerMembershipId = ownerMembership?.id ?? "";
});

describe("listMembers", () => {
  it("lista os membros da Org A e não inclui a Org B", async () => {
    const result = await listMembers(ownerA);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const userIds = result.members.map((m) => m.userId);
    expect(userIds).toContain(seed.userAId);
    expect(userIds).toContain(memberA.userId);
    expect(userIds).not.toContain(seed.userBId);
    expect(result.members.find((m) => m.userId === seed.userAId)?.role).toBe(
      "owner"
    );
  });

  it("member também visualiza a lista da própria organização", async () => {
    const result = await listMembers(memberA.client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members.length).toBeGreaterThan(0);
    expect(result.members.every((m) => m.userId !== seed.userBId)).toBe(true);
    // Privacidade: member não recebe e-mails.
    expect(result.members.every((m) => m.email === null)).toBe(true);
  });

  it("expõe e-mail para owner e status do convite", async () => {
    const result = await listMembers(ownerA);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ownerRow = result.members.find((m) => m.userId === seed.userAId);
    expect(ownerRow?.email).toBe(SEED.userA.email);
    expect(ownerRow?.invitationPending).toBe(false);
  });

  it("marca convite pendente para usuário não confirmado", async () => {
    const userId = await createUnassignedUser("service.pending@test.local", false);
    const admin = createTestAdminClient();
    await admin.from("organization_members").insert({
      organization_id: seed.orgAId,
      user_id: userId,
      role: "member",
    });

    const result = await listMembers(ownerA);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const row = result.members.find((m) => m.userId === userId);
    expect(row?.invitationPending).toBe(true);
    expect(row?.email).toBe("service.pending@test.local");
  });
});

describe("changeMemberRole — rejeições", () => {
  it("member não altera papel (ação forjada) e o papel não muda", async () => {
    await expectAppError(
      changeMemberRole(memberA.client, tempA.membershipId, "admin"),
      "FORBIDDEN"
    );

    expect(await roleOf(tempA.userId)).toBe("member");
  });

  it("admin não promove a si mesmo a owner", async () => {
    await expectAppError(
      changeMemberRole(adminA.client, adminA.membershipId, "owner"),
      "FORBIDDEN"
    );

    expect(await roleOf(adminA.userId)).toBe("admin");
  });

  it("owner não rebaixa a si mesmo quando é o último owner", async () => {
    await expectAppError(
      changeMemberRole(ownerA, ownerMembershipId, "member"),
      "VALIDATION"
    );

    expect(await roleOf(seed.userAId)).toBe("owner");
  });

  it("admin não altera um owner", async () => {
    await expectAppError(
      changeMemberRole(adminA.client, ownerMembershipId, "member"),
      "FORBIDDEN"
    );

    expect(await roleOf(seed.userAId)).toBe("owner");
  });

  it("admin não altera o papel de um member (exclusivo de owner)", async () => {
    const target = await createOrgAUser("service.admin.target@test.local", "member");

    await expectAppError(
      changeMemberRole(adminA.client, target.membershipId, "admin"),
      "FORBIDDEN"
    );

    expect(await roleOf(target.userId)).toBe("member");
  });
});

describe("changeMemberRole / removeMember — sucesso", () => {
  it("owner promove member a admin", async () => {
    await changeMemberRole(ownerA, tempA.membershipId, "admin");
    expect(await roleOf(tempA.userId)).toBe("admin");
  });

  it("admin remove um member e ele perde o membership", async () => {
    await removeMember(adminA.client, memberA.membershipId);
    expect(await roleOf(memberA.userId)).toBeNull();
  });

  it("admin não remove um owner", async () => {
    await expectAppError(
      removeMember(adminA.client, ownerMembershipId),
      "FORBIDDEN"
    );

    expect(await roleOf(seed.userAId)).toBe("owner");
  });
});

describe("addMemberByEmail", () => {
  it("owner adiciona usuário existente como admin", async () => {
    const userId = await createUnassignedUser("service.add.owner@test.local");

    const memberId = await addMemberByEmail(ownerA, {
      email: "service.add.owner@test.local",
      role: "admin",
    });

    expect(memberId).toBeTruthy();
    expect(await roleOf(userId)).toBe("admin");
  });

  it("admin adiciona usuário existente como member", async () => {
    const userId = await createUnassignedUser("service.add.admin@test.local");

    await addMemberByEmail(adminA.client, {
      email: "service.add.admin@test.local",
      role: "member",
    });

    expect(await roleOf(userId)).toBe("member");
  });

  it("admin não adiciona como admin", async () => {
    const userId = await createUnassignedUser("service.add.rejected@test.local");

    await expectAppError(
      addMemberByEmail(adminA.client, {
        email: "service.add.rejected@test.local",
        role: "admin",
      }),
      "FORBIDDEN"
    );

    expect(await roleOf(userId)).toBeNull();
  });

  it("e-mail inexistente retorna NOT_FOUND (aciona o convite)", async () => {
    await expectAppError(
      addMemberByEmail(ownerA, {
        email: "service.add.missing@test.local",
        role: "member",
      }),
      "NOT_FOUND"
    );
  });

  it("e-mail já membro retorna VALIDATION", async () => {
    await expectAppError(
      addMemberByEmail(ownerA, {
        email: SEED.userA.email,
        role: "member",
      }),
      "VALIDATION"
    );
  });

  it("usuário de outra organização é rejeitado", async () => {
    await expectAppError(
      addMemberByEmail(ownerA, {
        email: SEED.userB.email,
        role: "member",
      }),
      "VALIDATION"
    );

    expect(await roleOf(seed.userBId)).toBeNull();
  });
});

describe("updateMemberProfile", () => {
  it("owner edita o nome de qualquer membro", async () => {
    const admin = await createOrgAUser("service.edit.owner@test.local", "admin");

    await updateMemberProfile(ownerA, admin.membershipId, "  Admin Renomeado  ");

    expect(await profileNameOf(admin.userId)).toBe("Admin Renomeado");
  });

  it("admin edita o nome de um member", async () => {
    const member = await createOrgAUser("service.edit.member@test.local", "member");

    await updateMemberProfile(adminA.client, member.membershipId, "Membro Editado");

    expect(await profileNameOf(member.userId)).toBe("Membro Editado");
  });

  it("admin não edita outro admin", async () => {
    const other = await createOrgAUser("service.edit.admin2@test.local", "admin");
    const before = await profileNameOf(other.userId);

    await expectAppError(
      updateMemberProfile(adminA.client, other.membershipId, "Tentativa"),
      "FORBIDDEN"
    );

    expect(await profileNameOf(other.userId)).toBe(before);
  });

  it("member não edita outro membro", async () => {
    const member = await createOrgAUser("service.edit.m1@test.local", "member");
    const other = await createOrgAUser("service.edit.m2@test.local", "member");

    await expectAppError(
      updateMemberProfile(member.client, other.membershipId, "Tentativa"),
      "FORBIDDEN"
    );
  });

  it("nome inválido retorna VALIDATION e não altera", async () => {
    const member = await createOrgAUser("service.edit.invalid@test.local", "member");
    const before = await profileNameOf(member.userId);

    await expectAppError(
      updateMemberProfile(ownerA, member.membershipId, " A "),
      "VALIDATION"
    );

    expect(await profileNameOf(member.userId)).toBe(before);
  });

  it("alvo de outra organização retorna NOT_FOUND", async () => {
    const admin = createTestAdminClient();
    const { data: other } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", seed.orgBId)
      .eq("user_id", seed.userBId)
      .single();

    await expectAppError(
      updateMemberProfile(ownerA, other!.id, "Invasão Cross Tenant"),
      "NOT_FOUND"
    );
  });
});
