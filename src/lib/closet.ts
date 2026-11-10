export const CATEGORIES = [
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'accessory', label: 'Accessories' },
] as const

export const FORMALITY = [
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'sport', label: 'Sport' },
] as const

export const SEASONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
  { value: 'all-season', label: 'All year' },
] as const

export const COLOR_FAMILIES = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
  { value: 'bold', label: 'Bold' },
  { value: 'pastel', label: 'Pastel' },
] as const

export type Category = (typeof CATEGORIES)[number]['value']
export type ColorFamily = (typeof COLOR_FAMILIES)[number]['value']

export type Item = {
  id: string
  name: string
  category: string
  category_group: Category | null
  primary_color: string | null
  dominant_color_hex: string | null
  color_family: ColorFamily | null
  formality: string | null
  season: string | null
  is_clean: boolean
  wear_count: number
  last_worn_date: string | null
  original_image_path: string | null
  processing_status: string
  created_at: string
  imageUrl?: string
}

export const ITEM_COLUMNS =
  'id,name,category,category_group,primary_color,dominant_color_hex,color_family,formality,season,is_clean,wear_count,last_worn_date,original_image_path,processing_status,created_at'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function categoryOf(item: Item): Category {
  return item.category_group ?? 'accessory'
}

export function labelFor<T extends { value: string; label: string }>(list: readonly T[], value: string | null) {
  return list.find(entry => entry.value === value)?.label ?? ''
}

/** Reads the dominant color of a photo using a small canvas. No external library. */
export function extractColor(file: File): Promise<{ hex: string; family: ColorFamily }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const size = 48
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Canvas is not available')
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        // Count pixels in coarse color bins, ignoring the outer border (usually background)
        // and near-white pixels (studio or wall backgrounds).
        const bins = new Map<string, number>()
        for (let y = 6; y < size - 6; y++) {
          for (let x = 6; x < size - 6; x++) {
            const i = (y * size + x) * 4
            if (data[i + 3] < 180) continue
            const r = data[i], g = data[i + 1], b = data[i + 2]
            if (r > 235 && g > 235 && b > 235) continue
            const key = [r, g, b].map(v => Math.round(v / 32) * 32).join(',')
            bins.set(key, (bins.get(key) ?? 0) + 1)
          }
        }
        const top = [...bins].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '128,128,128'
        const [r, g, b] = top.split(',').map(v => Math.min(255, Number(v)))
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
        resolve({ hex, family: classifyColor(r, g, b) })
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this image'))
    }
    img.src = url
  })
}

export function classifyColor(r: number, g: number, b: number): ColorFamily {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const saturation = max ? delta / max : 0
  const lightness = (max + min) / 510
  let hue = 0
  if (delta) {
    hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
  }
  if (saturation < 0.18 || lightness < 0.12 || lightness > 0.9) return 'neutral'
  if (lightness > 0.72 && saturation < 0.55) return 'pastel'
  if (saturation > 0.68) return 'bold'
  return hue < 70 || hue >= 330 ? 'warm' : 'cool'
}
