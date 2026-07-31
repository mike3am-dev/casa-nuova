import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signedUrls } from '../lib/media'
import { euro } from '../lib/format'
import { TUTTI_I_TAG, zoneDi } from '../lib/zone'
import VisoreFoto from '../components/VisoreFoto'
import imageCompression from 'browser-image-compression'

const KINDS = { ispirazione: 'Ispirazione', salone: 'Salone', arredo: 'Arredo', tech: 'Tech', render: 'Render e planimetrie' }

// le tab che raccolgono cose da comprare: hanno stato decisionale e confronto
const ACQUISTI = ['arredo', 'tech']
const STATI = {
  valutare:  { label: 'da valutare',  emoji: '♥' },
  acquistare:{ label: 'da acquistare', emoji: '★' },
  comprato:  { label: 'comprato',     emoji: '✓' },
}
const ORDINE_STATI = ['valutare', 'acquistare', 'comprato']

export default function Design() {
  const [items, setItems] = useState(null)
  const [kind, setKind] = useState('ispirazione')
  const [thumbs, setThumbs] = useState({})
  const [grande, setGrande] = useState(null)
  const [form, setForm] = useState(false)
  const [editItem, setEditItem] = useState(null)   // voce in modifica, o null = nuova
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const [zoneSel, setZoneSel] = useState([])   // zone scelte nel form (multiple)
  const [filtroStato, setFiltroStato] = useState('')   // '' = tutti
  const [confronto, setConfronto] = useState(null)     // null = spento, [] = selezione in corso
  const [urlConfronto, setUrlConfronto] = useState({})

  async function carica() {
    const { data } = await supabase.from('design_items').select('*').order('sort').order('created_at')
    setItems(data ?? [])
  }
  useEffect(() => { carica() }, [])

  const acquisti = ACQUISTI.includes(kind)
  const statoDi = it => it.meta?.stato || 'valutare'

  const visibili = useMemo(() => {
    let v = (items ?? []).filter(i => i.kind === kind)
    if (acquisti && filtroStato) v = v.filter(i => statoDi(i) === filtroStato)
    return v
  }, [items, kind, filtroStato, acquisti])

  // conteggi per stato e totale di spesa della tab corrente
  const perStato = useMemo(() => {
    const tutti = (items ?? []).filter(i => i.kind === kind)
    const c = {}
    for (const it of tutti) c[statoDi(it)] = (c[statoDi(it)] || 0) + 1
    return { c, tutti }
  }, [items, kind])

  const totaleTab = perStato.tutti
    .filter(i => ['piace', 'scelto', 'comprato'].includes(statoDi(i)))
    .reduce((t, i) => t + Number(i.meta?.prezzo || 0), 0)

  async function impostaStato(item, stato) {
    const meta = { ...(item.meta || {}), stato }
    setItems(is => is.map(x => x.id === item.id ? { ...x, meta } : x))
    await supabase.from('design_items').update({ meta }).eq('id', item.id)
  }

  function toggleConfronto(item) {
    setConfronto(c => {
      if (!c) return [item.id]
      return c.includes(item.id) ? c.filter(x => x !== item.id) : [...c, item.id].slice(-4)
    })
  }

  // carica le immagini grandi per la vista confronto
  useEffect(() => {
    if (!confronto?.length) return
    const scelti = (items ?? []).filter(i => confronto.includes(i.id))
    signedUrls(scelti.map(i => i.image_path).filter(Boolean)).then(setUrlConfronto)
  }, [confronto, items])

  useEffect(() => {
    const paths = visibili.map(i => i.thumb_path).filter(Boolean)
    if (paths.length) signedUrls(paths).then(setThumbs)
  }, [visibili])

  function apriNuovo() { setEditItem(null); setFileName(''); setZoneSel([]); setForm(true) }
  function apriModifica(item) { setEditItem(item); setFileName(''); setZoneSel(zoneDi(item)); setForm(true) }
  function chiudiForm() { setForm(false); setEditItem(null); setFileName(''); setZoneSel([]) }
  const toggleZona = z => setZoneSel(s => s.includes(z) ? s.filter(x => x !== z) : [...s, z])

  async function salva(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const file = f.get('file')
    const editing = !!editItem
    if (!editing && (!file || !file.size)) return alert('Aggiungi un\'immagine.')
    setBusy(true)
    try {
      let image_path = editItem?.image_path ?? null
      let thumb_path = editItem?.thumb_path ?? null
      if (file && file.size) {
        const id = crypto.randomUUID()
        const ip = `design/${id}.jpg`, tp = `design/${id}.thumb.jpg`
        const [web, th] = await Promise.all([
          imageCompression(file, { maxWidthOrHeight: 2560, maxSizeMB: 2.6, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.9 }),
          imageCompression(file, { maxWidthOrHeight: 600, maxSizeMB: 0.12, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.72 }),
        ])
        let r = await supabase.storage.from('media').upload(ip, web, { contentType: 'image/jpeg' })
        if (r.error) throw r.error
        r = await supabase.storage.from('media').upload(tp, th, { contentType: 'image/jpeg' })
        if (r.error) throw r.error
        if (editing && editItem.image_path) {
          await supabase.storage.from('media').remove([editItem.image_path, editItem.thumb_path].filter(Boolean))
        }
        image_path = ip; thumb_path = tp
      }

      const prezzo = f.get('prezzo') === '' ? null : Number(f.get('prezzo'))
      const meta = { ...(editItem?.meta ?? {}), zone: zoneSel, prezzo, link: f.get('link') || '' }
      delete meta.zona   // sostituito da zone[]
      if (editing) {
        const { error } = await supabase.from('design_items')
          .update({ title: f.get('title'), kind: f.get('kind') || editItem.kind, image_path, thumb_path, meta })
          .eq('id', editItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('design_items').insert({ kind, title: f.get('title'), image_path, thumb_path, meta })
        if (error) throw error
      }
      chiudiForm(); carica()
    } catch (err) { alert('Non salvato: ' + err.message) }
    finally { setBusy(false) }
  }

  function apri(item) {
    if (item.image_path) setGrande(item)
  }

  function aggiornaItem(nuovo) {
    setItems(is => is.map(x => x.id === nuovo.id ? nuovo : x))
    setGrande(g => (g?.id === nuovo.id ? nuovo : g))
  }

  async function elimina(item) {
    if (!confirm(`Eliminare "${item.title}"?`)) return
    if (item.image_path) await supabase.storage.from('media').remove([item.image_path, item.thumb_path].filter(Boolean))
    await supabase.from('design_items').delete().eq('id', item.id)
    carica()
  }

  if (items === null) return <div className="caricamento">carico Casa &amp; design…</div>

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Casa &amp; design</h2>
        <p>La materia della casa: le superfici, i toni, i pezzi scelti. Wabi-Sabi Mediterranean.</p>
      </div>

      <div className="kind-tabs stanze">
        {Object.entries(KINDS).map(([k, l]) => (
          <button key={k} className={k === kind ? 'on' : ''}
            onClick={() => { setKind(k); chiudiForm(); setConfronto(null); setFiltroStato('') }}>{l}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-eyebrow-row">
          <span className="eyebrow">{KINDS[kind]}</span>
          <span style={{ display: 'flex', gap: '.7rem', alignItems: 'baseline' }}>
            {acquisti && perStato.tutti.length > 1 && (
              <button className="btn-mini" onClick={() => setConfronto(c => (c ? null : []))}>
                {confronto ? 'Esci dal confronto' : '⇄ Confronta'}
              </button>
            )}
            <button className="btn-mini" onClick={() => (form ? chiudiForm() : apriNuovo())}>{form ? 'Chiudi' : '+ Aggiungi'}</button>
          </span>
        </div>

        {acquisti && perStato.tutti.length > 0 && (
          <div className="stati-barra">
            <div className="stati-filtri">
              <button className={filtroStato === '' ? 'on' : ''} onClick={() => setFiltroStato('')}>
                tutti <b>{perStato.tutti.length}</b>
              </button>
              {ORDINE_STATI.map(s => perStato.c[s] && (
                <button key={s} className={`${filtroStato === s ? 'on' : ''} st-${s}`} onClick={() => setFiltroStato(f => f === s ? '' : s)}>
                  {STATI[s].label} <b>{perStato.c[s]}</b>
                </button>
              ))}
            </div>
            {totaleTab > 0 && (
              <small className="stati-totale">
                da mettere a budget: <b>{euro(totaleTab)}</b>
                <span> · solo ♥ scelti e comprati</span>
              </small>
            )}
          </div>
        )}

        {confronto && (
          <p className="pay-avviso">
            {confronto.length === 0 ? 'Tocca due o più pezzi per confrontarli (max 4).'
              : `${confronto.length} ${confronto.length === 1 ? 'selezionato' : 'selezionati'} — toccane un altro o scorri in fondo per il confronto.`}
          </p>
        )}

        {form && (
          <form onSubmit={salva} className="d-form" key={editItem?.id || 'nuovo'}>
            <div className="d-grid">
              <div className={editItem ? 'fld' : 'fld fld-full'}><label>Titolo</label>
                <input name="title" required defaultValue={editItem?.title || ''} placeholder="es. Robot aspirapolvere Dreame X50 Master" /></div>
              {editItem && (
                <div className="fld"><label>In quale sezione</label>
                  <select name="kind" defaultValue={editItem.kind}>
                    {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              )}
              <div className="fld fld-full"><label>Dove serve · se ne possono scegliere più d'uno</label>
                <div className="tag-scelta">
                  {TUTTI_I_TAG.map(z => (
                    <button type="button" key={z}
                      className={zoneSel.includes(z) ? 'on' : ''}
                      onClick={() => toggleZona(z)}>{z}</button>
                  ))}
                </div>
              </div>
              <div className="fld"><label>Prezzo (€)</label>
                <input name="prezzo" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={editItem?.meta?.prezzo ?? ''} placeholder="es. 1299" /></div>
              <div className="fld fld-full"><label>Link</label>
                <input name="link" type="url" defaultValue={editItem?.meta?.link || ''} placeholder="https://…" /></div>
              <div className="fld fld-full"><label>Immagine{editItem ? ' (lascia vuoto per non cambiarla)' : ''}</label>
                <label className="file-drop">
                  <input name="file" type="file" accept="image/*" required={!editItem} hidden
                    onChange={e => setFileName(e.target.files[0]?.name || '')} />
                  <svg width="22" height="22" viewBox="0 0 22 22" className="glyph"><path d="M3 15l4-4 3 3 4-5 5 6M3 5.5h16v11H3z" /></svg>
                  <span>{fileName || (editItem ? 'Cambia immagine (opzionale)' : 'Scegli o trascina un’immagine')}</span>
                </label>
              </div>
            </div>
            <div className="d-actions">
              <button className="btn" type="submit" disabled={busy}>{busy ? 'Salvo…' : (editItem ? 'Salva modifiche' : 'Salva')}</button>
              <button className="btn quiet" type="button" onClick={chiudiForm}>Annulla</button>
            </div>
          </form>
        )}

        {visibili.length === 0 && !form && (
          <p className="vuoto">Ancora vuoto. Aggiungi il primo elemento con “+ Aggiungi”.</p>
        )}

        <div className="mood">
          {visibili.map(item => {
            const m = item.meta || {}
            const sel = confronto?.includes(item.id)
            return (
              <div key={item.id} className={sel ? 'in-confronto' : ''}>
                <button className="m-item"
                  onClick={() => (confronto ? toggleConfronto(item) : apri(item))}
                  aria-label={item.title}>
                  {item.thumb_path && thumbs[item.thumb_path]
                    ? <img src={thumbs[item.thumb_path]} alt={item.title} loading="lazy" />
                    : <div className="senza-foto">{item.title}</div>}
                  {confronto && <span className="segno-confronto">{sel ? '✓' : ''}</span>}
                </button>
                <div className="m-cap">
                  <span className="zona">{zoneDi(item).join(' · ') || KINDS[item.kind]}</span>
                  <span className="tit">{item.title}</span>
                  <span className="m-riga-fine">
                    <span className="prezzo">{m.prezzo != null ? euro(m.prezzo) : ''}</span>
                    {acquisti && (
                      <select className={`stato-sel st-${statoDi(item)}`} value={statoDi(item)}
                        onChange={e => impostaStato(item, e.target.value)} aria-label="Stato">
                        {ORDINE_STATI.map(s => (
                          <option key={s} value={s}>{STATI[s].emoji} {STATI[s].label}</option>
                        ))}
                      </select>
                    )}
                  </span>
                </div>
                <button className="m-edit" onClick={() => apriModifica(item)} aria-label="Modifica">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z" /></svg>
                </button>
                <button className="m-del" onClick={() => elimina(item)} aria-label="Elimina">✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {confronto?.length >= 2 && (
        <div className="card confronto-card">
          <div className="card-eyebrow-row">
            <span className="eyebrow">Confronto · {confronto.length} pezzi</span>
            <button className="btn-mini" onClick={() => setConfronto([])}>Svuota</button>
          </div>
          <div className="confronto-griglia" style={{ gridTemplateColumns: `repeat(${confronto.length}, 1fr)` }}>
            {confronto.map(id => {
              const it = (items ?? []).find(x => x.id === id)
              if (!it) return null
              const m = it.meta || {}
              return (
                <div className="cfr-col" key={id}>
                  <div className="cfr-img">
                    {urlConfronto[it.image_path]
                      ? <img src={urlConfronto[it.image_path]} alt={it.title} />
                      : <span className="caricamento" />}
                  </div>
                  <b>{it.title}</b>
                  <div className="cfr-riga"><small>prezzo</small><span className="imp">{m.prezzo != null ? euro(m.prezzo) : '—'}</span></div>
                  <div className="cfr-riga"><small>dove</small><span>{zoneDi(it).join(' · ') || '—'}</span></div>
                  <div className="cfr-riga"><small>stato</small>
                    <select className={`stato-sel st-${statoDi(it)}`} value={statoDi(it)}
                      onChange={e => impostaStato(it, e.target.value)} aria-label="Stato">
                      {ORDINE_STATI.map(s => (
                        <option key={s} value={s}>{STATI[s].emoji} {STATI[s].label}</option>
                      ))}
                    </select>
                  </div>
                  {m.note && <p className="cfr-note">{m.note}</p>}
                  <div className="cfr-azioni">
                    {m.link && <a className="btn-mini" href={m.link} target="_blank" rel="noopener noreferrer">Apri ↗</a>}
                    <button className="btn-mini" onClick={() => toggleConfronto(it)}>togli</button>
                  </div>
                </div>
              )
            })}
          </div>
          {confronto.length >= 2 && (() => {
            const scelti = confronto.map(id => (items ?? []).find(x => x.id === id)).filter(Boolean)
            const conPrezzo = scelti.filter(s => s.meta?.prezzo != null)
            if (conPrezzo.length < 2) return null
            const min = Math.min(...conPrezzo.map(s => s.meta.prezzo))
            const max = Math.max(...conPrezzo.map(s => s.meta.prezzo))
            return <p className="pay-avviso">Differenza tra il più caro e il più economico: <b>{euro(max - min)}</b></p>
          })()}
        </div>
      )}

      {grande && (
        <VisoreFoto item={grande} elenco={visibili}
          onChiudi={() => setGrande(null)} onModifica={aggiornaItem} />
      )}
    </section>
  )
}
