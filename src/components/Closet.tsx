import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  ALLOWED_TYPES, CATEGORIES, COLOR_FAMILIES, FORMALITY, ITEM_COLUMNS, MAX_UPLOAD_BYTES,
  categoryOf, extractColor, labelFor, type Category, type Item,
} from '../lib/closet'
import AddSheet from './AddSheet'
import ItemSheet from './ItemSheet'
import { DropIcon, PlusIcon } from './Icons'

type Progress = { done: number; total: number } | null

export default function Closet({ userId, onCount }: { userId: string; onCount?: (count: number) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [progress, setProgress] = useState<Progress>(null)
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState<'all' | Category>('all')
  const [colorFilter, setColorFilter] = useState('all')
  const [formFilter, setFormFilter] = useState('all')
  const [lastCategory, setLastCategory] = useState<Category>('top')

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase.from('wardrobe_items').select(ITEM_COLUMNS).eq('user_id', userId).order('created_at', { ascending: false })
    if (queryError) { setError(`We could not load your closet. ${queryError.message}`); setLoading(false); return }
    const rows = (data ?? []) as Item[]
    const paths = rows.map(row => row.original_image_path).filter((path): path is string => Boolean(path))
    const urls = new Map<string, string>()
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('wardrobe-images').createSignedUrls(paths, 3600)
      signed?.forEach(entry => { if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl) })
    }
    setItems(rows.map(row => ({ ...row, imageUrl: row.original_image_path ? urls.get(row.original_image_path) : undefined })))
    onCount?.(rows.length)
    setLoading(false)
  }, [userId, onCount])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function upload(files: File[], category: Category) {
    if (!supabase) return
    setAdding(false)
    setLastCategory(category)
    setError('')
    setNotice('')
    setProgress({ done: 0, total: files.length })
    let added = 0
    const failures: string[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
        failures.push(`${file.name || 'A photo'}: use a JPG, PNG or WebP under 10 MB.`)
      } else {
        const id = crypto.randomUUID()
        const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
        const path = `${userId}/${id}/original.${ext}`
        try {
          const color = await extractColor(file)
          const { error: uploadError } = await supabase.storage.from('wardrobe-images').upload(path, file, { contentType: file.type })
          if (uploadError) throw uploadError
          const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 60) || 'New piece'
          const { error: insertError } = await supabase.from('wardrobe_items').insert({
            id, user_id: userId, name, category, category_group: category,
            primary_color: color.hex, dominant_color_hex: color.hex, color_family: color.family,
            is_clean: true, wear_count: 0, original_image_path: path, processing_status: 'pending',
          })
          if (insertError) {
            await supabase.storage.from('wardrobe-images').remove([path])
            throw insertError
          }
          added++
        } catch (caught) {
          failures.push(`${file.name || 'A photo'}: ${caught instanceof Error ? caught.message : 'upload failed'}.`)
        }
      }
      setProgress(current => current && { ...current, done: current.done + 1 })
    }

    setProgress(null)
    if (added) setNotice(added === 1 ? '1 piece added.' : `${added} pieces added.`)
    if (failures.length) setError(failures.join(' '))
    await load()
  }

  async function update(item: Item, patch: Partial<Item>) {
    if (!supabase) return
    setSavingId(item.id)
    setError('')
    const { error: updateError } = await supabase.from('wardrobe_items').update(patch).eq('id', item.id).eq('user_id', userId)
    if (updateError) setError(`Your change was not saved. ${updateError.message}`)
    else setItems(rows => rows.map(row => (row.id === item.id ? { ...row, ...patch } : row)))
    setSavingId(null)
  }

  async function remove(item: Item) {
    if (!supabase) return
    setSavingId(item.id)
    const { error: deleteError } = await supabase.from('wardrobe_items').delete().eq('id', item.id).eq('user_id', userId)
    if (deleteError) { setError(`Could not delete this piece. ${deleteError.message}`); setSavingId(null); return }
    if (item.original_image_path) await supabase.storage.from('wardrobe-images').remove([item.original_image_path])
    setOpenId(null)
    setSavingId(null)
    setNotice('Piece deleted.')
    setItems(rows => { const next = rows.filter(row => row.id !== item.id); onCount?.(next.length); return next })
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length }
    items.forEach(item => { const key = categoryOf(item); map[key] = (map[key] ?? 0) + 1 })
    return map
  }, [items])

  const visible = useMemo(() => items.filter(item =>
    (catFilter === 'all' || categoryOf(item) === catFilter) &&
    (colorFilter === 'all' || item.color_family === colorFilter) &&
    (formFilter === 'all' || item.formality === formFilter)), [items, catFilter, colorFilter, formFilter])

  const palette = useMemo(() => items.map(item => item.dominant_color_hex).filter((hex): hex is string => Boolean(hex)).slice(0, 40), [items])
  const openItem = items.find(item => item.id === openId) ?? null
  const filtered = catFilter !== 'all' || colorFilter !== 'all' || formFilter !== 'all'

  return (
    <section className="closet" aria-busy={loading}>
      <div className="screen-head">
        <div>
          <h1>My closet</h1>
          <p className="muted">{loading ? 'Loading…' : items.length === 1 ? '1 piece' : `${items.length} pieces`}</p>
        </div>
      </div>

      {palette.length > 1 && (
        <div className="palette" role="img" aria-label="Colors in your closet">
          {palette.map((hex, index) => <i key={index} style={{ background: hex }} />)}
        </div>
      )}

      {notice && <p className="banner ok" role="status">{notice}</p>}
      {error && <p className="banner bad" role="alert">{error}</p>}
      {progress && <p className="banner" role="status">Adding photo {Math.min(progress.done + 1, progress.total)} of {progress.total}…</p>}

      <div className="chip-row scroll" role="group" aria-label="Filter by category">
        <button className={catFilter === 'all' ? 'chip on' : 'chip'} onClick={() => setCatFilter('all')}>All <b>{counts.all}</b></button>
        {CATEGORIES.map(entry => (
          <button key={entry.value} className={catFilter === entry.value ? 'chip on' : 'chip'} onClick={() => setCatFilter(entry.value)}>{entry.label} <b>{counts[entry.value] ?? 0}</b></button>
        ))}
      </div>
      <div className="filter-selects">
        <select aria-label="Filter by color family" value={colorFilter} onChange={event => setColorFilter(event.target.value)}>
          <option value="all">Any color</option>
          {COLOR_FAMILIES.map(entry => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
        </select>
        <select aria-label="Filter by formality" value={formFilter} onChange={event => setFormFilter(event.target.value)}>
          <option value="all">Any formality</option>
          {FORMALITY.map(entry => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className="tile skeleton" />)}</div>
      ) : visible.length ? (
        <div className="grid">
          {visible.map(item => (
            <button key={item.id} className="tile" onClick={() => setOpenId(item.id)} aria-label={`Edit ${item.name}`}>
              <span className="tile-photo">
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <em>No photo</em>}
                {!item.is_clean && <span className="laundry-badge"><DropIcon /> Laundry</span>}
              </span>
              <span className="tile-info">
                <strong>{item.name}</strong>
                <span className="tile-meta">
                  <i className="dot" style={{ background: item.dominant_color_hex ?? '#bbb' }} />
                  {labelFor(CATEGORIES, categoryOf(item))}{item.formality ? `, ${item.formality}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>{filtered ? 'Nothing matches these filters' : 'Your closet is empty'}</h2>
          <p>{filtered ? 'Try a different category, color or formality.' : 'Add a few photos of clothes you own. The app reads each color so it can plan outfits later. Your photos stay private.'}</p>
          {filtered
            ? <button className="btn" onClick={() => { setCatFilter('all'); setColorFilter('all'); setFormFilter('all') }}>Clear filters</button>
            : <button className="btn primary" onClick={() => setAdding(true)}><PlusIcon /> Add your first piece</button>}
        </div>
      )}

      <button className="fab" onClick={() => setAdding(true)} disabled={Boolean(progress)}><PlusIcon /> Add clothes</button>

      {adding && <AddSheet defaultCategory={lastCategory} onClose={() => setAdding(false)} onPick={(files, category) => void upload(files, category)} />}
      {openItem && (
        <ItemSheet key={openItem.id} item={openItem} saving={savingId === openItem.id} onClose={() => setOpenId(null)} onChange={patch => void update(openItem, patch)} onDelete={() => void remove(openItem)} />
      )}
    </section>
  )
}
