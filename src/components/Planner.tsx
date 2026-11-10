import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ITEM_COLUMNS, categoryOf, type Item } from '../lib/closet'
import { PLAN_DAYS, canPlan, dateKey, generatePlan, pieces, preferenceScores, swapDay, type PlanDay } from '../lib/planner'

type Props = { userId: string; onOpenCloset: () => void }

const todayKey = () => dateKey(new Date(), 0)

function formatDate(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Planner({ userId, onOpenCloset }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [days, setDays] = useState<PlanDay[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    const { data: rows, error: itemError } = await supabase.from('wardrobe_items').select(ITEM_COLUMNS).eq('user_id', userId)
    if (itemError) { setError(`We could not load your closet. ${itemError.message}`); setLoading(false); return }
    const list = (rows ?? []) as Item[]
    const paths = list.map(row => row.original_image_path).filter((p): p is string => Boolean(p))
    const urls = new Map<string, string>()
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('wardrobe-images').createSignedUrls(paths, 3600)
      signed?.forEach(entry => { if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl) })
    }
    setItems(list.map(row => ({ ...row, imageUrl: row.original_image_path ? urls.get(row.original_image_path) : undefined })))

    const { data: plans, error: planError } = await supabase.from('outfit_plans').select('id').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1)
    if (planError) { setError(`We could not load your plan. ${planError.message}`); setLoading(false); return }
    const active = plans?.[0]
    if (active) {
      const { data: dayRows, error: dayError } = await supabase.from('outfit_plan_days').select('date,top_id,bottom_id,shoe_id,ai_note,feedback').eq('plan_id', active.id).order('date')
      if (dayError) { setError(`We could not load your plan days. ${dayError.message}`); setLoading(false); return }
      setPlanId(active.id)
      setDays((dayRows ?? []).map(r => ({ date: r.date, topId: r.top_id, bottomId: r.bottom_id, shoeId: r.shoe_id, note: r.ai_note ?? '', feedback: r.feedback })))
    } else { setPlanId(null); setDays([]) }
    setLoading(false)
  }, [userId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(t)
  }, [notice])

  const byId = useMemo(() => new Map(items.map(item => [item.id, item])), [items])
  const counts = useMemo(() => {
    const p = pieces(items)
    return { tops: p.tops.length, bottoms: p.bottoms.length, shoes: p.shoes.length }
  }, [items])

  async function create() {
    if (!supabase) return
    setBusy(true)
    setError('')
    const prefs = preferenceScores(days)
    const start = new Date()
    const plan = generatePlan(items, start, prefs)
    if (!plan.length) { setError('We could not build a plan from your current pieces.'); setBusy(false); return }
    await supabase.from('outfit_plans').update({ status: 'archived' }).eq('user_id', userId).eq('status', 'active')
    const { data: created, error: planError } = await supabase.from('outfit_plans').insert({ user_id: userId, start_date: plan[0].date, end_date: plan[plan.length - 1].date, status: 'active' }).select('id').single()
    if (planError || !created) { setError(`Could not save your plan. ${planError?.message ?? ''}`); setBusy(false); return }
    const { error: daysError } = await supabase.from('outfit_plan_days').insert(plan.map(day => ({ plan_id: created.id, date: day.date, top_id: day.topId, bottom_id: day.bottomId, shoe_id: day.shoeId, ai_note: day.note })))
    if (daysError) { setError(`Could not save your plan days. ${daysError.message}`); setBusy(false); return }
    setPlanId(created.id)
    setDays(plan)
    setNotice('Your 30-day plan is ready.')
    setBusy(false)
  }

  async function saveDay(index: number, next: PlanDay) {
    if (!supabase || !planId) return
    const { error: updateError } = await supabase.from('outfit_plan_days').update({ top_id: next.topId, bottom_id: next.bottomId, shoe_id: next.shoeId, ai_note: next.note, feedback: next.feedback }).eq('plan_id', planId).eq('date', next.date)
    if (updateError) { setError(`Your change was not saved. ${updateError.message}`); return }
    setDays(list => list.map((day, i) => (i === index ? next : day)))
  }

  function swap(index: number) {
    const next = swapDay(items, days, index, preferenceScores(days))
    if (!next) { setNotice('No other clean combination is available. Add more pieces or move items out of the laundry.'); return }
    void saveDay(index, next)
  }

  function rate(index: number, value: 1 | -1) {
    const day = days[index]
    void saveDay(index, { ...day, feedback: day.feedback === value ? null : value })
  }

  async function worn(index: number) {
    if (!supabase) return
    const day = days[index]
    const ids = [day.topId, day.bottomId, day.shoeId]
    const stamp = day.date
    const results = await Promise.all(ids.map(id => {
      const item = byId.get(id)
      if (!item) return Promise.resolve({ error: null })
      return supabase!.from('wardrobe_items').update({ wear_count: item.wear_count + 1, last_worn_date: stamp, is_clean: false }).eq('id', id).eq('user_id', userId)
    }))
    const failed = results.find(r => r.error)
    if (failed?.error) { setError(`Could not record what you wore. ${failed.error.message}`); return }
    setItems(list => list.map(item => (ids.includes(item.id) ? { ...item, wear_count: item.wear_count + 1, last_worn_date: stamp, is_clean: false } : item)))
    setNotice('Marked as worn. Those pieces moved to the laundry.')
  }

  if (loading) return <section className="planner"><div className="screen-head"><h1>30-day planner</h1></div><div className="skeleton plan-skeleton" aria-hidden="true" /></section>

  const ready = canPlan(items)
  const today = todayKey()
  const firstIndex = Math.max(0, days.findIndex(day => day.date >= today))

  return (
    <section className="planner">
      <div className="screen-head">
        <div>
          <h1>30-day planner</h1>
          <p className="muted">{days.length ? 'A different outfit every day, from clean pieces only.' : 'Plan a month of outfits in one tap.'}</p>
        </div>
      </div>
      {notice && <p className="banner ok" role="status">{notice}</p>}
      {error && <p className="banner bad" role="alert">{error}</p>}

      {!ready && (
        <div className="empty">
          <h2>Add a few more pieces</h2>
          <p>The planner needs at least one clean top, one bottom and one pair of shoes. You have {counts.tops} {counts.tops === 1 ? 'top' : 'tops'}, {counts.bottoms} {counts.bottoms === 1 ? 'bottom' : 'bottoms'} and {counts.shoes} {counts.shoes === 1 ? 'pair of shoes' : 'pairs of shoes'} that {counts.tops + counts.bottoms + counts.shoes === 1 ? 'is' : 'are'} clean.</p>
          <button className="btn primary" onClick={onOpenCloset}>Go to closet</button>
        </div>
      )}

      {ready && !days.length && (
        <div className="empty">
          <h2>Ready to plan</h2>
          <p>We will mix your {counts.tops} tops, {counts.bottoms} bottoms and {counts.shoes} shoes, avoid repeats, and keep colors and formality matching.</p>
          <button className="btn primary" disabled={busy} onClick={() => void create()}>{busy ? 'Planning…' : `Create my ${PLAN_DAYS}-day plan`}</button>
        </div>
      )}

      {days.length > 0 && (
        <>
          <div className="plan-list">
            {days.slice(firstIndex).map((day, offset) => {
              const index = firstIndex + offset
              const parts = [byId.get(day.topId), byId.get(day.bottomId), byId.get(day.shoeId)]
              const isToday = day.date === today
              return (
                <article key={day.date} className={isToday ? 'plan-day today' : 'plan-day'}>
                  <header><h2>{isToday ? 'Today' : formatDate(day.date)}</h2>{isToday && <span className="muted">{formatDate(day.date)}</span>}</header>
                  <div className="plan-parts">
                    {parts.map((item, i) => (
                      <div key={i} className="plan-part">
                        <span className="plan-photo">{item?.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <em>Removed</em>}</span>
                        <span className="plan-label">{item ? (categoryOf(item) === 'top' ? 'Top' : categoryOf(item) === 'bottom' ? 'Bottom' : 'Shoes') : 'Missing'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="muted">{day.note}</p>
                  <div className="plan-actions">
                    <button className={day.feedback === 1 ? 'chip on' : 'chip'} aria-pressed={day.feedback === 1} onClick={() => rate(index, 1)}>Like</button>
                    <button className={day.feedback === -1 ? 'chip on' : 'chip'} aria-pressed={day.feedback === -1} onClick={() => rate(index, -1)}>Not for me</button>
                    <button className="chip" onClick={() => swap(index)}>Swap</button>
                    {isToday && <button className="btn primary small" onClick={() => void worn(index)}>Wore this</button>}
                  </div>
                </article>
              )
            })}
          </div>
          <div className="plan-footer">
            <button className="btn" disabled={busy} onClick={() => void create()}>{busy ? 'Planning…' : 'Rebuild plan'}</button>
            <p className="hint">Rebuilding uses your likes and swaps, and leaves out pieces in the laundry.</p>
          </div>
        </>
      )}
    </section>
  )
}
