import type { Consulta, NovedadTipo } from "../src/lib/types";

export type SnapshotData = {
  estado: string | null;
  plazo_limite: string | null;
  consultas: Consulta[];
};

export type NovedadCandidata = {
  tipo: NovedadTipo;
  detalle: string;
};

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Compara el snapshot anterior (o null si es la primera vez que se
 * revisa el expediente) contra el actual y devuelve las novedades
 * detectadas. No escribe nada: es lógica pura para poder testearla sin
 * Playwright ni Supabase.
 */
export function calcularNovedades(
  anterior: SnapshotData | null,
  actual: SnapshotData,
  opts: { avisoVencimientoDias: number },
): NovedadCandidata[] {
  const novedades: NovedadCandidata[] = [];

  if (anterior && anterior.estado && actual.estado && anterior.estado !== actual.estado) {
    novedades.push({
      tipo: "cambio_estado",
      detalle: `Cambió de estado: "${anterior.estado}" → "${actual.estado}".`,
    });
  }

  if (anterior) {
    const idsAnteriores = new Set(anterior.consultas.map((c) => c.id));
    const nuevas = actual.consultas.filter((c) => !idsAnteriores.has(c.id));
    for (const c of nuevas) {
      novedades.push({
        tipo: "consulta_nueva",
        detalle: c.respuesta
          ? `Nueva consulta con respuesta: "${truncar(c.texto)}"`
          : `Nueva consulta sin responder: "${truncar(c.texto)}"`,
      });
    }
  }

  if (actual.plazo_limite) {
    const dias = diasRestantes(actual.plazo_limite);
    if (dias !== null && dias >= 0 && dias <= opts.avisoVencimientoDias) {
      novedades.push({
        tipo: "vencimiento_proximo",
        detalle:
          dias === 0
            ? "El plazo vence hoy."
            : `Quedan ${dias} día(s) para el vencimiento del plazo.`,
      });
    }
  }

  return novedades;
}

function diasRestantes(iso: string): number | null {
  const fecha = new Date(iso).getTime();
  if (Number.isNaN(fecha)) return null;
  return Math.ceil((fecha - Date.now()) / MS_POR_DIA);
}

function truncar(texto: string, max = 140): string {
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}
