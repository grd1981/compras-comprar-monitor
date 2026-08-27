-- Monitor de Compras — comprar.ar
-- Ejecutar este script completo en el SQL Editor de Supabase (una sola vez).

create extension if not exists "pgcrypto";

-- Expedientes/procesos que se quieren seguir en comprar.ar
create table if not exists expedientes (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  organismo text,
  descripcion text,
  url text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists expedientes_numero_key on expedientes (numero);

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

-- Novedades detectadas (lo que se muestra en el dashboard)
create table if not exists novedades (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes (id) on delete cascade,
  tipo text not null check (tipo in ('consulta_nueva', 'cambio_estado', 'vencimiento_proximo')),
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
  expedientes_revisados integer not null default 0
);

-- RLS: la app web solo la usa el admin autenticado (login con Supabase Auth).
-- El scraper (GitHub Actions) usa la service role key y no pasa por RLS.
alter table expedientes enable row level security;
alter table snapshots enable row level security;
alter table novedades enable row level security;
alter table scrape_runs enable row level security;

create policy "authenticated_all_expedientes" on expedientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_read_snapshots" on snapshots
  for select using (auth.role() = 'authenticated');

create policy "authenticated_all_novedades" on novedades
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_read_scrape_runs" on scrape_runs
  for select using (auth.role() = 'authenticated');
