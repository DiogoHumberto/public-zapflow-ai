import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/safe-path";

describe("safeNextPath", () => {
  it("mantém caminhos internos", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/settings/members?tab=all")).toBe(
      "/settings/members?tab=all"
    );
  });

  it("usa o fallback quando ausente", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined, "/auth/reset")).toBe("/auth/reset");
  });

  it("bloqueia redirecionamento externo", () => {
    expect(safeNextPath("https://evil.example.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.example.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example.com")).toBe("/dashboard");
  });
});
