import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Link
        href="/"
        className="mb-8 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
      >
        ZapFlow <span className="text-emerald-600">AI</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </div>
  );
}
