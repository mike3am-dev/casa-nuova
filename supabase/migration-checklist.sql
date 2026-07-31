-- ============================================================
-- Casa Nuova — migrazione "checklist desideri"
-- Incolla nell'SQL Editor e premi RUN.
-- Aggiunge a ogni voce: entro quale fase di cantiere + foto di riferimento.
-- ============================================================

alter table checklist_items add column if not exists meta jsonb not null default '{}'::jsonb;
