import { test, expect, setupMocks, buildApplication, gotoApp, setupData, photoDataset, photoLines, datasetHref } from './fixtures'

test.describe('sources and states', () => {
  test('attachments of the application, with their own titles and links', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 220 })
    await setupMocks(page, buildApplication({
      source: 'attachments',
      images: [
        { attachment: 'logo a.png', title: 'Ville A', link: 'www.ville-a.test' },
        { attachment: 'logo-b.svg', title: 'Agence B' },
        { attachment: 'logo-c.png' }
      ],
      scroll: { mode: 'step', interval: 0 },
      visible: 3,
      fit: 'contain',
      textPosition: 'below',
      link: 'image'
    }))
    await setupData(page, [])
    await gotoApp(page)

    const images = page.locator('.carousel-slide img')
    await expect(images).toHaveCount(3)
    await expect(images.first()).toHaveAttribute('src', 'http://mock.test/data-fair/api/v1/applications/test-app/attachments/logo%20a.png')
    // the caption below names the link: no duplicate alternative on the image
    await expect(page.getByRole('link', { name: 'Ville A' })).toHaveAttribute('href', 'https://www.ville-a.test')
    await expect(page.locator('figcaption')).toHaveText(['Ville A', 'Agence B'])
    // no title, no link: a decorative image
    await expect(images.nth(2)).toHaveAttribute('alt', '')
  })

  test('the title is the alternative of an image when no caption is shown', async ({ page }) => {
    await setupMocks(page, buildApplication({
      source: 'dataset',
      datasets: [photoDataset],
      scroll: { mode: 'step', interval: 0 },
      showTitle: false,
      link: 'none'
    }))
    await setupData(page, photoLines(2))
    await gotoApp(page)
    await expect(page.locator('[aria-roledescription="diapositive"]:not([inert]) img')).toHaveAttribute('alt', 'Photo 1')
    await expect(page.locator('.carousel-slide a')).toHaveCount(0)
  })

  test('an SVG is shown as is, not through a thumbnail', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'step', interval: 0 }, fit: 'contain' }))
    const lines = photoLines(2)
    lines[0].photo = 'http://mock.test/data-fair/api/v1/datasets/test-dataset/attachments/logo.svg'
    await setupData(page, lines)
    await page.route('**/attachments/logo.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' }))
    await gotoApp(page)
    await expect(page.locator('[aria-roledescription="diapositive"]:not([inert]) img')).toHaveAttribute('src', lines[0].photo)
    // a whole logo is asked to the thumbnail service with fit=inside
    await page.getByRole('button', { name: 'Image suivante' }).click()
    await expect(page.locator('[aria-roledescription="diapositive"]:not([inert]) img')).toHaveAttribute('src', /&fit=inside$/)
  })

  test('no dataset: a message says what to choose', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset' }))
    await gotoApp(page)
    await expect(page.getByText('Configuration incomplète')).toBeVisible()
    await expect(page.getByText('Choisissez un jeu de données')).toBeVisible()
  })

  test('the configuration messages follow the language of the session', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'i18n_lang', value: 'en', url: baseURL! }])
    await setupMocks(page, buildApplication({ source: 'dataset' }))
    await gotoApp(page)
    await expect(page.getByText('Incomplete configuration')).toBeVisible()
    await expect(page.getByText('Choose a dataset.')).toBeVisible()
  })

  test('no attachment chosen: a message says where to add them', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'attachments', images: [] }))
    await gotoApp(page)
    await expect(page.getByText(/Ajoutez des fichiers dans l'onglet « Pièces jointes »/)).toBeVisible()
  })

  test('a dataset without image column', async ({ page }) => {
    await setupMocks(page, buildApplication({
      source: 'dataset',
      datasets: [{ ...photoDataset, schema: [{ key: 'nom', type: 'string' }] }]
    }))
    await gotoApp(page)
    await expect(page.getByText('Données manquantes')).toBeVisible()
  })

  test('no line with an image', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset] }))
    await setupData(page, [])
    await gotoApp(page)
    await expect(page.getByText('Aucune image', { exact: true })).toBeVisible()
  })

  test.describe('lines error', () => {
    test.use({ expectedConsole: ['status of 500'] })
    test('the error is shown, not a blank frame', async ({ page }) => {
      await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset] }))
      await page.route(`${datasetHref}/lines**`, route => route.fulfill({ status: 500, body: 'boom' }))
      await gotoApp(page)
      await expect(page.getByText('Erreur de chargement')).toBeVisible()
    })
  })

  test('the capture service gets a still image once the images are there', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__captures = []
      window.triggerCapture = async (animate?: boolean) => { (window as any).__captures.push(animate ?? null); return false }
    })
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'continuous' }, visible: 3 }))
    await setupData(page, photoLines(6))
    await gotoApp(page)
    await expect.poll(() => page.evaluate(() => (window as any).__captures)).toEqual([false])
    // no control in a still image
    await expect(page.getByRole('button', { name: /défilement/ })).toHaveCount(0)
  })

  test('the capture of attachments waits for the images to be rendered', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__capturedImages = []
      window.triggerCapture = async () => {
        (window as any).__capturedImages.push(Array.from(document.querySelectorAll<HTMLImageElement>('.carousel-slide img')).filter(img => img.complete).length)
        return false
      }
    })
    await setupMocks(page, buildApplication({ source: 'attachments', images: [{ attachment: 'a.png' }, { attachment: 'b.png' }], visible: 2 }))
    await setupData(page, [])
    await gotoApp(page)
    await expect.poll(() => page.evaluate(() => (window as any).__capturedImages)).toEqual([2])
  })

  test('the concept filters of the page restrict the lines', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset] }))
    const { linesRequests } = await setupData(page, photoLines(3))
    await gotoApp(page, '?_c_codeCommune_eq=35238&_d_test-dataset_nom_eq=Photo%201&_d_other_nom_eq=x')
    await expect(page.locator('.carousel-slide img').first()).toBeVisible()
    const params = linesRequests[linesRequests.length - 1].searchParams
    expect(params.get('_c_codeCommune_eq')).toBe('35238')
    expect(params.get('nom_eq')).toBe('Photo 1')
    expect(params.has('_d_other_nom_eq')).toBe(false)
  })

  test('the capture is also triggered on a configuration error', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__captures = []
      window.triggerCapture = async () => { (window as any).__captures.push(true); return false }
    })
    await setupMocks(page, buildApplication({ source: 'dataset' }))
    await gotoApp(page)
    await expect.poll(() => page.evaluate(() => (window as any).__captures.length)).toBe(1)
  })

  test('a configuration sent by the form replaces the previous one', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'attachments', images: [{ attachment: 'a.png', title: 'A' }] }))
    await setupData(page, [])
    await gotoApp(page)
    await expect(page.locator('.carousel-slide')).toHaveCount(1)
    // the form drops the emptied list from the configuration: it must not survive in the app
    await page.evaluate(() => window.postMessage({ type: 'set-config', content: { source: 'attachments' } }, '*'))
    await expect(page.getByText(/Ajoutez des fichiers dans l'onglet « Pièces jointes »/)).toBeVisible()
  })

  test('description, chosen columns and button text', async ({ page }) => {
    await setupMocks(page, buildApplication({
      source: 'dataset',
      datasets: [photoDataset],
      scroll: { mode: 'step', interval: 0 },
      showDescription: true,
      titleField: { key: 'resume' },
      buttonLabel: 'Voir la fiche'
    }))
    await setupData(page, photoLines(3))
    await gotoApp(page)
    const shown = page.locator('[aria-roledescription="diapositive"]:not([inert])')
    // the title comes from the chosen column, the description from the concept
    await expect(shown).toContainText('Description 1')
    await expect(shown.getByRole('link', { name: 'Voir la fiche : Description 1' })).toBeVisible()
  })

  test('the button text defaults to a translated "read more"', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'step', interval: 0 } }))
    await setupData(page, photoLines(2))
    await gotoApp(page)
    await expect(page.locator('[aria-roledescription="diapositive"]:not([inert])').getByRole('link')).toHaveText('En savoir plus')
  })

  test('background color from the data, invalid values ignored', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 200 })
    await setupMocks(page, buildApplication({
      source: 'dataset',
      datasets: [photoDataset],
      scroll: { mode: 'step', interval: 0 },
      visible: 3,
      background: { type: 'field' }
    }))
    await setupData(page, photoLines(3))
    await gotoApp(page)
    const media = page.locator('[aria-roledescription="diapositive"]:not([inert]) .carousel-slide__media')
    await expect(media.nth(0)).toHaveCSS('background-color', 'rgb(255, 0, 0)')
    await expect(media.nth(1)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(media.nth(2)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  })

  test('a site color as background is a theme class', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'attachments', images: [{ attachment: 'a.png' }], background: { type: 'theme', color: 'primary' } }))
    await setupData(page, [])
    await gotoApp(page)
    await expect(page.locator('.carousel-slide__media')).toHaveClass(/bg-primary/)
  })

  test('a fixed height is announced; a frame that does not follow it is filled', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 100 })
    await setupMocks(page, buildApplication({
      source: 'dataset',
      datasets: [photoDataset],
      scroll: { mode: 'continuous' },
      height: { type: 'fixed', px: 100 },
      visible: 4,
      showTitle: false
    }))
    await setupData(page, photoLines(8))
    await gotoApp(page)
    const announced = page.locator('[data-iframe-height]')
    await expect(announced).toHaveCount(1)
    await expect(announced).toHaveCSS('height', '100px')
    // the parent followed: the frame has the announced height
    await expect(page.locator('.carousel-slide__media').first()).toHaveCSS('height', '100px')
    // the parent did not follow (taller frame): the images take the frame, the announce stays
    await page.setViewportSize({ width: 1300, height: 300 })
    await expect(page.locator('.carousel-slide__media').first()).toHaveCSS('height', '300px')
    await expect(announced).toHaveCSS('height', '100px')
  })

  test('filling the frame: nothing is announced', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'step', interval: 0 } }))
    await setupData(page, photoLines(2))
    await gotoApp(page)
    await expect(page.locator('.carousel-slide').first()).toBeVisible()
    await expect(page.locator('[data-iframe-height]')).toHaveCount(0)
  })

  test('a ratio higher than the frame: whole images with margins, the wanted height announced', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 200 })
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'step', interval: 0 }, height: { type: 'ratio', ratio: '1/1' }, showTitle: false, link: 'none' }))
    await setupData(page, photoLines(2))
    await gotoApp(page)
    const media = page.locator('[aria-roledescription="diapositive"]:not([inert]) .carousel-slide__media')
    await expect(media).toHaveCSS('height', '200px')
    // square, centered in its box, nothing cut: margins on the sides
    const img = (await media.locator('img').boundingBox())!
    expect(Math.round(img.width)).toBe(200)
    expect(Math.round(img.height)).toBe(200)
    expect(Math.round(img.x + img.width / 2)).toBe(400)
    expect(img.y + img.height).toBeLessThanOrEqual(200)
    // the parent may still grow the frame to the full width square
    await expect(page.locator('[data-iframe-height]')).toHaveCSS('height', '800px')
    // never a scrollbar
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden')
    await page.mouse.wheel(0, 500)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    // the parent followed: the full width again
    await page.setViewportSize({ width: 800, height: 800 })
    await expect(media).toHaveCSS('height', '800px')
    expect(Math.round((await media.locator('img').boundingBox())!.width)).toBe(800)
  })

  test('an empty state announces its height, a host following it does not cut the message', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset' }))
    await gotoApp(page)
    await expect(page.locator('.v-empty-state[data-iframe-height]')).toBeVisible()
  })

  test('the description stays when the title is hidden, the title stays the alternative', async ({ page }) => {
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'step', interval: 0 }, showTitle: false, showDescription: true, link: 'none' }))
    await setupData(page, photoLines(2))
    await gotoApp(page)
    const shown = page.locator('[aria-roledescription="diapositive"]:not([inert])')
    await expect(shown).toContainText('Description 1')
    await expect(shown).not.toContainText('Photo 1')
    await expect(shown.locator('img')).toHaveAttribute('alt', 'Photo 1')
  })

  test('centered: the text above the button, not beside it', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 500 })
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'step', interval: 0 }, textLayout: 'center' }))
    await setupData(page, photoLines(2))
    await gotoApp(page)
    const shown = page.locator('[aria-roledescription="diapositive"]:not([inert])')
    const title = (await shown.getByText('Photo 1').boundingBox())!
    const button = (await shown.getByRole('link').boundingBox())!
    expect(button.y).toBeGreaterThan(title.y + title.height - 1)
    expect(Math.abs((button.x + button.width / 2) - (title.x + title.width / 2))).toBeLessThan(2)
  })

  test('text on the left, button on the right by default', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 500 })
    await setupMocks(page, buildApplication({ source: 'dataset', datasets: [photoDataset], scroll: { mode: 'step', interval: 0 } }))
    await setupData(page, photoLines(2))
    await gotoApp(page)
    const shown = page.locator('[aria-roledescription="diapositive"]:not([inert])')
    const slide = (await shown.boundingBox())!
    const button = (await shown.getByRole('link').boundingBox())!
    const title = (await shown.getByText('Photo 1').boundingBox())!
    expect(slide.x + slide.width - (button.x + button.width)).toBeLessThan(24)
    expect(title.x - slide.x).toBeLessThan(24)
  })

  test('a square ratio gives a square image, whatever the gap and padding', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 800 })
    await setupMocks(page, buildApplication({
      source: 'dataset',
      datasets: [photoDataset],
      scroll: { mode: 'step', interval: 0 },
      height: { type: 'ratio', ratio: '1/1' },
      visible: 3,
      gap: 'large',
      padding: 'large',
      link: 'none',
      showTitle: false
    }))
    await setupData(page, photoLines(6))
    await gotoApp(page)
    const img = (await page.locator('[aria-roledescription="diapositive"]:not([inert]) img').first().boundingBox())!
    expect(Math.abs(img.width - img.height)).toBeLessThan(2)
  })
})
