import { FormEvent, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const navigation = ['Today’s Look', 'My Closet', 'My Mannequin', '30-Day Planner', 'Backup Planner', 'Style Preferences']

function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMessage('')
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
      setMessage('Your account is created. Check your email to confirm it, then sign in.')
    } else {
      setMessage('You’re signed in. Welcome to Closet.com.')
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <a className="brand auth-brand" href="#"><span className="brand-mark">C.</span><span>CLOSET<span className="brand-dot">.</span>COM</span></a>
        <p className="eyebrow">YOUR PERSONAL DIGITAL WARDROBE</p>
        <h1>{mode === 'signup' ? 'Make room for better style.' : 'Welcome back.'}</h1>
        <p className="auth-subtitle">Your wardrobe. Your style. Decided.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">EMAIL ADDRESS</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
          <label htmlFor="password">PASSWORD</label>
          <input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" />
          <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'PLEASE WAIT…' : mode === 'signup' ? 'CREATE MY ACCOUNT ↗' : 'SIGN IN ↗'}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to Closet.com?'} <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage('') }}>{mode === 'signup' ? 'Sign in' : 'Create account'}</button></p>
        <p className="auth-note">Your wardrobe stays private. Only you can access your clothing and images.</p>
      </section>
      <aside className="auth-art"><span>THE EVERYDAY EDIT</span><div className="auth-art-shape" /><p>Less time<br/>choosing.<br/><em>More time</em><br/>living.</p><small>YOUR WARDROBE. YOUR STYLE. DECIDED.</small></aside>
    </main>
  )
}

export default function App() {
  const [active, setActive] = useState('Today’s Look')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured || !supabase) {
    return <main className="setup-screen"><div className="setup-card"><span className="brand-mark">C.</span><p className="eyebrow">CLOSET.COM SETUP</p><h1>One last connection.</h1><p>Add your Supabase project URL and publishable key to <code>.env.local</code> to enable secure accounts.</p><code>VITE_SUPABASE_URL=…<br/>VITE_SUPABASE_PUBLISHABLE_KEY=…</code></div></main>
  }
  if (!session) return <AuthScreen />

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">C.</span><span>CLOSET<span className="brand-dot">.</span>COM</span></a>
        <p className="nav-label">YOUR SPACE</p>
        <nav>{navigation.map((item, i) => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}><span className="nav-icon">{['◷','▦','◉','▤','◇','⚙'][i]}</span>{item}{item === 'Today’s Look' && <span className="nav-today" />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="avatar">{(session.user.email?.[0] ?? 'C').toUpperCase()}</div><div className="account-copy"><strong>{session.user.email}</strong><small>Personal style space</small></div><button className="signout" onClick={() => supabase.auth.signOut()} aria-label="Sign out">↗</button></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="breadcrumb">YOUR WARDROBE <span>/</span> <b>{active.toUpperCase()}</b></div><div className="top-actions"><span className="status"><i /> CONNECTED</span><div className="avatar small">{(session.user.email?.[0] ?? 'C').toUpperCase()}</div></div></header>
        <div className="content">
          <div className="date-line">YOUR PERSONAL STYLE SPACE <span className="date-rule" /></div>
          <div className="heading-row"><div><p className="eyebrow">YOUR DAILY EDIT</p><h1>{active === 'Today’s Look' ? 'Today’s Look' : active}</h1><p className="subtitle">{active === 'Today’s Look' ? 'A little less deciding. A lot more living.' : 'Your personal style, thoughtfully organized.'}</p></div><button className="outline-button" onClick={() => setActive('30-Day Planner')}>VIEW PLANNER <span>↗</span></button></div>
          {active === 'Today’s Look' ? <div className="look-grid"><div className="look-card"><div className="card-top"><span>THE LOOK · 01</span><span className="weather">✳ &nbsp; YOUR STYLE, YOUR DAY</span></div><div className="look-visual"><div className="visual-copy"><span className="visual-kicker">COMING TO YOUR CLOSET</span><h2>Your next<br/>great outfit<br/><em>starts here.</em></h2><p>Build your digital wardrobe to get a look picked just for you.</p><button className="primary-button" onClick={() => setActive('My Closet')}>ADD YOUR FIRST PIECES <span>↗</span></button></div><div className="visual-shape"><div className="shape-circle" /><div className="shape-line" /><div className="shape-label">01 / STYLE</div></div></div><div className="card-footer"><span>01 — PERSONALIZED OUTFITS</span><span>MADE FROM WHAT YOU OWN</span></div></div><div className="side-stack"><div className="mini-card"><span className="mini-number">01</span><div><p className="eyebrow">YOUR DIGITAL CLOSET</p><h3>Make it yours.</h3><p>Upload the clothes you already love. We’ll organize the rest.</p><button onClick={() => setActive('My Closet')}>EXPLORE CLOSET ↗</button></div></div><div className="quote-card"><span>“</span><p>Style is not about having more. It’s about making more of what you have.</p><small>THE CLOSET PHILOSOPHY</small></div></div></div> : <div className="empty-state"><div className="empty-icon">✳</div><h2>Coming together, one piece at a time.</h2><p>This space will be ready as we build your wardrobe foundation.</p><button className="primary-button" onClick={() => setActive('My Closet')}>START WITH MY CLOSET ↗</button></div>}
          <footer className="page-footer"><span>YOUR WARDROBE. YOUR STYLE. DECIDED.</span><span>MADE TO MAKE EVERY DAY EASIER.</span></footer>
        </div>
      </section>
    </main>
  )
}
