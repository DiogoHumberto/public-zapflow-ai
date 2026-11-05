import { z } from "zod";

/**
 * Validação centralizada de variáveis de ambiente.
 *
 * - `publicEnv`: expostas ao navegador (prefixo NEXT_PUBLIC_). Validadas
 *   em qualquer contexto e seguras para importar em Client Components.
 * - `serverEnv`: segredos SERVER-ONLY. Nunca importar em Client Components.
 *
 * Falha rápida (fail-fast) com mensagem clara quando algo obrigatório falta.
 * Elimina o uso de `process.env.X!` espalhado pelo código.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY vazia"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

/**
 * Segredo opcional: linha `CHAVE=` no `.env.local` equivale a "não configurado".
 * Sem isso, um valor vazio falha no `min(1)` e derruba `getServerEnv()`, mascarando
 * o erro real (ex.: convite falhando com mensagem genérica de SMTP).
 */
const optionalSecret = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional()
);

const serverSchema = z.object({
  // Service Role ignora RLS — usar somente no servidor.
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  // Épico 5 — IA.
  OPENAI_API_KEY: optionalSecret,
  // Épico 4 — WhatsApp Cloud API.
  WHATSAPP_ACCESS_TOKEN: optionalSecret,
  WHATSAPP_VERIFY_TOKEN: optionalSecret,
  WHATSAPP_APP_SECRET: optionalSecret,
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let cachedPublic: PublicEnv | undefined;
let cachedServer: ServerEnv | undefined;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

/** Variáveis públicas (seguras no navegador). */
export function getPublicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente públicas inválidas ou ausentes:\n${formatIssues(parsed.error)}\n` +
        `Verifique seu .env.local contra .env.example.`
    );
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

/** Variáveis server-only (NUNCA importar em Client Components). */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() chamado no navegador — isso vazaria segredos.");
  }
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
  });
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente de servidor inválidas:\n${formatIssues(parsed.error)}`
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}
