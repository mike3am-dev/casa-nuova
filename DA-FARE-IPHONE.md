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
- [~] **Lentezza**: vedi nota sotto.

## Checklist
- [x] **Swipe a sinistra = elimina**, **swipe a destra = fatta/da fare**.
- [x] Tolte le **icone di stato a destra** (tick verde/rosso).
- [x] Tolta l'**emoji da ogni riga** (restano solo nelle intestazioni di categoria).
- [x] "+ scadenza" e "+ nota" sostituiti da una **matita** che apre i dettagli.

## Spese e documenti
- [x] **Niente modifiche da iPhone** (compresa la pillola dello stato, che si toccava per sbaglio).
- [~] **Lentezza**: vedi nota sotto.

## Va bene così
- Casa & Design su iPhone è chiaro e comprensibile.

## Logo rotto nella schermata iniziale
- [x] `logo.png` e `favicon.png` erano **fuori dal precache** del service worker
      (c'erano 10 voci su 12). Il file era sano e online rispondeva 200: mancava
      solo in cache, quindi senza rete o con rete incerta restava il riquadro
      rotto. Ora sono precaricati entrambi.
- Se ricapita **con rete buona**, non è questo: dimmelo e lo guardo daccapo.

---

## Nota sulla lentezza — da confermare sul telefono

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

**Non è dimostrato che questi tre risolvano**: su questa macchina manca Xcode/il
simulatore iOS, quindi WebKit vero non è stato testato. Se dopo l'aggiornamento
"Il progetto" e "Spese" sono ancora lente, il prossimo passo è misurare sul
telefono (pagina di misura temporanea, poi rimossa) invece di tirare a indovinare.

Resta comunque vero che "Il progetto" scarica ~1 MB di miniature (12 × ~90 KB a
600px, mostrate a ~340px): se la lentezza è lì, si risolve rigenerando le
miniature più piccole.
