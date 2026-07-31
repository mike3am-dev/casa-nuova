-- ============================================================
-- Casa Nuova — migrazione "spese: fasi e dettagli"
-- Incolla nell'SQL Editor e premi RUN.
-- Aggiunge un contenitore per fase, destinatario, imponibile/IVA.
-- ============================================================

alter table expenses add column if not exists meta jsonb not null default '{}'::jsonb;
