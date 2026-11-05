import Link from "next/link";
import { Bot, CalendarCheck2, MessageSquareText, Users } from "lucide-react";

const features = [
  {
    icon: MessageSquareText,
    title: "Atendimento 24/7",
    description:
      "A IA responde seus clientes no WhatsApp a qualquer hora, sem fila de espera.",
  },
  {
    icon: Bot,
    title: "Qualificação de leads",
    description:
      "Identifica oportunidades e encaminha conversas quentes para um humano.",
  },
  {
    icon: CalendarCheck2,
    title: "Agenda inteligente",
    description:
      "Informa horários, serviços e preços com base na sua base de conhecimento.",
  },
  {
    icon: Users,
    title: "Multi-atendente",
    description:
      "Sua equipe assume a conversa quando necessário, com contexto completo.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ZapFlow <span className="text-emerald-600">AI</span>
        </span>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Para salões de beleza e estética
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Automatize o atendimento do seu negócio no WhatsApp
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Conecte seu WhatsApp Business, cadastre seus serviços e deixe a
            inteligência artificial atender, qualificar e agendar — sem
            contratar uma equipe.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="flex h-12 items-center justify-center rounded-full bg-emerald-600 px-6 text-base font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Começar agora
            </Link>
            <Link
              href="/login"
              className="flex h-12 items-center justify-center rounded-full border border-zinc-200 px-6 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-zinc-100 bg-zinc-50/60 py-20 dark:border-zinc-900 dark:bg-zinc-900/40">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <feature.icon className="h-6 w-6 text-emerald-600" aria-hidden />
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {feature.title}
                </h3>
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-8 dark:border-zinc-900">
        <div className="mx-auto w-full max-w-6xl px-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          © 2026 ZapFlow AI. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
