import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <p className="text-sm font-semibold tracking-widest text-zinc-500 uppercase">
        404
      </p>
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Página não encontrada
      </h2>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        O recurso que você procura não existe ou foi movido.
      </p>
      <Link
        href="/"
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
