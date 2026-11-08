import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import Wardrobe from './components/Wardrobe'
import Mannequin3D from './components/Mannequin3D'

const navigation = [
  { label: 'Today’s Look', icon: '◷' },
  { label: 'My Closet', icon: '▦' },
  { label: 'Mannequin', icon: '◉' },
  { label: 'Planner', icon: '▤' },
  { label: 'Backup', icon: '◇' },
  { label: 'Style', icon: '⚙' },
]

export default function App() {
  const [active, setActive] = useState('Today’s Look')
  const [session, setSession] = useState<Session | null>(null)
  const [starting, setStarting] = useState(true)
  const [guestError, setGuestError] = useState('')
  const [mannequinGender, setMannequinGender] = useState<'male' | 'female'>('male')
  const [closetCount, setClosetCount] = useState<number | null>(null)

  useEffect(() => {
    if (!supabase) {
      setStarting(false)
      return
    }
    let alive = true
    async function startGuestSession() {
      const { data: current } = await supabase!.auth.getSession()
      if (current.session) {
        if (alive) setSession(current.session)
      } else {
        const { data, error } = await supabase!.auth.signInAnonymously()
        if (error) {
          if (alive) setGuestError(error.message)
        } else if (alive) {
          setSession(data.session)
        }
      }
      if (alive) setStarting(false)
    }
    void startGuestSession()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) setSession(nextSession)
    })
    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session) return
    let alive = true
    void supabase.from('wardrobe_items').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).then(({ count }) => {
      if (alive) setClosetCount(count ?? 0)
    })
    return () => { alive = false }
  }, [session])

  if (!isSupabaseConfigured || !supabase) {
    return <main className="setup-screen"><div className="setup-card"><span className="brand-mark">C.</span><p className="eyebrow">CLOSET.COM SETUP</p><h1>One last connection.</h1><p>Add your Supabase project URL and publishable key to <code>.env.local</code> to enable the private test workspace.</p></div></main>
  }

  if (starting) {
    return <main className="launch-screen"><span className="brand-mark">C.</span><p>OPENING YOUR CLOSET…</p></main>
  }

  if (!session) {
    return <main className="launch-screen"><span className="brand-mark">C.</span><h1>Guest access needs one setting.</h1><p>Enable <strong>Anonymous Sign-ins</strong> in Supabase → Authentication → Providers, then refresh this page.</p><small>{guestError}</small></main>
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="#" aria-label="Closet.com home" onClick={event => { event.preventDefault(); setActive('Today’s Look') }}>
          <span className="brand-mark">C.</span><span>CLOSET<span className="brand-dot">.</span>COM</span>
        </a>
        <div className="header-page-title">
          <span className="header-kicker">YOUR SPACE</span>
          <strong>{active}</strong>
        </div>
        <div className="header-status"><i /> <span>TEST MODE</span></div>
      </header>

      <section className="main-area">
        <div className="content">
          {active === 'Today’s Look' ? (
            <>
              <div className="date-line">YOUR PERSONAL STYLE SPACE <span className="date-rule" /></div>
              <div className="screen-toolbar">
                <div><p className="eyebrow">YOUR DAILY EDIT</p><p className="subtitle">A little less deciding. A lot more living.</p></div>
                <button className="outline-button" onClick={() => setActive('Planner')}>VIEW PLANNER <span>↗</span></button>
              </div>
              <section className="mannequin-home">
                <div className="mannequin-heading">
                  <div><p className="eyebrow">MEET YOUR DIGITAL MANNEQUIN</p><h2>See your style in 3D.</h2><p className="subtitle">Your base look, ready for your wardrobe.</p></div>
                  <div className="gender-tabs" role="tablist" aria-label="Choose mannequin">
                    <button role="tab" aria-selected={mannequinGender === 'male'} className={mannequinGender === 'male' ? 'selected' : ''} onClick={() => setMannequinGender('male')}>MALE</button>
                    <button role="tab" aria-selected={mannequinGender === 'female'} className={mannequinGender === 'female' ? 'selected' : ''} onClick={() => setMannequinGender('female')}>FEMALE</button>
                  </div>
                </div>
                <Mannequin3D gender={mannequinGender} />
                <div className="mannequin-outfit-details"><span>WHITE SHIRT</span><i/><span>WHITE PANTS</span><i/><span>WHITE SNEAKERS</span></div>
                {closetCount === 0 && <div className="create-closet-panel"><div><p className="eyebrow">YOUR WARDROBE STARTS HERE</p><h3>Create your closet</h3><p>Add the clothes you already own. Your mannequin and outfit planner will grow with you.</p></div><button className="primary-button" onClick={() => setActive('My Closet')}>CREATE CLOSET <span>↗</span></button></div>}
                {closetCount !== 0 && <div className="create-closet-panel"><div><p className="eyebrow">YOUR DIGITAL WARDROBE</p><h3>{closetCount === null ? 'Checking your closet…' : 'Your closet is ready'}</h3><p>Manage your pieces and build new outfit combinations.</p></div><button className="primary-button" onClick={() => setActive('My Closet')}>OPEN MY CLOSET <span>↗</span></button></div>}
              </section>
