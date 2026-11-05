/**
 * Seed determinístico dos testes de integração RLS.
 *
 * Cria:
 *  - 2 usuários (user.a / user.b) — senha fixa, e-mail confirmado
 *  - 2 organizações (Org A e Org B), cada uma com seu owner
 *  - dados mínimos em cada org (contact, conversation, message, knowledge_base)
 *
 * Executa APENAS em ambiente de teste, usando o cliente admin.
 */
import { createTestAdminClient, deleteUserByEmail } from "./helpers";

export const SEED = {
  userA: { email: "user.a@test.local", password: "TestPassword123!" },
  userB: { email: "user.b@test.local", password: "TestPassword123!" },
  orgA: { name: "Org A", slug: "org-a" },
  orgB: { name: "Org B", slug: "org-b" },
} as const;

export interface SeedResult {
  userAId: string;
  userBId: string;
  orgAId: string;
  orgBId: string;
  contactBId: string;
  conversationBId: string;
}

export async function runSeed(): Promise<SeedResult> {
  const admin = createTestAdminClient();

  // Limpa dados do seed anterior (idempotência).
  // 1) Remove orgs do seed (cascateia members, subscriptions, contacts, ...)
  await admin
    .from("organizations")
    .delete()
    .in("slug", [SEED.orgA.slug, SEED.orgB.slug]);

  // 2) Remove usuários de auth do seed anterior
  await deleteUserByEmail(SEED.userA.email);
  await deleteUserByEmail(SEED.userB.email);
  await deleteUserByEmail("member.a@test.local");

  // Cria usuários
  const { data: userA, error: eA } = await admin.auth.admin.createUser({
    email: SEED.userA.email,
    password: SEED.userA.password,
    email_confirm: true,
    user_metadata: { full_name: "User A" },
  });
  if (eA || !userA.user) throw new Error(`seed userA: ${eA?.message}`);

  const { data: userB, error: eB } = await admin.auth.admin.createUser({
    email: SEED.userB.email,
    password: SEED.userB.password,
    email_confirm: true,
    user_metadata: { full_name: "User B" },
  });
  if (eB || !userB.user) throw new Error(`seed userB: ${eB?.message}`);

  // Cria organizações (admin bypassa a RPC pois o usuário já estará autenticado no teste)
  const { data: orgA, error: eOrgA } = await admin
    .from("organizations")
    .insert({ name: SEED.orgA.name, slug: SEED.orgA.slug })
    .select("id")
    .single();
  if (eOrgA) throw new Error(`seed orgA: ${eOrgA.message}`);

  const { data: orgB, error: eOrgB } = await admin
    .from("organizations")
    .insert({ name: SEED.orgB.name, slug: SEED.orgB.slug })
    .select("id")
    .single();
  if (eOrgB) throw new Error(`seed orgB: ${eOrgB.message}`);

  // Memberships
  await admin.from("organization_members").insert([
    { organization_id: orgA.id, user_id: userA.user.id, role: "owner" },
    { organization_id: orgB.id, user_id: userB.user.id, role: "owner" },
  ]);

  // Subscriptions
  await admin.from("subscriptions").insert([
    { organization_id: orgA.id, plan: "starter", status: "trialing" },
    { organization_id: orgB.id, plan: "starter", status: "trialing" },
  ]);

  // Dados da Org B (alvos das tentativas de acesso cross-tenant)
  const { data: contactB, error: eContact } = await admin
    .from("contacts")
    .insert({ organization_id: orgB.id, phone: "+5511999990002", name: "Contact B" })
    .select("id")
    .single();
  if (eContact) throw new Error(`seed contact: ${eContact.message}`);

  const { data: conversationB, error: eConv } = await admin
    .from("conversations")
    .insert({ organization_id: orgB.id, contact_id: contactB.id })
    .select("id")
    .single();
  if (eConv) throw new Error(`seed conversation: ${eConv.message}`);

  await admin.from("messages").insert({
    organization_id: orgB.id,
    conversation_id: conversationB.id,
    direction: "inbound",
    sender_type: "customer",
    message_type: "text",
    content: "hello from org B",
    delivery_status: "received",
    metadata: {},
  });

  await admin.from("knowledge_base").insert({
    organization_id: orgB.id,
    title: "FAQ Org B",
    content: "conteúdo privado da org B",
  });

  return {
    userAId: userA.user.id,
    userBId: userB.user.id,
    orgAId: orgA.id,
    orgBId: orgB.id,
    contactBId: contactB.id,
    conversationBId: conversationB.id,
  };
}
