import { useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Mode = 'home' | 'save' | 'signin' | 'forgot'
type Props = { session: Session; recovery: boolean; onRecovered: () => void }

function plainError(message: string) {
  const text = message.toLowerCase()
  if (text.includes('already') && text.includes('registered')) return 'That email already has an account. Use "Sign in" instead.'
  if (text.includes('invalid login')) return 'The email or password is not right. Try again, or reset your password.'
  if (text.includes('password') && (text.includes('weak') || text.includes('least'))) return 'Choose a stronger password with at least 8 characters.'
  if (text.includes('rate') || text.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
  if (text.includes('expired') || text.includes('invalid')) return 'This link has expired. Request a new one.'
  return message
}

export default function Account({ session, recovery, onRecovered }: Props) {
  const guest = Boolean(session.user.is_anonymous)
  const [mode, setMode] = useState<Mode>('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function open(next: Mode) { setMode(next); setError(''); setInfo(''); setPassword('') }

  async function run(action: () => Promise<{ error: { message: string } | null }>, success: string, after?: () => void) {
    setBusy(true); setError(''); setInfo('')
    const { error: failure } = await action()
    setBusy(false)
    if (failure) { setError(plainError(failure.message)); return }
    setInfo(success)
    after?.()
  }

  function saveCloset(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    void run(() => supabase!.auth.updateUser({ email: email.trim(), password }, { emailRedirectTo: window.location.origin }),
      'Check your email and confirm the link. Your closet stays on this account.')
  }

  function signIn(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    void run(() => supabase!.auth.signInWithPassword({ email: email.trim(), password }), 'Signed in.', () => open('home'))
  }

  function forgot(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    void run(() => supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin }), 'If that email has an account, a reset link is on its way.')
  }

  function setNewPassword(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    void run(() => supabase!.auth.updateUser({ password }), 'Password updated.', onRecovered)
  }

  function signOut() {
    if (!supabase) return
    if (guest && !window.confirm('You are a guest. Signing out will leave this closet behind and you will not be able to get it back. Save your closet first. Sign out anyway?')) return
    void supabase.auth.signOut().then(() => window.location.reload())
  }

  const messages = (<>
    {error && <p className="banner bad" role="alert">{error}</p>}
    {info && <p className="banner ok" role="status">{info}</p>}
  </>)

  if (recovery) {
    return (
      <section className="account">
        <div className="screen-head"><h1>Set a new password</h1></div>
        {messages}
        <form className="form" onSubmit={setNewPassword}>
          <label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        </form>
      </section>
    )
  }

  if (mode === 'save' || mode === 'signin' || mode === 'forgot') {
    const title = mode === 'save' ? 'Save your closet' : mode === 'signin' ? 'Sign in' : 'Reset password'
    return (
      <section className="account">
        <div className="screen-head"><h1>{title}</h1></div>
        {mode === 'save' && <p className="muted lead">Add an email and password. Your pieces and plan stay exactly as they are, and you can open them on any phone.</p>}
        {mode === 'signin' && <p className="muted lead">Signing in opens your saved closet. Anything in this guest closet will be left behind.</p>}
        {messages}
        <form className="form" onSubmit={mode === 'save' ? saveCloset : mode === 'signin' ? signIn : forgot}>
          <label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          {mode !== 'forgot' && <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'save' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>}
          <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'save' ? 'Save my closet' : mode === 'signin' ? 'Sign in' : 'Send reset link'}</button>
        </form>
        {mode === 'signin' && <button className="link" onClick={() => open('forgot')}>Forgot your password?</button>}
        <button className="link" onClick={() => open('home')}>Back</button>
      </section>
    )
  }

  return (
    <section className="account">
      <div className="screen-head"><h1>You</h1></div>
      {messages}
      {guest ? (
        <div className="card stack">
          <h2>You are using a guest closet</h2>
          <p className="muted">It lives only on this phone. If you clear your browser data or switch phones, you will lose it. Save it to an account to keep it safe.</p>
          <button className="btn primary" onClick={() => open('save')}>Save my closet</button>
          <button className="btn" onClick={() => open('signin')}>I already have an account</button>
        </div>
      ) : (
        <div className="card stack">
          <h2>Signed in</h2>
          <p className="muted">{session.user.email}</p>
          {!session.user.email_confirmed_at && <p className="hint">Your email is not confirmed yet. Open the link we sent you.</p>}
        </div>
      )}
      <button className="btn ghost" onClick={signOut}>Sign out</button>
    </section>
  )
}
