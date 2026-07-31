-- ============================================================
-- Casa Nuova — migrazione "tag Casa & Design"
-- Incolla nell'SQL Editor e premi RUN.
-- Rimuove il vincolo fisso sui tipi di design_items così da accettare
-- i nuovi tag (moodboard / ispirazione / tech) oltre a 'render'.
-- ============================================================

alter table design_items drop constraint if exists design_items_kind_check;
