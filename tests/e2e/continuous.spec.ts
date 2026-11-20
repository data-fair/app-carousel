import { test, expect, setupMocks, buildApplication, gotoApp, setupData, photoDataset, photoLines } from './fixtures'

const stripConfig = (overrides: Record<string, unknown> = {}) => buildApplication({
  source: 'dataset',
  datasets: [photoDataset],
  scroll: { mode: 'continuous', speed: 5 },
  visible: 4,
  fit: 'contain',
  background: { type: 'custom', hexValue: '#FFFFFF' },
  showTitle: false,
  link: 'image',
  linksTarget: '_blank',
  ...overrides
})

test.describe('continuous strip', () => {
  test('scrolls a looping strip of logos, links named by their title', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 160 })
    await setupMocks(page, stripConfig())
    await setupData(page, photoLines(8))
    await gotoApp(page)

    const strip = page.locator('.v-infinite-carousel')
    await expect(strip).toBeVisible()
    // the copies that make the loop seamless are hidden from assistive technologies
    await expect(page.locator('.v-infinite-carousel__group[aria-hidden="true"]').first()).toBeAttached()
    const firstLink = page.locator('.v-infinite-carousel__group:not([aria-hidden]) a').first()
    await expect(firstLink).toHaveAccessibleName('Photo 1')
    await expect(firstLink).toHaveAttribute('target', '_blank')
    await expect(firstLink).toHaveAttribute('rel', 'noopener')
    // the image is the content of the link: its alternative is empty, the link carries the name
    await expect(firstLink.locator('img')).toHaveAttribute('alt', '')

    // it moves
    const track = page.locator('.v-infinite-carousel__track')
    await strip.dispatchEvent('pointerleave')
    const read = () => track.evaluate(el => Number(el.getAnimations()[0]?.currentTime ?? 0))
    const t1 = await read()
    await page.waitForTimeout(500)
    expect(await read()).toBeGreaterThan(t1)

    // and stops with the pause button
    await page.getByRole('button', { name: 'Mettre en pause le défilement' }).click()
    await strip.dispatchEvent('pointerleave')
    const t2 = await read()
    await page.waitForTimeout(500)
    expect(await read()).toBe(t2)
    await expect(page.getByRole('button', { name: 'Reprendre le défilement' })).toBeVisible()
  })

  test('the logos are sized from the number of images visible', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 160 })
    await setupMocks(page, stripConfig({ visible: 5, gap: 'none' }))
    await setupData(page, photoLines(8))
    await gotoApp(page)
    const slide = page.locator('.v-infinite-carousel__group:not([aria-hidden]) > div').first()
    await expect(slide).toBeVisible()
    expect(Math.round((await slide.boundingBox())!.width)).toBe(260)
  })

  test('fewer images than places: a static row, nothing moves', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 160 })
    await setupMocks(page, stripConfig({ visible: 6 }))
    await setupData(page, photoLines(3))
    await gotoApp(page)
    await expect(page.locator('.carousel-slide')).toHaveCount(3)
    await expect(page.locator('.v-infinite-carousel')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /défilement/ })).toHaveCount(0)
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('nothing moves and no useless pause button', async ({ page }) => {
      await page.setViewportSize({ width: 1300, height: 160 })
      await setupMocks(page, stripConfig())
      await setupData(page, photoLines(8))
      await gotoApp(page)
      await expect(page.locator('.v-infinite-carousel')).toBeVisible()
      await expect(page.getByRole('button', { name: /défilement/ })).toHaveCount(0)
    })
  })
})
