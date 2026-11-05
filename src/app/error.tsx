"use client";

import { useEffect } from "react";

/**
 * Error boundary de rota (App Router).
 * Captura erros de renderização em segmentos abaixo da raiz.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: enviar para observabilidade (Sentry etc.) em épico futuro.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Algo deu errado
      </h2>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Ocorreu um erro inesperado ao carregar esta página. Você pode tentar
        novamente.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Tentar novamente
      </button>
    </div>
  );
}
