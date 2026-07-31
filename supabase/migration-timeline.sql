-- ============================================================
-- Casa Nuova — migrazione "timeline orizzontale con report"
-- Incolla nell'SQL Editor e premi RUN (poi "Run and enable RLS", come l'altra volta).
-- Aggiunge: il report di cantiere per ogni sopralluogo + lo stato per-edificio a quella data.
-- ============================================================

-- Report testuale del capo cantiere, per sopralluogo
alter table visits add column if not exists report text not null default '';

-- Stato di ogni edificio a quella data (barra + nota), come la vecchia tabella confronto
create table if not exists visit_status (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  building_code text not null,
  percent int not null default 0 check (percent between 0 and 100),
  note text not null default '',
  sort int not null default 0,
  unique (visit_id, building_code)
);

alter table visit_status enable row level security;
drop policy if exists "autenticato tutto" on visit_status;
create policy "autenticato tutto" on visit_status for all to authenticated using (true) with check (true);
