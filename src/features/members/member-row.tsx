"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { MemberRole } from "@/types/database";

import { changeMemberRoleAction, removeMemberAction } from "./actions";
import type { OrganizationMember } from "./service";

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

const ROLE_BADGE_CLASS: Record<MemberRole, string> = {
  owner:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  admin: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  member: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const actionButtonClass =
  "inline-flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

function Feedback({
  state,
}: {
  state: { status: "success" | "error"; message: string } | null;
}) {
  if (!state) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "mt-1 basis-full text-xs text-red-600 dark:text-red-400"
          : "mt-1 basis-full text-xs text-emerald-600 dark:text-emerald-400"
      }
    >
      {state.message}
    </p>
  );
}

/**
 * Linha da tabela de membros.
 *
 * As permissões chegam calculadas pela página (matriz da spec): `owner` vê o
 * seletor de papel nas linhas de terceiros; `admin` só edita/remove linhas
 * `member`; `member` não vê ações. A RPC `security definer` é a barreira real.
 */
export function MemberRow({
  member,
  canViewEmail,
  canEdit,
  canRemove,
  canChangeRole,
  joinedAt,
  isSelf,
}: {
  member: OrganizationMember;
  canViewEmail: boolean;
  canEdit: boolean;
  canRemove: boolean;
  canChangeRole: boolean;
  joinedAt: string;
  isSelf: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState(
    changeMemberRoleAction,
    null
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeMemberAction,
    null
  );
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  return (
    <tr className="border-t border-zinc-200 align-top dark:border-zinc-800">
      <td className="px-3 py-3 text-sm text-zinc-900 dark:text-zinc-50">
        <span className="flex flex-wrap items-center gap-2">
          {member.fullName || "Sem nome"}
          {isSelf && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              (você)
            </span>
          )}
          {member.invitationPending && (
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Convite pendente
            </span>
          )}
        </span>
      </td>

      {canViewEmail && (
        <td className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-300">
          {member.email ?? "—"}
        </td>
      )}

      <td className="px-3 py-3 text-sm">
        {canChangeRole ? (
          <form action={roleAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="memberId" value={member.memberId} />
            <select
              name="role"
              defaultValue={member.role}
              aria-label={`Papel de ${member.fullName ?? "membro"}`}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {(Object.keys(ROLE_LABELS) as MemberRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={rolePending}
              className="h-9 rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {rolePending ? "Salvando..." : "Salvar"}
            </button>
            <Feedback state={roleState} />
          </form>
        ) : (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASS[member.role]}`}
          >
            {ROLE_LABELS[member.role]}
          </span>
        )}
      </td>

      <td className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">
        {joinedAt}
      </td>

      <td className="px-3 py-3 text-sm">
        {canEdit || canRemove ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <Link
                  href={`/settings/members/${member.memberId}`}
                  className={actionButtonClass}
                >
                  Editar
                </Link>
              )}

              {canRemove &&
                (confirmingRemoval ? (
                  <form
                    action={removeAction}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="memberId"
                      value={member.memberId}
                    />
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">
                      Confirmar remoção?
                    </span>
                    <button
                      type="submit"
                      disabled={removePending}
                      className="h-9 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
                    >
                      {removePending ? "Removendo..." : "Confirmar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoval(false)}
                      disabled={removePending}
                      className="h-9 rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingRemoval(true)}
                    className="h-9 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    Remover
                  </button>
                ))}
            </div>
            <Feedback state={removeState} />
          </div>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
        )}
      </td>
    </tr>
  );
}
