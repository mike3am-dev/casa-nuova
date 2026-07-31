import { useMemo, useState } from 'react'
import { GLOSSARIO } from '../lib/glossario'

export default function Glossario() {
  const [q, setQ] = useState('')

  const filtrato = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return GLOSSARIO
    return GLOSSARIO.map(g => ({
      ...g,
      voci: g.voci.filter(([t, def, cant]) => (t + ' ' + def + ' ' + cant).toLowerCase().includes(s)),
    })).filter(g => g.voci.length)
  }, [q])

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Glossario tecnico</h2>
        <p>Le parole del cantiere spiegate in due righe, ognuna con un riferimento concreto alla tua costruzione.</p>
      </div>

      <div className="card">
        <input className="gloss-search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cerca un termine… (es. soletta, PE-Xa, disarmo)" aria-label="Cerca nel glossario" />
        {filtrato.length === 0 && <p className="vuoto">Nessun termine trovato.</p>}
        {filtrato.map(g => (
          <div className="gloss-cat" key={g.cat}>
            <h4>{g.cat}</h4>
            <div className="gloss-grid">
              {g.voci.map(([t, def, cant]) => (
                <div className="gloss-voce" key={t}>
                  <b>{t}</b>
                  <p>{def}</p>
                  <small><span className="freccia">→</span> Nel tuo cantiere: {cant}</small>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
