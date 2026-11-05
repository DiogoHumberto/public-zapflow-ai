import "server-only";

import { AppError } from "@/lib/errors";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

import { mapInviteError } from "@/features/members/invite-errors";

/**
 * Convite de membro via Supabase Auth (`inviteUserByEmail`).
 *
 * Único uso autorizado do cliente admin neste fluxo: criar a conta e enviar o
 * link de definição de senha. O membership NUNCA é escrito com service role —
 * isso continua sendo feito pelas RPCs autenticadas (migration 005).
 *
 * O e-mail de convite aponta para `/auth/confirm` (ver
 * `supabase/templates/invite.html`): o token é verificado no servidor com
 * `verifyOtp`, o que funciona em qualquer navegador/dispositivo.
 */

const MISSING_SERVICE_ROLE_MESSAGE =
  "Convites estão indisponíveis: configure SUPABASE_SERVICE_ROLE_KEY no servidor.";

export type InviteUserInput = {
  email: string;
  fullName: string | null;
};

export type InvitedUser = {
  userId: string;
};

export async function inviteUserByEmail(
  input: InviteUserInput
): Promise<InvitedUser> {
  const server = getServerEnv();

  if (!server.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError("INTERNAL", MISSING_SERVICE_ROLE_MESSAGE);
  }

  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const redirectTo = `${appUrl}/auth/confirm`;

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (error) {
    console.error(
      "[members] cliente admin indisponível para convite",
      error
    );
    throw new AppError("INTERNAL", MISSING_SERVICE_ROLE_MESSAGE);
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: input.fullName ? { full_name: input.fullName } : {},
    redirectTo,
  });

  if (error || !data?.user) {
    // O mapeador devolve uma mensagem acionável para a UI; o detalhe do
    // GoTrue/SMTP precisa ficar no log para diagnóstico.
    console.error("[members] falha no convite do Supabase Auth", {
      email: input.email,
      code: (error as { code?: string } | null)?.code,
      status: (error as { status?: number } | null)?.status,
      message: error?.message,
    });
    throw mapInviteError(error);
  }

  return { userId: data.user.id };
}

/**
 * Compensação best-effort: remove a conta recém-convidada quando a associação
 * à organização falha, para não deixar convite órfão.
 */
export async function removeInvitedUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    throw new AppError(
      "INTERNAL",
      "Não foi possível desfazer o convite. Remova o membro pendente manualmente."
    );
  }
}
