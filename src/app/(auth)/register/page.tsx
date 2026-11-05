import Link from "next/link";

import { AuthForm } from "@/components/forms/auth-form";
import { register } from "@/lib/auth/actions";

export const metadata = { title: "Criar conta — ZapFlow AI" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Criar conta
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Cadastre-se para automatizar o atendimento do seu negócio.
      </p>

      <AuthForm
        action={register}
        submitLabel="Criar conta"
        fields={[
          {
            name: "fullName",
            label: "Nome completo",
            type: "text",
            autoComplete: "name",
            placeholder: "Maria Silva",
          },
          {
            name: "email",
            label: "E-mail",
            type: "email",
            autoComplete: "email",
            placeholder: "voce@empresa.com",
          },
          {
            name: "password",
            label: "Senha",
            type: "password",
            autoComplete: "new-password",
            placeholder: "Mínimo de 8 caracteres",
          },
        ]}
      />

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Já tem conta?{" "}
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
