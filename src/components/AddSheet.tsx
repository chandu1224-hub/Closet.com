import { useRef, useState } from 'react'
import { CATEGORIES, type Category } from '../lib/closet'
import { CameraIcon, CloseIcon, GalleryIcon } from './Icons'

type Props = {
  defaultCategory: Category
  onClose: () => void
  onPick: (files: File[], category: Category) => void
}

export default function AddSheet({ defaultCategory, onClose, onPick }: Props) {
  const [category, setCategory] = useState<Category>(defaultCategory)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  function handle(list: FileList | null) {
    const files = list ? Array.from(list) : []
    if (files.length) onPick(files, category)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Add clothes" onClick={event => event.stopPropagation()}>
        <div className="sheet-head">
          <h2>Add clothes</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <p className="sheet-label">What are you adding?</p>
        <div className="chip-row wrap" role="radiogroup" aria-label="Category">
          {CATEGORIES.map(entry => (
            <button key={entry.value} role="radio" aria-checked={category === entry.value} className={category === entry.value ? 'chip on' : 'chip'} onClick={() => setCategory(entry.value)}>
              {entry.label}
            </button>
          ))}
        </div>
        <div className="add-actions">
          <button className="btn primary" onClick={() => camera.current?.click()}><CameraIcon /> Take a photo</button>
          <button className="btn" onClick={() => gallery.current?.click()}><GalleryIcon /> Choose from gallery</button>
        </div>
        <p className="hint">You can pick several photos at once. JPG, PNG or WebP, up to 10 MB each. Lay the piece flat on a plain surface for the best color match.</p>
        <input ref={camera} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => { handle(event.target.files); event.target.value = '' }} />
        <input ref={gallery} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { handle(event.target.files); event.target.value = '' }} />
      </div>
    </div>
  )
}
