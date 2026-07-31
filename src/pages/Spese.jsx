import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signedUrl } from '../lib/media'
import { dataIt, euro } from '../lib/format'

const CATEGORIE = ['contratto', 'capitolato', 'planimetria', 'preventivo', 'fattura', 'garanzia', 'altro']
const STATI_SPESA = { pagata: 'pagata', da_pagare: 'da pagare', prevista: 'prevista' }
const FASI = {
  1: 'Fase 1 · Preliminare di compravendita',
  2: 'Fase 2 · Acconti prezzo',
  3: 'Fase 3 · Rogito notarile e consegna',
  9: 'Altre spese',
}

export default function Spese() {
  const [spese, setSpese] = useState(null)
  const [docs, setDocs] = useState([])
  const [formSpesa, setFormSpesa] = useState(false)
  const [formDoc, setFormDoc] = useState(false)
  const [caricandoDoc, setCaricandoDoc] = useState(false)

  async function carica() {
    const [s, d] = await Promise.all([
      supabase.from('expenses').select('*').order('date', { ascending: true, nullsFirst: false }),
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
    ])
    setSpese(s.data ?? []); setDocs(d.data ?? [])
  }
  useEffect(() => { carica() }, [])

  async function nuovaSpesa(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const { error } = await supabase.from('expenses').insert({
      label: f.get('label'),
      amount: f.get('amount') === '' ? null : Number(f.get('amount')),
      date: f.get('date') || null,
      status: f.get('status'), note: f.get('note') || '',
      meta: { fase: Number(f.get('fase')) || 9, a: f.get('a') || '' },
    })
    if (error) return alert(error.message)
    setFormSpesa(false); carica()
  }

  async function cambiaStato(s) {
    const ordine = ['prevista', 'da_pagare', 'pagata']
    const next = ordine[(ordine.indexOf(s.status) + 1) % ordine.length]
    await supabase.from('expenses').update({ status: next }).eq('id', s.id)
    setSpese(ss => ss.map(x => x.id === s.id ? { ...x, status: next } : x))
  }

  async function nuovoDoc(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const file = f.get('file')
    setCaricandoDoc(true)
    try {
      let storage_path = null
      if (file && file.size) {
        storage_path = `documenti/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
        const { error } = await supabase.storage.from('documents').upload(storage_path, file)
        if (error) throw error
      }
      const { error } = await supabase.from('documents').insert({
        title: f.get('title'), category: f.get('category'), storage_path,
        amount: f.get('amount') === '' ? null : Number(f.get('amount')),
        warranty_until: f.get('warranty') || null, note: f.get('note') || '',
      })
      if (error) throw error
      setFormDoc(false); carica()
    } catch (err) { alert('Documento non salvato: ' + err.message) }
    finally { setCaricandoDoc(false) }
  }

  async function apriDoc(d) {
    try { open(await signedUrl(d.storage_path, 'documents', 300), '_blank') }
    catch (err) { alert(err.message) }
  }

  async function eliminaSpesa(s) {
    if (!confirm(`Eliminare "${s.label}"?`)) return
    await supabase.from('expenses').delete().eq('id', s.id); carica()
  }

  async function eliminaDoc(d) {
    if (!confirm(`Eliminare "${d.title}"?`)) return
    if (d.storage_path) await supabase.storage.from('documents').remove([d.storage_path])
    await supabase.from('documents').delete().eq('id', d.id); carica()
  }

  if (spese === null) return <div className="caricamento">carico spese e documenti…</div>

  const versato = spese.filter(s => s.status === 'pagata').reduce((t, s) => t + Number(s.amount || 0), 0)
  const daVersare = spese.filter(s => s.status !== 'pagata').reduce((t, s) => t + Number(s.amount || 0), 0)
  const totale = versato + daVersare
  const senzaImporto = spese.filter(s => s.amount == null).length

  // raggruppo per fase, mantenendo l'ordine cronologico dentro ogni fase
  const perFase = {}
  for (const s of spese) (perFase[s.meta?.fase ?? 9] ??= []).push(s)
  const fasi = Object.keys(perFase).map(Number).sort((a, b) => a - b)

  return (
    <section className="screen">
      <div className="screen-head">
        <h2>Spese &amp; documenti</h2>
        <p>Il piano dei pagamenti come da preventivo ufficiale, in ordine e a portata di mano.</p>
      </div>

      <div className="card">
        <div className="card-eyebrow-row">
          <span className="eyebrow">Piano pagamenti</span>
          <button className="btn-mini solo-mac" onClick={() => setFormSpesa(v => !v)}>{formSpesa ? 'Chiudi' : '+ Voce'}</button>
        </div>

        {spese.length > 0 && (
          <>
            <div className="pay-sommario">
              <div><small>versato finora</small><b>{euro(versato)}</b></div>
              <div><small>ancora da versare</small><b>{euro(daVersare)}</b></div>
              <div><small>totale generale</small><b>{euro(totale)}</b></div>
            </div>

            {totale > 0 && (() => {
              const pct = Math.round((versato / totale) * 100)
              const oggi = new Date().toISOString().slice(0, 10)
              const prossima = spese.filter(s => s.status !== 'pagata' && s.date && s.date >= oggi)
                .sort((a, b) => a.date.localeCompare(b.date))[0]
              return (
                <div className="avanzamento">
                  <div className="avz-barra" role="img" aria-label={`versato il ${pct}%`}>
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <div className="avz-note">
                    <span><b>{pct}%</b> versato</span>
                    {prossima && (
                      <span className="avz-prossimo">
                        prossimo: {prossima.label.replace(/ — .*/, '')} · <b>{euro(prossima.amount)}</b> il {dataIt(prossima.date)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}
            {senzaImporto > 0 && (
              <p className="pay-avviso">{senzaImporto === 1 ? 'Una voce è' : `${senzaImporto} voci sono`} ancora da quantificare — non {senzaImporto === 1 ? 'è compresa' : 'sono comprese'} nel totale.</p>
            )}
          </>
        )}

        {formSpesa && (
          <form onSubmit={nuovaSpesa} className="d-form" style={{ margin: '1.4rem 0' }}>
            <div className="d-grid">
              <div className="fld fld-full"><label>Voce</label>
                <input name="label" required placeholder="es. Costi notaio rogito" /></div>
              <div className="fld"><label>Importo €</label>
                <input name="amount" type="number" step="0.01" placeholder="lascia vuoto se da quantificare" /></div>
              <div className="fld"><label>Data</label><input name="date" type="date" /></div>
              <div className="fld"><label>Fase</label>
                <select name="fase" defaultValue="9">
                  {Object.entries(FASI).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div className="fld"><label>Stato</label>
                <select name="status" defaultValue="prevista">
                  {Object.entries(STATI_SPESA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div className="fld"><label>Intestato a</label>
                <input name="a" placeholder="es. Officine Mak Srl" /></div>
              <div className="fld"><label>Nota</label><input name="note" /></div>
            </div>
            <div className="d-actions">
              <button className="btn" type="submit">Salva voce</button>
              <button className="btn quiet" type="button" onClick={() => setFormSpesa(false)}>Annulla</button>
            </div>
          </form>
        )}

        {spese.length === 0 && !formSpesa && <p className="vuoto">Nessuna voce nel piano pagamenti.</p>}

        {fasi.map(f => {
          const voci = perFase[f]
          const tot = voci.reduce((t, s) => t + Number(s.amount || 0), 0)
          return (
            <div className="fase-pag" key={f}>
              <div className="fase-testa">
                <span className="eyebrow">{FASI[f] || 'Altre spese'}</span>
                <b>{euro(tot)}</b>
              </div>
              <ol className="pagamenti">
                {voci.map(s => (
                  <li className={`pag ${s.status === 'pagata' ? 'pagata' : 'futura'}`} key={s.id}>
                    <div className="pag-data">
                      {s.date ? dataIt(s.date) : 'al rogito'}
                      <button className="pag-del solo-mac" onClick={() => eliminaSpesa(s)} aria-label={`Elimina ${s.label}`}>✕</button>
                    </div>
                    <div className="pag-corpo">
                      <div className="pag-testa">
                        <b>{s.label}</b>
                        <span className="pag-imp">{s.amount == null ? <em className="da-quant">da quantificare</em> : euro(s.amount)}</span>
                      </div>
                      {(s.note || s.meta?.a) && (
                        <small>{[s.note, s.meta?.a && `a ${s.meta.a}`].filter(Boolean).join(' · ')}</small>
                      )}
                      <button className={`pill ${s.status}`} onClick={() => cambiaStato(s)} title="Tocca per cambiare stato">
                        {STATI_SPESA[s.status]}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="card-eyebrow-row"><span className="eyebrow">Come è composto il prezzo</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tab-av prezzo-tab">
            <thead><tr><th>Voce</th><th>Mq</th><th>Incidenza</th><th>Mq commerciali</th></tr></thead>
            <tbody>
              <tr><td>Superficie netta + murature</td><td>94,57</td><td>100%</td><td>94,57</td></tr>
              <tr><td>Giardino fino a 100 mq</td><td>100</td><td>10%</td><td>10,00</td></tr>
              <tr><td>Giardino oltre 100 mq</td><td>103</td><td>5%</td><td>5,15</td></tr>
              <tr><td>Portico</td><td>32,51</td><td>30%</td><td>9,75</td></tr>
              <tr><td>Parti comuni</td><td>—</td><td>5%</td><td>5,97</td></tr>
              <tr className="evid"><td><b>Mq commerciali</b></td><td /><td /><td><b>125,45</b></td></tr>
            </tbody>
          </table>
        </div>
        <div className="prezzo-righe">
          <div className="riga"><span>Valore di vendita al mq</span><span className="imp">{euro(3100)}</span></div>
          <div className="riga"><span>Prezzo immobile a listino<small>125,45 mq × 3.100 €</small></span><span className="imp">{euro(388884.62)}</span></div>
          <div className="riga"><span>Box</span><span className="imp">{euro(25000)}</span></div>
          <div className="riga"><span>Cantina</span><span className="imp">{euro(5000)}</span></div>
          <div className="riga"><span>Totale a listino</span><span className="imp">{euro(418884.62)}</span></div>
          <div className="riga evid-riga"><span><b>Valore proposta (appartamento + box)</b><small>sconto applicato: 17.884,62 € · 4,27%</small></span><span className="imp"><b>{euro(401000)}</b></span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-eyebrow-row"><span className="eyebrow">Mutuo</span></div>
        <div className="riga"><span>Mutuo fino all'80% sul valore imponibile<small>appartamento + box</small></span><span className="imp">{euro(320800)}</span></div>
        <div className="riga"><span>Differenza da coprire<small>totale costi − mutuo massimo</small></span><span className="imp">{euro(totale - 320800)}</span></div>
        <div className="riga"><span>Già versato di tasca<small>al {dataIt(new Date().toISOString().slice(0, 10))}</small></span><span className="imp">{euro(versato)}</span></div>
        <div className="nota" style={{ marginTop: '1rem' }}>
          <div className="vtx"><p>⏰ La richiesta di anticipo TFR al datore richiede la <b>copia registrata del compromesso</b>.</p></div>
        </div>
      </div>

      <div className="card">
        <div className="card-eyebrow-row">
          <span className="eyebrow">Documenti · fatture · garanzie</span>
          <button className="btn-mini solo-mac" onClick={() => setFormDoc(v => !v)}>{formDoc ? 'Chiudi' : '+ Documento'}</button>
        </div>

        {formDoc && (
          <form onSubmit={nuovoDoc} className="d-form" style={{ marginBottom: '1.2rem' }}>
            <div className="d-grid">
              <div className="fld fld-full"><label>Titolo</label>
                <input name="title" required placeholder="es. Compromesso — copia registrata" /></div>
              <div className="fld"><label>Categoria</label>
                <select name="category" defaultValue="altro">{CATEGORIE.map(c => <option key={c}>{c}</option>)}</select>
              </div>
              <div className="fld"><label>Importo €</label><input name="amount" type="number" step="0.01" /></div>
              <div className="fld"><label>Garanzia fino al</label><input name="warranty" type="date" /></div>
              <div className="fld"><label>Nota</label><input name="note" /></div>
              <div className="fld fld-full"><label>File (PDF o foto)</label>
                <input name="file" type="file" accept="application/pdf,image/*" /></div>
            </div>
            <div className="d-actions">
              <button className="btn" type="submit" disabled={caricandoDoc}>{caricandoDoc ? 'Carico…' : 'Salva documento'}</button>
              <button className="btn quiet" type="button" onClick={() => setFormDoc(false)}>Annulla</button>
            </div>
          </form>
        )}

        {docs.length === 0 && !formDoc && <p className="vuoto">Nessun documento in archivio.</p>}
        {docs.map(d => (
          <div className="riga" key={d.id}>
            <span>
              {d.title}
              <small>
                {[d.category, d.amount != null && euro(d.amount),
                  d.warranty_until && `garanzia fino al ${dataIt(d.warranty_until)}`, d.note]
                  .filter(Boolean).join(' · ')}
              </small>
            </span>
            <span className="fine">
              {d.storage_path && <button className="btn-mini" onClick={() => apriDoc(d)}>Apri</button>}
              <button className="btn-mini rosso solo-mac" onClick={() => eliminaDoc(d)} aria-label="Elimina">✕</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
