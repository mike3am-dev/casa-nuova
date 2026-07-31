import { useState } from 'react'
import { supabase, LOGIN_EMAIL } from '../lib/supabase'

export default function Login() {
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [busy, setBusy] = useState(false)

  async function entra(e) {
    e.preventDefault()
    setBusy(true); setErrore('')
    const { error } = await supabase.auth.signInWithPassword({ email: LOGIN_EMAIL, password })
    if (error) setErrore('Password non giusta. Riprova.')
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={entra}>
        <svg className="arco-logo" width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
          <path d="M12 46V28c0-8.3 6.7-15 15-15s15 6.7 15 15v18" fill="none" stroke="var(--terra)" strokeWidth="3" strokeLinecap="round"/>
          <path d="M6 46h42" stroke="var(--bronzo)" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <h1>Casa Nuova</h1>
        <span className="eyebrow">Palazzina E · dicembre 2027</span>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="password" autoFocus autoComplete="current-password" aria-label="Password"
        />
        <button className="btn" type="submit" disabled={busy || !password}>
          {busy ? 'Un attimo…' : 'Entra'}
        </button>
        <p className="errore">{errore}</p>
      </form>
    </div>
  )
}
