export function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMonto(monto: number | null, moneda?: string | null) {
  if (monto === null) return "—";
  const formateado = monto.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${moneda === "USD" ? "US$" : "$"} ${formateado}`;
}

export function formatFechaCorta(iso: string) {
  // Para columnas "date" de Postgres (sin hora): evitar que el huso
  // horario corra la fecha un día si se parsea como Date normal.
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function formatFechaCompleta(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
