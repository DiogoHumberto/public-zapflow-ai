import { describe, expect, it } from "vitest";

import { changeMemberRoleSchema } from "@/lib/validation/members";
import { updateOrganizationSchema } from "@/lib/validation/organizations";
import { updateProfileSchema } from "@/lib/validation/profile";

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  if (result.success || !result.error) return undefined;
  return result.error.issues[0]?.message;
}

describe("updateProfileSchema", () => {
  it("aceita nome válido e avatar https, aparando espaços", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "  Maria Silva  ",
      avatarUrl: "https://cdn.exemplo.com/a.png",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Maria Silva");
      expect(result.data.avatarUrl).toBe("https://cdn.exemplo.com/a.png");
    }
  });

  it("aceita avatar ausente ou vazio como null", () => {
    const empty = updateProfileSchema.safeParse({ fullName: "Ana", avatarUrl: "" });
    expect(empty.success).toBe(true);
    if (empty.success) expect(empty.data.avatarUrl).toBeNull();

    const missing = updateProfileSchema.safeParse({ fullName: "Ana" });
    expect(missing.success).toBe(true);
  });

  it("rejeita nome com menos de 2 caracteres após trim, em pt-BR", () => {
    const result = updateProfileSchema.safeParse({ fullName: "  A  " });
    expect(firstMessage(result)).toBe("O nome deve ter pelo menos 2 caracteres");
  });

  it("rejeita nome com mais de 100 caracteres, em pt-BR", () => {
    const result = updateProfileSchema.safeParse({ fullName: "a".repeat(101) });
    expect(firstMessage(result)).toBe("O nome deve ter no máximo 100 caracteres");
  });

  it("rejeita avatar que não é https", () => {
    const result = updateProfileSchema.safeParse({
      fullName: "Ana",
      avatarUrl: "http://cdn.exemplo.com/a.png",
    });
    expect(firstMessage(result)).toBe("A URL do avatar deve usar https");
  });

  it("rejeita avatar que não é URL", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Ana", avatarUrl: "não-é-url" });
    expect(firstMessage(result)).toBe("Informe uma URL válida para o avatar");
  });
});

describe("changeMemberRoleSchema", () => {
  const memberId = "7f0c1d7e-3b1a-4c55-9a77-2d8e4f1b9a10";

  it("aceita owner, admin e member", () => {
    for (const role of ["owner", "admin", "member"]) {
      expect(changeMemberRoleSchema.safeParse({ memberId, role }).success).toBe(true);
    }
  });

  it("rejeita papel fora do conjunto, em pt-BR", () => {
    const result = changeMemberRoleSchema.safeParse({ memberId, role: "superuser" });
    expect(firstMessage(result)).toBe("Papel inválido. Use owner, admin ou member");
  });

  it("rejeita memberId que não é UUID, em pt-BR", () => {
    const result = changeMemberRoleSchema.safeParse({ memberId: "123", role: "admin" });
    expect(firstMessage(result)).toBe("Identificador de membro inválido");
  });
});

describe("updateOrganizationSchema", () => {
  const valid = {
    name: "Salão Bela Vista",
    businessType: "Salão de beleza",
    email: "contato@salao.com",
    phone: "11999990000",
    timezone: "America/Sao_Paulo",
  };

  it("aceita dados válidos", () => {
    expect(updateOrganizationSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita e-mail vazio como null", () => {
    const result = updateOrganizationSchema.safeParse({ ...valid, email: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeNull();
  });

  it("rejeita nome fora do intervalo 2–100, em pt-BR", () => {
    expect(firstMessage(updateOrganizationSchema.safeParse({ ...valid, name: "A" }))).toBe(
      "O nome deve ter pelo menos 2 caracteres"
    );
    expect(
      firstMessage(updateOrganizationSchema.safeParse({ ...valid, name: "a".repeat(101) }))
    ).toBe("O nome deve ter no máximo 100 caracteres");
  });

  it("rejeita fuso horário inexistente, em pt-BR", () => {
    const result = updateOrganizationSchema.safeParse({ ...valid, timezone: "Marte/Olympus" });
    expect(firstMessage(result)).toBe(
      "Fuso horário inválido. Use um identificador IANA (ex.: America/Sao_Paulo)"
    );
  });

  it("rejeita e-mail inválido", () => {
    const result = updateOrganizationSchema.safeParse({ ...valid, email: "nao-e-email" });
    expect(firstMessage(result)).toBe("Informe um e-mail válido");
  });

  it.each([
    ["slug", "novo-slug"],
    ["status", "suspended"],
    ["id", "7f0c1d7e-3b1a-4c55-9a77-2d8e4f1b9a10"],
  ])("não aceita o campo %s", (field, value) => {
    const result = updateOrganizationSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
  });
});
