import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/**
 * Endpoints que trocam token por sessão. Nunca são "páginas de auth": mesmo
 * com sessão ativa precisam executar (ex.: convite aberto por quem já está
 * logado em outra conta).
 */
const AUTH_CALLBACK_PATHS = ["/auth/callback", "/auth/confirm"];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

function isAuthCallback(pathname: string): boolean {
  return AUTH_CALLBACK_PATHS.some((path) => pathname.startsWith(path));
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/webhooks") ||
    isAuthPage(pathname) ||
    isAuthCallback(pathname)
  );
}

/**
 * Atualiza a sessão do Supabase no Proxy (antigo middleware).
 *
 * Executado em TODA requisição (exceto assets estáticos). Refresha o token
 * e regrava os cookies de auth tanto na requisição quanto na resposta.
 *
 * Redirects grossos aplicados aqui (a verificação autoritativa continua
 * no servidor — `requireUser`/`requireOrganization`):
 *   1. Autenticado acessando rota de auth → /dashboard
 *   2. Anônimo acessando rota protegida → /login
 *
 * Este é o padrão oficial Supabase + Next 16 (Proxy).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Importante: não remover — força o refresh do token entre request/response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Autenticado acessando página de auth → dashboard
  if (user && isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 2. Anônimo acessando rota protegida → login
  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
