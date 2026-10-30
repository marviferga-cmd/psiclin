// Valor monetário por extenso (pt-BR), usado em recibos.
const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEN = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CEN[c]);
  if (r) {
    if (r < 20) parts.push(UNI[r]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      parts.push(u ? `${DEZ[d]} e ${UNI[u]}` : DEZ[d]);
    }
  }
  return parts.join(" e ");
}

function inteiro(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const parts: string[] = [];
  if (milhoes) parts.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) parts.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) parts.push(ate999(resto));
  if (parts.length > 1 && resto && (resto < 100 || resto % 100 === 0)) {
    const last = parts.pop()!;
    return `${parts.join(" ")} e ${last}`;
  }
  return parts.join(" ");
}

export function valorPorExtenso(valor: number) {
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  const parts: string[] = [];
  if (reais) parts.push(`${inteiro(reais)}${reais % 1_000_000 === 0 ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  if (centavos) parts.push(`${inteiro(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return parts.join(" e ") || "zero real";
}
