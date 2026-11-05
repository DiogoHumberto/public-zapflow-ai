import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EditMemberForm } from "@/features/members/edit-member-form";
import { listMembers } from "@/features/members/service";
import { getCurrentMemberRole, requireOrganization } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/database";

export const metadata = { title: "Editar membro — ZapFlow AI" };

/**
 * Edição de membro (somente nome).
 *
 * A seção busca o alvo pela RPC de listagem (nunca lê `profiles` direto):
 * id inexistente, membro de outro tenant ou linha que o `admin` não gerencia
 * viram 404, sem revelar dados. As RPCs revalidam a hierarquia na escrita.
 */

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

function EditMemberFormSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
      <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      <div className="mt-2 h-10 w-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function MemberEditSection({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  await requireOrganization();

  const role = await getCurrentMemberRole();
  if (role !== "owner" && role !== "admin") notFound();

  const { memberId } = await params;
  const supabase = await createClient();
  const result = await listMembers(supabase);

  if (!result.ok) {
    return (
      <p
        role="status"
        className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        Membro indisponível no momento. Tente novamente em alguns instantes.
      </p>
    );
  }

  const member = result.members.find((item) => item.memberId === memberId);

  // Alvo de outro tenant, id inválido ou linha que o admin não gerencia.
  if (!member || (role === "admin" && member.role !== "member")) notFound();

  return (
    <EditMemberForm
      memberId={member.memberId}
      defaultFullName={member.fullName ?? ""}
      email={member.email}
      roleLabel={ROLE_LABELS[member.role]}
    />
  );
}

export default function EditMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
      <header className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link
          href="/settings/members"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Membros
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Editar membro
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Atualize o nome exibido para a equipe
        </p>
      </header>

      <main className="flex-1 py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <Suspense fallback={<EditMemberFormSkeleton />}>
            <MemberEditSection params={params} />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
