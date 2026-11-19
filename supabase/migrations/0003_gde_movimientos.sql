-- Agrega el seguimiento de movimientos del expediente GDE (Gestión
-- Documental Electrónica), separado del seguimiento de comprar.gob.ar.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

create table if not exists gde_snapshots (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes (id) on delete cascade,
  -- Los últimos movimientos leídos de la tabla "Documentos" de GDE,
  -- más nuevo primero: [{ orden, tipo_documento, numero_documento,
  -- referencia, fecha_asociacion, fecha_creacion }, ...]
  movimientos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gde_snapshots_expediente_idx
  on gde_snapshots (expediente_id, created_at desc);

alter table gde_snapshots enable row level security;

create policy "authenticated_read_gde_snapshots" on gde_snapshots
  for select using (auth.role() = 'authenticated');

-- Permitir el nuevo tipo de novedad "movimiento_gde" (nuevo movimiento
-- detectado en el expediente GDE).
alter table novedades drop constraint if exists novedades_tipo_check;
alter table novedades add constraint novedades_tipo_check
  check (tipo in ('consulta_nueva', 'cambio_estado', 'vencimiento_proximo', 'movimiento_gde'));

alter table scrape_runs
  add column if not exists expedientes_gde_revisados integer not null default 0;
