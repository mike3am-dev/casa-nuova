import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signedUrl } from '../lib/media'
import { TUTTI_I_TAG, zoneDi } from '../lib/zone'
import { euro } from '../lib/format'

/**
 * Visore a schermo pieno per il materiale di Casa & Design.
 * Ovunque venga aperta un'immagine nel sito, da qui si possono cambiare gli ambienti.
 *
 * item      elemento di design_items
 * elenco    (opzionale) array per sfogliare avanti/indietro
 * onChiudi  callback
 * onModifica callback(itemAggiornato) per aggiornare la lista che sta sotto
 */
export default function VisoreFoto({ item, elenco, onChiudi, onModifica }) {
  const lista = elenco?.length ? elenco : (item ? [item] : [])
  const [i, setI] = useState(() => Math.max(0, lista.findIndex(x => x.id === item?.id)))
  const [url, setUrl] = useState(null)
  const [salvataggio, setSalvataggio] = useState(false)

  const corrente = lista[i] ?? item
  const zone = zoneDi(corrente ?? {})

  useEffect(() => {
    let vivo = true
    setUrl(null)
    if (corrente?.image_path) {
      signedUrl(corrente.image_path).then(u => { if (vivo) setUrl(u) }).catch(() => {})
    }
    return () => { vivo = false }
  }, [corrente?.image_path])

  useEffect(() => {
    function tasti(e) {
      if (e.key === 'Escape') onChiudi()
      if (e.key === 'ArrowLeft' && lista.length > 1) setI(v => (v - 1 + lista.length) % lista.length)
      if (e.key === 'ArrowRight' && lista.length > 1) setI(v => (v + 1) % lista.length)
    }
    addEventListener('keydown', tasti)
    return () => removeEventListener('keydown', tasti)
  }, [lista.length, onChiudi])

  if (!corrente) return null

  async function cambiaZona(z) {
    const nuove = zone.includes(z) ? zone.filter(x => x !== z) : [...zone, z]
    const meta = { ...(corrente.meta || {}), zone: nuove }
    delete meta.zona
    setSalvataggio(true)
    const { error } = await supabase.from('design_items').update({ meta }).eq('id', corrente.id)
    setSalvataggio(false)
    if (error) return alert('Non salvato: ' + error.message)
    onModifica?.({ ...corrente, meta })
  }

  const m = corrente.meta || {}

  return (
    <div className="visore" role="dialog" aria-modal="true" aria-label={corrente.title}
      onClick={e => { if (e.target === e.currentTarget) onChiudi() }}>
      <button className="chiudi" onClick={onChiudi}>Chiudi ✕</button>

      {lista.length > 1 && <>
        <button className="freccia sx" onClick={() => setI(v => (v - 1 + lista.length) % lista.length)} aria-label="Precedente">‹</button>
        <button className="freccia dx" onClick={() => setI(v => (v + 1) % lista.length)} aria-label="Successiva">›</button>
      </>}

      <div className="vis-corpo" onClick={e => e.stopPropagation()}>
        <div className="vis-img">
          {url ? <img src={url} alt={corrente.title} />
               : <div className="caricamento" style={{ color: '#D8C7AC' }}>carico…</div>}
        </div>

        <aside className="vis-pannello">
          <div className="vis-testa">
            <b>{corrente.title}</b>
            {m.prezzo != null && <span className="vis-prezzo">{euro(m.prezzo)}</span>}
          </div>
          {m.note && <p className="vis-nota">{m.note}</p>}

          <div className="vis-tag">
            <span className="eyebrow">
              In quali ambienti {salvataggio && <em>· salvo…</em>}
            </span>
            <p className="vis-aiuto">Tocca per accendere o spegnere. Compare nella checklist di ogni ambiente scelto.</p>
            <div className="tag-scelta">
              {TUTTI_I_TAG.map(z => (
                <button key={z} className={zone.includes(z) ? 'on' : ''} onClick={() => cambiaZona(z)}>{z}</button>
              ))}
            </div>
          </div>

          {m.link && (
            <a className="btn ghost vis-link" href={m.link} target="_blank" rel="noopener noreferrer">
              Apri la pagina del prodotto ↗
            </a>
          )}
          {lista.length > 1 && <p className="vis-conta">{i + 1} di {lista.length}</p>}
        </aside>
      </div>
    </div>
  )
}
