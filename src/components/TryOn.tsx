import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ITEM_COLUMNS, categoryOf, type Item } from '../lib/closet'
import { dateKey } from '../lib/planner'
import Mannequin3D, { type MannequinView } from './Mannequin3D'

type Slot = 'top' | 'bottom' | 'shoes'
const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'top', label: 'Top' },
  { slot: 'bottom', label: 'Bottom' },
  { slot: 'shoes', label: 'Shoes' },
]

type Props = { userId: string; gender: 'male' | 'female'; onGender: (g: 'male' | 'female') => void; onOpenCloset: () => void }

export default function TryOn({ userId, gender, onGender, onOpenCloset }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [view, setView] = useState<MannequinView>('front')
  const [picked, setPicked] = useState<Record<Slot, string | null>>({ top: null, bottom: null, shoes: null })

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase.from('wardrobe_items').select(ITEM_COLUMNS).eq('user_id', userId).order('created_at', { ascending: false })
    if (queryError) { setError(`We could not load your closet. ${queryError.message}`); setLoading(false); return }
    const rows = (data ?? []) as Item[]
    const paths = rows.map(row => row.original_image_path).filter((p): p is string => Boolean(p))
    const urls = new Map<string, string>()
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('wardrobe-images').createSignedUrls(paths, 3600)
      signed?.forEach(entry => { if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl) })
    }
    setItems(rows.map(row => ({ ...row, imageUrl: row.original_image_path ? urls.get(row.original_image_path) : undefined })))
    setLoading(false)
  }, [userId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(t)
  }, [notice])

  const bySlot = useMemo(() => ({
    top: items.filter(item => categoryOf(item) === 'top'),
    bottom: items.filter(item => categoryOf(item) === 'bottom'),
    shoes: items.filter(item => categoryOf(item) === 'shoes'),
  }), [items])

  const byId = useMemo(() => new Map(items.map(item => [item.id, item])), [items])
  const chosen = SLOTS.map(({ slot }) => (picked[slot] ? byId.get(picked[slot]!) ?? null : null))
  const outfit = {
    top: chosen[0]?.dominant_color_hex ?? null,
    bottom: chosen[1]?.dominant_color_hex ?? null,
    shoes: chosen[2]?.dominant_color_hex ?? null,
  }
  const anyPicked = chosen.some(Boolean)

  async function useTodaysPlan() {
    if (!supabase) return
    setError('')
    const { data: plans } = await supabase.from('outfit_plans').select('id').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1)
    const planId = plans?.[0]?.id
    if (!planId) { setNotice('You have no plan yet. Create one in the Planner tab.'); return }
    const { data: day, error: dayError } = await supabase.from('outfit_plan_days').select('top_id,bottom_id,shoe_id').eq('plan_id', planId).eq('date', dateKey(new Date(), 0)).maybeSingle()
    if (dayError) { setError(`Could not load today's outfit. ${dayError.message}`); return }
    if (!day) { setNotice('Your plan has no outfit for today. Rebuild it in the Planner tab.'); return }
    setPicked({ top: day.top_id, bottom: day.bottom_id, shoes: day.shoe_id })
    setNotice("Today's planned outfit is on the mannequin.")
  }

  function choose(slot: Slot, id: string | null) {
    setPicked(current => ({ ...current, [slot]: current[slot] === id ? null : id }))
  }

  return (
    <section className="tryon">
      <div className="screen-head">
        <div>
          <h1>Try on</h1>
          <p className="muted">See how your pieces and colors look together.</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Mannequin">
          <button role="tab" aria-selected={gender === 'male'} className={gender === 'male' ? 'on' : ''} onClick={() => onGender('male')}>Male</button>
          <button role="tab" aria-selected={gender === 'female'} className={gender === 'female' ? 'on' : ''} onClick={() => onGender('female')}>Female</button>
        </div>
      </div>

      <Mannequin3D gender={gender} outfit={outfit} view={view} onInteract={() => setView('spin')} />

      <div className="view-row">
        <div className="segmented" role="tablist" aria-label="Mannequin view">
          {(['front', 'back', 'spin'] as const).map(entry => (
            <button key={entry} role="tab" aria-selected={view === entry} className={view === entry ? 'on' : ''} onClick={() => setView(entry)}>{entry === 'spin' ? 'Spin' : entry === 'front' ? 'Front' : 'Back'}</button>
          ))}
        </div>
        {anyPicked && <button className="btn ghost small" onClick={() => setPicked({ top: null, bottom: null, shoes: null })}>Reset</button>}
      </div>
      <p className="caption">The mannequin shows each piece in its detected color. Fabric and fit are not simulated.</p>

      {notice && <p className="banner ok" role="status">{notice}</p>}
      {error && <p className="banner bad" role="alert">{error}</p>}

      {loading ? (
        <div className="skeleton picker-skeleton" aria-hidden="true" />
      ) : !items.length ? (
        <div className="card cta">
          <div><h2>Start your closet</h2><p className="muted">Add clothes to try them on the mannequin.</p></div>
          <button className="btn primary" onClick={onOpenCloset}>Add clothes</button>
        </div>
      ) : (
        <>
          <button className="btn wide" onClick={() => void useTodaysPlan()}>Use today&apos;s planned outfit</button>
          {SLOTS.map(({ slot, label }) => (
            <div key={slot} className="picker">
              <h2>{label}</h2>
              {bySlot[slot].length ? (
                <div className="picker-row">
                  {bySlot[slot].map(item => (
                    <button key={item.id} className={picked[slot] === item.id ? 'pick on' : 'pick'} aria-pressed={picked[slot] === item.id} aria-label={`${label}: ${item.name}`} onClick={() => choose(slot, item.id)}>
                      {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <i style={{ background: item.dominant_color_hex ?? '#bbb' }} />}
                      <span className="pick-dot" style={{ background: item.dominant_color_hex ?? '#bbb' }} />
                    </button>
                  ))}
                </div>
              ) : <p className="hint">No {label.toLowerCase()} in your closet yet.</p>}
            </div>
          ))}
          {anyPicked && (
            <div className="board" aria-label="Outfit board">
              {chosen.map((item, i) => (
                <div key={SLOTS[i].slot} className="board-cell">
                  <span className="plan-photo">{item?.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <em>None</em>}</span>
                  <span className="plan-label">{SLOTS[i].label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
