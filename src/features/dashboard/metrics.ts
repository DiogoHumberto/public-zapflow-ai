import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Indicadores do dashboard inicial (D02, specs/dashboard).
 *
 * A leitura usa o cliente SSR (sujeito a RLS): o filtro por organização vem
 * do PostgreSQL, nunca do corpo da requisição. Ver design.md (D5).
 */

export type DashboardMetrics = {
  contacts: number;
  openConversations: number;
  aiDisabledConversations: number;
  inboundMessagesLast7Days: number;
};

export type DashboardMetricsResult =
  | { ok: true; metrics: DashboardMetrics }
  | { ok: false };

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Carrega os quatro indicadores em paralelo. Retorna `ok: false` em qualquer
 * falha de consulta, para a página exibir a mensagem genérica sem vazar
 * detalhes internos (specs/dashboard, requisito de falha).
 */
export async function loadDashboardMetrics(
  supabase: SupabaseClient<Database>
): Promise<DashboardMetricsResult> {
  const inboundCutoff = new Date(Date.now() - SEVEN_DAYS_IN_MS).toISOString();

  const [contacts, openConversations, aiDisabledConversations, inboundMessages] =
    await Promise.all([
      supabase.from("contacts").select("*", { count: "exact", head: true }),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("ai_enabled", false),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("direction", "inbound")
        .gte("created_at", inboundCutoff),
    ]);

  const failed = [contacts, openConversations, aiDisabledConversations, inboundMessages].find(
    (result) => result.error !== null
  );

  if (failed?.error) {
    console.error("[dashboard] falha ao consultar indicadores:", failed.error.message);
    return { ok: false };
  }

  return {
    ok: true,
    metrics: {
      contacts: contacts.count ?? 0,
      openConversations: openConversations.count ?? 0,
      aiDisabledConversations: aiDisabledConversations.count ?? 0,
      inboundMessagesLast7Days: inboundMessages.count ?? 0,
    },
  };
}
