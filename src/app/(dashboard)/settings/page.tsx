import Link from "next/link";
import { Suspense } from "react";

import { ProfileForm } from "@/features/profile/profile-form";
import { getCurrentProfile } from "@/features/profile/queries";

export const metadata = { title: "Configurações — ZapFlow AI" };

/**
 * Configurações da conta (D04).
 *
 * Casca estática + `<Suspense>`: a leitura do perfil depende da requisição e,
 * com Cache Components (Next 16), I/O no corpo da página quebraria o prerender
 * (`blocking-prerender-dynamic`). O guard de sessão/organização fica no layout
 * de `(dashboard)`.
 */

/** Campos do formulário enquanto o perfil não chega. */
function ProfileFormSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        </div>
      ))}
      <div className="mt-2 h-10 w-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function ProfileSection() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <p
        role="status"
        className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        Perfil indisponível no momento. Tente novamente em alguns instantes.
      </p>
    );
  }

  return (
    <ProfileForm
      defaultFullName={profile.full_name ?? ""}
      defaultAvatarUrl={profile.avatar_url ?? ""}
    />
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
      <header className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Configurações
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Seus dados de conta e da empresa
        </p>
      </header>

      <main className="flex-1 py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Perfil
          </h2>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            Nome e avatar exibidos para os membros da sua organização.
          </p>

          <Suspense fallback={<ProfileFormSkeleton />}>
            <ProfileSection />
          </Suspense>
        </section>

        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Empresa
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Nome, contato e fuso horário usados no atendimento.
          </p>
          <Link
            href="/settings/organization"
            className="inline-flex h-10 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Editar dados da empresa
          </Link>
        </section>

        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Membros
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Adicione, edite e remova membros. Proprietários definem papéis;
            administradores gerenciam apenas membros comuns.
          </p>
          <Link
            href="/settings/members"
            className="inline-flex h-10 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Gerenciar membros
          </Link>
        </section>
      </main>
    </div>
  );
}
