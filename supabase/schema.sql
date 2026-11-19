-- Monitor de Compras — comprar.ar
-- Ejecutar este script completo en el SQL Editor de Supabase (una sola vez).

create extension if not exists "pgcrypto";

-- Expedientes/licitaciones seguidas. Combina lo que trae comprar.gob.ar
-- (numero, url para el scraper) con el circuito interno completo que
-- antes se llevaba a mano en una planilla (Jurídica, CECE, BORA, SIGEN,
-- apertura, adjudicación, estado del proceso).
create table if not exists expedientes (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  organismo text,
  descripcion text,
  expediente_nro text,
  objeto text,
  url text,
  activo boolean not null default true,
  moneda text default 'ARS',
  monto_estimado numeric,
  envio_jur boolean not null default false,
  fecha_jur date,
  envio_cece boolean not null default false,
  cece_link text,
  bora boolean not null default false,
  bora_link text,
  pedido_sigen boolean not null default false,
  pedido_sigen_link text,
  fecha_difusion date,
  respuesta_sigen boolean not null default false,
  link_rta_sigen text,
  resol_aprobacion_pbcp text,
  resol_link text,
  fecha_apertura date,
  hora_apertura text,
  acta_apertura_link text,
  cuadro_comparativo_link text,
  resolucion_adjudicacion text,
  link_resol_adj text,
  monto_adjudicado numeric,
  plazo_contrato date,
  procedimiento text,
  ejercicio integer,
  anexo text,
  estado_proceso text,
  observaciones text,
  created_at timestamptz not null default now()
);

create unique index if not exists expedientes_numero_key on expedientes (numero);

-- Renglones de órdenes de compra ya adjudicadas: seguimiento de entrega.
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

-- Última foto conocida de cada expediente (estado, plazo, consultas)
create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes (id) on delete cascade,
  estado text,
  plazo_limite timestamptz,
  consultas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_expediente_idx
  on snapshots (expediente_id, created_at desc);

-- Última foto conocida de los movimientos del expediente en GDE (Gestión
-- Documental Electrónica), independiente del seguimiento de comprar.gob.ar.
create table if not exists gde_snapshots (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes (id) on delete cascade,
  movimientos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gde_snapshots_expediente_idx
  on gde_snapshots (expediente_id, created_at desc);

-- Novedades detectadas (lo que se muestra en el dashboard)
create table if not exists novedades (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes (id) on delete cascade,
  tipo text not null check (tipo in ('consulta_nueva', 'cambio_estado', 'vencimiento_proximo', 'movimiento_gde')),
  detalle text not null,
  detectado_en timestamptz not null default now(),
  leida boolean not null default false
);

create index if not exists novedades_expediente_idx on novedades (expediente_id);
create index if not exists novedades_detectado_en_idx on novedades (detectado_en desc);

-- Historial de corridas del scraper diario (para diagnosticar si algo falló)
create table if not exists scrape_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  error text,
  expedientes_revisados integer not null default 0,
  expedientes_gde_revisados integer not null default 0
);

-- RLS: la app web solo la usa el admin autenticado (login con Supabase Auth).
-- El scraper (GitHub Actions) usa la service role key y no pasa por RLS.
alter table expedientes enable row level security;
alter table ejecucion_oc enable row level security;
alter table snapshots enable row level security;
alter table gde_snapshots enable row level security;
alter table novedades enable row level security;
alter table scrape_runs enable row level security;

create policy "authenticated_all_expedientes" on expedientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_ejecucion_oc" on ejecucion_oc
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_read_snapshots" on snapshots
  for select using (auth.role() = 'authenticated');

create policy "authenticated_read_gde_snapshots" on gde_snapshots
  for select using (auth.role() = 'authenticated');

create policy "authenticated_all_novedades" on novedades
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_read_scrape_runs" on scrape_runs
  for select using (auth.role() = 'authenticated');
