/**
 * Erros tipados da aplicação.
 *
 * `AppError` carrega um código estável, útil para logs, respostas de API
 * e telemetria, sem vazar detalhes internos ao cliente.
 */

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status ?? defaultStatusFor(code);
  }
}

function defaultStatusFor(code: AppErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "VALIDATION":
      return 400;
    case "INTERNAL":
      return 500;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Extrai uma mensagem segura para exibir ao usuário. */
export function toPublicMessage(error: unknown): string {
  if (isAppError(error)) return error.message;
  return "Ocorreu um erro inesperado. Tente novamente.";
}
