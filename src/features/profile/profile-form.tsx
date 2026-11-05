"use client";

import { useActionState } from "react";

import { updateProfile, type ProfileActionState } from "./actions";

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

/**
 * Formulário de perfil (D04). Recebe os valores atuais do Server Component e
 * exibe os erros de validação retornados pela Server Action.
 */
export function ProfileForm({
  defaultFullName,
  defaultAvatarUrl,
}: {
  defaultFullName: string;
  defaultAvatarUrl: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(
    updateProfile,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="fullName"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Nome completo
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="avatarUrl"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          URL do avatar <span className="text-zinc-400">(opcional)</span>
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          inputMode="url"
          placeholder="https://exemplo.com/avatar.png"
          defaultValue={defaultAvatarUrl}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Deve ser uma URL https.
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

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-10 self-start rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
