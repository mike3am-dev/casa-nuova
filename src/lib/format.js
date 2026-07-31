export const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
const MESI_BR = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function toDate(iso) {
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
}

export function dataIt(iso) {
  if (!iso) return ''
  const d = toDate(iso)
  return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`
}

// "1 lug", "17 giu"
export function dataBreve(iso) {
  if (!iso) return ''
  const d = toDate(iso)
  return `${d.getDate()} ${MESI_BR[d.getMonth()]}`
}

// "oggi", "domani", "tra 3 giorni", "8 giorni fa"
export function quando(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const g = Math.round((target - oggi) / 864e5)
  if (g === 0) return 'oggi'
  if (g === 1) return 'domani'
  if (g === -1) return 'ieri'
  if (g > 1) return `tra ${g} giorni`
  return `${-g} giorni fa`
}

export function giornoSettimana(iso) {
  const G = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
  const [y, m, d] = iso.split('-').map(Number)
  return G[new Date(y, m - 1, d).getDay()]
}

// { mese: 'luglio', anno: 2026, key: '2026-6' }
export function meseAnno(iso) {
  const d = toDate(iso)
  return { mese: MESI[d.getMonth()], anno: d.getFullYear(), key: `${d.getFullYear()}-${d.getMonth()}` }
}

// Un solo formattatore per tutta l'app: costruire un Intl.NumberFormat costa
// molto su iPhone (JavaScriptCore), e "Spese" ne chiedeva uno nuovo a ogni importo.
const FMT_EURO = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export function euro(n) {
  if (n == null || n === '') return ''
  return FMT_EURO.format(n)
}

// Giorni di calendario che separano oggi dalla consegna.
// Confronta due mezzanotti locali: niente sfasamenti da fuso orario o ora legale.
export function giorniAllaConsegna(deliveryDate = '2027-12-30') {
  const [y, m, d] = deliveryDate.split('-').map(Number)
  const fine = new Date(y, m - 1, d)
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((fine - oggi) / 864e5))
}

// I quattro sguardi su ogni ambiente: due sulla casa di oggi, due su quella nuova.
export const CODICI = {
  ok:        { emoji: '✅', label: 'oggi funziona',   titolo: 'Oggi mi piace',   sotto: 'da riportare nella casa nuova' },
  manca:     { emoji: '❌', label: 'oggi non va',     titolo: 'Oggi non funziona', sotto: 'da non ripetere' },
  desiderio: { emoji: '📋', label: 'desiderio',       titolo: 'Desideri',        sotto: 'più ce ne sono, più è la casa dei sogni' },
  domanda:   { emoji: '🤔', label: 'da chiarire',     titolo: 'Dubbi da chiarire', sotto: 'con geometra o architetto' },
  tecnico:   { emoji: '📐', label: 'tecnico',         titolo: 'Note tecniche',   sotto: 'predisposizioni e misure' },
}
export const ORDINE_CODICI = ['ok', 'manca', 'desiderio', 'domanda', 'tecnico']
