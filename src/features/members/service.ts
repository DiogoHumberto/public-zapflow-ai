import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";
import type { Database, MemberRole } from "@/types/database";

/**
 * Regras de membros, executadas pelas RPCs das migrations 004/005.
 *
 * As funções recebem o cliente Supabase (SSR em produção, cliente autenticado
 * nos testes) e traduzem os erros estáveis das RPCs para `AppError` com
 * mensagem pt-BR. Nenhuma regra de autorização vive aqui: o banco decide.
 */

export type OrganizationMember = {
  memberId: string;
  userId: string;
  fullName: string | null;
  /** NULL quando o chamador não é owner/admin. */
  email: string | null;
  role: MemberRole;
  createdAt: string;
  /** Convite ainda não confirmado (e-mail/senha pendentes). */
  invitationPending: boolean;
};

export type ListMembersResult =
  | { ok: true; members: OrganizationMember[] }
  | { ok: false; error: AppError };

export type AddMemberByEmailInput = {
  email: string;
  role: MemberRole;
};

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

/** Mapeia as mensagens estáveis das RPCs de membros para `AppError`. */
export function mapMemberRpcError(error: unknown): AppError {
  const message = extractMessage(error);

  if (message.includes("Last owner")) {
    return new AppError(
      "VALIDATION",
      "A organização precisa manter ao menos um proprietário."
    );
  }
  if (message.includes("Member already exists")) {
    return new AppError(
      "VALIDATION",
      "Este e-mail já pertence à organização."
    );
  }
  if (message.includes("User already belongs to an organization")) {
    return new AppError(
      "VALIDATION",
      "Este usuário já pertence a outra organização."
    );
  }
  if (message.includes("User not found")) {
    return new AppError(
      "NOT_FOUND",
      "Nenhuma conta encontrada para este e-mail."
    );
  }
  if (message.includes("Member not found")) {
    return new AppError(
      "NOT_FOUND",
      "Membro não encontrado nesta organização."
    );
  }
  if (message.includes("Invalid role")) {
    return new AppError(
      "VALIDATION",
      "Papel inválido. Use owner, admin ou member."
    );
  }
  if (message.includes("Invalid name")) {
    return new AppError(
      "VALIDATION",
      "O nome deve ter entre 2 e 100 caracteres."
    );
  }
  if (message.includes("Invalid email")) {
    return new AppError("VALIDATION", "Informe um e-mail válido.");
  }
  if (message.includes("Authentication required")) {
    return new AppError("UNAUTHORIZED", "Sessão expirada. Faça login novamente.");
  }
  if (message.includes("Forbidden")) {
    return new AppError(
      "FORBIDDEN",
      "Você não tem permissão para gerenciar este membro."
    );
  }

  return new AppError(
    "INTERNAL",
    "Não foi possível concluir a operação agora. Tente novamente."
  );
}

/** O tipo do banco expõe `role` como `text`; normaliza para o union do app. */
function toMemberRole(value: string): MemberRole {
  return value === "owner" || value === "admin" ? value : "member";
}

/** Lista os membros da organização do chamador (RPC filtra por tenant). */
export async function listMembers(
  supabase: SupabaseClient<Database>
): Promise<ListMembersResult> {
  const { data, error } = await supabase.rpc("list_organization_members");

  if (error) {
    return { ok: false, error: mapMemberRpcError(error) };
  }

  const members: OrganizationMember[] = (data ?? []).map((row) => ({
    memberId: row.member_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: toMemberRole(row.role),
    createdAt: row.created_at,
    invitationPending: row.invitation_pending,
  }));

  return { ok: true, members };
}

/**
 * Associa um usuário já existente à organização do chamador.
 * Falha com `NOT_FOUND` quando o e-mail ainda não tem conta — nesse caso a
 * Server Action envia o convite e repete a chamada.
 */
export async function addMemberByEmail(
  supabase: SupabaseClient<Database>,
  input: AddMemberByEmailInput
): Promise<string> {
  const { data, error } = await supabase.rpc("add_member_by_email", {
    p_email: input.email,
    p_role: input.role,
  });

  if (error) throw mapMemberRpcError(error);

  return data as string;
}

/** Altera somente o nome de um membro; lança `AppError` em caso de rejeição. */
export async function updateMemberProfile(
  supabase: SupabaseClient<Database>,
  memberId: string,
  fullName: string
): Promise<void> {
  const { error } = await supabase.rpc("update_member_profile", {
    p_member_id: memberId,
    p_full_name: fullName,
  });

  if (error) throw mapMemberRpcError(error);
}

/** Altera o papel de um membro (exclusivo de owner); lança `AppError`. */
export async function changeMemberRole(
  supabase: SupabaseClient<Database>,
  memberId: string,
  role: MemberRole
): Promise<void> {
  const { error } = await supabase.rpc("change_member_role", {
    p_member_id: memberId,
    p_new_role: role,
  });

  if (error) throw mapMemberRpcError(error);
}

/** Remove um membro; lança `AppError` em caso de rejeição. */
export async function removeMember(
  supabase: SupabaseClient<Database>,
  memberId: string
): Promise<void> {
  const { error } = await supabase.rpc("remove_member", {
    p_member_id: memberId,
  });

  if (error) throw mapMemberRpcError(error);
}
