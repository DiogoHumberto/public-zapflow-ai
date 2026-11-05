import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { loadDashboardMetrics } from "@/features/dashboard/metrics";
import type { Database } from "@/types/database";

/**
 * Simula falha da consulta. O cast é intencional: o mock cobre apenas a
 * superfície usada por `loadDashboardMetrics` (select/eq/gte).
 */
function failingClient(): SupabaseClient<Database> {
  const query = {
    eq: () => query,
    gte: () => query,
    then: (
      onFulfilled: (value: { count: number | null; error: { message: string } }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve({ count: null, error: { message: "boom" } }).then(onFulfilled, onRejected),
  };

  return {
    from: () => ({ select: () => query }),
  } as unknown as SupabaseClient<Database>;
}

describe("loadDashboardMetrics", () => {
  it("retorna ok:false quando alguma consulta falha", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await loadDashboardMetrics(failingClient());

    expect(result).toEqual({ ok: false });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
