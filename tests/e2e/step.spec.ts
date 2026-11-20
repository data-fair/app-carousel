import { test, expect, setupMocks, buildApplication, gotoApp, setupData, photoDataset, photoLines, currentLabel } from './fixtures'

const stepConfig = (overrides: Record<string, unknown> = {}) => buildApplication({
  source: 'dataset',
  datasets: [photoDataset],
  scroll: { mode: 'step', interval: 0 },
  visible: 1,
  textPosition: 'overlay',
  link: 'button',
  ...overrides
})

test.describe('image by image', () => {
  test('shows the title and a labelled link button, and moves with the arrows', async ({ page }) => {
    await setupMocks(page, stepConfig())
    await setupData(page, photoLines(5))
    await gotoApp(page)

    await expect(currentLabel(page)).toHaveText('Image 1 sur 5')
    const shown = page.locator('[aria-roledescription="diapositive"]:not([inert])')
    await expect(shown).toHaveCount(1)
    await expect(shown).toContainText('Photo 1')
    await expect(shown.getByRole('link', { name: 'En savoir plus : Photo 1' })).toHaveAttribute('href', 'https://site-0.test/')

    await page.getByRole('button', { name: 'Image suivante' }).click()
    await expect(currentLabel(page)).toHaveText('Image 2 sur 5')
    // a link typed without scheme gets https, not a path relative to the app
    await expect(shown.getByRole('link', { name: 'En savoir plus : Photo 2' })).toHaveAttribute('href', 'https://www.site-1.test')

    // wraps around both ways
    await page.getByRole('button', { name: 'Image précédente' }).click()
    await page.getByRole('button', { name: 'Image précédente' }).click()
    await expect(currentLabel(page)).toHaveText('Image 5 sur 5')
    await expect(shown).toContainText('Photo 5')
  })

  // regression: on data.laposte.fr the arrows came up from the bottom of the frame during each
  // transition (the leaving slide stayed in the flow and doubled the height of the window)
  test('the arrows and the frame height do not move during a transition', async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 350 })
    await setupMocks(page, stepConfig())
    await setupData(page, photoLines(4))
    await gotoApp(page)
    const next = page.getByRole('button', { name: 'Image suivante' })
    const carousel = page.locator('.step-carousel')
    await expect(currentLabel(page)).toHaveText('Image 1 sur 4')
    const before = await next.boundingBox()
    const height = (await carousel.boundingBox())!.height

    await next.click()
    for (let i = 0; i < 6; i++) {
      expect(await next.boundingBox()).toEqual(before)
      expect((await carousel.boundingBox())!.height).toBe(height)
      await page.waitForTimeout(100)
    }
    await expect(currentLabel(page)).toHaveText('Image 2 sur 4')
  })

  test('autoplay advances, and the pause button stops it', async ({ page }) => {
    await setupMocks(page, stepConfig({ scroll: { mode: 'step', interval: 1 } }))
    await setupData(page, photoLines(5))
    await gotoApp(page)
    const carousel = page.locator('.step-carousel')
    // the carousel fills the page and the mouse of Playwright rests over it: hovering pauses
    await carousel.dispatchEvent('pointerleave')
    await expect(currentLabel(page)).toHaveText('Image 2 sur 5', { timeout: 4000 })

    await page.getByRole('button', { name: 'Mettre en pause le défilement' }).click()
    // the click hovered and focused the carousel: only the pause button must keep it stopped
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await carousel.dispatchEvent('pointerleave')
    const label = await currentLabel(page).textContent()
    await page.waitForTimeout(2500)
    await expect(currentLabel(page)).toHaveText(label!)

    await page.getByRole('button', { name: 'Reprendre le défilement' }).click()
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await carousel.dispatchEvent('pointerleave')
    await expect(currentLabel(page)).not.toHaveText(label!, { timeout: 4000 })
  })

  test('hovering and keyboard focus stop the autoplay', async ({ page }) => {
    await setupMocks(page, stepConfig({ scroll: { mode: 'step', interval: 1 } }))
    await setupData(page, photoLines(5))
    await gotoApp(page)
    // Playwright's mouse rests over the carousel since the load
    await page.mouse.move(400, 200)
    await page.waitForTimeout(2500)
    await expect(currentLabel(page)).toHaveText('Image 1 sur 5')

    await page.locator('.step-carousel').dispatchEvent('pointerleave')
    await page.getByRole('button', { name: 'Image suivante' }).focus()
    await page.waitForTimeout(2500)
    await expect(currentLabel(page)).toHaveText('Image 1 sur 5')
  })

  test('several images: both arrows centered, the pause button never pushes them or leaves the frame', async ({ page }) => {
    for (const height of [300, 60]) {
      await page.setViewportSize({ width: 1300, height })
      await setupMocks(page, stepConfig({ scroll: { mode: 'step', interval: 5 }, visible: 4, showTitle: false, link: 'none' }))
      await setupData(page, photoLines(6))
      await gotoApp(page)
      const previous = (await page.getByRole('button', { name: 'Image précédente' }).boundingBox())!
      const next = (await page.getByRole('button', { name: 'Image suivante' }).boundingBox())!
      const pause = (await page.getByRole('button', { name: /Mettre en pause/ }).boundingBox())!
      expect(Math.abs(previous.y - next.y), `arrows aligned in a ${height}px frame`).toBeLessThan(1)
      for (const box of [previous, next, pause]) {
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.height).toBeLessThanOrEqual(height)
      }
      // the pause button does not cover the next arrow
      const overlap = pause.x < next.x + next.width && next.x < pause.x + pause.width && pause.y < next.y + next.height && next.y < pause.y + pause.height
      expect(overlap, `pause and next arrow apart in a ${height}px frame`).toBe(false)
    }
  })

  test('the pause button is only seen with the mouse or the focus on the carousel', async ({ page }) => {
    await setupMocks(page, stepConfig({ scroll: { mode: 'step', interval: 5 } }))
    await setupData(page, photoLines(3))
    await gotoApp(page)
    const carousel = page.locator('.step-carousel')
    const pause = page.getByRole('button', { name: 'Mettre en pause le défilement' })
    await carousel.dispatchEvent('pointerleave')
    await expect(pause).toHaveClass(/opacity-0/)
    await page.getByRole('button', { name: 'Image précédente' }).focus()
    await expect(pause).not.toHaveClass(/opacity-0/)
    await pause.click()
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await carousel.dispatchEvent('pointerleave')
    // once paused it stays visible, to resume
    await expect(page.getByRole('button', { name: 'Reprendre le défilement' })).not.toHaveClass(/opacity-0/)
  })

  test('no pause button without autoplay', async ({ page }) => {
    await setupMocks(page, stepConfig())
    await setupData(page, photoLines(3))
    await gotoApp(page)
    await expect(page.getByRole('button', { name: 'Image suivante' })).toBeVisible()
    await expect(page.getByRole('button', { name: /défilement/ })).toHaveCount(0)
  })

  test('the number of images follows the width of the app', async ({ page }) => {
    await setupMocks(page, stepConfig({ visible: 4 }))
    await setupData(page, photoLines(10))
    const shown = page.locator('[aria-roledescription="diapositive"]:not([inert])')

    await page.setViewportSize({ width: 1300, height: 300 })
    await gotoApp(page)
    await expect(shown).toHaveCount(4)

    await page.setViewportSize({ width: 700, height: 300 })
    await expect(shown).toHaveCount(2)

    await page.setViewportSize({ width: 400, height: 300 })
    await expect(shown).toHaveCount(2)
  })

  test('fewer images than places: a static row without controls', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 300 })
    await setupMocks(page, stepConfig({ visible: 4 }))
    await setupData(page, photoLines(3))
    await gotoApp(page)
    await expect(page.locator('.carousel-slide')).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Image suivante' })).toHaveCount(0)
  })

  test.describe('broken image', () => {
    test.use({ expectedConsole: ['status of 404'] })
    test('an image that fails to load leaves the rotation', async ({ page }) => {
      await setupMocks(page, stepConfig({ visible: 4 }))
      await page.setViewportSize({ width: 1300, height: 300 })
      await setupData(page, photoLines(6, { broken: [2] }))
      await gotoApp(page)
      await expect(page.locator('.carousel-slide', { hasText: 'Photo 3' })).toHaveCount(0)
      await expect(page.locator('[aria-roledescription="diapositive"]:not([inert])')).toHaveCount(4)
    })

    test('a broken image does not hide the image at the same place in other lines', async ({ page }) => {
      await setupMocks(page, stepConfig({ visible: 4 }))
      await page.setViewportSize({ width: 1300, height: 300 })
      // lines without _id (not selected): the position in the list is all that tells them apart
      const withoutId = (lines: Record<string, unknown>[]) => lines.map(({ _id, ...line }) => line)
      await setupData(page, withoutId(photoLines(3, { broken: [0, 1] })))
      await gotoApp(page)
      await expect(page.locator('[aria-roledescription="diapositive"]')).toHaveCount(1)
      // another configuration, other lines, all valid
      await page.unroute('**/datasets/test-dataset/lines**')
      await setupData(page, withoutId(photoLines(3)).map((line, i) => ({ ...line, _thumbnail: `http://mock.test/thumb/other-${i}.png` })))
      await page.evaluate(() => {
        const configuration = JSON.parse(JSON.stringify(window.APPLICATION.configuration))
        configuration.staticFilters = [{ type: 'exists', field: { key: 'nom' } }]
        window.postMessage({ type: 'set-config', content: configuration }, '*')
      })
      await expect(page.locator('[aria-roledescription="diapositive"]')).toHaveCount(3)
    })
  })

  test('the lines are read once, with a thumbnail sized on the slides', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 400 })
    await setupMocks(page, stepConfig({ visible: 3, staticFilters: [{ type: 'in', field: { key: 'nom' }, values: ['Photo 1', 'Photo 2'] }], sortField: { key: 'nom' }, sortDesc: true }))
    const { linesRequests } = await setupData(page, photoLines(4))
    await gotoApp(page)
    await expect(page.locator('.carousel-slide').first()).toBeVisible()
    await page.waitForTimeout(800)
    expect(linesRequests).toHaveLength(1)
    const params = linesRequests[0].searchParams
    expect(params.get('thumbnail')).toMatch(/^\d+x\d+$/)
    expect(params.get('finalizedAt')).toBe(photoDataset.finalizedAt)
    expect(params.get('nom_in')).toBe('Photo 1,Photo 2')
    expect(params.get('sort')).toBe('-nom')
    expect(params.get('select')).toBe('_id,photo,nom,site')
  })
})
