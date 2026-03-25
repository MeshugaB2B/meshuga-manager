'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    if (data.user) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFEB5A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: "'Arial Narrow', Arial, sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img
            src="/meshuga-stamp.png"
            alt="Meshuga"
            width={120}
            height={120}
            style={{
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'block',
              border: '3px solid #191923',
              boxShadow: '5px 5px 0px #191923'
            }}
          />
          <h1 style={{
            fontFamily: "'Arial Narrow', Arial",
            fontWeight: 900,
            fontSize: 48,
            color: '#191923',
            letterSpacing: 2,
            textTransform: 'uppercase',
            lineHeight: 1,
            margin: 0
          }}>
            meshuga
          </h1>
          <p style={{
            fontSize: 18,
            color: '#191923',
            opacity: 0.6,
            marginTop: 4
          }}>
            B2B Manager
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{
          background: '#FFFFFF',
          borderRadius: 8,
          padding: 28,
          border: '3px solid #191923',
          boxShadow: '6px 6px 0px #191923'
        }}>
          {error && (
            <div style={{
              background: '#FF82D7',
              border: '2px solid #191923',
              borderRadius: 6,
              padding: '10px 14px',
              marginBottom: 16,
              fontWeight: 900,
              fontSize: 13
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 16,
              color: '#191923',
              display: 'block',
              marginBottom: 6,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@meshuga.fr"
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 5,
                border: '2px solid #191923',
                fontFamily: "'Arial Narrow', Arial",
                fontSize: 14,
                outline: 'none',
                boxShadow: '2px 2px 0 #191923'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              fontSize: 16,
              color: '#191923',
              display: 'block',
              marginBottom: 6,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 5,
                border: '2px solid #191923',
                fontFamily: "'Arial Narrow', Arial",
                fontSize: 14,
                outline: 'none',
                boxShadow: '2px 2px 0 #191923'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 18px',
              background: '#FFEB5A',
              border: '2px solid #191923',
              borderRadius: 5,
              fontFamily: "'Arial Narrow', Arial",
              fontSize: 13,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '3px 3px 0 #191923',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: '#191923',
          opacity: 0.4,
          marginTop: 20,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 1
        }}>
          Accès réservé · Meshuga · 3 rue Vavin 75006
        </p>
      </div>
    </div>
  )
}
