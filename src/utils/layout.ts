// Pure layout helpers, unit tested in tests/unit/layout.spec.ts.

export type Thresholds = { sm: number, md: number, lg: number }

// Vuetify 4 / MD3 thresholds, the ones useDisplay() returns by default
export const defaultThresholds: Thresholds = { sm: 600, md: 840, lg: 1145 }

// Number of images side by side for the configured value (index 0 = setting 1), by width
// class. Same principle as the responsive grid of portals: the setting applies on large
// widths and shrinks on narrower ones. Documented in the description of `visible`.
const visibleTable: Record<'lg' | 'md' | 'sm' | 'xs', number[]> = {
  lg: [1, 2, 3, 4, 5, 6, 7, 8],
  md: [1, 2, 3, 3, 4, 4, 5, 6],
  sm: [1, 1, 2, 2, 3, 3, 4, 4],
  xs: [1, 1, 1, 2, 2, 2, 3, 3]
}

// width is the app's own width (the iframe), never the screen's
export function visibleCount (width: number, setting: number | undefined, thresholds: Thresholds = defaultThresholds): number {
  const index = Math.min(Math.max(Math.round(setting ?? 1), 1), 8) - 1
  const size = width >= thresholds.lg ? 'lg' : width >= thresholds.md ? 'md' : width >= thresholds.sm ? 'sm' : 'xs'
  return visibleTable[size][index]
}

// speed setting 1-10 → pixels per second of the continuous strip
const speeds = [10, 15, 22, 30, 40, 52, 66, 82, 100, 120]
export function speedPxPerSecond (level: number | undefined): number {
  const index = Math.min(Math.max(Math.round(level ?? 4), 1), 10) - 1
  return speeds[index]
}

export const gapPx: Record<string, number> = { none: 0, small: 8, medium: 16, large: 32 }

// image by image, the gap is half a gap on each side of every image (Vuetify spacing classes)
export const gapClass: Record<string, string> = { none: '', small: 'px-1', medium: 'px-2', large: 'px-4' }

// classes of the inner padding of each image (Vuetify spacing utilities)
export const paddingClass: Record<string, string> = { none: '', small: 'pa-2', medium: 'pa-4', large: 'pa-8' }
export const paddingPx: Record<string, number> = { none: 0, small: 8, medium: 16, large: 32 }

// Thumbnail size requested to data-fair: rounded up by steps of 200px so that a resize does
// not refetch every image, and capped to keep the thumbnails light.
export function thumbnailSize (itemWidth: number, itemHeight: number): string {
  const round = (v: number) => Math.min(Math.max(Math.ceil((v || 1) / 200) * 200, 200), 2000)
  return `${round(itemWidth * (globalThis.devicePixelRatio || 1))}x${round(itemHeight * (globalThis.devicePixelRatio || 1))}`
}

// a link typed without scheme ("www.exemple.fr") would resolve against the app's own URL
export function normalizeLink (url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  if (/^\/\//.test(trimmed)) return 'https:' + trimmed
  // a path of the portal: the app is served from the portal's origin
  if (trimmed.startsWith('/')) return trimmed
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return undefined
  return 'https://' + trimmed
}

export function hostname (url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// "16/9" → 1.78; anything unreadable → undefined
export function parseRatio (ratio: string | undefined): number | undefined {
  if (!ratio) return undefined
  const [w, h] = ratio.split('/').map(Number)
  const value = h ? w / h : w
  return Number.isFinite(value) && value > 0 ? value : undefined
}

// height of the image box when the app sizes itself (ratio or fixed); undefined = fill the
// frame. The ratio applies to the image itself, inside the padding of the box.
export function imageHeight (height: { type?: string, ratio?: string, px?: number } | undefined, slideWidth: number, padding = 0): number | undefined {
  if (height?.type === 'fixed') return Math.max(40, height.px ?? 120)
  if (height?.type === 'ratio') {
    const ratio = parseRatio(height.ratio ?? '16/9')
    return ratio ? Math.round((slideWidth - 2 * padding) / ratio + 2 * padding) : undefined
  }
  return undefined
}
