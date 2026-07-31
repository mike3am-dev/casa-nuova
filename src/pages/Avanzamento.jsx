import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PhotoGrid from '../components/PhotoGrid'

const STATI = ['previsto', 'in_posa', 'fatto']
const LABEL = { previsto: 'previsto', in_posa: 'in posa', fatto: 'fatto' }

export default function Capitolato() {
  const [capitolato, setCapitolato] = useState(null)
  const [fotoCap, setFotoCap] = useState({})
  const [apriCap, setApriCap] = useState(null)
  const [nuovo, setNuovo] = useState(false)

  async function carica() {
    const [c, p] = await Promise.all([
      supabase.from('capitolato_items').select('*').order('sort'),
      supabase.from('photos').select('*').not('capitolato_item_id', 'is', null).order('created_at'),
    ])
    setCapitolato(c.data ?? [])
    const per = {}
    for (const ph of p.data ?? []) (per[ph.capitolato_item_id] ??= []).push(ph)
    setFotoCap(per)
  }
  useEffect(() => { carica() }, [])

  async function cicloStato(item) {
    const next = STATI[(STATI.indexOf(item.status) + 1) % STATI.length]
    await supabase.from('capitolato_items').update({ status: next }).eq('id', item.id)
    setCapitolato(cs => cs.map(c => c.id === item.id ? { ...c, status: next } : c))
  }

  async function aggiungi(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const { error } = await supabase.from('capitolato_items').insert({
      name: f.get('name'), sort: (capitolato.at(-1)?.sort ?? 0) + 1,
    })
    if (error) return alert(error.message)
    setNuovo(false); carica()
  }

  async function elimina(item) {
    if (!confirm(`Eliminare "${item.name}" dal capitolato?`)) return
    await supabase.from('capitolato_items').delete().eq('id', item.id)
    carica()
  }

  if (capitolato === null) return <div className="caricamento">carico il capitolato…</div>

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Capitolato</h2>
        <p>Ogni elemento tecnico previsto, con lo stato reale e le foto a riprova. Tocca lo stato per cambiarlo.</p>
      </div>

      <div className="card">
        <div className="card-eyebrow-row">
          <span className="eyebrow">Previsto vs reale</span>
          <button className="btn-mini" onClick={() => setNuovo(v => !v)}>{nuovo ? 'Chiudi' : '+ Voce'}</button>
        </div>

        {nuovo && (
          <form onSubmit={aggiungi} style={{ marginBottom: '1.2rem', display: 'flex', gap: '.6rem' }}>
            <input name="name" required placeholder="es. Impianto fotovoltaico" />
            <button className="btn" type="submit">Aggiungi</button>
          </form>
        )}

        {capitolato.map(item => (
          <div key={item.id}>
            <div className="cap-item">
              <p>
                {item.name}<br />
                <small>{(fotoCap[item.id]?.length ?? 0) ? `${fotoCap[item.id].length} foto a riprova` : 'nessuna foto ancora'}</small>
              </p>
              <div className="cap-foto">
                <button className="btn-mini" onClick={() => setApriCap(v => v === item.id ? null : item.id)}>
                  {apriCap === item.id ? 'chiudi foto' : 'foto'}
                </button>
                <button className={`pill ${item.status}`} onClick={() => cicloStato(item)} title="Tocca per cambiare stato">
                  {LABEL[item.status]}
                </button>
                <button className="btn-mini rosso" onClick={() => elimina(item)} aria-label="Elimina">✕</button>
              </div>
            </div>
            {apriCap === item.id && (
              <div style={{ padding: '0 0 1rem' }}>
                <PhotoGrid photos={fotoCap[item.id] ?? []} meta={{ capitolato_item_id: item.id }}
                  onChange={carica} addLabel="Foto a riprova" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
