import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/safe-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirmação de token de e-mail no servidor (`token_hash`).
 *
 * Usado pelo template de convite (`supabase/templates/invite.html`): o link
 * aponta para `/auth/confirm?token_hash=...&type=invite&next=/auth/reset`.
 * Diferente de `/auth/callback` (PKCE, exige o mesmo navegador que iniciou o
 * fluxo), este endpoint funciona em qualquer dispositivo, pois valida o token
 * diretamente no GoTrue e grava a sessão nos cookies.
 */

const ALLOWED_TYPES: readonly EmailOtpType[] = [
  "invite",
  "signup",
  "recovery",
  "email_change",
  "magiclink",
  "email",
];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[auth] falha ao verificar token de e-mail", {
      type,
      code: error.code,
      status: error.status,
    });
  }

  // Token ausente/inválido/expirado — volta ao login com aviso.
  return NextResponse.redirect(`${origin}/login?error=link-invalido`);
}
