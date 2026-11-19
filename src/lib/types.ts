export type Expediente = {
  id: string;
  numero: string;
  organismo: string | null;
  descripcion: string | null;
  expediente_nro: string | null;
  objeto: string | null;
  url: string | null;
  activo: boolean;
  moneda: string | null;
  monto_estimado: number | null;
  envio_jur: boolean;
  fecha_jur: string | null;
  envio_cece: boolean;
  cece_link: string | null;
  bora: boolean;
  bora_link: string | null;
  pedido_sigen: boolean;
  pedido_sigen_link: string | null;
  fecha_difusion: string | null;
  respuesta_sigen: boolean;
  link_rta_sigen: string | null;
  resol_aprobacion_pbcp: string | null;
  resol_link: string | null;
  fecha_apertura: string | null;
  hora_apertura: string | null;
  acta_apertura_link: string | null;
  cuadro_comparativo_link: string | null;
  resolucion_adjudicacion: string | null;
  link_resol_adj: string | null;
  monto_adjudicado: number | null;
  plazo_contrato: string | null;
  procedimiento: string | null;
  ejercicio: number | null;
  anexo: string | null;
  estado_proceso: string | null;
  observaciones: string | null;
  created_at: string;
};

export type EjecucionOC = {
  id: string;
  expediente_id: string;
  id_oc: string | null;
  adjudicatario: string | null;
  renglon: number | null;
  descripcion: string | null;
  importe_unitario: number | null;
  monto_adjudicado: number | null;
  cantidad_adjudicada: number | null;
  cantidad_entregada: number;
  inciso: number | null;
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

export type MovimientoGde = {
  orden: number | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  referencia: string | null;
  fecha_asociacion: string | null;
  fecha_creacion: string | null;
};

export type GdeSnapshot = {
  id: string;
  expediente_id: string;
  movimientos: MovimientoGde[];
  created_at: string;
};

export type NovedadTipo =
  | "consulta_nueva"
  | "cambio_estado"
  | "vencimiento_proximo"
  | "movimiento_gde";

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
