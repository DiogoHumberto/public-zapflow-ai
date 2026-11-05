import { describe, expect, it } from "vitest";

import {
  addMemberSchema,
  updateMemberNameSchema,
} from "@/lib/validation/members";

function firstMessage(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) {
  if (result.success || !result.error) return undefined;
  return result.error.issues[0]?.message;
}

describe("addMemberSchema", () => {
  it("normaliza e-mail (trim + minúsculas) e aceita role member", () => {
    const result = addMemberSchema.safeParse({
      email: "  Novo.Membro@Exemplo.com ",
      role: "member",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("novo.membro@exemplo.com");
      expect(result.data.fullName).toBeNull();
      expect(result.data.role).toBe("member");
    }
  });

  it("aceita nome opcional válido e o mantém aparado", () => {
    const result = addMemberSchema.safeParse({
      email: "novo@exemplo.com",
      fullName: "  Maria Silva  ",
      role: "admin",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe("Maria Silva");
  });

  it("aceita nome vazio como nulo", () => {
    const result = addMemberSchema.safeParse({
      email: "novo@exemplo.com",
      fullName: "",
      role: "member",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBeNull();
  });

  it("rejeita e-mail inválido em pt-BR", () => {
    const result = addMemberSchema.safeParse({
      email: "sem-arroba",
      role: "member",
    });

    expect(firstMessage(result)).toBe("Informe um e-mail válido");
  });

  it("rejeita nome com menos de 2 caracteres após trim", () => {
    const result = addMemberSchema.safeParse({
      email: "novo@exemplo.com",
      fullName: " A ",
      role: "member",
    });

    expect(firstMessage(result)).toBe("O nome deve ter entre 2 e 100 caracteres");
  });

  it("rejeita nome com mais de 100 caracteres", () => {
    const result = addMemberSchema.safeParse({
      email: "novo@exemplo.com",
      fullName: "a".repeat(101),
      role: "member",
    });

    expect(firstMessage(result)).toBe("O nome deve ter entre 2 e 100 caracteres");
  });

  it("não aceita owner na criação (só member/admin)", () => {
    const result = addMemberSchema.safeParse({
      email: "novo@exemplo.com",
      role: "owner",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateMemberNameSchema", () => {
  const memberId = "11111111-1111-4111-8111-111111111111";

  it("aceita nome válido e apara espaços", () => {
    const result = updateMemberNameSchema.safeParse({
      memberId,
      fullName: "  João Pedro  ",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe("João Pedro");
  });

  it("rejeita identificador que não é UUID", () => {
    const result = updateMemberNameSchema.safeParse({
      memberId: "abc",
      fullName: "João",
    });

    expect(firstMessage(result)).toBe("Identificador de membro inválido");
  });

  it("rejeita nome curto e nome longo em pt-BR", () => {
    const short = updateMemberNameSchema.safeParse({
      memberId,
      fullName: " A ",
    });
    expect(firstMessage(short)).toBe("O nome deve ter entre 2 e 100 caracteres");

    const long = updateMemberNameSchema.safeParse({
      memberId,
      fullName: "a".repeat(101),
    });
    expect(firstMessage(long)).toBe("O nome deve ter entre 2 e 100 caracteres");
  });
});
