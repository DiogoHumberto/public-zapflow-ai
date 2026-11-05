import { Suspense } from "react";

import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { loadDashboardMetrics } from "@/features/dashboard/metrics";
import { requireOrganization } from "@/lib/auth";
import { logout } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard — ZapFlow AI" };

/**
 * Nome da organização (request time). Fica isolado em `<Suspense>` para que a
 * casca da página continue estática e a navegação seja instantânea — com
 * Cache Components, I/O no corpo da página quebra o prerender
 * (`blocking-prerender-dynamic`).
 */
async function OrganizationName() {
  const org = await requireOrganization();
  return <>{org.name}</>;
}

/** Indicadores (D02): consulta dinâmica, sempre atrás de `<Suspense>`. */
async function DashboardMetrics() {
  // Guard de sessão/organização do layout já redireciona antes daqui; a
  // chamada garante o tipo da organização para a consulta.
  await requireOrganization();
  const supabase = await createClient();
  const metrics = await loadDashboardMetrics(supabase);

  if (!metrics.ok) {
    return (
      <p
        role="status"
        className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        Indicadores indisponíveis no momento. Tente novamente em alguns
        instantes.
      </p>
    );
  }

  return <MetricsGrid metrics={metrics.metrics} />;
}

/** Placeholder dos cartões exibido enquanto os indicadores não chegam. */
function MetricsGridSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            <Suspense
              fallback={
                <span className="inline-block h-6 w-40 animate-pulse rounded bg-zinc-200 align-middle dark:bg-zinc-800" />
              }
            >
              <OrganizationName />
            </Suspense>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Painel de atendimento
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sair
          </button>
        </form>
      </header>

      <main className="flex-1 py-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Visão geral
        </h2>

        <Suspense fallback={<MetricsGridSkeleton />}>
          <DashboardMetrics />
        </Suspense>
      </main>
    </div>
  );
}
