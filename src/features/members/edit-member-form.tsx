"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updateMemberAction, type MemberActionState } from "./actions";

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

/**
 * Edição de membro: apenas o nome. E-mail e papel são exibidos como leitura —
 * o e-mail é a identidade da conta e o papel só muda pelo `owner` na listagem.
 */
export function EditMemberForm({
  memberId,
  defaultFullName,
  email,
  roleLabel,
}: {
  memberId: string;
  defaultFullName: string;
  email: string | null;
  roleLabel: string;
}) {
  const [state, formAction, pending] = useActionState<MemberActionState, FormData>(
    updateMemberAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="memberId" value={memberId} />

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            E-mail
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-50">
            {email ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Papel
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-50">{roleLabel}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fullName"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Nome
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={defaultFullName}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Entre 2 e 100 caracteres. O e-mail não é editável por aqui.
        </p>
      </div>

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
          {state.message}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar nome"}
        </button>
        <Link
          href="/settings/members"
          className="inline-flex h-10 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Voltar para membros
        </Link>
      </div>
    </form>
  );
}
