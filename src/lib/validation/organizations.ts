import { z } from "zod";

/**
 * Validação do onboarding da organização.
 * Espelha as regras da RPC `create_organization()` (migration 003):
 * nome 2–100 caracteres; slug ^[a-z0-9-]{3,50}$.
 */

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(100, "O nome deve ter no máximo 100 caracteres"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]{3,50}$/,
      "Slug inválido: use 3–50 caracteres entre letras minúsculas, números e hífens"
    ),
  businessType: z.string().trim().max(100).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Edição dos dados cadastrais (specs/organizations). `slug`, `status` e `id`
 * não fazem parte do schema: `z.object` remove chaves desconhecidas, e a
 * opção `strict` rejeita explicitamente qualquer um deles.
 */

const ianaTimezone = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Fuso horário inválido. Use um identificador IANA (ex.: America/Sao_Paulo)" }
  );

export const updateOrganizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome deve ter pelo menos 2 caracteres")
      .max(100, "O nome deve ter no máximo 100 caracteres"),
    businessType: z.string().trim().max(100).optional(),
    email: z
      .union([z.literal(""), z.email("Informe um e-mail válido")])
      .transform((value) => (value === "" ? null : value))
      .nullable()
      .optional(),
    phone: z
      .string()
      .trim()
      .max(30, "O telefone deve ter no máximo 30 caracteres")
      .optional(),
    timezone: ianaTimezone,
  })
  .strict();

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
