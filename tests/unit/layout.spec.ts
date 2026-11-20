import { test, expect } from '@playwright/test'
import { visibleCount, speedPxPerSecond, thumbnailSize, normalizeLink, hostname, parseRatio, imageHeight } from '../../src/utils/layout.ts'

test.describe('visibleCount', () => {
  test('applies the setting on large widths', () => {
    for (let n = 1; n <= 8; n++) expect(visibleCount(1400, n)).toBe(n)
  })

  test('follows the documented table on narrower widths', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(n => visibleCount(900, n))).toEqual([1, 2, 3, 3, 4, 4, 5, 6])
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(n => visibleCount(700, n))).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(n => visibleCount(360, n))).toEqual([1, 1, 1, 2, 2, 2, 3, 3])
  })

  test('uses the Vuetify thresholds at their exact values', () => {
    expect(visibleCount(1145, 8)).toBe(8)
    expect(visibleCount(1144, 8)).toBe(6)
    expect(visibleCount(840, 8)).toBe(6)
    expect(visibleCount(839, 8)).toBe(4)
    expect(visibleCount(600, 8)).toBe(4)
    expect(visibleCount(599, 8)).toBe(3)
  })

  test('never shrinks a setting', () => {
    for (const width of [300, 700, 900, 1400]) {
      for (let n = 1; n < 8; n++) expect(visibleCount(width, n + 1)).toBeGreaterThanOrEqual(visibleCount(width, n))
    }
  })

  test('clamps missing or out of range settings', () => {
    expect(visibleCount(1400, undefined)).toBe(1)
    expect(visibleCount(1400, 0)).toBe(1)
    expect(visibleCount(1400, 20)).toBe(8)
  })
})

test('speedPxPerSecond grows with the level and has a default', () => {
  const speeds = Array.from({ length: 10 }, (_, i) => speedPxPerSecond(i + 1))
  expect(speeds).toEqual([...speeds].sort((a, b) => a - b))
  expect(speedPxPerSecond(undefined)).toBe(speedPxPerSecond(4))
})

test('thumbnailSize rounds up by 200px, with bounds', () => {
  expect(thumbnailSize(310, 450)).toBe('400x600')
  expect(thumbnailSize(0, 0)).toBe('200x200')
  expect(thumbnailSize(5000, 3000)).toBe('2000x2000')
})

test.describe('normalizeLink', () => {
  test('keeps absolute links', () => {
    expect(normalizeLink('https://exemple.fr/a')).toBe('https://exemple.fr/a')
    expect(normalizeLink('http://exemple.fr')).toBe('http://exemple.fr')
    expect(normalizeLink('mailto:contact@exemple.fr')).toBe('mailto:contact@exemple.fr')
  })

  test('adds https to a link typed without scheme', () => {
    expect(normalizeLink('www.exemple.fr')).toBe('https://www.exemple.fr')
    expect(normalizeLink('  exemple.fr/page ')).toBe('https://exemple.fr/page')
    expect(normalizeLink('//exemple.fr')).toBe('https://exemple.fr')
  })

  test('keeps a path of the site, which the app shares the origin of', () => {
    expect(normalizeLink('/contact')).toBe('/contact')
  })

  test('drops empty values and script links', () => {
    expect(normalizeLink('')).toBeUndefined()
    expect(normalizeLink('   ')).toBeUndefined()
    expect(normalizeLink(null)).toBeUndefined()
    expect(normalizeLink(42)).toBeUndefined()
    expect(normalizeLink('javascript:alert(1)')).toBeUndefined()
    expect(normalizeLink('JavaScript:alert(1)')).toBeUndefined()
    expect(normalizeLink('data:text/html,x')).toBeUndefined()
  })
})

test('hostname strips www and survives invalid URLs', () => {
  expect(hostname('https://www.exemple.fr/a')).toBe('exemple.fr')
  expect(hostname('pas une url')).toBe('pas une url')
})

test('parseRatio reads width/height', () => {
  expect(parseRatio('16/9')).toBeCloseTo(1.778, 3)
  expect(parseRatio('1/1')).toBe(1)
  expect(parseRatio('2')).toBe(2)
  expect(parseRatio('abc')).toBeUndefined()
  expect(parseRatio('0/1')).toBeUndefined()
  expect(parseRatio(undefined)).toBeUndefined()
})

test('imageHeight: fill the frame, a ratio of the slide width, or a fixed height', () => {
  expect(imageHeight(undefined, 800)).toBeUndefined()
  expect(imageHeight({ type: 'fill' }, 800)).toBeUndefined()
  expect(imageHeight({ type: 'ratio', ratio: '16/9' }, 800)).toBe(450)
  expect(imageHeight({ type: 'ratio' }, 800)).toBe(450)
  expect(imageHeight({ type: 'fixed', px: 120 }, 800)).toBe(120)
  expect(imageHeight({ type: 'fixed' }, 800)).toBe(120)
  expect(imageHeight({ type: 'fixed', px: 10 }, 800)).toBe(40)
  // the ratio is the image's, inside the padding: a square image in a 300px box with 32px padding
  expect(imageHeight({ type: 'ratio', ratio: '1/1' }, 300, 32)).toBe(300)
  expect(imageHeight({ type: 'ratio', ratio: '2/1' }, 300, 32)).toBe(182)
})
