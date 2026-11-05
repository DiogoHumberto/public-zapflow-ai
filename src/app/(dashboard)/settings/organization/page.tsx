import Link from "next/link";
import { Suspense } from "react";

import { EditOrganizationForm } from "@/features/organizations/edit-organization-form";
import { getCurrentMemberRole, requireOrganization } from "@/lib/auth";

export const metadata = { title: "Dados da empresa — ZapFlow AI" };

/**
 * Dados cadastrais da empresa (D03).
 *
 * Casca estática + `<Suspense>`: organização e papel vêm da requisição, e I/O
 * no corpo da página quebraria o prerender com Cache Components (Next 16).
 * A visibilidade do formulário é só UI — a RLS e os grants por coluna
 * (migration 004) são a barreira real.
 */

function OrganizationFormSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        </div>
      ))}
      <div className="mt-2 h-10 w-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function OrganizationSection() {
  const org = await requireOrganization();
  const role = await getCurrentMemberRole();
  const canEdit = role === "owner" || role === "admin";

  if (!canEdit) {
    const rows: [string, string][] = [
      ["Nome", org.name],
      ["Tipo de negócio", org.business_type ?? "—"],
      ["E-mail", org.email ?? "—"],
      ["Telefone", org.phone ?? "—"],
      ["Fuso horário", org.timezone],
    ];

    return (
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {label}
              </dt>
              <dd className="text-sm text-zinc-900 dark:text-zinc-50">{value}</dd>
            </div>
          ))}
        </dl>
        <p
          role="status"
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          Somente owners e admins podem editar os dados da empresa.
        </p>
      </div>
    );
  }

  return (
    <EditOrganizationForm
      defaultName={org.name}
      defaultBusinessType={org.business_type ?? ""}
      defaultEmail={org.email ?? ""}
      defaultPhone={org.phone ?? ""}
      defaultTimezone={org.timezone}
    />
  );
}

export default function OrganizationSettingsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
      <header className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link
          href="/settings"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Configurações
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dados da empresa
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Informações usadas nos atendimentos da sua organização
        </p>
      </header>

      <main className="flex-1 py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <Suspense fallback={<OrganizationFormSkeleton />}>
            <OrganizationSection />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
