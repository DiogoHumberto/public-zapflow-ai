"use server";

import { redirect } from "next/navigation";

import { mapAuthError } from "@/lib/auth/errors";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

/**
 * Server Actions de autenticação. Retornam `{ error }` para o formulário
 * ou redirecionam em caso de sucesso. Nunca vazam detalhes internos
 * (mensagens genéricas — anti-enumeração).
 */

export type AuthActionState = { error?: string; success?: string } | null;

export async function register(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const env = getPublicEnv();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: mapAuthError(error).message };
  }

  // Sem confirmação de e-mail (padrão no ambiente local), o `signUp` já cria a
  // sessão. Nesse caso o usuário entra direto no onboarding; com confirmação
  // habilitada, `session` vem nulo e ele precisa abrir o link enviado.
  if (data.session) {
    redirect("/onboarding");
  }

  return {
    success:
      "Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme para acessar.",
  };
}

export async function login(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: mapAuthError(error).message };
  }

  // Com organização → dashboard; sem organização → onboarding.
  const { data: orgId } = await supabase.rpc("current_organization_id");
  redirect(orgId ? "/dashboard" : "/onboarding");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const env = getPublicEnv();
  const supabase = await createClient();

  // Resposta idêntica independente do e-mail existir (anti-enumeração).
  // O link passa pelo callback (troca o code por sessão) e segue ao reset.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset`,
  });

  return {
    success:
      "Se houver uma conta com este e-mail, enviamos um link de recuperação.",
  };
}

export async function resetPassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: mapAuthError(error).message };
  }

  redirect("/login");
}
