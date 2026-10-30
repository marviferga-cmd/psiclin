"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-ink-900">Algo deu errado</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        Ocorreu um erro inesperado ao processar sua solicitação.{error.digest ? ` (código ${error.digest})` : ""}
      </p>
      <button onClick={reset} className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Tentar novamente
      </button>
    </div>
  );
}
