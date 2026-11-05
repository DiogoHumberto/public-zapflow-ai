"use client";

/**
 * Error boundary raiz. Substitui o layout inteiro em falhas catastróficas.
 * DEVE incluir <html> e <body> (convenção do App Router).
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Algo deu errado</h2>
        <p>Ocorreu um erro inesperado. Tente novamente.</p>
        <button
          onClick={reset}
          style={{
            borderRadius: "9999px",
            background: "#18181b",
            color: "#fff",
            padding: "0.625rem 1.25rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
