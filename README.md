# Casa Nuova 🏺

Sito personale privato per seguire la costruzione della casa nuova (Palazzina E, consegna prevista dicembre 2027). PWA installabile su iPhone, consultabile da Mac.

**Solo codice in questo repo.** Foto, documenti, spese e ogni dato personale vivono su Supabase (privato, dietro login) — le cartelle `materiale/` e `.env` sono escluse da git.

## Stack
- **Frontend**: Vite + React, PWA (`vite-plugin-pwa`)
- **Backend**: Supabase — Postgres (RLS attiva su tutto), Storage (bucket privati `media` e `documents`), Auth (utente singolo)
- **Foto**: compressione client-side al caricamento (~1800px web + miniatura 480px), URL firmati a scadenza

## Comandi
```bash
npm install
npm run dev       # sviluppo su http://localhost:5173
npm run build     # build di produzione in dist/
```

## Setup una tantum
1. Copia `.env` (non è nel repo): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_LOGIN_EMAIL`.
2. Esegui `supabase/schema.sql` nell'SQL Editor del progetto Supabase.
3. Crea l'utente in Supabase → Authentication → Add user (email = `VITE_LOGIN_EMAIL`).

## Struttura
- `src/pages/` — le sei sezioni: Cantiere, Avanzamento, Design, Checklist, Spese, Note
- `src/components/` — Layout (nav laterale/bottom bar), PhotoGrid, Lightbox
- `src/lib/` — client Supabase, upload/compressione media, formattazione
- `supabase/schema.sql` — schema completo con RLS e dati iniziali
