import { describe, expect, it } from "vitest";

import { mapMemberRpcError } from "@/features/members/service";

describe("mapMemberRpcError", () => {
  it("mapeia 'Forbidden' para FORBIDDEN com mensagem pt-BR", () => {
    const error = mapMemberRpcError({ message: "Forbidden" });
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe(
      "Você não tem permissão para gerenciar este membro."
    );
  });

  it("mapeia 'Last owner' para VALIDATION com mensagem pt-BR", () => {
    const error = mapMemberRpcError({ message: "Last owner" });
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe(
      "A organização precisa manter ao menos um proprietário."
    );
  });

  it("mapeia 'Invalid role' para VALIDATION com mensagem pt-BR", () => {
    const error = mapMemberRpcError({ message: "Invalid role" });
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe("Papel inválido. Use owner, admin ou member.");
  });

  it("mapeia 'Authentication required' para UNAUTHORIZED", () => {
    const error = mapMemberRpcError({ message: "Authentication required" });
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Sessão expirada. Faça login novamente.");
  });

  it("mapeia 'User not found' para NOT_FOUND", () => {
    const error = mapMemberRpcError({ message: "User not found" });
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Nenhuma conta encontrada para este e-mail.");
  });

  it("mapeia 'Member already exists' para VALIDATION", () => {
    const error = mapMemberRpcError({ message: "Member already exists" });
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe("Este e-mail já pertence à organização.");
  });

  it("mapeia 'User already belongs to an organization' para VALIDATION", () => {
    const error = mapMemberRpcError({
      message: "User already belongs to an organization",
    });
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe(
      "Este usuário já pertence a outra organização."
    );
  });

  it("mapeia 'Member not found' para NOT_FOUND", () => {
    const error = mapMemberRpcError({ message: "Member not found" });
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Membro não encontrado nesta organização.");
  });

  it("mapeia 'Invalid name' para VALIDATION", () => {
    const error = mapMemberRpcError({ message: "Invalid name" });
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe("O nome deve ter entre 2 e 100 caracteres.");
  });

  it("mapeia 'Invalid email' para VALIDATION", () => {
    const error = mapMemberRpcError({ message: "Invalid email" });
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe("Informe um e-mail válido.");
  });

  it("usa mensagem genérica para erros desconhecidos", () => {
    const mapped = mapMemberRpcError({ message: "permission denied" });
    expect(mapped.code).toBe("INTERNAL");
    expect(mapped.message).toBe(
      "Não foi possível concluir a operação agora. Tente novamente."
    );

    expect(mapMemberRpcError(null).code).toBe("INTERNAL");
    expect(mapMemberRpcError(undefined).code).toBe("INTERNAL");
  });
});
