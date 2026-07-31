-- ============================================================
-- Casa Nuova — migrazione "campi Casa & Design"
-- Incolla nell'SQL Editor e premi RUN.
-- Aggiunge un contenitore per zona / prezzo / link agli elementi di design.
-- ============================================================

alter table design_items add column if not exists meta jsonb not null default '{}'::jsonb;
