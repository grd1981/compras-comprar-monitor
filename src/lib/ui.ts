export const inputClasses =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export const buttonPrimary =
  "rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";

export const buttonDanger =
  "rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50";

export const cardClasses =
  "rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";

export const badgeClasses: Record<string, string> = {
  consulta_nueva:
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  cambio_estado:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  vencimiento_proximo:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  movimiento_gde:
    "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

export const tipoLabel: Record<string, string> = {
  consulta_nueva: "Consulta nueva",
  cambio_estado: "Cambio de estado",
  vencimiento_proximo: "Vencimiento próximo",
  movimiento_gde: "Movimiento de expediente",
};

const ESTADO_PROCESO_CLASSES: Record<string, string> = {
  Adjudicado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Publicado: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "En Apertura": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "En Evaluación": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "Días de Impugnación": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "En Juridico para Adjudicar": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "En UOC para iniciar": "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Desierta: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Fracasado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function estadoProcesoClasses(estado: string | null): string {
  if (!estado) return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    ESTADO_PROCESO_CLASSES[estado] ??
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  );
}

export const ESTADOS_PROCESO = [
  "Publicado",
  "En Apertura",
  "Días de Impugnación",
  "En Evaluación",
  "En Juridico para Adjudicar",
  "En UOC para iniciar",
  "Adjudicado",
  "Desierta",
  "Fracasado",
] as const;
