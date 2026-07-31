import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CODICI, ORDINE_CODICI } from '../lib/format'
import { FASI, ORDINE_FASI } from '../lib/fasi'
import { riguarda } from '../lib/zone'
import { signedUrls } from '../lib/media'
import VisoreFoto from '../components/VisoreFoto'

const PLACEHOLDER = {
  ok: 'cosa funziona già oggi…',
  manca: 'cosa non sopporti oggi…',
  desiderio: 'cosa vorresti avere…',
  domanda: 'cosa chiedere al geometra…',
  tecnico: 'predisposizione o misura…',
}

const SOGLIA = 72   // quanto trascinare perché lo swipe conti

/**
 * Una riga della checklist, come in Promemoria:
 * swipe a destra = fatta / da fare, swipe a sinistra = elimina,
 * matita = apre i dettagli. Niente emoji, niente icone di stato a destra.
 */
function VoceRiga({ v, thumbs, onToggle, onElimina, onFoto, onDettagli, sotto }) {
  const [dx, setDx] = useState(0)
  const [trascino, setTrascino] = useState(false)
  const p = useRef(null)

  function inizio(e) {
    const t = e.touches[0]
    p.current = { x: t.clientX, y: t.clientY, deciso: null }
  }
  function muovi(e) {
    if (!p.current) return
    const t = e.touches[0]
    const ddx = t.clientX - p.current.x
    const ddy = t.clientY - p.current.y
    // decido una volta sola se è uno swipe orizzontale o uno scorrimento verticale
    if (p.current.deciso === null) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return
      p.current.deciso = Math.abs(ddx) > Math.abs(ddy)
      if (p.current.deciso) setTrascino(true)
    }
    if (!p.current.deciso) return
    setDx(Math.max(-140, Math.min(140, ddx)))
  }
  function fine() {
    const d = dx
    const era = p.current?.deciso
    p.current = null
    setTrascino(false); setDx(0)
    if (!era) return
    if (d > SOGLIA) onToggle(v)
    else if (d < -SOGLIA) onElimina(v)
  }

  const versoDestra = dx > 0
  return (
    <div className="voce-swipe">
      <div className={`voce-sotto ${versoDestra ? 'a-destra' : 'a-sinistra'}`} aria-hidden="true">
        <span className="sw-fatta">{v.done ? 'Da fare' : 'Fatta'}</span>
        <span className="sw-elimina">Elimina</span>
      </div>

      <div className={`voce ${v.done ? 'done' : ''}`}
        style={{ transform: `translateX(${dx}px)`, transition: trascino ? 'none' : 'transform .2s ease' }}
        onTouchStart={inizio} onTouchMove={muovi} onTouchEnd={fine} onTouchCancel={fine}>

        <button className="check" onClick={() => onToggle(v)}
          aria-label={v.done ? 'Segna da fare' : 'Segna fatta'}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3" /></svg>
        </button>

        <div className="vtx">
          <p className="riga-testo" onClick={() => onDettagli(v)}>{v.text}</p>
          {sotto}
        </div>

        {v.meta?.foto_thumb && thumbs[v.meta.foto_thumb] && (
          <button className="voce-foto" onClick={() => onFoto(v)} aria-label="Apri foto di riferimento">
            <img src={thumbs[v.meta.foto_thumb]} alt="" loading="lazy" decoding="async" />
          </button>
        )}

        <button className="voce-matita" onClick={() => onDettagli(v)} aria-label={`Dettagli di ${v.text}`}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 2.5l2 2L6 12l-2.7.7L4 10z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/** Scheda dei dettagli: qui dentro stanno testo, nota, scadenza e categoria. */
function SchedaDettagli({ v, onChiudi, onSalva, onElimina }) {
  const [testo, setTesto] = useState(v.text)
  const [nota, setNota] = useState(v.note || '')
  const [fase, setFase] = useState(v.meta?.fase || '')
  const [code, setCode] = useState(v.code)

  function salva(e) {
    e.preventDefault()
    const pulito = testo.trim()
    if (!pulito) return
    onSalva(v, { text: pulito, note: nota.trim(), code, meta: { ...(v.meta || {}), fase } })
  }

  return (
    <div className="scheda-fondo" role="dialog" aria-modal="true" aria-label="Dettagli della voce"
      onClick={e => { if (e.target === e.currentTarget) onChiudi() }}>
      <form className="scheda" onSubmit={salva}>
        <div className="scheda-testa">
          <span className="eyebrow">Dettagli</span>
          <button type="button" className="btn-mini" onClick={onChiudi}>Chiudi</button>
        </div>

        <label className="fld fld-full"><span>Voce</span>
          <input value={testo} onChange={e => setTesto(e.target.value)} autoFocus required /></label>

        <label className="fld fld-full"><span>Nota</span>
          <input value={nota} onChange={e => setNota(e.target.value)} placeholder="dettagli, misure…" /></label>

        <label className="fld fld-full"><span>Entro quando</span>
          <select value={fase} onChange={e => setFase(e.target.value)}>
            <option value="">— non urgente</option>
            {ORDINE_FASI.map(f => <option key={f} value={f}>{FASI[f].label}</option>)}
          </select></label>

        <label className="fld fld-full"><span>Categoria</span>
          <select value={code} onChange={e => setCode(e.target.value)}>
            {ORDINE_CODICI.map(k => <option key={k} value={k}>{CODICI[k].titolo}</option>)}
          </select></label>

        <div className="scheda-azioni">
          <button className="btn" type="submit">Salva</button>
          <button className="btn quiet rosso" type="button" onClick={() => onElimina(v)}>Elimina</button>
        </div>
      </form>
    </div>
  )
}

export default function Checklist() {
  const [stanze, setStanze] = useState(null)
  const [attiva, setAttiva] = useState(null)      // room_id, oppure 'urgenze'
  const [voci, setVoci] = useState([])            // voci della stanza attiva
  const [tutte, setTutte] = useState([])          // tutte le voci (per la vista urgenze)
  const [ispirazioni, setIspirazioni] = useState([])
  const [thumbs, setThumbs] = useState({})
  const [form, setForm] = useState(false)
  const [grande, setGrande] = useState(null)
  const [dettagli, setDettagli] = useState(null)   // voce aperta nella scheda dettagli

  useEffect(() => {
    supabase.from('rooms').select('*').order('sort').then(({ data }) => {
      setStanze(data ?? [])
      if (data?.length) setAttiva(data.find(r => r.name === 'Cucina')?.id ?? data[0].id)
    })
    // tutto il materiale di Casa & Design tranne i render ufficiali del complesso
    supabase.from('design_items').select('id,title,kind,thumb_path,image_path,meta')
      .neq('kind', 'progetto')
      .then(({ data }) => setIspirazioni(data ?? []))
  }, [])

  async function caricaVoci() {
    const { data } = await supabase.from('checklist_items').select('*')
      .order('done').order('sort').order('created_at')
    const all = data ?? []
    setTutte(all)
    setVoci(attiva && attiva !== 'urgenze' ? all.filter(v => v.room_id === attiva) : [])
  }
  useEffect(() => { if (attiva) caricaVoci() }, [attiva])

  // miniature delle foto agganciate
  useEffect(() => {
    const usate = tutte.map(v => v.meta?.foto_thumb).filter(Boolean)
    const cat = ispirazioni.map(i => i.thumb_path).filter(Boolean)
    const paths = [...new Set([...usate, ...cat])]
    if (paths.length) signedUrls(paths).then(setThumbs)
  }, [tutte, ispirazioni])

  async function toggle(v) {
    const nuovo = !v.done
    setVoci(vs => vs.map(x => x.id === v.id ? { ...x, done: nuovo } : x))
    setTutte(vs => vs.map(x => x.id === v.id ? { ...x, done: nuovo } : x))
    await supabase.from('checklist_items').update({ done: nuovo }).eq('id', v.id)
  }

  async function nuova(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const fotoId = f.get('foto')
    const isp = ispirazioni.find(i => i.id === fotoId)
    const meta = { fase: f.get('fase') || '' }
    if (isp) { meta.foto_thumb = isp.thumb_path; meta.foto_img = isp.image_path; meta.foto_tit = isp.title }
    const { error } = await supabase.from('checklist_items').insert({
      room_id: attiva, code: f.get('code'), text: f.get('text'), note: f.get('note') || '', meta,
    })
    if (error) return alert(error.message)
    e.target.reset(); setForm(false); caricaVoci()
  }

  // aggiunta rapida dentro un singolo riquadro
  async function aggiungiRapida(e, code) {
    e.preventDefault()
    const input = e.target.elements.testo
    const testo = input.value.trim()
    if (!testo) return
    const { error } = await supabase.from('checklist_items')
      .insert({ room_id: attiva, code, text: testo, note: '', meta: {} })
    if (error) return alert(error.message)
    input.value = ''
    caricaVoci()
  }

  // salvataggio dalla scheda dei dettagli: testo, nota, scadenza e categoria in un colpo solo
  async function salvaDettagli(v, campi) {
    setDettagli(null)
    setVoci(vs => vs.map(x => x.id === v.id ? { ...x, ...campi } : x))
    setTutte(vs => vs.map(x => x.id === v.id ? { ...x, ...campi } : x))
    const { error } = await supabase.from('checklist_items').update(campi).eq('id', v.id)
    if (error) { alert('Non salvato: ' + error.message); caricaVoci() }
  }

  async function elimina(v) {
    if (!confirm(`Eliminare questa voce?\n\n“${v.text}”\n\nL'operazione non si può annullare.`)) return
    setDettagli(null)
    await supabase.from('checklist_items').delete().eq('id', v.id)
    caricaVoci()
  }

  // la foto agganciata alla voce: la ritrovo nel catalogo per poterne modificare gli ambienti
  function apriFoto(v) {
    const trovato = ispirazioni.find(i => i.image_path === v.meta?.foto_img)
    if (trovato) setGrande(trovato)
  }

  function apriRiferimento(item) { setGrande(item) }

  function aggiornaImmagine(nuovo) {
    setIspirazioni(is => is.map(x => x.id === nuovo.id ? nuovo : x))
    setGrande(g => (g?.id === nuovo.id ? nuovo : g))
  }

  const nomeStanza = id => stanze?.find(s => s.id === id)?.name ?? ''

  // vista urgenze: voci da fare, raggruppate per fase di cantiere
  const perFase = useMemo(() => {
    const g = {}
    for (const v of tutte.filter(x => !x.done && x.meta?.fase)) (g[v.meta.fase] ??= []).push(v)
    return g
  }, [tutte])

  if (stanze === null) return <div className="caricamento">carico le checklist…</div>
  const stanza = stanze.find(s => s.id === attiva)
  // riferimenti visivi dell'ambiente: tutto il materiale di Casa & Design taggato con questo ambiente
  const rifStanza = stanza ? ispirazioni.filter(i => riguarda(i, stanza.name)) : []
  const fatte = voci.filter(v => v.done).length
  const daDecidere = tutte.filter(v => !v.done && ['muri', 'impianti'].includes(v.meta?.fase)).length

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Desideri &amp; checklist</h2>
        <p>Una scheda per ambiente. Farlo giusto prima che si chiudano i muri.</p>
      </div>

      {daDecidere > 0 && (
        <div className="card allerta">
          <b>{daDecidere} {daDecidere === 1 ? 'cosa va decisa' : 'cose vanno decise'} presto</b>
          <span>riguardano muri e impianti — vanno chiuse prima che il cantiere ci arrivi</span>
          <button className="btn-mini" onClick={() => setAttiva('urgenze')}>Vedi</button>
        </div>
      )}

      <div className="stanze">
        <button className={attiva === 'urgenze' ? 'on' : ''} onClick={() => setAttiva('urgenze')}>⏱ Per scadenza</button>
        {stanze.map(s => (
          <button key={s.id} className={s.id === attiva ? 'on' : ''}
            onClick={() => { setAttiva(s.id); setForm(false); setDettagli(null) }}>{s.name}</button>
        ))}
      </div>

      {attiva === 'urgenze' ? (
        <div className="card">
          <div className="card-eyebrow-row"><span className="eyebrow">Cosa decidere, e entro quando</span></div>
          {ORDINE_FASI.every(f => !perFase[f]) && (
            <p className="vuoto">Nessuna voce con una scadenza indicata. Aggiungile dalle schede degli ambienti.</p>
          )}
          {ORDINE_FASI.map(f => perFase[f] && (
            <div className="fase-blocco" key={f}>
              <div className="fase-testa">
                <span className="eyebrow">{FASI[f].label}</span>
                <small>{FASI[f].spiega}</small>
              </div>
              {perFase[f].map(v => (
                <VoceRiga key={v.id} v={v} thumbs={thumbs}
                  onToggle={toggle} onElimina={elimina} onFoto={apriFoto} onDettagli={setDettagli}
                  sotto={
                    <small className="riga-sotto">
                      <button className="fase-tag stanza-tag" onClick={() => setAttiva(v.room_id)}
                        title="Vai alla scheda dell'ambiente">{nomeStanza(v.room_id)}</button>
                      {v.note}
                    </small>
                  } />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-eyebrow-row">
            <span className="eyebrow">{stanza?.name}</span>
            <span style={{ display: 'flex', gap: '.6rem', alignItems: 'baseline' }}>
              {voci.length > 0 && <small>{fatte} di {voci.length} fatte</small>}
              <button className="btn-mini" onClick={() => setForm(v => !v)}>
                {form ? 'Chiudi' : 'Voce con dettagli'}
              </button>
            </span>
          </div>

          {voci.length === 0 && !form && <p className="vuoto">Ancora niente per questo ambiente. Aggiungi la prima voce.</p>}

          <div className="quadranti">
            {ORDINE_CODICI.map(code => {
              const gruppo = voci.filter(v => v.code === code)
              // il riquadro "tecnico" compare solo se ha voci; gli altri quattro sempre
              if (!gruppo.length && code === 'tecnico') return null
              const c = CODICI[code]
              return (
                <div className={`quadrante q-${code}`} key={code}>
                  <div className="q-testa">
                    <span className="q-emoji">{c.emoji}</span>
                    <div>
                      <b>{c.titolo}</b>
                      <small>{c.sotto}</small>
                    </div>
                  </div>
                  {gruppo.map(v => (
                    <VoceRiga key={v.id} v={v} thumbs={thumbs}
                      onToggle={toggle} onElimina={elimina} onFoto={apriFoto} onDettagli={setDettagli}
                      sotto={(v.meta?.fase || v.note) && (
                        <small className="riga-sotto">
                          {v.meta?.fase && <span className={`fase-tag ${v.meta.fase}`}>{FASI[v.meta.fase].label}</span>}
                          {v.note && <span className="riga-nota">{v.note}</span>}
                        </small>
                      )} />
                  ))}

                  <form className="q-aggiungi" onSubmit={e => aggiungiRapida(e, code)}>
                    <input name="testo" placeholder={PLACEHOLDER[code]} aria-label={`Aggiungi a ${c.titolo}`} />
                    <button type="submit" aria-label="Aggiungi">+</button>
                  </form>
                </div>
              )
            })}
          </div>

          {rifStanza.length > 0 && (
            <div className="rif-stanza">
              <span className="eyebrow">Riferimenti visivi · {stanza?.name}</span>
              <div className="rif-griglia">
                {rifStanza.map(i => thumbs[i.thumb_path] && (
                  <button key={i.id} className="rif-foto" onClick={() => apriRiferimento(i)} aria-label={i.title}>
                    <img src={thumbs[i.thumb_path]} alt={i.title} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {form && (
            <form onSubmit={nuova} className="d-form" style={{ marginTop: '1.4rem' }}>
              <div className="d-grid">
                <div className="fld"><label>Codice</label>
                  <select name="code" defaultValue="desiderio">
                    {Object.entries(CODICI).map(([k, c]) => <option key={k} value={k}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div className="fld"><label>Entro quando</label>
                  <select name="fase" defaultValue="">
                    <option value="">— non urgente</option>
                    {ORDINE_FASI.map(f => <option key={f} value={f}>{FASI[f].label}</option>)}
                  </select>
                </div>
                <div className="fld fld-full"><label>Voce</label>
                  <input name="text" required placeholder="es. Lavastoviglie rialzata a 40 cm da terra" /></div>
                <div className="fld fld-full"><label>Nota</label>
                  <input name="note" placeholder="dettagli, misure, riferimenti…" /></div>
                <div className="fld fld-full"><label>Foto di riferimento</label>
                  <select name="foto" defaultValue="">
                    <option value="">— nessuna</option>
                    {ispirazioni.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.kind === 'salone' ? 'Salone' : i.kind === 'render' ? 'Render' : 'Ispirazione'} · {i.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="d-actions">
                <button className="btn" type="submit">Aggiungi voce</button>
                <button className="btn quiet" type="button" onClick={() => setForm(false)}>Annulla</button>
              </div>
            </form>
          )}

        </div>
      )}

      {dettagli && (
        <SchedaDettagli v={dettagli} onChiudi={() => setDettagli(null)}
          onSalva={salvaDettagli} onElimina={elimina} />
      )}

      {grande && (
        <VisoreFoto item={grande} elenco={rifStanza.length ? rifStanza : undefined}
          onChiudi={() => setGrande(null)} onModifica={aggiornaImmagine} />
      )}
    </section>
  )
}
