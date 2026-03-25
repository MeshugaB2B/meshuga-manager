'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFEB5A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/meshuga-stamp.png" alt="Meshuga" width={120} height={120} style={{ borderRadius: '50%', margin: '0 auto 16px', display: 'block', border: '3px solid #191923', boxShadow: '5px 5px 0px #191923' }} />
          <h1 style={{ fontFamily: "'Arial Narrow', Arial", fontWeight: 900, fontSize: 48, color: '#191923', letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1 }}>
            meshuga
          </h1>
          <p style={{ fontFamily: 'Yellowtail, cursive', fontSize: 20, color: '#191923', opacity: 0.6, marginTop: 4 }}>
            B2B Manager
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ background: '#FFFFFF', borderRadius: 8, padding: 28, border: '3px solid #191923', boxShadow: '6px 6px 0px #191923' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: 'Yellowtail, cursive', fontSize: 16, color: '#191923', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="vous@meshuga.fr"
              required
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontFamily: 'Yellowtail, cursive', fontSize: 16, color: '#191923', display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}>
            {loading ? 'Connexion…' : 'Se connecter →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontFamily: 'Yellowtail, cursive', fontSize: 14, color: '#191923', opacity: 0.4, marginTop: 20 }}>
          Accès réservé à l'équipe Meshuga · 3 rue Vavin 75006
        </p>
      </div>
    </div>
  )
}
