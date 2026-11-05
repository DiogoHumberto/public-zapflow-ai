import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy do Next 16 (antigo "middleware").
 * Roda antes de cada requisição para manter a sessão Supabase atualizada.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas as rotas exceto assets estáticos e imagens.
     * Ajuste conforme novas rotas públicas surgirem.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
