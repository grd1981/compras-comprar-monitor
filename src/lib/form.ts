export function campoTexto(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v || null;
}

export function campoBooleano(formData: FormData, campo: string): boolean {
  return formData.get(campo) === "on";
}

export function campoNumero(formData: FormData, campo: string): number | null {
  const v = String(formData.get(campo) ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
