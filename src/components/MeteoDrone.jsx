import { useEffect, useState } from 'react'
import { previsione, cielo, giudizioDrone } from '../lib/meteo'
import { dataIt, giornoSettimana, quando } from '../lib/format'

/**
 * Che tempo farà al prossimo sopralluogo, e se si potrà alzare il drone.
 * Guarda le 12:00, l'ora in cui si vola.
 */
export default function MeteoDrone({ data }) {
  const [p, setP] = useState(undefined)   // undefined = sto guardando

  useEffect(() => {
    let vivo = true
    setP(undefined)
    previsione(data).then(x => { if (vivo) setP(x) })
    return () => { vivo = false }
  }, [data])

  if (!data) return null

  const testa = (
    <div className="md-testa">
      <span className="eyebrow">Prossimo sopralluogo</span>
      <b>{giornoSettimana(data)} {dataIt(data)}</b>
      <small>{quando(data)}</small>
    </div>
  )

  if (p === undefined) return <div className="meteo-drone">{testa}<p className="md-attesa">guardo che tempo farà…</p></div>
  if (p === null) return <div className="meteo-drone">{testa}<p className="md-attesa">previsione non disponibile adesso.</p></div>
  if (p.passata) return <div className="meteo-drone">{testa}</div>
  if (p.troppoLontano) return (
    <div className="meteo-drone">{testa}
      <p className="md-attesa">Ancora {p.giorni} giorni: la previsione arriva a due settimane di distanza.</p>
    </div>
  )

  const [descrizione, icona] = cielo(p.code)
  const g = giudizioDrone(p)

  return (
    <div className="meteo-drone">
      {testa}

      <div className="md-riga">
        <span className="md-icona" aria-hidden="true">{icona}</span>
        <div className="md-cielo">
          <b>{p.temperatura}°</b>
          <small>{descrizione}</small>
        </div>
        <div className="md-vento">
          <b>{p.vento} <i>km/h</i></b>
          <small>raffiche {p.raffiche}</small>
        </div>
        {p.pioggia != null && (
          <div className="md-pioggia">
            <b>{p.pioggia}%</b>
            <small>pioggia</small>
          </div>
        )}
      </div>

      <p className={`md-drone ${g.esito === 'sì' ? 'ok' : g.esito === 'forse' ? 'forse' : 'no'}`}>
        <span className="md-pallino" aria-hidden="true" />
        {g.frase}
      </p>

      <small className="md-fonte">previsione per le 12:00 · {p.giorni > 7 ? 'a due settimane di distanza, da riguardare' : 'affidabile'}</small>
    </div>
  )
}
