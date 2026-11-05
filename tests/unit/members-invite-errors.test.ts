import { describe, expect, it } from "vitest";

import {
  INVITE_ALREADY_REGISTERED_MESSAGE,
  INVITE_RATE_LIMIT_MESSAGE,
  INVITE_UNAVAILABLE_MESSAGE,
  isAlreadyRegisteredError,
  isRateLimitError,
  mapInviteError,
} from "@/features/members/invite-errors";

describe("isAlreadyRegisteredError", () => {
  it("reconhece o código email_exists do GoTrue", () => {
    expect(
      isAlreadyRegisteredError({
        code: "email_exists",
        message: "A user with this email address has already been registered",
      })
    ).toBe(true);
  });

  it("reconhece a mensagem em inglês do GoTrue", () => {
    expect(
      isAlreadyRegisteredError({
        message: "A user with this email address has already been registered",
      })
    ).toBe(true);
  });

  it("não confunde falha de SMTP com conta existente", () => {
    expect(
      isAlreadyRegisteredError({
        code: "unexpected_failure",
        message: "Error sending invite email: connect ECONNREFUSED",
      })
    ).toBe(false);
  });
});

describe("mapInviteError", () => {
  it("mapeia conta já cadastrada para VALIDATION", () => {
    const error = mapInviteError({
      code: "email_exists",
      message: "A user with this email address has already been registered",
    });

    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe(INVITE_ALREADY_REGISTERED_MESSAGE);
  });

  it("mapeia cota de e-mails do GoTrue para a mensagem de limite", () => {
    const error = mapInviteError({
      code: "over_email_send_rate_limit",
      status: 429,
      message: "Email rate limit exceeded",
    });

    expect(error.code).toBe("INTERNAL");
    expect(error.message).toBe(INVITE_RATE_LIMIT_MESSAGE);
  });

  it("mapeia falha de SMTP para INTERNAL com mensagem acionável", () => {
    const error = mapInviteError({
      code: "unexpected_failure",
      message: "Error sending invite email: smtp.internal:587 ECONNREFUSED",
    });

    expect(error.code).toBe("INTERNAL");
    expect(error.message).toBe(INVITE_UNAVAILABLE_MESSAGE);
  });

  it("não vaza detalhes internos do Supabase/SMTP", () => {
    const error = mapInviteError(
      new Error("host=smtp.interno.local port=587 token=segredo")
    );

    expect(error.message).not.toContain("smtp");
    expect(error.message).not.toContain("segredo");
    expect(error.message).toBe(INVITE_UNAVAILABLE_MESSAGE);
  });

  it("trata erro desconhecido com a mensagem genérica de convite", () => {
    const error = mapInviteError(undefined);

    expect(error.code).toBe("INTERNAL");
    expect(error.message).toBe(INVITE_UNAVAILABLE_MESSAGE);
  });
});

describe("isRateLimitError", () => {
  it("reconhece o código over_email_send_rate_limit", () => {
    expect(isRateLimitError({ code: "over_email_send_rate_limit" })).toBe(true);
  });

  it("reconhece HTTP 429 sem código explícito", () => {
    expect(isRateLimitError({ status: 429, message: "too many" })).toBe(true);
  });

  it("não confunde falha de SMTP com limite de envio", () => {
    expect(
      isRateLimitError({
        code: "unexpected_failure",
        status: 500,
        message: "Error sending invite email: connect ECONNREFUSED",
      })
    ).toBe(false);
  });
});
