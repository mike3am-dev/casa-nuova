# Bugfix iPhone — lista del 30/07/2026

## Aspetto
- [x] **Icona non si vede** nella barra di Safari e **non è centrata** in Home.
- [x] **Foto della homepage sgranata**.
- [x] **Barra di navigazione in basso**: icone più grandi, niente testo a capo.
- [x] **Icona nuova** (segno La Torriani): a pieno campo, versione maskable dedicata.

## Cantiere
- [x] In alto **subito la timeline**; widget "stato attuale" molto più compatto su iPhone.
- [x] Toccando la **foto** della timeline: cambia la tappa **e** si apre grande.
      (Toccando la **data** cambia solo la tappa, senza aprire nulla.)
- [x] Sopralluogo **rimpaginato su mobile**: una colonna, righe più arieggiate.
- [x] **"Modifica report" ed "elimina tappa"** via da iPhone (anche meteo e "Aggiorna").

## Il progetto
- [x] Aprendo una foto: **solo grande**, niente selezione ambienti.
- [x] **Lentezza risolta** — confermato da Mike sul telefono il 7 agosto 2026.

## Checklist
- [x] **Swipe a sinistra = elimina**, **swipe a destra = fatta/da fare**.
- [x] Tolte le **icone di stato a destra** (tick verde/rosso).
- [x] Tolta l'**emoji da ogni riga** (restano solo nelle intestazioni di categoria).
- [x] "+ scadenza" e "+ nota" sostituiti da una **matita** che apre i dettagli.

## Spese e documenti
- [x] **Niente modifiche da iPhone** (compresa la pillola dello stato, che si toccava per sbaglio).
- [x] **Lentezza risolta** — confermato da Mike sul telefono il 7 agosto 2026.

## Va bene così
- Casa & Design su iPhone è chiaro e comprensibile.

## Logo rotto nella schermata iniziale — risolto

**Causa vera:** `BrowserRouter` era montato **senza `basename`**, ma il sito sta
in `/casa-nuova/`. Quel percorso non combaciava con nessuna rotta, scattava il
`path="*"` con `<Navigate to="/">` e l'app **usciva dalla propria cartella**:
l'indirizzo diventava la radice del dominio. Da lì `./logo.png` andava a cercarsi
`github.io/logo.png`, che non esiste → riquadro rotto. Ed è la stessa ragione per
cui ricaricando compariva il 404 di GitHub: non era un segnalibro sbagliato.

Dimostrato servendo la build sotto `/casa-nuova/` in locale: prima l'indirizzo
saltava a `/` e il logo era 0×0, dopo resta in cartella e il logo carica 503×512.

Correzioni:
- `base: '/casa-nuova/'` (assoluto) e `basename={import.meta.env.BASE_URL}` nel router.
- Logo e favicon con percorso assoluto, non più relativo all'indirizzo corrente.
- `pubblica.sh` genera `404.html` = `index.html`, così ricaricare `/spese` riprende
  dall'app invece che dalla pagina d'errore di GitHub.

**Falso allarme precedente:** avevo attribuito il problema al precache del service
worker. Sbagliato — il file era sano e rispondeva 200. Le due voci aggiunte al
precache restano comunque utili offline, ma non erano la causa.

---

## Nota sulla lentezza — RISOLTA (confermato il 7 agosto 2026)

Sul Mac **non si riproduce**: dati in 150–370 ms, DOM minuscolo (Spese: 328 nodi,
11 righe), immagini a posto. Quindi la causa è nel motore di iOS, non nei dati.

Rimossi tre costrutti che su WebKit costano molto e su desktop no:

1. `body::before` con `mix-blend-mode: multiply` a tutto schermo e `position: fixed`
   — obbligava a ricomporre l'intero documento a ogni frame. Ora è un velo con
   sola opacità, visivamente identico.
2. `backdrop-filter: blur(14px)` sulla barra fissa in basso — rasterizzazione
   della striscia a ogni frame. Ora fondo pieno (era già opaca al 92%).
3. `euro()` costruiva un `Intl.NumberFormat` nuovo a ogni importo; in "Spese"
   erano decine per render. Ora uno solo, riusato.

Le tre correzioni sono bastate: Mike ha confermato sul telefono il 7 agosto 2026.
Da notare per il futuro: **sul Mac il problema non si vedeva affatto**, perché
Blink/V8 gestisce bene sia la fusione a schermo intero sia gli `Intl` ripetuti.
Se ricapita un "lento solo su iPhone", guardare per prime le stesse tre famiglie:
livelli fissi che si fondono o si sfocano, e oggetti costosi ricostruiti dentro
un render.

Resta comunque vero che "Il progetto" scarica ~1 MB di miniature (12 × ~90 KB a
600px, mostrate a ~340px): non era la causa, ma se un giorno servisse alleggerire,
si rigenerano più piccole.
