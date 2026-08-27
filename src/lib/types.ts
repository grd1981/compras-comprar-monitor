export type Expediente = {
  id: string;
  numero: string;
  organismo: string | null;
  descripcion: string | null;
  url: string;
  activo: boolean;
  created_at: string;
};

export type Snapshot = {
  id: string;
  expediente_id: string;
  estado: string | null;
  plazo_limite: string | null;
  consultas: Consulta[];
  created_at: string;
};

export type Consulta = {
  id: string;
  texto: string;
  fecha: string | null;
  respuesta: string | null;
};

export type NovedadTipo =
  | "consulta_nueva"
  | "cambio_estado"
  | "vencimiento_proximo";

export type Novedad = {
  id: string;
  expediente_id: string;
  tipo: NovedadTipo;
  detalle: string;
  detectado_en: string;
  leida: boolean;
  expediente?: Pick<Expediente, "id" | "numero" | "organismo" | "url">;
};

export type ScrapeRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  error: string | null;
  expedientes_revisados: number;
};
