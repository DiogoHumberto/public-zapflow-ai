import type { DashboardMetrics } from "@/features/dashboard/metrics";

/**
 * Cartões de indicadores do dashboard (D02). Componente puramente
 * apresentacional: as contagens chegam prontas do Server Component.
 */

const CARDS: readonly {
  key: keyof DashboardMetrics;
  label: string;
  hint: string;
}[] = [
  { key: "contacts", label: "Contatos", hint: "Total de contatos cadastrados" },
  { key: "openConversations", label: "Conversas abertas", hint: "Atendimentos em andamento" },
  {
    key: "aiDisabledConversations",
    label: "IA desativada",
    hint: "Conversas com atendimento humano",
  },
  {
    key: "inboundMessagesLast7Days",
    label: "Mensagens recebidas",
    hint: "Últimos 7 dias",
  },
];

export function MetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, label, hint }) => (
        <div
          key={key}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </dt>
          <dd className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {metrics[key]}
          </dd>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
        </div>
      ))}
    </dl>
  );
}
