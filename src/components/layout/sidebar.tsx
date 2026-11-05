import Link from "next/link";

/**
 * Navegação lateral do grupo (dashboard). Itens de épicos ainda não entregues
 * são renderizados desabilitados (`aria-disabled`, sem `href`), conforme
 * specs/dashboard.
 */

export type SidebarItem = {
  label: string;
  href?: string;
};

export const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Conversas" },
  { label: "Contatos" },
  { label: "Base de conhecimento" },
  { label: "Configurações", href: "/settings" },
];

const itemClass =
  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";

export function Sidebar({ organizationName }: { organizationName: string }) {
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-zinc-200 bg-white p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r md:p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Organização
        </p>
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {organizationName}
        </p>
      </div>

      <nav aria-label="Navegação principal">
        <ul className="flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`${itemClass} text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className={`${itemClass} cursor-not-allowed text-zinc-400 dark:text-zinc-600`}
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
