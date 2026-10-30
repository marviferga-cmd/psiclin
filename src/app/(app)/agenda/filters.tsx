"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AgendaFilters({
  psychologists,
  value,
  date,
}: {
  psychologists: { id: string; name: string }[];
  value: string;
  date: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <select
      className="input h-10 w-auto min-w-[180px] py-0"
      value={value}
      aria-label="Filtrar profissional"
      onChange={(e) => {
        const u = new URLSearchParams(params.toString());
        u.set("prof", e.target.value);
        u.set("date", date);
        router.push(`/agenda?${u}`);
      }}
    >
      <option value="all">Todos os profissionais</option>
      {psychologists.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
