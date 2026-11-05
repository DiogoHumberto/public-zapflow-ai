import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/safe-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de confirmação de e-mail do Supabase Auth (fluxo PKCE).
 * Troca o `code` do link por uma sessão e redireciona ao destino
 * (o guard do layout leva ao onboarding quando não há organização).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Código ausente/inválido/expirado — volta ao login com aviso.
  return NextResponse.redirect(`${origin}/login?error=link-invalido`);
}
