import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AddMemberForm } from "@/features/members/add-member-form";
import { getCurrentMemberRole, requireOrganization } from "@/lib/auth";

export const metadata = { title: "Adicionar membro — ZapFlow AI" };

/**
 * Adicionar membro (convite ou associação de conta existente).
 *
 * Casca estática + `<Suspense>`: o papel do chamador depende da requisição.
 * Quem não gerencia membros é devolvido à listagem; a Server Action e as RPCs
 * revalidam a permissão de qualquer forma.
 */

function AddMemberFormSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        </div>
      ))}
      <div className="mt-2 h-10 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
    </div>
  );
}

async function NewMemberSection() {
  await requireOrganization();
  const role = await getCurrentMemberRole();

  if (role !== "owner" && role !== "admin") {
    redirect("/settings/members");
  }

  return <AddMemberForm isOwner={role === "owner"} />;
}

export default function NewMemberPage() {
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
          Adicionar membro
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Convide por e-mail ou associe uma conta que ainda não tem organização
        </p>
      </header>

      <main className="flex-1 py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <Suspense fallback={<AddMemberFormSkeleton />}>
            <NewMemberSection />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
