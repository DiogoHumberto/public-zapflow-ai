import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentOrganization, requireUser } from "@/lib/auth";

/**
 * Layout da área autenticada com organização.
 *
 * Guard server-side autoritativo:
 *  - sem sessão → /login
 *  - sem organização → /onboarding
 *
 * `instant = false` permite que o segmento bloqueie a resposta até o guard
 * resolver. O redirect acontece ANTES de qualquer streaming (status 307), o
 * que evita o loop de navegação que ocorria quando o layout compartilhava o
 * mesmo segmento de `/onboarding` e o redirect era transmitido depois da
 * casca estática (Partial Rendering reaproveitava o payload do layout).
 *
 * `/onboarding` vive em outro route group e tem o seu próprio guard, então a
 * navegação entre as duas áreas sempre remonta o layout correto.
 */
export const instant = false;

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  const org = await getCurrentOrganization();
  if (!org) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar organizationName={org.name} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
