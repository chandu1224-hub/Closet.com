import { useState } from 'react'
import { CATEGORIES, COLOR_FAMILIES, FORMALITY, SEASONS, categoryOf, labelFor, type Item } from '../lib/closet'
import { CloseIcon, TrashIcon } from './Icons'

type Props = {
  item: Item
  saving: boolean
  onClose: () => void
  onChange: (patch: Partial<Item>) => void
  onDelete: () => void
}

export default function ItemSheet({ item, saving, onClose, onChange, onDelete }: Props) {
  const [name, setName] = useState(item.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const category = categoryOf(item)

  function commitName() {
    const next = name.trim()
    if (!next) setName(item.name)
    else if (next !== item.name) onChange({ name: next })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tall" role="dialog" aria-modal="true" aria-label={`Edit ${item.name}`} onClick={event => event.stopPropagation()}>
        <div className="sheet-head">
          <h2>Edit piece</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <div className="sheet-photo">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>Photo unavailable</span>}
        </div>

        <label className="field">
          <span>Name</span>
          <input value={name} maxLength={60} onChange={event => setName(event.target.value)} onBlur={commitName} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
        </label>

        <div className="field">
          <span>Category</span>
          <div className="chip-row wrap">
            {CATEGORIES.map(entry => (
              <button key={entry.value} className={category === entry.value ? 'chip on' : 'chip'} onClick={() => onChange({ category_group: entry.value })}>{entry.label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Formality</span>
          <div className="chip-row wrap">
            {FORMALITY.map(entry => (
              <button key={entry.value} className={item.formality === entry.value ? 'chip on' : 'chip'} onClick={() => onChange({ formality: item.formality === entry.value ? null : entry.value })}>{entry.label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Season</span>
          <div className="chip-row wrap">
            {SEASONS.map(entry => (
              <button key={entry.value} className={item.season === entry.value ? 'chip on' : 'chip'} onClick={() => onChange({ season: item.season === entry.value ? null : entry.value })}>{entry.label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Color</span>
          <div className="color-row">
            <label className="swatch-picker" style={{ background: item.dominant_color_hex ?? '#888888' }}>
              <input type="color" aria-label="Pick a color" value={item.dominant_color_hex ?? '#888888'} onChange={event => onChange({ dominant_color_hex: event.target.value, primary_color: event.target.value })} />
            </label>
            <div>
              <strong>{item.dominant_color_hex ?? 'Not detected'}</strong>
              <p className="hint">{labelFor(COLOR_FAMILIES, item.color_family) || 'Unclassified'} family. Tap the swatch to correct it.</p>
            </div>
          </div>
        </div>

        <div className="switch-row">
          <div>
            <strong>{item.is_clean ? 'Clean and ready' : 'In the laundry'}</strong>
            <p className="hint">Pieces in the laundry are left out of outfit suggestions.</p>
          </div>
          <button role="switch" aria-checked={!item.is_clean} aria-label="In the laundry" className={item.is_clean ? 'switch' : 'switch on'} onClick={() => onChange({ is_clean: !item.is_clean })}><i /></button>
        </div>

        <div className="sheet-foot">
          <span className="saving" role="status">{saving ? 'Saving…' : ''}</span>
          {confirmDelete ? (
            <button className="btn danger" onClick={onDelete}>Tap again to delete</button>
          ) : (
            <button className="btn ghost danger" onClick={() => setConfirmDelete(true)}><TrashIcon /> Delete piece</button>
          )}
        </div>
      </div>
    </div>
  )
}
