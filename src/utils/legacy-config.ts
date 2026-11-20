import type { Config } from '@/config/index.js'

// Configurations written for app-carousel 0.x / 1.x keep working on this version: their
// fields are read when the new ones are absent. The configuration form rewrites them in the
// new shape at the next save.
export type LegacyConfig = Config & {
  interval?: number
  hideTitle?: boolean
  distactivateLinks?: boolean
}

export function upgradeLegacyConfig (config: LegacyConfig): Config {
  if (!config || typeof config !== 'object') return config
  const upgraded: LegacyConfig = { ...config }
  if (!upgraded.scroll && typeof upgraded.interval === 'number') {
    upgraded.scroll = { mode: 'step', interval: upgraded.interval }
  }
  if (upgraded.showTitle === undefined && upgraded.hideTitle) upgraded.showTitle = false
  if (!upgraded.link && upgraded.distactivateLinks) upgraded.link = 'none'
  delete upgraded.interval
  delete upgraded.hideTitle
  delete upgraded.distactivateLinks
  return upgraded
}
