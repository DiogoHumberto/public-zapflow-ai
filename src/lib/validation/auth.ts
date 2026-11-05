import { z } from "zod";

/**
 * Schemas de validação dos fluxos de autenticação.
 * Mensagens em pt-BR; o servidor (Supabase Auth) continua autoritativo.
 */

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(100, "Nome muito longo"),
  email: z.email("Informe um e-mail válido"),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const resetPasswordRequestSchema = z.object({
  email: z.email("Informe um e-mail válido"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .max(72, "A senha deve ter no máximo 72 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
