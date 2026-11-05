import { z } from "zod";

/**
 * Validação da edição do perfil do usuário autenticado (specs/user-profile).
 * Somente `full_name` e `avatar_url` são aceitos; o restante é descartado.
 */

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(100, "O nome deve ter no máximo 100 caracteres"),
  avatarUrl: z
    .union([
      z.literal(""),
      z
        .url("Informe uma URL válida para o avatar")
        .refine((value) => value.startsWith("https://"), {
          message: "A URL do avatar deve usar https",
        }),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
