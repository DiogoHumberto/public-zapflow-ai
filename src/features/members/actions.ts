"use server";

import { revalidatePath } from "next/cache";

import { getCurrentMemberRole } from "@/lib/auth";
import { AppError, toPublicMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  addMemberSchema,
  changeMemberRoleSchema,
  removeMemberSchema,
  updateMemberNameSchema,
} from "@/lib/validation/members";
import {
  inviteUserByEmail,
  removeInvitedUser,
} from "@/server/integrations/supabase-auth/invite";

import { addMemberWithInvite } from "./add-member";
import {
  changeMemberRole,
  removeMember,
  updateMemberProfile,
} from "./service";

/**
 * Server Actions da gestão de membros (D05 + CRUD).
 *
 * A hierarquia é sempre revalidada aqui e, principalmente, na RPC
 * `security definer` (migration 005) — a ocultação na UI não é proteção.
 * `revalidatePath` mantém a listagem e a tela de edição atualizadas.
 */

export type MemberActionState =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | null;

/** Confirma no servidor que o chamador pode gerenciar membros. */
async function requireManager(): Promise<"owner" | "admin"> {
  const role = await getCurrentMemberRole();

  if (role === "owner" || role === "admin") return role;

  throw role === null
    ? new AppError("UNAUTHORIZED", "Sessão expirada. Faça login novamente.")
    : new AppError(
        "FORBIDDEN",
        "Você não tem permissão para gerenciar membros."
      );
}

export async function addMemberAction(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const parsed = addMemberSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName") ?? "",
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    const callerRole = await requireManager();

    if (callerRole === "admin" && parsed.data.role !== "member") {
      throw new AppError(
        "FORBIDDEN",
        "Administradores só podem adicionar membros com papel Membro."
      );
    }

    const supabase = await createClient();
    const result = await addMemberWithInvite({
      supabase,
      input: parsed.data,
      invite: inviteUserByEmail,
      removeInvitedUser,
    });

    revalidatePath("/settings/members");

    // Nome informado para uma conta já existente: o convite usa metadata,
    // mas quem já tem perfil precisa da RPC de edição.
    if (parsed.data.fullName && !result.invited) {
      try {
        await updateMemberProfile(
          supabase,
          result.memberId,
          parsed.data.fullName
        );
        revalidatePath(`/settings/members/${result.memberId}`);
      } catch {
        return {
          status: "success",
          message:
            "Membro adicionado, mas não foi possível atualizar o nome. Edite o membro para tentar novamente.",
        };
      }
    }

    return {
      status: "success",
      message: result.invited
        ? "Convite enviado. O membro ficará pendente até aceitar e definir a senha."
        : "Membro adicionado à organização.",
    };
  } catch (error) {
    return { status: "error", message: toPublicMessage(error) };
  }
}

export async function updateMemberAction(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const parsed = updateMemberNameSchema.safeParse({
    memberId: formData.get("memberId"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await requireManager();
    const supabase = await createClient();
    await updateMemberProfile(
      supabase,
      parsed.data.memberId,
      parsed.data.fullName
    );
  } catch (error) {
    return { status: "error", message: toPublicMessage(error) };
  }

  revalidatePath("/settings/members");
  revalidatePath(`/settings/members/${parsed.data.memberId}`);
  return { status: "success", message: "Nome do membro atualizado." };
}

export async function changeMemberRoleAction(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const parsed = changeMemberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    const callerRole = await requireManager();

    if (callerRole !== "owner") {
      throw new AppError(
        "FORBIDDEN",
        "Somente o proprietário pode alterar papéis."
      );
    }

    const supabase = await createClient();
    await changeMemberRole(supabase, parsed.data.memberId, parsed.data.role);
  } catch (error) {
    return { status: "error", message: toPublicMessage(error) };
  }

  revalidatePath("/settings/members");
  return { status: "success", message: "Papel atualizado." };
}

export async function removeMemberAction(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const parsed = removeMemberSchema.safeParse({
    memberId: formData.get("memberId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await requireManager();
    const supabase = await createClient();
    await removeMember(supabase, parsed.data.memberId);
  } catch (error) {
    return { status: "error", message: toPublicMessage(error) };
  }

  revalidatePath("/settings/members");
  return { status: "success", message: "Membro removido." };
}
