import { z } from "zod";

/**
 * Validação das operações de membros (specs/members).
 * A hierarquia e o isolamento entre organizações são impostos pelas RPCs;
 * aqui garantimos forma e limites dos dados antes de chamar o banco.
 */

export const MEMBER_ROLES = ["owner", "admin", "member"] as const;

/** Papéis que owner/admin podem atribuir ao adicionar um membro. */
export const ASSIGNABLE_ROLES = ["member", "admin"] as const;

export const changeMemberRoleSchema = z.object({
  memberId: z.uuid("Identificador de membro inválido"),
  role: z.enum(MEMBER_ROLES, {
    message: "Papel inválido. Use owner, admin ou member",
  }),
});

export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

/** Remoção de membro: só o identificador do membership é aceito. */
export const removeMemberSchema = z.object({
  memberId: z.uuid("Identificador de membro inválido"),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

/**
 * Adicionar membro por e-mail.
 * `admin` só pode atribuir `member`; a RPC rejeita o restante mesmo que a
 * validação seja contornada.
 */
export const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(z.email("Informe um e-mail válido")),
  fullName: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value))
    .refine(
      (value) => value === null || (value.length >= 2 && value.length <= 100),
      { message: "O nome deve ter entre 2 e 100 caracteres" }
    ),
  role: z.enum(ASSIGNABLE_ROLES, {
    message: "Papel inválido. Use member ou admin",
  }),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

/** Edição de membro: apenas o nome; o e-mail é descartado. */
export const updateMemberNameSchema = z.object({
  memberId: z.uuid("Identificador de membro inválido"),
  fullName: z
    .string()
    .trim()
    .min(2, "O nome deve ter entre 2 e 100 caracteres")
    .max(100, "O nome deve ter entre 2 e 100 caracteres"),
});

export type UpdateMemberNameInput = z.infer<typeof updateMemberNameSchema>;
