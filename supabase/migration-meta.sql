-- ============================================================
-- Casa Nuova — migrazione "meta sopralluogo"
-- Incolla nell'SQL Editor e premi RUN (poi "Run and enable RLS", come sempre).
-- Aggiunge un contenitore flessibile per: meteo, prossimo milestone, confronto.
-- ============================================================

alter table visits add column if not exists meta jsonb not null default '{}'::jsonb;
