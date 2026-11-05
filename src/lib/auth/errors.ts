import { AuthError } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";

/**
 * Converte erros do Supabase Auth em `AppError` com mensagens pt-BR
 * seguras para exibição — sem vazar detalhes internos nem permitir
 * enumeração de contas (mensagens genéricas para credenciais inválidas
 * e recuperação de senha).
 */
export function mapAuthError(error: unknown): AppError {
  if (error instanceof AuthError) {
    switch (error.code) {
      case "invalid_credentials":
      case "email_not_confirmed":
        return new AppError("UNAUTHORIZED", "E-mail ou senha incorretos.");
      case "user_already_exists":
        return new AppError("VALIDATION", "Não foi possível concluir o cadastro com os dados informados.");
      case "weak_password":
        return new AppError("VALIDATION", "A senha não atende aos requisitos mínimos de segurança.");
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return new AppError("VALIDATION", "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      default:
        return new AppError("INTERNAL", "Não foi possível concluir a autenticação. Tente novamente.");
    }
  }
  if (error instanceof AppError) return error;
  return new AppError("INTERNAL", "Ocorreu um erro inesperado. Tente novamente.");
}
