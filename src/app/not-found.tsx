import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-semibold text-ink-900">Página não encontrada</h1>
      <p className="mt-2 text-sm text-ink-500">O registro pode ter sido removido ou o endereço está incorreto.</p>
      <Link href="/" className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Voltar ao painel
      </Link>
    </div>
  );
}
