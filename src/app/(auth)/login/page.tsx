import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/forms/auth-form";
import { login } from "@/lib/auth/actions";

export const metadata = { title: "Entrar — ZapFlow AI" };

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Entrar
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Acesse o painel do seu negócio.
      </p>

      {error === "link-invalido" && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        >
          O link de confirmação é inválido ou expirou. Faça login ou solicite um
          novo cadastro.
        </p>
      )}

      <AuthForm
        action={login}
        submitLabel="Entrar"
        fields={[
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
            autoComplete: "current-password",
          },
        ]}
      />

      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link
          href="/forgot-password"
          className="font-medium text-emerald-600 hover:text-emerald-500"
        >
          Esqueci minha senha
        </Link>
        <span>
          Não tem conta?{" "}
          <Link
            href="/register"
            className="font-medium text-emerald-600 hover:text-emerald-500"
          >
            Criar conta
          </Link>
        </span>
      </div>
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
