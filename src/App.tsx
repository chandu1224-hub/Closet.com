import { useState } from 'react'
import { isSupabaseConfigured } from './lib/supabase'

const navigation = ['Today’s Look', 'My Closet', 'My Mannequin', '30-Day Planner', 'Backup Planner', 'Style Preferences']

export default function App() {
  const [active, setActive] = useState('Today’s Look')
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">C.</span><span>CLOSET<span className="brand-dot">.</span>COM</span></a>
        <p className="nav-label">YOUR SPACE</p>
        <nav>{navigation.map((item, i) => <button key={item} className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)}><span className="nav-icon">{['◷','▦','◉','▤','◇','⚙'][i]}</span>{item}{item === 'Today’s Look' && <span className="nav-today" />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="avatar">G</div><div><strong>Guest wardrobe</strong><small>Personal style space</small></div><span className="more">···</span></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="breadcrumb">YOUR WARDROBE <span>/</span> <b>{active.toUpperCase()}</b></div><div className="top-actions"><span className="status"><i /> {isSupabaseConfigured ? 'Connected' : 'Setup required'}</span><button className="icon-button" aria-label="Notifications">♧</button><div className="avatar small">G</div></div></header>
        <div className="content">
          <div className="date-line">SUNDAY, NOVEMBER 8, 2026 <span className="date-rule" /></div>
          <div className="heading-row"><div><p className="eyebrow">YOUR DAILY EDIT</p><h1>{active === 'Today’s Look' ? 'Today’s Look' : active}</h1><p className="subtitle">{active === 'Today’s Look' ? 'A little less deciding. A lot more living.' : 'Your personal style, thoughtfully organized.'}</p></div><button className="outline-button" onClick={() => setActive('30-Day Planner')}>VIEW PLANNER <span>↗</span></button></div>
          {active === 'Today’s Look' ? <div className="look-grid"><div className="look-card"><div className="card-top"><span>THE LOOK · 01</span><span className="weather">✳ &nbsp; YOUR STYLE, YOUR DAY</span></div><div className="look-visual"><div className="visual-copy"><span className="visual-kicker">COMING TO YOUR CLOSET</span><h2>Your next<br/>great outfit<br/><em>starts here.</em></h2><p>Build your digital wardrobe to get a look picked just for you.</p><button className="primary-button" onClick={() => setActive('My Closet')}>ADD YOUR FIRST PIECES <span>↗</span></button></div><div className="visual-shape"><div className="shape-circle" /><div className="shape-line" /><div className="shape-label">01 / STYLE</div></div></div><div className="card-footer"><span>01 — PERSONALIZED OUTFITS</span><span>MADE FROM WHAT YOU OWN</span></div></div><div className="side-stack"><div className="mini-card"><span className="mini-number">01</span><div><p className="eyebrow">YOUR DIGITAL CLOSET</p><h3>Make it yours.</h3><p>Upload the clothes you already love. We’ll organize the rest.</p><button onClick={() => setActive('My Closet')}>EXPLORE CLOSET ↗</button></div></div><div className="quote-card"><span>“</span><p>Style is not about having more. It’s about making more of what you have.</p><small>THE CLOSET PHILOSOPHY</small></div></div></div> : <div className="empty-state"><div className="empty-icon">✳</div><h2>Coming together, one piece at a time.</h2><p>This space will be ready as we build your wardrobe foundation.</p><button className="primary-button" onClick={() => setActive('My Closet')}>START WITH MY CLOSET ↗</button></div>}
          <footer className="page-footer"><span>YOUR WARDROBE. YOUR STYLE. DECIDED.</span><span>MADE TO MAKE EVERY DAY EASIER.</span></footer>
        </div>
      </section>
    </main>
  )
}
