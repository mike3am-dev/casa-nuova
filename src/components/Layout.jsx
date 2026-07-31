import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { giorniAllaConsegna } from '../lib/format'

const VOCI = [
  { to: '/', label: 'Home', icon: <path d="M3 17V9.5L10 3l7 6.5V17M7.5 17v-5h5v5" /> },
  { to: '/cantiere', label: 'Cantiere', icon: <><path d="M3 17h14" /><path d="M5.5 17V7l5-3 5 3v10" /><path d="M8 17v-4h4.5v4" /><path d="M15.5 7l2.5 2" /></> },
  { to: '/progetto', label: 'Il progetto', icon: <><path d="M3 4.5h14v11H3z" /><path d="M3 11l4-3 4 3 3-2 3 2" /><circle cx="7" cy="7.5" r="1.2" /></> },
  { to: '/avanzamento', label: 'Capitolato', icon: <path d="M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5" /> },
  { to: '/design', label: 'Casa & Design', icon: <path d="M10 3c3.6 0 6.5 2.7 6.5 6.2 0 4.6-3.5 7.8-6.5 7.8s-6.5-3.2-6.5-7.8C3.5 5.7 6.4 3 10 3ZM10 3v14" /> },
  { to: '/checklist', label: 'Checklist', icon: <path d="M4 10.5l4 4L16 6" /> },
  { to: '/spese', label: 'Spese', icon: <><circle cx="10" cy="10" r="6.5" /><path d="M7.5 12c.5.9 1.5 1.4 2.5 1.4 1.6 0 2.8-1 2.8-3.4s-1.2-3.4-2.8-3.4c-1 0-2 .5-2.5 1.4M6 8.8h4M6 11.2h4" /></> },
  { to: '/note', label: 'Geometra', icon: <path d="M3 5.5C3 4.7 3.7 4 4.5 4h11c.8 0 1.5.7 1.5 1.5v7c0 .8-.7 1.5-1.5 1.5H9l-4 3v-3H4.5C3.7 14 3 13.3 3 12.5v-7Z" /> },
  { to: '/glossario', label: 'Glossario', icon: <><path d="M5 4h9a1.5 1.5 0 0 1 1.5 1.5V16H6.5A1.5 1.5 0 0 0 5 17.5V4Z" /><path d="M5 4v13.5" /><path d="M8 8h4.5" /></> },
]

export default function Layout({ children }) {
  const [consegna, setConsegna] = useState('2027-12-30')
  const [giorni, setGiorni] = useState(giorniAllaConsegna())

  useEffect(() => {
    supabase.from('settings').select('delivery_date').eq('id', 1).single()
      .then(({ data }) => { if (data?.delivery_date) setConsegna(data.delivery_date) })
  }, [])

  // ricalcola subito e a ogni mezzanotte (anche a sito aperto)
  useEffect(() => {
    setGiorni(giorniAllaConsegna(consegna))
    let timer
    const programmaMezzanotte = () => {
      const ora = new Date()
      const mezzanotte = new Date(ora)
      mezzanotte.setHours(24, 0, 0, 100) // 00:00 del giorno dopo (+100ms di margine)
      timer = setTimeout(() => {
        setGiorni(giorniAllaConsegna(consegna))
        programmaMezzanotte()
      }, mezzanotte - ora)
    }
    programmaMezzanotte()
    // ricalcola anche quando il device torna attivo (sblocco/riapertura)
    const onWake = () => { if (!document.hidden) setGiorni(giorniAllaConsegna(consegna)) }
    document.addEventListener('visibilitychange', onWake)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onWake) }
  }, [consegna])

  return (
    <div className="app">
      <nav className="side" aria-label="Sezioni">
        <NavLink to="/" className="wordmark">
          <img src="./logo.png" alt="Casa Nuova" />
          <span className="eyebrow">Palazzina E · dic 2027</span>
        </NavLink>
        <ul>
          {VOCI.map(v => (
            <li key={v.to}>
              <NavLink to={v.to} end className={({ isActive }) => isActive ? 'active' : ''}>
                <svg className="glyph" width="20" height="20" viewBox="0 0 20 20">{v.icon}</svg>
                {v.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="side-foot">
          <div className="countdown">{giorni}</div>
          <small>giorni alla consegna prevista</small>
          <button className="btn-mini" onClick={() => supabase.auth.signOut()}>Esci</button>
        </div>
      </nav>
      <main>
        <div className="m-head">
          <h1>Casa Nuova</h1>
          <span className="eyebrow">Palazzina E · {giorni} giorni alla consegna</span>
        </div>
        {children}
      </main>
    </div>
  )
}
