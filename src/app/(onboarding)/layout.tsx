import { redirect } from "next/navigation";

import { getCurrentOrganization, requireUser } from "@/lib/auth";

/**
 * Layout do onboarding da organização.
 *
 * Separado de `(dashboard)` de propósito: o guard de organização precisa
 * remontar ao entrar/sair desta área. Compartilhar o mesmo layout fazia o
 * redirect de `/dashboard` ser reaproveitado pelo router em `/onboarding`
 * (Partial Rendering), gerando loop de navegação.
 *
 * `instant = false` permite que o segmento bloqueie até a sessão/organização
 * resolver, evitando a casca vazia antes do redirect.
 */
export const instant = false;

export default async function OnboardingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  // Quem já tem organização não passa pelo onboarding.
  const org = await getCurrentOrganization();
  if (org) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
