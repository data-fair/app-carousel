# Agent Guide – @data-fair/app-carousel

DataFair visualization that shows scrolling images: a slideshow (image by image) or a continuous strip (logos). Published on npm as `@data-fair/app-carousel`, served by jsDelivr. It follows the `data-fair-app` skill (stack, root files, theme, tests): read it before changing the structure.

## Structure

```
public/config-schema.json        the form schema, hand-written (re-exported by src/config/schema.ts for df-build-types)
src/main.ts                      session, vuetify, i18n, createConfig
src/App.vue                      measures the frame, picks the mode, empty states, capture, draft errors
src/composables/config.ts        window.APPLICATION + live config (set-config messages)
src/composables/items.ts         the list of images: dataset lines (thumbnails sized on the slides) or app attachments
src/components/StepCarousel.vue  image by image: own track with copies at both ends (no v-window/v-carousel)
src/components/ContinuousCarousel.vue  continuous strip: VInfiniteCarousel (vuetify/labs)
src/components/CarouselSlide.vue one image: link, background, loader, broken image removed
src/components/SlideCaption.vue  title, description and button, over the image (scrim) or below it
src/components/PauseButton.vue   RGAA 13.8 pause/resume
src/utils/layout.ts              visible count table, speeds, thumbnail size, link normalization (unit tested)
src/utils/legacy-config.ts       reads the 0.x/1.x configurations (interval, hideTitle, distactivateLinks)
tests/unit, tests/e2e            Playwright projects; e2e mock everything (tests/e2e/fixtures.ts)
```

## Decisions worth knowing

- **Visible images by width**: the setting applies from 1145 px (Vuetify `lg`) and shrinks on narrower frames with the table of `visibleCount`, same principle as the portals responsive grid. The width is the frame's, not the screen's. The table is documented in the `visible` description of the schema: keep both in sync.
- **No `v-carousel`**: a transition of `v-window` keeps the leaving slide in the flow when a rule overrides its `position: absolute` (the 1.0 app did, unlayered), doubling the height and moving the arrows (data.laposte.fr). The step track never changes height; a regression e2e test checks it.
- **Native `<img>`, mounted near the visible slides**: `v-img` reads `eager` only at mount, and its intersection observer did not fire in a translated track: slides stayed blank.
- **Loading**: at most 100 dataset lines (`maxImages`, said in the schema). Image by image, a slide mounts its image when it gets near the visible ones, on both sides (both directions). The continuous strip mounts all its images at start, by choice: a strip holds few light images, and an IntersectionObserver was not worth its code (native `loading="lazy"` has no effect in the moving track).
- **SVG images are not thumbnailed**: the data-fair thumbnail service rasterizes SVG text without its fonts.
- **Logos**: `fit: contain` asks the thumbnail with `fit=inside` (not cropped). Background behind each image: theme color class, custom color, or a color column (validated with `CSS.supports`), kept under forced colors.
- **Caption over a photo**: a scrim in the inverse surface of the theme (`surface-variant` / `on-surface-variant`: dark in a light theme, light in a dark one); the outlined button takes its text color.
- **Ratio**: it applies to the image itself, inside the padding of its box; gap and padding are ignored with a single image (hidden in the form too).
- **Height**: `height.type` `fill` fills the frame the host gives (portal block in aspect ratio or fixed height) and announces nothing. `ratio` and `fixed` announce the wanted height on an invisible sizer (`data-iframe-height`, portal block in "Hauteur optimale", `df:overflow` `true`) and render in the frame they really have, so a host that does not follow (fixed height, aspect ratio, external site, the app alone) never cuts the images: a ratio is kept in the available height, the image narrower and centered in its box (margins on the sides; the box, its arrows and its caption keep the whole width, a narrowed caption would wrap and take more height); a fixed height becomes the height of the frame. The caption below the images is measured and kept out of the available height. The empty states announce their height too.
- **Pause**: hover, keyboard focus, the pause button and the capture service stop the autoplay; under reduced motion the strip never moves (VInfiniteCarousel) so no pause button is shown. The button is always in the DOM for the keyboard but `opacity-0` until the mouse or the focus is on the carousel (or once paused).
- **Filters of the page** (`df:filter-concepts`): the `_c_*` params of the URL go as is to `/lines` (data-fair ignores a concept the dataset does not carry), the `_d_<dataset id>_*` ones unprefixed.
- **Live configuration**: a `set-config` message carries the whole configuration (data-fair UI and df-dev-server): it replaces the current one. A merge kept the properties the form had removed (an emptied list).
- **Default texts** (button) are i18n in the code and only a placeholder in the schema, never a schema `default` saved in the configuration.
- **CSS**: Vuetify utility classes first; the few scoped rules left have no utility equivalent and are commented.

## Notes for agents

- Never change `version` in package.json, the package name or `application-name`.
- `.env`, `.dev-config.json`, `.dev-attachments` are local state, never committed.
- During development run targeted specs (`npx dotenv -- npx playwright test --project=e2e tests/e2e/x.spec.ts`); the whole suite runs in `npm run quality` (pre-push).
