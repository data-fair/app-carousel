import { test, expect } from '@playwright/test'
import { upgradeLegacyConfig } from '../../src/utils/legacy-config.ts'

// the configurations found in production on app-carousel 0.2 and 1.0 (20/11/2026)
test('reads the configurations of app-carousel 1.0', () => {
  expect(upgradeLegacyConfig({ datasets: [], interval: 6, linksTarget: '_blank', distactivateLinks: false, hideTitle: false } as any)).toEqual({
    datasets: [], linksTarget: '_blank', scroll: { mode: 'step', interval: 6 }
  })
  expect(upgradeLegacyConfig({ staticFilters: [], interval: 4, linksTarget: '_blank', distactivateLinks: true, hideTitle: true } as any)).toEqual({
    staticFilters: [], linksTarget: '_blank', scroll: { mode: 'step', interval: 4 }, showTitle: false, link: 'none'
  })
})

test('an interval of 0 keeps the images still', () => {
  expect(upgradeLegacyConfig({ interval: 0 } as any)).toEqual({ scroll: { mode: 'step', interval: 0 } })
})

test('the new fields win over the old ones', () => {
  expect(upgradeLegacyConfig({ interval: 6, scroll: { mode: 'continuous' }, hideTitle: true, showTitle: true } as any)).toEqual({
    scroll: { mode: 'continuous' }, showTitle: true
  })
})

test('a new configuration is left as is', () => {
  const config = { source: 'attachments', images: [{ attachment: 'a.png' }] } as any
  expect(upgradeLegacyConfig(config)).toEqual(config)
})
