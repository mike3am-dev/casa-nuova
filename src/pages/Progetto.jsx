import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signedUrls } from '../lib/media'
import VisoreFoto from '../components/VisoreFoto'

export default function Progetto() {
  const [render, setRender] = useState(null)
  const [thumbs, setThumbs] = useState({})
  const [aperta, setAperta] = useState(null)   // elemento aperto nel visore

  async function carica() {
    const { data } = await supabase.from('design_items').select('*').eq('kind', 'progetto').order('sort').order('created_at')
    setRender(data ?? [])
  }
  useEffect(() => { carica() }, [])

  useEffect(() => {
    const paths = (render ?? []).map(r => r.thumb_path).filter(Boolean)
    if (paths.length) signedUrls(paths).then(setThumbs)
  }, [render])

  function aggiorna(nuovo) {
    setRender(rs => rs.map(r => r.id === nuovo.id ? nuovo : r))
    setAperta(a => (a?.id === nuovo.id ? nuovo : a))
  }

  if (render === null) return <div className="caricamento">carico il progetto…</div>

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Il progetto</h2>
        <p>I render ufficiali del complesso: le palazzine dai balconi ondulati vegetati, la torre e la corte verde. Tocca un'immagine per ingrandirla.</p>
      </div>

      {render.length === 0 ? (
        <p className="vuoto">Ancora nessun render.</p>
      ) : (
        <div className="mosaico">
          {render.map(r => (
            <button className="tile" key={r.id} onClick={() => setAperta(r)} aria-label={r.title}>
              {thumbs[r.thumb_path]
                ? <img src={thumbs[r.thumb_path]} alt={r.title} loading="lazy" decoding="async" />
                : <span className="tile-ph" />}
              <span className="tile-cap">{r.title}</span>
            </button>
          ))}
        </div>
      )}

      {aperta && (
        <VisoreFoto item={aperta} elenco={render}
          onChiudi={() => setAperta(null)} onModifica={aggiorna} />
      )}
    </section>
  )
}
