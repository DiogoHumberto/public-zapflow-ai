"use client";

import Link from "next/link";
import { useActionState } from "react";

import { addMemberAction, type MemberActionState } from "./actions";

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

/**
 * Formulário de adicionar membro.
 *
 * Para `admin` o papel é fixo em `member` (campo oculto) — a Server Action e a
 * RPC rejeitam qualquer outro valor mesmo que o campo seja adulterado.
 */
export function AddMemberForm({ isOwner }: { isOwner: boolean }) {
  const [state, formAction, pending] = useActionState<MemberActionState, FormData>(
    addMemberAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="pessoa@exemplo.com"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Se ainda não houver conta, a pessoa recebe um convite para definir a
          senha.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fullName"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Nome <span className="text-zinc-400">(opcional)</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={100}
          placeholder="Maria Silva"
          className={inputClass}
        />
      </div>

      {isOwner ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="role"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className={inputClass}
          >
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Papel
          </span>
          <input type="hidden" name="role" value="member" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Membro — administradores só podem adicionar membros com papel
            Membro.
          </span>
        </div>
      )}

      {state?.status === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      {state?.status === "success" && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {state.message}{" "}
          <Link href="/settings/members" className="font-medium underline">
            Voltar para membros
          </Link>
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Adicionando..." : "Adicionar membro"}
        </button>
        <Link
          href="/settings/members"
          className="inline-flex h-10 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
