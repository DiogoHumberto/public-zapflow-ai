import Link from "next/link";

import { AuthForm } from "@/components/forms/auth-form";
import { requestPasswordReset } from "@/lib/auth/actions";

export const metadata = { title: "Recuperar senha — ZapFlow AI" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Recuperar senha
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Informe seu e-mail para receber o link de redefinição.
      </p>

      <AuthForm
        action={requestPasswordReset}
        submitLabel="Enviar link"
        fields={[
          {
            name: "email",
            label: "E-mail",
            type: "email",
            autoComplete: "email",
            placeholder: "voce@empresa.com",
          },
        ]}
      />

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Lembrou a senha?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-600 hover:text-emerald-500"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
