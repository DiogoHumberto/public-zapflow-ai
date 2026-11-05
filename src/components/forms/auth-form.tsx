"use client";

import { useActionState, useState } from "react";

import type { AuthActionState } from "@/lib/auth/actions";

interface Field {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
}

interface AuthFormProps {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  fields: Field[];
  submitLabel: string;
}

/**
 * Formulário genérico de autenticação com Server Action (useActionState).
 * Exibe erro/sucesso retornados pela action e desabilita o botão no envio.
 */
export function AuthForm({ action, fields, submitLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [visible, setVisible] = useState(true);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label
            htmlFor={field.name}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            placeholder={field.placeholder}
            required
            className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      ))}

      {state?.error && visible && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}
      {state?.success && visible && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        onClick={() => setVisible(true)}
        className="mt-2 h-10 rounded-lg bg-emerald-600 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Aguarde..." : submitLabel}
      </button>
    </form>
  );
}
