import { useEffect, useState } from 'react'
import { previsione, cielo, giudizioDrone } from '../lib/meteo'
import { dataIt, giornoSettimana, quando } from '../lib/format'

/**
 * Che tempo farà al prossimo sopralluogo, e se si potrà alzare il drone.
 * Guarda le 12:00, l'ora in cui si vola.
 */
export default function MeteoDrone({ data, onClick }) {
  const [p, setP] = useState(undefined)   // undefined = sto guardando

  useEffect(() => {
    let vivo = true
    setP(undefined)
    const guarda = () => previsione(data).then(x => { if (vivo) setP(x) })
    guarda()

    // Se l'app resta aperta su questa pagina (su iPhone è la norma) il
    // componente non si rimonta e la previsione invecchia lì. Quando il
    // telefono torna attivo la ricontrollo: entro l'ora risponde la cache,
    // dopo va a riprendersela.
    const alRisveglio = () => { if (!document.hidden) guarda() }
    document.addEventListener('visibilitychange', alRisveglio)
    return () => { vivo = false; document.removeEventListener('visibilitychange', alRisveglio) }
  }, [data])

  if (!data) return null

  const dati = p && !p.passata && !p.troppoLontano ? p : null
  const [descrizione, icona] = dati ? cielo(dati.code) : []
  const g = dati ? giudizioDrone(dati) : null

  // Una riga sola sotto la data: o la previsione, o il motivo per cui non c'è.
  const nota = p === undefined ? 'guardo che tempo farà…'
    : p === null ? 'previsione non disponibile'
    : p.troppoLontano ? `previsione disponibile da due settimane prima`
    : null

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag className="meteo-drone" onClick={onClick} type={onClick ? 'button' : undefined}>
      <header className="md-testa">
        <span className="eyebrow">Prossimo sopralluogo</span>
        <b>{giornoSettimana(data)} {dataIt(data)}</b>
        <span className="md-quando">{quando(data)}</span>
      </header>

      {dati ? (
        <>
          <div className="md-riga">
            <div className="md-dato">
              <b><span className="md-icona" aria-hidden="true">{icona}</span>{dati.temperatura}°</b>
              <small>{descrizione}</small>
            </div>
            <div className="md-dato">
              <b>{dati.vento}<i>km/h</i></b>
              <small>raffiche {dati.raffiche}</small>
            </div>
            <div className="md-dato">
              <b>{dati.pioggia ?? '—'}<i>%</i></b>
              <small>pioggia</small>
            </div>
          </div>

          <p className={`md-drone ${g.esito === 'sì' ? 'ok' : g.esito === 'forse' ? 'forse' : 'no'}`}>
            <span className="md-pallino" aria-hidden="true" />
            {g.frase}
          </p>
        </>
      ) : (
        <p className="md-attesa">{nota}</p>
      )}
    </Tag>
  )
}
