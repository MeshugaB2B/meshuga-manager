'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    if (data.user) { router.push('/dashboard'); router.refresh() }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError('Erreur : ' + error.message); setLoading(false); return }
    setResetSent(true)
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 5,
    border: '2px solid #191923', fontFamily: "'Arial Narrow', Arial",
    fontSize: 14, outline: 'none', boxShadow: '2px 2px 0 #191923', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight:'100vh', background:'#FFEB5A', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Arial Narrow', Arial, sans-serif" }}>
      <div style={{ width:'100%', maxWidth:400 }}>

        <div style={{ textAlign:'center', marginBottom:40 }}>
          <img src="/apple-touch-icon.png" alt="Meshuga" width={120} height={120}
            style={{ borderRadius:'50%', margin:'0 auto 16px', display:'block', border:'3px solid #191923', boxShadow:'5px 5px 0px #191923' }} />
          <h1 style={{ fontFamily:"'Arial Narrow', Arial", fontWeight:900, fontSize:48, color:'#191923', letterSpacing:2, textTransform:'uppercase', lineHeight:1, margin:0 }}>meshuga</h1>
          <p style={{ fontSize:18, color:'#191923', opacity:0.6, marginTop:4 }}>B2B Manager</p>
        </div>

        <div style={{ background:'#FFFFFF', borderRadius:8, padding:28, border:'3px solid #191923', boxShadow:'6px 6px 0px #191923' }}>
          <div style={{ fontFamily:"'Yellowtail', cursive", fontSize:22, marginBottom:20, color:'#191923' }}>
            {mode === 'login' ? 'Connexion 👋' : 'Mot de passe oublié'}
          </div>

          {error && (
            <div style={{ background:'#FF82D7', border:'2px solid #191923', borderRadius:6, padding:'10px 14px', marginBottom:16, fontWeight:900, fontSize:13 }}>{error}</div>
          )}

          {mode === 'forgot' && resetSent ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📧</div>
              <div style={{ fontWeight:900, fontSize:14, marginBottom:8 }}>Email envoyé !</div>
              <div style={{ fontSize:12, opacity:0.6, marginBottom:20 }}>Vérifie ta boîte mail — tu as reçu un lien pour réinitialiser ton mot de passe.</div>
              <button onClick={() => { setMode('login'); setResetSent(false) }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#005FFF', fontWeight:900, fontSize:13, textDecoration:'underline' }}>
                ← Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={mode === 'login' ? handleLogin : handleForgot}>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:14, color:'#191923', display:'block', marginBottom:6, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@meshuga.fr" required style={inputStyle} />
              </div>

              {mode === 'login' && (
                <div style={{ marginBottom:8 }}>
                  <label style={{ fontSize:14, color:'#191923', display:'block', marginBottom:6, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>Mot de passe</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
                </div>
              )}

              {mode === 'login' && (
                <div style={{ textAlign:'right', marginBottom:20 }}>
                  <button type="button" onClick={() => { setMode('forgot'); setError('') }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#191923', opacity:0.5, fontSize:12, fontWeight:900, textDecoration:'underline' }}>
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {mode === 'forgot' && <div style={{ marginBottom:20 }} />}

              <button type="submit" disabled={loading} style={{
                width:'100%', padding:'11px 18px', background:'#FFEB5A',
                border:'2px solid #191923', borderRadius:5, fontFamily:"'Arial Narrow', Arial",
                fontSize:13, fontWeight:900, textTransform:'uppercase', letterSpacing:1,
                cursor:loading ? 'not-allowed' : 'pointer', boxShadow:'3px 3px 0 #191923', opacity:loading ? 0.7 : 1
              }}>
                {loading ? '...' : mode === 'login' ? 'Se connecter →' : 'Envoyer le lien →'}
              </button>

              {mode === 'forgot' && (
                <div style={{ textAlign:'center', marginTop:16 }}>
                  <button type="button" onClick={() => { setMode('login'); setError('') }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#191923', opacity:0.5, fontSize:12, fontWeight:900, textDecoration:'underline' }}>
                    ← Retour à la connexion
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        <p style={{ textAlign:'center', fontSize:12, color:'#191923', opacity:0.4, marginTop:20, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>
          Accès réservé · Meshuga · 3 rue Vavin 75006
        </p>
      </div>
    </div>
  )
}
