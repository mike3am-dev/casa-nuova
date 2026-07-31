import { useEffect, useMemo, useState } from 'react'
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

export default function Checklist() {
  const [stanze, setStanze] = useState(null)
  const [attiva, setAttiva] = useState(null)      // room_id, oppure 'urgenze'
  const [voci, setVoci] = useState([])            // voci della stanza attiva
  const [tutte, setTutte] = useState([])          // tutte le voci (per la vista urgenze)
  const [ispirazioni, setIspirazioni] = useState([])
  const [thumbs, setThumbs] = useState({})
  const [form, setForm] = useState(false)
  const [grande, setGrande] = useState(null)
  const [edit, setEdit] = useState(null)   // { id, campo: 'text' | 'note' }

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

  // modifica diretta del testo o della nota, stile Promemoria
  async function salvaCampo(v, campo, valore) {
    const nuovo = valore.trim()
    setEdit(null)
    if (nuovo === (v[campo] ?? '')) return
    if (campo === 'text' && !nuovo) return          // il testo non può restare vuoto
    setVoci(vs => vs.map(x => x.id === v.id ? { ...x, [campo]: nuovo } : x))
    setTutte(vs => vs.map(x => x.id === v.id ? { ...x, [campo]: nuovo } : x))
    await supabase.from('checklist_items').update({ [campo]: nuovo }).eq('id', v.id)
  }

  // cambia la scadenza di cantiere ciclando tra le fasi
  async function cicloFase(v) {
    const cur = v.meta?.fase || ''
    const giro = ['', ...ORDINE_FASI]
    const next = giro[(giro.indexOf(cur) + 1) % giro.length]
    const meta = { ...(v.meta || {}), fase: next }
    setVoci(vs => vs.map(x => x.id === v.id ? { ...x, meta } : x))
    setTutte(vs => vs.map(x => x.id === v.id ? { ...x, meta } : x))
    await supabase.from('checklist_items').update({ meta }).eq('id', v.id)
  }

  // sposta la voce in un altro riquadro (es. da desiderio a dubbio)
  async function cambiaCodice(v, code) {
    setVoci(vs => vs.map(x => x.id === v.id ? { ...x, code } : x))
    setTutte(vs => vs.map(x => x.id === v.id ? { ...x, code } : x))
    await supabase.from('checklist_items').update({ code }).eq('id', v.id)
  }

  async function elimina(v) {
    if (!confirm(`Eliminare questa voce?\n\n“${v.text}”\n\nL'operazione non si può annullare.`)) return
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
            onClick={() => { setAttiva(s.id); setForm(false); setEdit(null) }}>{s.name}</button>
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
                <div className="voce" key={v.id}>
                  <button className="check" onClick={() => toggle(v)} aria-label="Segna fatta">
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3" /></svg>
                  </button>
                  <span className="cod">{CODICI[v.code]?.emoji ?? '•'}</span>
                  <div className="vtx">
                    {edit?.id === v.id && edit.campo === 'text' ? (
                      <input className="riga-edit" autoFocus defaultValue={v.text}
                        onBlur={e => salvaCampo(v, 'text', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur()
                          if (e.key === 'Escape') { e.target.value = v.text; setEdit(null) }
                        }} />
                    ) : (
                      <p className="riga-testo" onClick={() => setEdit({ id: v.id, campo: 'text' })}
                        title="Tocca per modificare">{v.text}</p>
                    )}
                    <small className="riga-sotto">
                      <button className="fase-tag stanza-tag" onClick={() => setAttiva(v.room_id)}
                        title="Vai alla scheda dell'ambiente">{nomeStanza(v.room_id)}</button>
                      {v.note}
                    </small>
                  </div>
                  {v.meta?.foto_thumb && thumbs[v.meta.foto_thumb] && (
                    <button className="voce-foto" onClick={() => apriFoto(v)} aria-label="Apri foto">
                      <img src={thumbs[v.meta.foto_thumb]} alt="" loading="lazy" />
                    </button>
                  )}
                  <div className="voce-azioni">
                    <button className="btn-mini" onClick={() => cicloFase(v)} title="Cambia scadenza">⏱</button>
                    <button className="btn-mini rosso" onClick={() => elimina(v)} aria-label="Elimina voce">✕</button>
                  </div>
                </div>
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
                    <div key={v.id} className={`voce ${v.done ? 'done' : ''}`}>
                      <button className="check" onClick={() => toggle(v)} aria-label={v.done ? 'Segna da fare' : 'Segna fatta'}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3" /></svg>
                      </button>
                      <div className="vtx">
                        {edit?.id === v.id && edit.campo === 'text' ? (
                          <input className="riga-edit" autoFocus defaultValue={v.text}
                            onBlur={e => salvaCampo(v, 'text', e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.target.blur()
                              if (e.key === 'Escape') { e.target.value = v.text; setEdit(null) }
                            }} />
                        ) : (
                          <p className="riga-testo" onClick={() => setEdit({ id: v.id, campo: 'text' })}
                            title="Tocca per modificare">{v.text}</p>
                        )}

                        <small className="riga-sotto">
                          <button className={`fase-tag ${v.meta?.fase || 'vuota'}`} onClick={() => cicloFase(v)}
                            title="Tocca per cambiare la scadenza">
                            {v.meta?.fase ? FASI[v.meta.fase].label : '+ scadenza'}
                          </button>
                          {edit?.id === v.id && edit.campo === 'note' ? (
                            <input className="riga-edit nota" autoFocus defaultValue={v.note}
                              placeholder="dettagli, misure…"
                              onBlur={e => salvaCampo(v, 'note', e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') e.target.blur()
                                if (e.key === 'Escape') { e.target.value = v.note; setEdit(null) }
                              }} />
                          ) : (
                            <span className={`riga-nota ${v.note ? '' : 'vuota'}`}
                              onClick={() => setEdit({ id: v.id, campo: 'note' })}>
                              {v.note || '+ nota'}
                            </span>
                          )}
                        </small>
                      </div>
                      {v.meta?.foto_thumb && thumbs[v.meta.foto_thumb] && (
                        <button className="voce-foto" onClick={() => apriFoto(v)} aria-label="Apri foto di riferimento">
                          <img src={thumbs[v.meta.foto_thumb]} alt="" loading="lazy" />
                        </button>
                      )}
                      <div className="voce-azioni">
                        <select className="voce-sposta" value={v.code} title="Sposta in un altro riquadro"
                          onChange={e => cambiaCodice(v, e.target.value)}>
                          {ORDINE_CODICI.map(k => <option key={k} value={k}>{CODICI[k].emoji}</option>)}
                        </select>
                        <button className="btn-mini rosso" onClick={() => elimina(v)} aria-label="Elimina voce">✕</button>
                      </div>
                    </div>
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

          <div className="legenda">
            {Object.values(CODICI).map(c => <span key={c.label}>{c.emoji} {c.label}</span>)}
          </div>
        </div>
      )}

      {grande && (
        <VisoreFoto item={grande} elenco={rifStanza.length ? rifStanza : undefined}
          onChiudi={() => setGrande(null)} onModifica={aggiornaImmagine} />
      )}
    </section>
  )
}
