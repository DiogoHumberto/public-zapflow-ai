import { CreateOrganizationForm } from "@/features/organizations/create-organization-form";

export const metadata = { title: "Criar empresa — ZapFlow AI" };

/**
 * Onboarding da organização.
 *
 * Sessão e ausência de organização são garantidas pelo layout de
 * `(onboarding)` — esta página não faz I/O de propósito, para permanecer uma
 * casca estática. Quem já tem organização é redirecionado ao dashboard pelo
 * mesmo guard.
 */
export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Crie sua empresa
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Para começar a usar o ZapFlow AI, cadastre os dados do seu negócio.
        </p>
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
