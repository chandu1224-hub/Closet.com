import { COLOR_FAMILIES, categoryOf, labelFor, type Item } from './closet'

export type Combo = { top: Item; bottom: Item; shoes: Item }
export type PlanDay = { date: string; topId: string; bottomId: string; shoeId: string; note: string; feedback: number | null }
type Slot = (Combo | null)[]

export const PLAN_DAYS = 30
const TOP_GAP = 5
const BOTTOM_GAP = 3
const SHOE_GAP = 2

export function pieces(items: Item[]) {
  const clean = items.filter(item => item.is_clean)
  return {
    tops: clean.filter(item => categoryOf(item) === 'top'),
    bottoms: clean.filter(item => categoryOf(item) === 'bottom'),
    shoes: clean.filter(item => categoryOf(item) === 'shoes'),
  }
}

export function canPlan(items: Item[]) {
  const { tops, bottoms, shoes } = pieces(items)
  return tops.length > 0 && bottoms.length > 0 && shoes.length > 0
}

function formalityScore(combo: Combo) {
  const known = [combo.top, combo.bottom, combo.shoes].map(item => item.formality).filter(Boolean)
  if (known.length < 2) return 0
  const set = new Set(known)
  if (set.size === 1) return 3
  if (set.has('formal') && set.has('sport')) return -8
  if (set.has('formal')) return -3
  return -2
}

function colorScore(combo: Combo) {
  const a = combo.top.color_family
  const b = combo.bottom.color_family
  const c = combo.shoes.color_family
  let score = 0
  if (a === 'neutral' || b === 'neutral') score += 2
  if (a === 'neutral' && b === 'neutral') score += 1
  if (a && a === b && a !== 'neutral') score += 1
  if ((a === 'warm' && b === 'cool') || (a === 'cool' && b === 'warm')) score += 1
  if (a === 'bold' && b === 'bold') score -= 4
  if ((a === 'bold' && b === 'pastel') || (a === 'pastel' && b === 'bold')) score -= 2
  if (combo.top.dominant_color_hex && combo.top.dominant_color_hex === combo.bottom.dominant_color_hex) score -= 2
  if (c === 'neutral') score += 1
  else if (c && c !== a && c !== b) score -= 1
  return score
}

function jitter(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 1000) / 2000
}

function sameCombo(x: Combo, y: Combo) {
  return x.top.id === y.top.id && x.bottom.id === y.bottom.id && x.shoes.id === y.shoes.id
}

function recencyPenalty(item: Item, slotKey: 'top' | 'bottom' | 'shoes', gap: number, index: number, plan: Slot) {
  for (let d = 1; d <= gap; d++) {
    const before = plan[index - d]
    const after = plan[index + d]
    if ((before && before[slotKey].id === item.id) || (after && after[slotKey].id === item.id)) return (gap - d + 2) * 3
  }
  return 0
}

function scoreCombo(combo: Combo, index: number, plan: Slot, usage: Map<string, number>, prefs: Map<string, number>) {
  if (plan.some(other => other && sameCombo(other, combo))) return -Infinity
  let score = formalityScore(combo) + colorScore(combo)
  score -= recencyPenalty(combo.top, 'top', TOP_GAP, index, plan)
  score -= recencyPenalty(combo.bottom, 'bottom', BOTTOM_GAP, index, plan)
  score -= recencyPenalty(combo.shoes, 'shoes', SHOE_GAP, index, plan)
  for (const item of [combo.top, combo.bottom, combo.shoes]) {
    score -= 0.6 * (usage.get(item.id) ?? 0)
    score += 1.5 * (prefs.get(item.id) ?? 0)
  }
  return score + jitter(`${index}${combo.top.id}${combo.bottom.id}${combo.shoes.id}`)
}

function usageOf(plan: Slot, skip: number) {
  const usage = new Map<string, number>()
  plan.forEach((combo, i) => {
    if (!combo || i === skip) return
    for (const item of [combo.top, combo.bottom, combo.shoes]) usage.set(item.id, (usage.get(item.id) ?? 0) + 1)
  })
  return usage
}

function bestFor(items: Item[], index: number, plan: Slot, prefs: Map<string, number>, avoid?: Combo): Combo | null {
  const { tops, bottoms, shoes } = pieces(items)
  const usage = usageOf(plan, index)
  let best: Combo | null = null
  let bestScore = -Infinity
  for (const top of tops) for (const bottom of bottoms) for (const shoe of shoes) {
    const combo = { top, bottom, shoes: shoe }
    if (avoid && sameCombo(avoid, combo)) continue
    const score = scoreCombo(combo, index, plan, usage, prefs)
    if (score > bestScore) { best = combo; bestScore = score }
  }
  return best
}

export function describe(combo: Combo) {
  const family = (item: Item) => labelFor(COLOR_FAMILIES, item.color_family).toLowerCase() || 'unclassified'
  const parts: string[] = []
  const formalities = new Set([combo.top, combo.bottom, combo.shoes].map(item => item.formality).filter(Boolean))
  if (formalities.size === 1) parts.push(`All ${[...formalities][0]}`)
  const a = combo.top.color_family
  const b = combo.bottom.color_family
  if (a === 'neutral' || b === 'neutral') parts.push('a neutral piece keeps the colors easy')
  else if (a && a === b) parts.push(`${family(combo.top)} tones that match`)
  else if ((a === 'warm' && b === 'cool') || (a === 'cool' && b === 'warm')) parts.push('warm and cool balance each other')
  else parts.push(`${family(combo.top)} top with a ${family(combo.bottom)} bottom`)
  const text = parts.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}

export function toDay(combo: Combo, date: string): PlanDay {
  return { date, topId: combo.top.id, bottomId: combo.bottom.id, shoeId: combo.shoes.id, note: describe(combo), feedback: null }
}

export function dateKey(base: Date, offset: number) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function preferenceScores(days: PlanDay[]) {
  const prefs = new Map<string, number>()
  for (const day of days) {
    if (!day.feedback) continue
    for (const id of [day.topId, day.bottomId, day.shoeId]) prefs.set(id, (prefs.get(id) ?? 0) + day.feedback)
  }
  return prefs
}

export function generatePlan(items: Item[], start: Date, prefs = new Map<string, number>()): PlanDay[] {
  const plan: Slot = Array.from({ length: PLAN_DAYS }, () => null)
  for (let i = 0; i < PLAN_DAYS; i++) plan[i] = bestFor(items, i, plan, prefs)
  return plan.flatMap((combo, i) => (combo ? [toDay(combo, dateKey(start, i))] : []))
}

export function swapDay(items: Item[], days: PlanDay[], index: number, prefs: Map<string, number>): PlanDay | null {
  const byId = new Map(items.map(item => [item.id, item]))
  const plan: Slot = days.map((day, i) => {
    if (i === index) return null
    const top = byId.get(day.topId), bottom = byId.get(day.bottomId), shoes = byId.get(day.shoeId)
    return top && bottom && shoes ? { top, bottom, shoes } : null
  })
  const current = byId.get(days[index].topId) && byId.get(days[index].bottomId) && byId.get(days[index].shoeId)
    ? { top: byId.get(days[index].topId)!, bottom: byId.get(days[index].bottomId)!, shoes: byId.get(days[index].shoeId)! }
    : undefined
  const next = bestFor(items, index, plan, prefs, current)
  return next ? toDay(next, days[index].date) : null
}
