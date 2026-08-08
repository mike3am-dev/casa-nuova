import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dataIt, dataBreve, quando, giorniAllaConsegna, euro } from '../lib/format'
import { signedUrls } from '../lib/media'
import MeteoDrone from '../components/MeteoDrone'

export default function Home() {
  const [d, setD] = useState(null)
  const [cover, setCover] = useState(null)
  const vai = useNavigate()

  useEffect(() => {
    (async () => {
      const [s, v, st, sp, ci] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 1).single(),
        supabase.from('visits').select('id,date,title').order('date', { ascending: false }).limit(1),
        supabase.from('visit_status').select('visit_id,building_code,percent,note'),
        supabase.from('expenses').select('amount,status,date,label'),
        supabase.from('checklist_items').select('id,code,done,meta'),
      ])
      const ultima = v.data?.[0]
      const statoDE = ultima ? (st.data ?? []).find(x => x.visit_id === ultima.id && x.building_code === 'DE') : null
      const spese = sp.data ?? []
      const versato = spese.filter(x => x.status === 'pagata').reduce((t, x) => t + Number(x.amount || 0), 0)
      const totale = spese.reduce((t, x) => t + Number(x.amount || 0), 0)
      const oggi = new Date().toISOString().slice(0, 10)
      const prossimaSpesa = spese.filter(x => x.status !== 'pagata' && x.date && x.date >= oggi)
        .sort((a, b) => a.date.localeCompare(b.date))[0]
      const voci = ci.data ?? []
      const urgenti = voci.filter(x => !x.done && ['muri', 'impianti'].includes(x.meta?.fase)).length
      const domande = voci.filter(x => !x.done && x.code === 'domanda').length

      if (ultima) {
        const { data: ph } = await supabase.from('photos').select('image_path')
          .eq('visit_id', ultima.id).limit(1)
        if (ph?.[0]) signedUrls([ph[0].image_path]).then(u => setCover(u[ph[0].image_path]))
      }
      setD({ s: s.data, ultima, statoDE, versato, totale, prossimaSpesa, urgenti, domande })
    })()
  }, [])

  if (!d) return <div className="caricamento">un momento…</div>
  const { s, ultima, statoDE, versato, totale, prossimaSpesa, urgenti, domande } = d
  const giorni = giorniAllaConsegna(s?.delivery_date)
  const pct = totale ? Math.round((versato / totale) * 100) : 0

  return (
    <section className="screen home">
      <div className="home-hero">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="home-logo" />
        <h1>La casa nuova</h1>
        <p className="home-claim">Palazzina E · piano terra sud-est, con giardino<br />Cologno Monzese</p>
        <div className="home-countdown">
          <b>{giorni}</b>
          <span>giorni alla consegna<br /><em>{dataIt(s?.delivery_date || '2027-12-30')}</em></span>
        </div>
      </div>

      <div className="home-griglia">
        <button className="home-card grande" onClick={() => vai('/')}>
          {cover && <img src={cover} alt="" className="home-card-foto" />}
          <div className="home-card-testo">
            <span className="eyebrow">Il cantiere</span>
            <b>{s?.floors_note || 'Da verificare'}</b>
            <small>
              {statoDE ? `${statoDE.percent}% del corpo D/E · ` : ''}
              {s?.floors_done ?? '—'}/{s?.floors_total ?? '?'} piani fuori terra
            </small>
          </div>
        </button>

        {s?.next_visit
          ? <MeteoDrone data={s.next_visit} onClick={() => vai('/')} />
          : <button className="home-card" onClick={() => vai('/')}>
              <span className="eyebrow">Prossimo sopralluogo</span>
              <b className="grande-num">—</b>
              <small>da fissare</small>
              {ultima && <em>ultimo: {dataBreve(ultima.date)}, {quando(ultima.date)}</em>}
            </button>}

        <button className="home-card" onClick={() => vai('/spese')}>
          <span className="eyebrow">Pagamenti</span>
          <b className="grande-num">{pct}%</b>
          <div className="home-barra"><i style={{ width: `${pct}%` }} /></div>
          <small>{euro(versato)} versati su {euro(totale)}</small>
          {prossimaSpesa && <em>prossimo: {euro(prossimaSpesa.amount)} il {dataBreve(prossimaSpesa.date)}</em>}
        </button>

        <button className={`home-card ${urgenti ? 'allerta-card' : ''}`} onClick={() => vai('/checklist')}>
          <span className="eyebrow">Da decidere</span>
          <b className="grande-num">{urgenti}</b>
          <small>cose che scadono con muri e impianti</small>
          {domande > 0 && <em>{domande} domande aperte per il geometra</em>}
        </button>
      </div>
    </section>
  )
}
