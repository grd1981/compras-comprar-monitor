-- Amplía expedientes al modelo completo de seguimiento de licitaciones
-- (circuito interno, apertura, adjudicación, estado) y agrega la tabla
-- ejecucion_oc (renglones de órdenes de compra ya adjudicadas).
-- Ejecutar una sola vez en el SQL Editor de Supabase.

-- url ya no es obligatoria: muchas licitaciones se cargan antes de tener
-- el link de comprar.gob.ar, o nunca lo tienen (ej. compulsas chicas).
alter table expedientes alter column url drop not null;

alter table expedientes
  add column if not exists expediente_nro text,
  add column if not exists objeto text,
  add column if not exists moneda text default 'ARS',
  add column if not exists monto_estimado numeric,
  add column if not exists envio_jur boolean not null default false,
  add column if not exists fecha_jur date,
  add column if not exists envio_cece boolean not null default false,
  add column if not exists cece_link text,
  add column if not exists bora boolean not null default false,
  add column if not exists bora_link text,
  add column if not exists pedido_sigen boolean not null default false,
  add column if not exists pedido_sigen_link text,
  add column if not exists fecha_difusion date,
  add column if not exists respuesta_sigen boolean not null default false,
  add column if not exists link_rta_sigen text,
  add column if not exists resol_aprobacion_pbcp text,
  add column if not exists resol_link text,
  add column if not exists fecha_apertura date,
  add column if not exists hora_apertura text,
  add column if not exists acta_apertura_link text,
  add column if not exists cuadro_comparativo_link text,
  add column if not exists resolucion_adjudicacion text,
  add column if not exists link_resol_adj text,
  add column if not exists monto_adjudicado numeric,
  add column if not exists plazo_contrato date,
  add column if not exists procedimiento text,
  add column if not exists ejercicio integer,
  add column if not exists anexo text,
  add column if not exists estado_proceso text,
  add column if not exists observaciones text;

create table if not exists ejecucion_oc (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes (id) on delete cascade,
  id_oc text,
  adjudicatario text,
  renglon integer,
  descripcion text,
  importe_unitario numeric,
  monto_adjudicado numeric,
  cantidad_adjudicada numeric,
  cantidad_entregada numeric not null default 0,
  inciso integer,
  created_at timestamptz not null default now()
);

create index if not exists ejecucion_oc_expediente_idx on ejecucion_oc (expediente_id);

alter table ejecucion_oc enable row level security;

create policy "authenticated_all_ejecucion_oc" on ejecucion_oc
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
