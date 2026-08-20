import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dataIt, dataBreve, quando, giorniAllaConsegna } from '../lib/format'
import { signedUrls } from '../lib/media'
import PhotoGrid from '../components/PhotoGrid'
import Lightbox from '../components/Lightbox'

const ORDINE = ['A', 'B', 'C', 'S', 'T', 'DE']
const LAB = c => (c === 'DE' ? 'D/E' : c)   // D/E: unica struttura (contiene la Palazzina E)
const METEO = { 'Soleggiato': '☀️', 'Parzialmente nuvoloso': '⛅', 'Nuvoloso': '🌥️', 'Coperto': '☁️', 'Pioggia': '🌧️' }
const RITMO_LAB = { norma: 'nella norma', accelerato: 'accelerato', rallentato: 'rallentato' }

export default function Cantiere() {
  const [visite, setVisite] = useState(null)
  const [foto, setFoto] = useState({})        // visit_id -> [photos]
  const [stati, setStati] = useState({})      // visit_id -> [visit_status]
  const [cover, setCover] = useState({})       // thumb_path -> url
  const [settings, setSettings] = useState(null)
  const [sel, setSel] = useState(null)         // visit_id selezionato
  const [nuovo, setNuovo] = useState(false)
  const [editPiani, setEditPiani] = useState(false)
  const [editReport, setEditReport] = useState(false)
  const [grande, setGrande] = useState(null)   // id della foto aperta a schermo pieno
  const stripRef = useRef(null)

  async function carica(mantieniSel = false) {
    const [v, p, s, st] = await Promise.all([
      supabase.from('visits').select('*').order('date', { ascending: true }),
      supabase.from('photos').select('*').not('visit_id', 'is', null).order('created_at'),
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('visit_status').select('*'),
    ])
    const visite = v.data ?? []
    setVisite(visite)
    const perVisita = {}, perStato = {}
    for (const ph of p.data ?? []) (perVisita[ph.visit_id] ??= []).push(ph)
    for (const x of st.data ?? []) (perStato[x.visit_id] ??= []).push(x)
    setFoto(perVisita); setStati(perStato); setSettings(s.data)
    const covers = (visite.map(vv => perVisita[vv.id]?.[0]?.thumb_path).filter(Boolean))
    if (covers.length) signedUrls(covers).then(setCover)
    if (!mantieniSel) setSel(prev => prev && visite.some(x => x.id === prev) ? prev : visite.at(-1)?.id ?? null)
  }
  useEffect(() => { carica() }, [])

  // porta la strip al più recente (sinistra) al primo caricamento
  useEffect(() => {
    if (stripRef.current) stripRef.current.scrollLeft = 0
  }, [visite])

  async function aggiungiVisita(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const meta = f.get('meteo') ? { weather: f.get('meteo') } : {}
    const { data, error } = await supabase.from('visits').insert({
      title: f.get('title'), date: f.get('date'),
      report: f.get('report') || '', drone: f.get('drone') === 'on', meta,
    }).select().single()
    if (error) return alert(error.message)
    setNuovo(false); await carica(); setSel(data.id)
  }

  async function salvaMeteo(vid, weather) {
    const v = visite.find(x => x.id === vid)
    const meta = { ...(v?.meta || {}), weather }
    await supabase.from('visits').update({ meta }).eq('id', vid)
    carica(true)
  }

  async function salvaPiani(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const { error } = await supabase.from('settings').update({
      floors_done: f.get('done') === '' ? null : Number(f.get('done')),
      floors_total: f.get('total') === '' ? null : Number(f.get('total')),
      floors_verified_on: f.get('verified') || null,
      floors_note: f.get('note') || '',
      next_visit: f.get('next') || null,
    }).eq('id', 1)
    if (error) return alert(error.message)
    setEditPiani(false); carica(true)
  }

  async function eliminaVisita(v) {
    const n = (foto[v.id] ?? []).length
    if (!confirm(`Eliminare "${v.title}"${n ? ` e le sue ${n} foto` : ''}? Non si può annullare.`)) return
    const paths = (foto[v.id] ?? []).flatMap(p => [p.storage_path, p.thumb_path])
    if (paths.length) await supabase.storage.from('media').remove(paths)
    await supabase.from('visits').delete().eq('id', v.id)
    setSel(null); carica()
  }

  async function salvaReport(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    await supabase.from('visits').update({ report: f.get('report') || '' }).eq('id', sel)
    // upsert stato per-edificio
    const righe = ORDINE.map((code, i) => ({
      visit_id: sel, building_code: code, sort: i,
      percent: Math.max(0, Math.min(100, Number(f.get(`p_${code}`)) || 0)),
      note: f.get(`n_${code}`) || '',
    }))
    const { error } = await supabase.from('visit_status').upsert(righe, { onConflict: 'visit_id,building_code' })
    if (error) return alert(error.message)
    setEditReport(false); carica(true)
  }

  // Tutte le foto del cantiere in un elenco solo, dal più recente al più vecchio:
  // è quello che si sfoglia con le frecce, senza dover chiudere e riaprire.
  // useMemo indispensabile: un array nuovo a ogni render rimanderebbe il visore
  // sempre alla foto di partenza.
  const tutteFoto = useMemo(() => {
    if (!visite) return []
    return [...visite].reverse().flatMap(vv => foto[vv.id] ?? [])
  }, [visite, foto])

  if (visite === null) return <div className="caricamento">carico il cantiere…</div>

  const v = visite.find(x => x.id === sel)
  const statoSel = (stati[sel] ?? []).slice().sort((a, b) => ORDINE.indexOf(a.building_code) - ORDINE.indexOf(b.building_code))
  const statoDesc = statoSel.slice().sort((a, b) => b.percent - a.percent)
  const idxSel = v ? visite.findIndex(x => x.id === v.id) : -1
  const prevV = idxSel > 0 ? visite[idxSel - 1] : null
  const mst = v?.meta?.milestone
  const cfr = v?.meta?.confronto

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Il cantiere</h2>
        <p>La costruzione nel tempo. Scorri la timeline e tocca un sopralluogo per vederne il report.</p>
      </div>

      {/* ---- prima di tutto la timeline: è la cosa che si guarda ogni volta ---- */}
      <div className="card">
        <div className="card-eyebrow-row">
          <span className="eyebrow">Timeline sopralluoghi</span>
          <button className="btn-mini solo-mac" onClick={() => setNuovo(x => !x)}>{nuovo ? 'Chiudi' : '+ Nuovo sopralluogo'}</button>
        </div>

        {nuovo && (
          <form onSubmit={aggiungiVisita} style={{ marginBottom: '1.4rem' }}>
            <div className="field"><label>Titolo</label>
              <input name="title" required placeholder="es. Volo drone di agosto" /></div>
            <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="field"><label>Data</label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              <div className="field" style={{ width: 190 }}><label>Meteo</label>
                <select name="meteo" defaultValue="">
                  <option value="">—</option>
                  {Object.entries(METEO).map(([v, i]) => <option key={v} value={v}>{i} {v}</option>)}
                </select>
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <input name="drone" type="checkbox" id="drone" style={{ width: 'auto' }} defaultChecked />
                <label htmlFor="drone" style={{ margin: 0 }}>Volo drone</label>
              </div>
            </div>
            <div className="field"><label>Report di cantiere</label>
              <textarea name="report" placeholder="Com'era il cantiere quel giorno…" /></div>
            <button className="btn" type="submit">Aggiungi tappa</button>
          </form>
        )}

        {visite.length === 0 && !nuovo && (
          <p className="vuoto">Nessun sopralluogo ancora. Aggiungi la prima tappa.</p>
        )}

        {visite.length > 0 && (
          <>
            <div className="tl-hint"><span className="frecce">→</span> il più recente è a sinistra · scorri verso destra per tornare indietro nel tempo</div>
            <div className="tl-wrap">
              <div className="tl" ref={stripRef}>
                {[...visite].reverse().map(vv => {
                  const thumb = cover[foto[vv.id]?.[0]?.thumb_path]
                  const haFoto = (foto[vv.id] ?? []).length > 0
                  return (
                    <div className="tl-item" key={vv.id}>
                      <div className={`tl-card ${vv.id === sel ? 'on' : ''}`}>
                        {/* la foto: seleziona la tappa E la apre subito grande */}
                        <button className="tl-thumb" aria-label={`Foto del ${dataBreve(vv.date)} a schermo pieno`}
                          onClick={() => { setSel(vv.id); if (haFoto) setGrande(foto[vv.id][0].id) }}>
                          {vv.drone && <span className="tl-drone">drone</span>}
                          {thumb ? <img src={thumb} alt="" loading="lazy" decoding="async" /> : <span className="t-nofoto">nessuna foto</span>}
                        </button>
                        <span className="tl-dot" />
                        {/* la data: cambia soltanto la tappa mostrata sotto */}
                        <button className="tl-meta" onClick={() => setSel(vv.id)}
                          aria-label={`Mostra il report del ${dataBreve(vv.date)}`}>
                          <b>{dataBreve(vv.date)}</b>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---- punto della situazione: dove siamo, in un colpo d'occhio ---- */}
      {(() => {
        const ultima = visite.at(-1)
        const statoDE = ultima ? (stati[ultima.id] ?? []).find(s => s.building_code === 'DE') : null
        const msE = ultima?.meta?.milestone
        const giorniConsegna = giorniAllaConsegna(settings?.delivery_date)
        return (
          <div className="card situazione">
            <div className="sit-testa">
              <span className="eyebrow">Il mio appartamento · Palazzina E, piano terra</span>
              {!editPiani && <button className="btn-mini solo-mac" onClick={() => setEditPiani(true)}>Aggiorna</button>}
            </div>

            {!editPiani ? (
              <>
                <h3 className="sit-titolo">{settings?.floors_note || 'Dato da verificare a vista'}</h3>
                {statoDE && (
                  <>
                    <div className="sit-barra">
                      <i style={{ width: `${statoDE.percent}%` }} />
                    </div>
                    <p className="sit-sotto">
                      <b>{statoDE.percent}%</b> del corpo D/E
                      {settings?.floors_verified_on && ` · rilevato a vista il ${dataIt(settings.floors_verified_on)}`}
                    </p>
                  </>
                )}

                <div className="sit-dati">
                  <div>
                    <b>{settings?.floors_done ?? '—'}<span>/{settings?.floors_total ?? '?'}</span></b>
                    <small>piani fuori terra</small>
                    <em>verificati a vista</em>
                  </div>
                  <div>
                    <b>{ultima ? dataBreve(ultima.date) : '—'}</b>
                    <small>ultimo sopralluogo</small>
                    <em>{ultima ? quando(ultima.date) : ''}</em>
                  </div>
                  <div>
                    <b>{giorniConsegna}</b>
                    <small>giorni alla consegna</small>
                    <em>{dataIt(settings?.delivery_date || '2027-12-30')}</em>
                  </div>
                </div>

                {msE?.e && (
                  <div className="sit-prossimo-passo">
                    <span className="eyebrow">Prossimo passo atteso</span>
                    <p>{msE.e} {msE.stima_e && <em>— stima {msE.stima_e}</em>}</p>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={salvaPiani} className="d-form" style={{ marginTop: '.8rem' }}>
                <div className="d-grid">
                  <div className="fld"><label>Piani fuori terra</label>
                    <input name="done" type="number" min="0" max="30" defaultValue={settings?.floors_done ?? ''} /></div>
                  <div className="fld"><label>Su un totale di</label>
                    <input name="total" type="number" min="0" max="30" defaultValue={settings?.floors_total ?? ''} /></div>
                  <div className="fld"><label>Verificato il</label>
                    <input name="verified" type="date" defaultValue={settings?.floors_verified_on ?? ''} /></div>
                  <div className="fld"><label>Prossimo sopralluogo</label>
                    <input name="next" type="date" defaultValue={settings?.next_visit ?? ''} /></div>
                  <div className="fld fld-full"><label>Com'è adesso</label>
                    <input name="note" defaultValue={settings?.floors_note ?? ''}
                      placeholder="es. solaio di piano terra completato, pilastri pronti" /></div>
                </div>
                <div className="d-actions">
                  <button className="btn" type="submit">Salva</button>
                  <button className="btn quiet" type="button" onClick={() => setEditPiani(false)}>Annulla</button>
                </div>
              </form>
            )}
          </div>
        )
      })()}

      {v && (
        <div className="card">
          <div className="card-eyebrow-row">
            <span className="eyebrow">
              {dataIt(v.date)} · {v.title}
              {v.meta?.weather && <span className="meteo-badge">{METEO[v.meta.weather]} {v.meta.weather}</span>}
            </span>
            <span className="solo-mac" style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
              <select className="meteo-sel" value={v.meta?.weather || ''} onChange={e => salvaMeteo(v.id, e.target.value)} aria-label="Meteo del sopralluogo">
                <option value="">meteo…</option>
                {Object.entries(METEO).map(([w, i]) => <option key={w} value={w}>{i} {w}</option>)}
              </select>
              <button className="btn-mini solo-mac" onClick={() => setEditReport(x => !x)}>{editReport ? 'Chiudi' : 'Modifica report'}</button>
              <button className="btn-mini rosso solo-mac" onClick={() => eliminaVisita(v)}>elimina tappa</button>
            </span>
          </div>

          {!editReport ? (
            <>
              <div className="fase">
                <div className="fase-foto">
                  <PhotoGrid photos={foto[v.id] ?? []} meta={{ visit_id: v.id }} onChange={() => carica(true)} canAdd={false} large
                    elencoCompleto={tutteFoto} />
                </div>
                {statoDesc.length > 0 && (
                  <div className="fase-stato">
                    <span className="eyebrow">Stato per edificio · dal più avanti</span>
                    {statoDesc.map(s => (
                      <div className={`ed ${s.building_code === 'DE' ? 'evid-ed' : ''}`} key={s.building_code}>
                        <div className="ed-top">
                          <b>{LAB(s.building_code)}{s.building_code === 'DE' ? ' ★' : ''}</b>
                          <div className="barra"><i style={{ width: `${s.percent}%` }} /></div>
                          <span className="ed-pct">{s.percent}%</span>
                        </div>
                        {s.note && <small>{s.note}</small>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {v.report && (
                <div className="report">
                  <span className="eyebrow">Report di cantiere</span>
                  <p>{v.report}</p>
                </div>
              )}

              {mst && (mst.e || mst.t || mst.cantiere) && (
                <div className="blocco-cantiere">
                  <span className="eyebrow">Prossimo milestone atteso</span>
                  <div className="ms-grid">
                    {mst.e && <div className="ms evid-ed"><b>Edificio E ★</b><p>{mst.e}</p>{mst.stima_e && <small>Stima: {mst.stima_e}</small>}</div>}
                    {mst.t && <div className="ms"><b>Torre T</b><p>{mst.t}</p>{mst.stima_t && <small>Stima: {mst.stima_t}</small>}</div>}
                    {mst.cantiere && <div className="ms"><b>Cantiere</b><p>{mst.cantiere}</p>{mst.stima_cantiere && <small>Stima: {mst.stima_cantiere}</small>}</div>}
                  </div>
                </div>
              )}

              {cfr && prevV && (cfr.e || cfr.t || cfr.generale) && (
                <div className="blocco-cantiere">
                  <span className="eyebrow">Confronto con {dataIt(prevV.date)}</span>
                  <div className="cfr-list">
                    {cfr.e && <div className="cfr-item evid-ed"><b>Edificio E ★</b><p>{cfr.e}</p></div>}
                    {cfr.t && <div className="cfr-item"><b>Torre T</b><p>{cfr.t}</p></div>}
                    {cfr.generale && (
                      <div className="cfr-item">
                        <b>Cantiere generale</b><p>{cfr.generale}</p>
                        {cfr.ritmo && <span className={`ritmo ${cfr.ritmo}`}>Ritmo: {RITMO_LAB[cfr.ritmo] || cfr.ritmo}{cfr.ritmo_nota ? ` — ${cfr.ritmo_nota}` : ''}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={salvaReport} style={{ marginTop: '1.2rem' }}>
              <PhotoGrid photos={foto[v.id] ?? []} meta={{ visit_id: v.id }} onChange={() => carica(true)} canAdd={false} />
              <div className="field" style={{ marginTop: '1rem' }}><label>Report di cantiere</label>
                <textarea name="report" defaultValue={v.report} style={{ minHeight: 90 }} /></div>
              <span className="eyebrow">Stato per edificio</span>
              <div style={{ marginTop: '.6rem' }}>
                {ORDINE.map(code => {
                  const cur = statoSel.find(s => s.building_code === code)
                  return (
                    <div key={code} style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginBottom: '.5rem', flexWrap: 'wrap' }}>
                      <b style={{ width: 34, fontFamily: 'Fraunces, Georgia, serif' }}>{LAB(code)}</b>
                      <input name={`p_${code}`} className="perc-input" type="number" min="0" max="100"
                        defaultValue={cur?.percent ?? 0} aria-label={`percentuale ${code}`} />
                      <input name={`n_${code}`} defaultValue={cur?.note ?? ''} placeholder="nota"
                        style={{ flex: 1, minWidth: 160, padding: '.3rem .5rem', fontSize: '.85rem' }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '.6rem', marginTop: '.8rem' }}>
                <button className="btn" type="submit">Salva report</button>
                <button className="btn quiet" type="button" onClick={() => setEditReport(false)}>Annulla</button>
              </div>
            </form>
          )}
        </div>
      )}

      {grande != null && (() => {
        const i = tutteFoto.findIndex(f => f.id === grande)
        return i < 0 ? null : (
          <Lightbox photos={tutteFoto} index={i} onClose={() => setGrande(null)} />
        )
      })()}
    </section>
  )
}
