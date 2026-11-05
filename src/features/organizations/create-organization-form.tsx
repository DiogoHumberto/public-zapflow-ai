"use client";

import { useActionState } from "react";

import { createOrganization, type OrganizationActionState } from "./actions";

/**
 * Formulário de criação da organização (onboarding).
 * Slug pré-preenche a partir do nome (normalizado) — o usuário pode ajustar.
 */
export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState<
    OrganizationActionState,
    FormData
  >(createOrganization, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Nome da empresa
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="organization"
          placeholder="Studio Bella"
          required
          minLength={2}
          maxLength={100}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="slug"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Slug (identificador único)
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          placeholder="studio-bella"
          required
          pattern="[a-z0-9\-]{3,50}"
          title="3–50 caracteres: letras minúsculas, números e hífens"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Apenas letras minúsculas, números e hífens (3–50 caracteres).
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="businessType"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Tipo de negócio <span className="text-zinc-400">(opcional)</span>
        </label>
        <input
          id="businessType"
          name="businessType"
          type="text"
          placeholder="Salão de beleza"
          maxLength={100}
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-10 rounded-lg bg-emerald-600 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar empresa"}
      </button>
    </form>
  );
}
