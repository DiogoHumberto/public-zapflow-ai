import Link from "next/link";
import { Suspense } from "react";

import { MemberRow } from "@/features/members/member-row";
import { listMembers } from "@/features/members/service";
import { getCurrentMemberRole, getUser, requireOrganization } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Membros — ZapFlow AI" };

/**
 * Gestão de membros (D05 + CRUD).
 *
 * Casca estática + `<Suspense>`: a lista vem da RPC `list_organization_members`
 * (request time). A ocultação das ações por papel é só UI — as RPCs
 * `change_member_role`/`remove_member`/`update_member_profile` rejeitam
 * chamadas forjadas no banco.
 */

function MembersSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}

function formatJoinedAt(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

async function MembersSection() {
  await requireOrganization();

  const [role, user] = await Promise.all([getCurrentMemberRole(), getUser()]);
  const canManage = role === "owner" || role === "admin";
  const canViewEmail = canManage;

  const supabase = await createClient();
  const result = await listMembers(supabase);

  if (!result.ok) {
    return (
      <p
        role="status"
        className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        Membros indisponíveis no momento. Tente novamente em alguns instantes.
      </p>
    );
  }

  const ownerCount = result.members.filter(
    (member) => member.role === "owner"
  ).length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="px-3 pb-2 font-medium">Membro</th>
            {canViewEmail && <th className="px-3 pb-2 font-medium">E-mail</th>}
            <th className="px-3 pb-2 font-medium">Papel</th>
            <th className="px-3 pb-2 font-medium">Desde</th>
            {canManage && <th className="px-3 pb-2 font-medium">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {result.members.map((member) => {
            const isSelf = member.userId === user?.id;

            // Matriz da spec: owner gerencia todos (papel só de terceiros);
            // admin apenas linhas `member`; member é somente leitura.
            const canEdit =
              role === "owner" ||
              (role === "admin" && member.role === "member");

            const canRemove =
              role === "owner"
                ? member.role !== "owner" || ownerCount > 1
                : role === "admin" && member.role === "member";

            const canChangeRole = role === "owner" && !isSelf;

            return (
              <MemberRow
                key={member.memberId}
                member={member}
                canViewEmail={canViewEmail}
                canEdit={canEdit}
                canRemove={canRemove}
                canChangeRole={canChangeRole}
                isSelf={isSelf}
                joinedAt={formatJoinedAt(member.createdAt)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MembersSettingsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-8">
      <header className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link
          href="/settings"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Configurações
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Membros
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pessoas com acesso à sua organização
            </p>
          </div>
          {/* A action revalida o papel no servidor; o link é só conveniência. */}
          <Suspense fallback={null}>
            <AddMemberLink />
          </Suspense>
        </div>
      </header>

      <main className="flex-1 py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <Suspense fallback={<MembersSkeleton />}>
            <MembersSection />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

/** Botão exibido apenas para gestores; resolvido no mesmo Suspense da lista. */
async function AddMemberLink() {
  const role = await getCurrentMemberRole();
  if (role !== "owner" && role !== "admin") return null;

  return (
    <Link
      href="/settings/members/new"
      className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
    >
      Adicionar membro
    </Link>
  );
}
