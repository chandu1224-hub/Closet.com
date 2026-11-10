import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import Closet from './components/Closet'
import Planner from './components/Planner'
import Account from './components/Account'
import TryOn from './components/TryOn'
import { AccountIcon, ClosetIcon, PlannerIcon, TodayIcon } from './components/Icons'

type Tab = 'today' | 'closet' | 'planner' | 'you'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'Try on', icon: <TodayIcon /> },
  { id: 'closet', label: 'Closet', icon: <ClosetIcon /> },
  { id: 'planner', label: 'Planner', icon: <PlannerIcon /> },
  { id: 'you', label: 'You', icon: <AccountIcon /> },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [session, setSession] = useState<Session | null>(null)
  const [starting, setStarting] = useState(true)
  const [guestError, setGuestError] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.register('/sw.js').catch(error => console.error('Service worker registration failed:', error))
    }
  }, [])

  useEffect(() => {
    if (!supabase) { setStarting(false); return }
    let alive = true
    async function start() {
      const { data: current } = await supabase!.auth.getSession()
      if (current.session) {
        if (alive) setSession(current.session)
      } else {
        const { data, error } = await supabase!.auth.signInAnonymously()
        if (error) { if (alive) setGuestError(error.message) }
        else if (alive) setSession(data.session)
      }
      if (alive) setStarting(false)
    }
    void start()
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setTab('you') }
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="center-screen">
        <h1>Connect Supabase</h1>
        <p>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your environment variables, then redeploy.</p>
      </main>
    )
  }
  if (starting) return <main className="center-screen"><p>Opening your closet…</p></main>
  if (!session) {
    return (
      <main className="center-screen">
        <h1>Guest access is turned off</h1>
        <p>In Supabase, open Authentication, then Sign In / Providers, and turn on Anonymous sign-ins. Then refresh this page.</p>
        {guestError && <small>{guestError}</small>}
      </main>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="wordmark">Closet</span>
      </header>

      <main className="screen">
        {tab === 'today' && <TryOn userId={session.user.id} gender={gender} onGender={setGender} onOpenCloset={() => setTab('closet')} />}

        {tab === 'closet' && <Closet userId={session.user.id} />}

        {tab === 'planner' && <Planner userId={session.user.id} onOpenCloset={() => setTab('closet')} />}

        {tab === 'you' && <Account session={session} recovery={recovery} onRecovered={() => setRecovery(false)} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map(entry => (
          <button key={entry.id} className={tab === entry.id ? 'tab on' : 'tab'} aria-current={tab === entry.id ? 'page' : undefined} onClick={() => setTab(entry.id)}>
            {entry.icon}<span>{entry.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
