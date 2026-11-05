import type { SupabaseClient } from "@supabase/supabase-js";

import { isAppError } from "@/lib/errors";
import type { Database, MemberRole } from "@/types/database";

import { isAlreadyRegisteredError, mapInviteError } from "./invite-errors";
import { addMemberByEmail } from "./service";

/**
 * Fluxo "adicionar membro" (design §3), separado da Server Action para ser
 * testável sem `cookies()`/`next/headers`.
 *
 * 1. tenta associar um usuário já existente;
 * 2. se a conta não existe, convida pelo Supabase Auth;
 * 3. repete a associação com o usuário recém-criado;
 * 4. se a associação final falhar, remove a conta convidada (compensação).
 */

export type AddMemberWithInviteInput = {
  email: string;
  fullName: string | null;
  role: MemberRole;
};

export type InviteMemberFn = (
  input: { email: string; fullName: string | null }
) => Promise<{ userId: string }>;

export type RemoveInvitedUserFn = (userId: string) => Promise<void>;

export type AddMemberWithInviteResult = {
  memberId: string;
  invited: boolean;
};

function isUserNotFound(error: unknown): boolean {
  return isAppError(error) && error.code === "NOT_FOUND";
}

export async function addMemberWithInvite({
  supabase,
  input,
  invite,
  removeInvitedUser,
}: {
  supabase: SupabaseClient<Database>;
  input: AddMemberWithInviteInput;
  invite: InviteMemberFn;
  removeInvitedUser: RemoveInvitedUserFn;
}): Promise<AddMemberWithInviteResult> {
  const membershipInput = { email: input.email, role: input.role };

  try {
    const memberId = await addMemberByEmail(supabase, membershipInput);
    return { memberId, invited: false };
  } catch (error) {
    // "User not found" = ainda não há conta; qualquer outro erro (permissão,
    // outra organização, membro já existente) encerra o fluxo sem convite.
    if (!isUserNotFound(error)) throw error;
  }

  let invitedUserId: string;

  try {
    const invited = await invite({
      email: input.email,
      fullName: input.fullName,
    });
    invitedUserId = invited.userId;
  } catch (error) {
    // Corrida: a conta foi criada entre a RPC e o convite. Tenta associar.
    if (isAlreadyRegisteredError(error)) {
      const memberId = await addMemberByEmail(supabase, membershipInput);
      return { memberId, invited: false };
    }
    // Erros já traduzidos (ex.: service role ausente) mantêm a mensagem
    // acionável; detalhes crus do GoTrue/SMTP são mapeados aqui.
    if (isAppError(error)) throw error;
    throw mapInviteError(error);
  }

  try {
    const memberId = await addMemberByEmail(supabase, membershipInput);
    return { memberId, invited: true };
  } catch (error) {
    await removeInvitedUser(invitedUserId).catch((compensationError: unknown) => {
      console.error(
        "[members] falha ao remover convite órfão",
        compensationError
      );
    });
    throw error;
  }
}
