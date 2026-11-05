import { AppError } from "@/lib/errors";

/**
 * Tradução dos erros do convite do Supabase Auth para `AppError`.
 *
 * Nenhuma mensagem interna do GoTrue/SMTP chega à UI: o convite é uma
 * operação administrativa e o gestor recebe apenas o que precisa para agir.
 */

export const INVITE_UNAVAILABLE_MESSAGE =
  "Não foi possível enviar o convite agora. Verifique a configuração de e-mail (SMTP) do Supabase e tente novamente.";

export const INVITE_ALREADY_REGISTERED_MESSAGE =
  "Este e-mail já possui uma conta. Tente adicioná-lo novamente.";

export const INVITE_RATE_LIMIT_MESSAGE =
  "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente novamente.";

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

function extractCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

function extractStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status: unknown }).status);
    return Number.isFinite(status) ? status : 0;
  }
  return 0;
}

/**
 * O GoTrue responde `email_exists`/422 quando a conta surge entre a consulta
 * da RPC e o convite (corrida). Nesse caso a Server Action repete a RPC.
 */
export function isAlreadyRegisteredError(error: unknown): boolean {
  const code = extractCode(error);
  if (code === "email_exists" || code === "user_already_exists") return true;

  const message = extractMessage(error).toLowerCase();
  return (
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}

/** Cota de e-mails do GoTrue (`over_email_send_rate_limit`, HTTP 429). */
export function isRateLimitError(error: unknown): boolean {
  const code = extractCode(error);
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return true;
  }

  return (
    extractStatus(error) === 429 ||
    extractMessage(error).toLowerCase().includes("rate limit")
  );
}

export function mapInviteError(error: unknown): AppError {
  if (isAlreadyRegisteredError(error)) {
    return new AppError("VALIDATION", INVITE_ALREADY_REGISTERED_MESSAGE);
  }

  if (isRateLimitError(error)) {
    return new AppError("INTERNAL", INVITE_RATE_LIMIT_MESSAGE);
  }

  // SMTP ausente, cota de e-mails ou falha do provedor: o detalhe fica no log
  // do servidor e a UI recebe uma instrução acionável.
  return new AppError("INTERNAL", INVITE_UNAVAILABLE_MESSAGE);
}
