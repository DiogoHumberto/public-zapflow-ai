/**
 * Testes de integração dos indicadores do dashboard (tarefas 3.3 e 3.4).
 *
 * Verifica que as contagens usam o cliente SSR/RLS e que uma organização
 * nunca contabiliza dados de outra, além do caso de organização vazia.
 *
 * Requer Supabase local rodando (npm run db:start) e migrations aplicadas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { loadDashboardMetrics } from "@/features/dashboard/metrics";
import type { Database } from "@/types/database";

import {
  createAuthenticatedClient,
  createTestAdminClient,
  deleteUserByEmail,
} from "./helpers";
import { runSeed, SEED, type SeedResult } from "./seed";

const PASSWORD = "TestPassword123!";
const EMPTY_OWNER_EMAIL = "empty.owner@test.local";
const EMPTY_ORG_SLUG = "org-c-dashboard-empty";

let seed: SeedResult;
let orgA: SupabaseClient<Database>;
let orgB: SupabaseClient<Database>;
let emptyOrg: SupabaseClient<Database>;

beforeAll(async () => {
  seed = await runSeed();
  const admin = createTestAdminClient();

  // ---- Org A: dados controlados para conferir cada indicador ----
  const { data: contactsA, error: contactsError } = await admin
    .from("contacts")
    .insert([
      { organization_id: seed.orgAId, phone: "+5511999991001", name: "Contato A1" },
      { organization_id: seed.orgAId, phone: "+5511999991002", name: "Contato A2" },
    ])
    .select("id");
  if (contactsError) throw new Error(`seed contacts A: ${contactsError.message}`);

  const { data: openConversationA, error: openError } = await admin
    .from("conversations")
    .insert({
      organization_id: seed.orgAId,
      contact_id: contactsA![0].id,
      status: "open",
      ai_enabled: false,
    })
    .select("id")
    .single();
  if (openError) throw new Error(`seed conversation A: ${openError.message}`);

  await admin.from("conversations").insert({
    organization_id: seed.orgAId,
    contact_id: contactsA![1].id,
    status: "closed",
    ai_enabled: true,
  });

  const inboundRecentA = {
    organization_id: seed.orgAId,
    conversation_id: openConversationA!.id,
    direction: "inbound" as const,
    sender_type: "customer" as const,
    message_type: "text",
    content: "mensagem recente 1",
    delivery_status: "received" as const,
    metadata: {},
  };
  await admin.from("messages").insert([
    inboundRecentA,
    { ...inboundRecentA, content: "mensagem recente 2" },
    {
      ...inboundRecentA,
      direction: "outbound",
      sender_type: "ai",
      content: "resposta da IA",
    },
  ]);

  // Mensagem fora da janela de 7 dias: cast intencional porque `created_at`
  // tem default no banco e não faz parte do tipo de insert da aplicação.
  const oldInboundA = {
    ...inboundRecentA,
    content: "mensagem antiga",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  } as unknown as Database["public"]["Tables"]["messages"]["Insert"];
  const { error: oldError } = await admin.from("messages").insert(oldInboundA);
  if (oldError) throw new Error(`seed old message A: ${oldError.message}`);

  // ---- Org C: recém-criada, sem contatos/conversas/mensagens ----
  await admin.from("organizations").delete().eq("slug", EMPTY_ORG_SLUG);
  // Busca paginada: a suíte cria muitos usuários e listUsers() pagina.
  await deleteUserByEmail(EMPTY_OWNER_EMAIL);

  const { data: emptyOwner, error: emptyOwnerError } = await admin.auth.admin.createUser({
    email: EMPTY_OWNER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Owner Org Vazia" },
  });
  if (emptyOwnerError || !emptyOwner.user) {
    throw new Error(`seed empty owner: ${emptyOwnerError?.message}`);
  }

  const { data: emptyOrganization, error: emptyOrgError } = await admin
    .from("organizations")
    .insert({ name: "Org C Dashboard", slug: EMPTY_ORG_SLUG })
    .select("id")
    .single();
  if (emptyOrgError) throw new Error(`seed empty org: ${emptyOrgError.message}`);

  await admin.from("organization_members").insert({
    organization_id: emptyOrganization!.id,
    user_id: emptyOwner.user.id,
    role: "owner",
  });

  orgA = await createAuthenticatedClient(SEED.userA.email, SEED.userA.password);
  orgB = await createAuthenticatedClient(SEED.userB.email, SEED.userB.password);
  emptyOrg = await createAuthenticatedClient(EMPTY_OWNER_EMAIL, PASSWORD);
});

describe("indicadores do dashboard", () => {
  it("conta somente os dados da Org A", async () => {
    const result = await loadDashboardMetrics(orgA);

    expect(result).toEqual({
      ok: true,
      metrics: {
        contacts: 2,
        openConversations: 1,
        aiDisabledConversations: 1,
        inboundMessagesLast7Days: 2,
      },
    });
  });

  it("conta somente os dados da Org B (isolamento cross-tenant)", async () => {
    const result = await loadDashboardMetrics(orgB);

    expect(result).toEqual({
      ok: true,
      metrics: {
        contacts: 1,
        openConversations: 1,
        aiDisabledConversations: 0,
        inboundMessagesLast7Days: 1,
      },
    });
  });

  it("organização sem dados exibe zeros, sem erro", async () => {
    const result = await loadDashboardMetrics(emptyOrg);

    expect(result).toEqual({
      ok: true,
      metrics: {
        contacts: 0,
        openConversations: 0,
        aiDisabledConversations: 0,
        inboundMessagesLast7Days: 0,
      },
    });
  });
});
