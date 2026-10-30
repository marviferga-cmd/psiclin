export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-56 rounded-lg bg-ink-200/70" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-ink-200/50" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-ink-200/40" />
    </div>
  );
}
