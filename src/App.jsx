import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Layout from './components/Layout'
import Home from './pages/Home'
import Cantiere from './pages/Cantiere'
import Progetto from './pages/Progetto'
import Glossario from './pages/Glossario'
import Avanzamento from './pages/Avanzamento'
import Design from './pages/Design'
import Checklist from './pages/Checklist'
import Spese from './pages/Spese'
import Note from './pages/Note'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = ancora da verificare

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cantiere" element={<Cantiere />} />
        <Route path="/progetto" element={<Progetto />} />
        <Route path="/avanzamento" element={<Avanzamento />} />
        <Route path="/design" element={<Design />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/spese" element={<Spese />} />
        <Route path="/note" element={<Note />} />
        <Route path="/glossario" element={<Glossario />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
