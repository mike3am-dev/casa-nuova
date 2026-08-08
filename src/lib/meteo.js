// Previsione per il prossimo sopralluogo, da Open-Meteo (niente chiavi, niente account).
// Interessa un'ora sola: mezzogiorno, quando si vola.

const COLOGNO = { lat: 45.5308, lon: 9.2783 }
const ORA = 12
const GIORNI_MAX = 16          // oltre non c'è previsione

// Codici WMO → come si dice in italiano
const CIELO = {
  0:  ['sereno', '☀️'],
  1:  ['quasi sereno', '🌤️'],
  2:  ['poco nuvoloso', '⛅'],
  3:  ['coperto', '☁️'],
  45: ['nebbia', '🌫️'], 48: ['nebbia gelata', '🌫️'],
  51: ['pioviggine', '🌦️'], 53: ['pioviggine', '🌦️'], 55: ['pioviggine fitta', '🌦️'],
  56: ['pioviggine gelata', '🌧️'], 57: ['pioviggine gelata', '🌧️'],
  61: ['pioggia debole', '🌧️'], 63: ['pioggia', '🌧️'], 65: ['pioggia forte', '🌧️'],
  66: ['pioggia gelata', '🌧️'], 67: ['pioggia gelata', '🌧️'],
  71: ['neve', '🌨️'], 73: ['neve', '🌨️'], 75: ['neve forte', '🌨️'], 77: ['nevischio', '🌨️'],
  80: ['rovesci', '🌦️'], 81: ['rovesci', '🌧️'], 82: ['rovesci forti', '⛈️'],
  85: ['rovesci di neve', '🌨️'], 86: ['rovesci di neve', '🌨️'],
  95: ['temporale', '⛈️'], 96: ['temporale con grandine', '⛈️'], 99: ['temporale con grandine', '⛈️'],
}
export const cielo = code => CIELO[code] ?? ['—', '🌡️']

// Il drone teme il vento più di ogni altra cosa: contano le raffiche, non la media.
// Un multirotore da consumo regge fino a ~38 km/h di raffica, ma sopra i 28
// le foto vengono mosse e la batteria si svuota a lottare contro l'aria.
export function giudizioDrone({ code, raffiche, vento }) {
  if (code >= 95) return { esito: 'no', frase: 'Temporale: il drone resta a casa.' }
  if (code >= 71 && code <= 77) return { esito: 'no', frase: 'Neve: niente volo.' }
  if (code >= 61 || code === 82) return { esito: 'no', frase: 'Pioggia: niente volo.' }
  if (code === 45 || code === 48) return { esito: 'no', frase: 'Nebbia: non si vedrebbe nulla.' }
  if (raffiche >= 38) return { esito: 'no', frase: `Raffiche a ${Math.round(raffiche)}: troppo vento.` }
  if (raffiche >= 28) return { esito: 'forse', frase: `Raffiche a ${Math.round(raffiche)}: vola basso e sbriga.` }
  if (code >= 51) return { esito: 'forse', frase: 'Pioviggine: serve un piano B.' }
  // si vola: resta da dire com'è la luce, che è quello che fa la differenza sulle foto
  if (code === 3) return { esito: 'sì', frase: 'Si vola, ma col coperto le foto vengono piatte.' }
  if (vento <= 12) return { esito: 'sì', frase: 'Aria ferma e cielo pulito: giornata giusta.' }
  return { esito: 'sì', frase: 'Vento tranquillo e buona luce: via libera.' }
}

/**
 * Previsione delle 12:00 per una data (ISO, "2026-08-21").
 * Torna null se la data è troppo lontana o se la richiesta non riesce:
 * il meteo è un di più, non deve mai rompere la pagina.
 */
export async function previsione(dataIso) {
  if (!dataIso) return null
  const giorni = Math.round((new Date(dataIso + 'T12:00:00') - new Date()) / 864e5)
  if (giorni < 0) return { troppoLontano: false, passata: true }
  if (giorni > GIORNI_MAX) return { troppoLontano: true, giorni }

  const chiave = `meteo:${dataIso}`
  try {
    const salvato = JSON.parse(sessionStorage.getItem(chiave) || 'null')
    if (salvato && Date.now() - salvato.quando < 36e5) return salvato.dati
  } catch { /* sessionStorage pieno o negato: pazienza */ }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${COLOGNO.lat}&longitude=${COLOGNO.lon}`
    + '&hourly=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation_probability'
    + `&timezone=Europe%2FRome&forecast_days=${GIORNI_MAX}`

  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const d = await r.json()
    const i = d.hourly.time.indexOf(`${dataIso}T${String(ORA).padStart(2, '0')}:00`)
    if (i < 0) return { troppoLontano: true, giorni }

    const dati = {
      temperatura: Math.round(d.hourly.temperature_2m[i]),
      code: d.hourly.weather_code[i],
      vento: Math.round(d.hourly.wind_speed_10m[i]),
      raffiche: Math.round(d.hourly.wind_gusts_10m[i]),
      pioggia: d.hourly.precipitation_probability?.[i] ?? null,
      giorni,
    }
    try { sessionStorage.setItem(chiave, JSON.stringify({ quando: Date.now(), dati })) } catch { /* pazienza */ }
    return dati
  } catch { return null }
}
