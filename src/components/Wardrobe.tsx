import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const categories = [
  ['shirt', 'Shirts'], ['t_shirt', 'T-shirts'], ['trousers', 'Trousers'],
  ['jeans', 'Jeans'], ['kurta', 'Kurtas'], ['dress', 'Dresses'],
  ['skirt', 'Skirts'], ['jacket', 'Jackets'], ['blazer', 'Blazers'],
  ['shorts', 'Shorts'], ['traditional', 'Traditional'], ['footwear', 'Footwear'],
  ['accessory', 'Accessories'], ['other', 'Other'],
] as const

type WardrobeItem = {
  id: string
  name: string
  category: string
  primary_color: string | null
  original_image_path: string | null
  processing_status: string
  created_at: string
  imageUrl?: string
}

type Props = { userId: string }

export default function Wardrobe({ userId }: Props) {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [category, setCategory] = useState('other')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const loadItems = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('id,name,category,primary_color,original_image_path,processing_status,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }
    const withImages = await Promise.all((data ?? []).map(async item => {
      if (!item.original_image_path) return item
      const { data: signed } = await supabase!.storage.from('wardrobe-images').createSignedUrl(item.original_image_path, 3600)
      return { ...item, imageUrl: signed?.signedUrl }
    }))
    setItems(withImages)
    setLoading(false)
  }, [userId])

  useEffect(() => { void loadItems() }, [loadItems])

  async function uploadFiles(fileList: FileList | null) {
    if (!supabase || !fileList?.length) return
    const files = Array.from(fileList)
    setUploading(true)
    setMessage('')
    let uploaded = 0
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setMessage(`Skipped ${file.name}: use JPG, PNG or WebP images.`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setMessage(`Skipped ${file.name}: image must be 10 MB or smaller.`)
        continue
      }
      const id = crypto.randomUUID()
      const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
      const path = `${userId}/${id}/original.${extension}`
      const { error: storageError } = await supabase.storage.from('wardrobe-images').upload(path, file, { contentType: file.type, upsert: false })
      if (storageError) {
        setMessage(`Could not upload ${file.name}: ${storageError.message}`)
        continue
      }
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled item'
      const { error: insertError } = await supabase.from('wardrobe_items').insert({
        id, user_id: userId, name, category, original_image_path: path, processing_status: 'pending',
      })
      if (insertError) {
        await supabase.storage.from('wardrobe-images').remove([path])
        setMessage(`Could not save ${file.name}: ${insertError.message}`)
        continue
      }
      uploaded += 1
    }
    if (uploaded) setMessage(`${uploaded} ${uploaded === 1 ? 'item' : 'items'} added to your closet.`)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    await loadItems()
  }

  async function deleteItem(item: WardrobeItem) {
    if (!supabase || !window.confirm(`Remove “${item.name}” from your closet?`)) return
    if (item.original_image_path) {
      const { error: storageError } = await supabase.storage.from('wardrobe-images').remove([item.original_image_path])
      if (storageError) { setMessage(storageError.message); return }
    }
    const { error } = await supabase.from('wardrobe_items').delete().eq('id', item.id).eq('user_id', userId)
    if (error) setMessage(error.message)
    else { setMessage('Item removed.'); await loadItems() }
  }

  const visibleItems = filter === 'all' ? items : items.filter(item => item.category === filter)

  return (
    <section className="wardrobe-page">
      <div className="wardrobe-toolbar">
        <div><p className="eyebrow">YOUR DIGITAL CLOSET</p><h2>{items.length} {items.length === 1 ? 'piece' : 'pieces'} in your wardrobe</h2><p className="subtitle">Add what you own. We’ll help organize the rest.</p></div>
        <div className="upload-actions">
          <select aria-label="Category for uploaded items" value={category} onChange={event => setCategory(event.target.value)}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="primary-button" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? 'UPLOADING…' : '＋ ADD CLOTHES'}</button>
          <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => void uploadFiles(event.target.files)} />
        </div>
      </div>
      <div className="upload-hint">BULK UPLOAD · JPG, PNG OR WEBP · MAX 10 MB PER IMAGE</div>
      {message && <p className="wardrobe-message" role="status">{message}</p>}
      <div className="closet-filters"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>ALL ITEMS</button>{categories.map(([value, label]) => items.some(item => item.category === value) && <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label.toUpperCase()}</button>)}</div>
      {loading ? <div className="closet-empty">LOADING YOUR WARDROBE…</div> : visibleItems.length ? <div className="wardrobe-grid">{visibleItems.map(item => <article className="wardrobe-item" key={item.id}><div className="wardrobe-image">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>IMAGE PENDING</span>}<button onClick={() => void deleteItem(item)} aria-label={`Delete ${item.name}`}>×</button></div><div className="wardrobe-item-copy"><strong>{item.name}</strong><small>{categories.find(([value]) => value === item.category)?.[1] ?? 'Other'}</small></div></article>)}</div> : <div className="closet-empty"><span>✳</span><h3>Your closet starts with one piece.</h3><p>Upload individual photos or select multiple images at once. Your photos stay private to your account.</p><button className="primary-button" onClick={() => inputRef.current?.click()}>UPLOAD YOUR FIRST CLOTHES ↗</button></div>}
    </section>
  )
}
