-- ============================================================
-- Casa Nuova — migrazione "prossimo sopralluogo"
-- Incolla nell'SQL Editor e premi RUN.
-- ============================================================

alter table settings add column if not exists next_visit date;
update settings set next_visit = '2026-07-30' where id = 1 and next_visit is null;
