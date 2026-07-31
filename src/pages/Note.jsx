import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dataIt } from '../lib/format'

export default function Note() {
  const [note, setNote] = useState(null)
  const [testo, setTesto] = useState('')
  const [domande, setDomande] = useState([])   // voci 🤔 dalla checklist

  useEffect(() => {
    supabase.from('geometra_notes').select('*').order('done').order('created_at', { ascending: false })
      .then(({ data }) => setNote(data ?? []))
    supabase.from('checklist_items').select('id,text,note,room_id,done,meta')
      .eq('code', 'domanda').eq('done', false)
      .then(async ({ data }) => {
        if (!data?.length) return
        const { data: st } = await supabase.from('rooms').select('id,name')
        const nomi = Object.fromEntries((st ?? []).map(r => [r.id, r.name]))
        setDomande(data.map(d => ({ ...d, stanza: nomi[d.room_id] ?? '' })))
      })
  }, [])

  async function aggiungi(e) {
    e.preventDefault()
    if (!testo.trim()) return
    const { data, error } = await supabase.from('geometra_notes').insert({ text: testo.trim() }).select().single()
    if (error) return alert(error.message)
    setNote(ns => [data, ...ns]); setTesto('')
  }

  async function toggle(n) {
    setNote(ns => ns.map(x => x.id === n.id ? { ...x, done: !n.done } : x))
    await supabase.from('geometra_notes').update({ done: !n.done }).eq('id', n.id)
  }

  async function elimina(n) {
    if (!confirm('Eliminare questa nota?')) return
    await supabase.from('geometra_notes').delete().eq('id', n.id)
    setNote(ns => ns.filter(x => x.id !== n.id))
  }

  if (note === null) return <div className="caricamento">carico le note…</div>
  const daFare = note.filter(n => !n.done)

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Note per il geometra</h2>
        <p>Scrivile quando ti vengono in mente — così ai meeting arrivi preparato.</p>
      </div>

      <div className="card">
        <form onSubmit={aggiungi} style={{ display: 'flex', gap: '.6rem' }}>
          <input value={testo} onChange={e => setTesto(e.target.value)}
            placeholder="es. Chiedere la data di chiusura del tetto…" aria-label="Nuova nota" />
          <button className="btn" type="submit" disabled={!testo.trim()}>Aggiungi</button>
        </form>

        {note.length === 0 && <p className="vuoto">Nessuna nota. La prossima cosa che ti viene in mente, scrivila qui.</p>}
        {daFare.length > 0 && <p style={{ margin: '1.2rem 0 0', fontSize: '.8rem', color: 'var(--inchiostro-2)' }}>
          {daFare.length === 1 ? '1 cosa da dire' : `${daFare.length} cose da dire`} al prossimo incontro
        </p>}

        {note.map(n => (
          <div key={n.id} className={`nota ${n.done ? 'done' : ''}`}>
            <button className="check" onClick={() => toggle(n)} aria-label={n.done ? 'Segna da fare' : 'Segna detta'}
              style={n.done ? { background: 'var(--oliva)', borderColor: 'var(--oliva)' } : {}}>
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: n.done ? 1 : 0, stroke: 'var(--calce)', strokeWidth: 2.5, fill: 'none' }}><path d="M2 6.5l2.5 2.5L10 3" /></svg>
            </button>
            <div className="vtx">
              <p>{n.text}</p>
              <small>{n.done ? 'detta' : 'aggiunta'} · {dataIt(n.created_at.slice(0, 10))}</small>
            </div>
            <button className="btn-mini rosso" onClick={() => elimina(n)} aria-label="Elimina nota">✕</button>
          </div>
        ))}
      </div>

      {domande.length > 0 && (
        <div className="card">
          <div className="card-eyebrow-row">
            <span className="eyebrow">Domande aperte dalla checklist</span>
            <small>🤔 {domande.length}</small>
          </div>
          {domande.map(d => (
            <div className="nota" key={d.id}>
              <span className="cod" style={{ fontSize: '1.05rem' }}>🤔</span>
              <div className="vtx">
                <p>{d.text}</p>
                <small>{[d.stanza, d.note].filter(Boolean).join(' · ')}</small>
              </div>
            </div>
          ))}
          <p className="pay-avviso">Si spuntano dalla scheda dell'ambiente, in Checklist.</p>
        </div>
      )}
    </section>
  )
}
