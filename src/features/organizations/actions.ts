"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { AppError, toPublicMessage } from "@/lib/errors";
import { getCurrentOrganization } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from "@/lib/validation/organizations";

/**
 * Server Actions do onboarding da organização.
 * A criação é SEMPRE via RPC `create_organization()` (migration 003) —
 * nunca por inserção direta — para garantir membership owner + assinatura
 * trialing atômicos.
 */

export type OrganizationActionState = { error?: string } | null;

/** Mapeia erros da RPC (PostgrestError) para mensagens pt-BR seguras. */
function mapOrganizationRpcError(error: unknown): AppError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "";

  if (message.includes("User already belongs to an organization")) {
    return new AppError(
      "VALIDATION",
      "Você já pertence a uma organização. No momento, cada usuário pode ter apenas uma."
    );
  }
  if (message.includes("Invalid organization name")) {
    return new AppError("VALIDATION", "Nome da empresa inválido.");
  }
  if (message.includes("Invalid organization slug")) {
    return new AppError(
      "VALIDATION",
      "Slug inválido: use 3–50 caracteres entre letras minúsculas, números e hífens."
    );
  }
  if (message.includes("Authentication required")) {
    return new AppError("UNAUTHORIZED", "Sessão expirada. Faça login novamente.");
  }
  if (message.includes("duplicate key") || message.includes("organizations_slug_key")) {
    return new AppError("VALIDATION", "Este slug já está em uso. Escolha outro.");
  }
  return new AppError(
    "INTERNAL",
    "Não foi possível criar a empresa agora. Tente novamente."
  );
}

export async function createOrganization(
  _prev: OrganizationActionState,
  formData: FormData
): Promise<OrganizationActionState> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    businessType: formData.get("businessType") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_business_type: parsed.data.businessType ?? null,
  });

  if (error || !orgId) {
    const mapped = mapOrganizationRpcError(error);
    return { error: toPublicMessage(mapped) };
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Edição dos dados cadastrais (D03)
// ---------------------------------------------------------------------------

export type UpdateOrganizationActionState =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | null;

/** Mapeia erros do PostgREST para mensagens pt-BR seguras. */
function mapUpdateOrganizationError(error: unknown): AppError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  // 42501 = insufficient_privilege (coluna protegida ou RLS).
  if (code === "42501") {
    return new AppError(
      "FORBIDDEN",
      "Você não tem permissão para editar os dados da empresa."
    );
  }

  return new AppError(
    "INTERNAL",
    "Não foi possível salvar os dados da empresa agora. Tente novamente."
  );
}

/**
 * Atualiza os dados cadastrais da própria organização (specs/organizations).
 *
 * Usa o cliente SSR: a RLS (`Admins update organizations`) e os grants por
 * coluna da migration 004 são a barreira real. `slug`, `status` e `id` não
 * existem no schema — `updateOrganizationSchema` é `strict` e os rejeita.
 */
export async function updateOrganization(
  _prev: UpdateOrganizationActionState,
  formData: FormData
): Promise<UpdateOrganizationActionState> {
  const org = await getCurrentOrganization();
  if (!org) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name") ?? "",
    businessType: formData.get("businessType") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    timezone: formData.get("timezone") ?? org.timezone,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      business_type: parsed.data.businessType || null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone || null,
      timezone: parsed.data.timezone,
    })
    .eq("id", org.id)
    .select("id");

  if (error) {
    return {
      status: "error",
      message: toPublicMessage(mapUpdateOrganizationError(error)),
    };
  }

  // RLS de UPDATE filtra a linha (member não é admin): zero linhas, sem erro.
  if (!data || data.length === 0) {
    return {
      status: "error",
      message: "Você não tem permissão para editar os dados da empresa.",
    };
  }

  revalidatePath("/settings/organization");
  revalidatePath("/dashboard");

  return { status: "success", message: "Dados da empresa atualizados." };
}
