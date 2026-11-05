import { AuthForm } from "@/components/forms/auth-form";
import { resetPassword } from "@/lib/auth/actions";

export const metadata = { title: "Redefinir senha — ZapFlow AI" };

/**
 * Página de redefinição de senha. O usuário chega pelo link do e-mail:
 * o Supabase estabelece uma sessão temporária (via /auth/callback ou
 * cookies de recovery) e `updateUser` aplica a nova senha.
 */
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Redefinir senha
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Escolha uma nova senha para sua conta.
        </p>

        <AuthForm
          action={resetPassword}
          submitLabel="Salvar nova senha"
          fields={[
            {
              name: "password",
              label: "Nova senha",
              type: "password",
              autoComplete: "new-password",
              placeholder: "Mínimo de 8 caracteres",
            },
            {
              name: "confirmPassword",
              label: "Confirmar nova senha",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />
      </div>
    </div>
  );
}
