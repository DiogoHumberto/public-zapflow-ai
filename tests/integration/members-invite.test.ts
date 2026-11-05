/**
 * Convite de membros — fluxo de adicionar (design §3).
 *
 *  - e-mail novo: conta criada pelo Supabase Auth (pendente) + membership
 *  - e-mail já cadastrado e sem organização: associação sem novo convite
 *  - falha na associação final: compensação remove a conta convidada
 *
 * Requer Supabase local rodando (npm run db:start) com Inbucket.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addMemberWithInvite } from "@/features/members/add-member";
import { listMembers } from "@/features/members/service";
import { isAppError } from "@/lib/errors";
import type { Database } from "@/types/database";

import {
  createAuthenticatedClient,
  createTestAdminClient,
  deleteUserByEmail,
  findUserByEmail,
} from "./helpers";
import { runSeed, SEED, type SeedResult } from "./seed";

const PASSWORD = "TestPassword123!";
const INVITE_URL = process.env.SUPABASE_LOCAL_URL ?? "http://127.0.0.1:54321";

// O módulo de convite lê as variáveis via getServerEnv()/getPublicEnv().
// Antes do import dinâmico, apontamos para o stack local.
process.env.NEXT_PUBLIC_SUPABASE_URL = INVITE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_LOCAL_ANON_KEY;
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;

type InviteFn = (input: {
  email: string;
  fullName: string | null;
}) => Promise<{ userId: string }>;
type RemoveInvitedFn = (userId: string) => Promise<void>;

let seed: SeedResult;
let ownerA: SupabaseClient<Database>;
let inviteUserByEmail: InviteFn;
let removeInvitedUser: RemoveInvitedFn;

const CREATED_EMAILS = [
  "invite.new@test.local",
  "invite.existing@test.local",
  "invite.compensation@test.local",
];

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

beforeAll(async () => {
  const inviteModule = await import("@/server/integrations/supabase-auth/invite");
  inviteUserByEmail = inviteModule.inviteUserByEmail;
  removeInvitedUser = inviteModule.removeInvitedUser;

  seed = await runSeed();
  ownerA = await createAuthenticatedClient(SEED.userA.email, SEED.userA.password);

  for (const email of CREATED_EMAILS) await deleteUserByEmail(email);
});

afterAll(async () => {
  for (const email of CREATED_EMAILS) await deleteUserByEmail(email);
});

describe("convite de e-mail novo", () => {
  it("cria a conta no Supabase local com metadata e convite pendente", async () => {
    const email = "invite.new@test.local";

    const result = await addMemberWithInvite({
      supabase: ownerA,
      input: { email, fullName: "Nova Pessoa", role: "member" },
      invite: inviteUserByEmail,
      removeInvitedUser,
    });

    expect(result.invited).toBe(true);

    const invited = await findUserByEmail(email);
    expect(invited).not.toBeNull();
    // Convite pendente: o GoTrue pode omitir o campo quando é nulo.
    expect(invited?.email_confirmed_at ?? null).toBeNull();
    expect(invited?.user_metadata.full_name).toBe("Nova Pessoa");

    expect(await membershipOf(seed.orgAId, invited!.id)).not.toBeNull();

    const list = await listMembers(ownerA);
    expect(list.ok).toBe(true);
    if (!list.ok) return;

    const row = list.members.find((member) => member.userId === invited!.id);
    expect(row?.email).toBe(email);
    expect(row?.fullName).toBe("Nova Pessoa");
    expect(row?.invitationPending).toBe(true);
  });
});

describe("usuário já cadastrado", () => {
  it("associa sem enviar novo convite", async () => {
    const email = "invite.existing@test.local";
    const admin = createTestAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Já Existe" },
    });
    if (error || !data.user) throw new Error(error?.message);

    let inviteCalls = 0;
    const result = await addMemberWithInvite({
      supabase: ownerA,
      input: { email, fullName: null, role: "member" },
      invite: async () => {
        inviteCalls += 1;
        return { userId: "nao-deveria-convidar" };
      },
      removeInvitedUser,
    });

    expect(result.invited).toBe(false);
    expect(inviteCalls).toBe(0);
    expect(await membershipOf(seed.orgAId, data.user.id)).not.toBeNull();

    const list = await listMembers(ownerA);
    expect(list.ok).toBe(true);
    if (!list.ok) return;

    const row = list.members.find((member) => member.userId === data.user.id);
    expect(row?.invitationPending).toBe(false);
  });
});

describe("compensação", () => {
  it("remove a conta convidada quando a associação final falha", async () => {
    const email = "invite.compensation@test.local";
    let invitedUserId = "";

    // Simula a corrida: a conta é criada entre a RPC e o convite e passa a
    // pertencer a outra organização, forçando a falha da associação.
    const inviteSimulatingRace: InviteFn = async () => {
      const admin = createTestAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name: "Corrida" },
      });
      if (error || !data.user) throw new Error(error?.message);

      invitedUserId = data.user.id;
      await admin.from("organization_members").insert({
        organization_id: seed.orgBId,
        user_id: invitedUserId,
        role: "member",
      });

      return { userId: invitedUserId };
    };

    let caught: unknown;
    try {
      await addMemberWithInvite({
        supabase: ownerA,
        input: { email, fullName: null, role: "member" },
        invite: inviteSimulatingRace,
        removeInvitedUser,
      });
    } catch (error) {
      caught = error;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe("VALIDATION");
      expect(caught.message).toBe("Este usuário já pertence a outra organização.");
    }

    // Compensação: conta removida e nenhum vínculo na Org A.
    expect(await findUserByEmail(email)).toBeNull();
    expect(await membershipOf(seed.orgAId, invitedUserId)).toBeNull();
  });
});
