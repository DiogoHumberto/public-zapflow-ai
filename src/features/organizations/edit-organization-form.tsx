"use client";

import { useActionState } from "react";

import {
  updateOrganization,
  type UpdateOrganizationActionState,
} from "./actions";

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

/** Fusos IANA mais comuns para o autocomplete (a validação é no servidor). */
const COMMON_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Rio_Branco",
  "America/Noronha",
  "America/New_York",
  "Europe/Lisbon",
  "UTC",
];

/**
 * Formulário de dados da empresa (D03). Visível somente para `owner`/`admin`;
 * a ação revalida no servidor e a RLS barra `member` de qualquer forma.
 */
export function EditOrganizationForm({
  defaultName,
  defaultBusinessType,
  defaultEmail,
  defaultPhone,
  defaultTimezone,
}: {
  defaultName: string;
  defaultBusinessType: string;
  defaultEmail: string;
  defaultPhone: string;
  defaultTimezone: string;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateOrganizationActionState,
    FormData
  >(updateOrganization, null);

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
          required
          minLength={2}
          maxLength={100}
          defaultValue={defaultName}
          className={inputClass}
        />
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
          defaultValue={defaultBusinessType}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            E-mail <span className="text-zinc-400">(opcional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="contato@salao.com"
            defaultValue={defaultEmail}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="phone"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Telefone <span className="text-zinc-400">(opcional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(11) 99999-0000"
            maxLength={30}
            defaultValue={defaultPhone}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="timezone"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Fuso horário
        </label>
        <input
          id="timezone"
          name="timezone"
          type="text"
          list="timezones"
          required
          defaultValue={defaultTimezone}
          className={inputClass}
        />
        <datalist id="timezones">
          {COMMON_TIMEZONES.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Identificador IANA, como America/Sao_Paulo.
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
        {pending ? "Salvando..." : "Salvar dados da empresa"}
      </button>
    </form>
  );
}
