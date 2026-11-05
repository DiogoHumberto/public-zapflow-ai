"use server";

import { revalidatePath } from "next/cache";

import { AppError, toPublicMessage } from "@/lib/errors";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validation/profile";

/**
 * Server Actions do perfil do usuário autenticado (D04).
 * A autorização de linha é da RLS (`Users update own profile`) e a de coluna
 * vem dos grants da migration 004 — a action nunca envia `id` nem `created_at`.
 */

export type ProfileActionState =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | null;

/** Mapeia erros do PostgREST para mensagens pt-BR seguras. */
function mapProfileError(error: unknown): AppError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  // 42501 = insufficient_privilege (coluna protegida ou RLS).
  if (code === "42501") {
    return new AppError(
      "FORBIDDEN",
      "Você não tem permissão para alterar esses dados do perfil."
    );
  }

  return new AppError(
    "INTERNAL",
    "Não foi possível salvar o perfil agora. Tente novamente."
  );
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await getUser();
  if (!user) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    avatarUrl: formData.get("avatarUrl") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl ?? null,
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: toPublicMessage(mapProfileError(error)) };
  }

  // Recarrega o formulário com os valores persistidos.
  revalidatePath("/settings");

  return { status: "success", message: "Perfil atualizado com sucesso." };
}
