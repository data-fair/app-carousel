<script setup lang="ts">
import { computed, nextTick, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useElementSize, useWindowSize } from '@vueuse/core'
import { mdiImageMultiple, mdiImageOff } from '@mdi/js'
import { ofetch } from 'ofetch'
import { getErrorMsg } from '@data-fair/lib-vue/ui-notif.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import StepCarousel from '@/components/StepCarousel.vue'
import ContinuousCarousel from '@/components/ContinuousCarousel.vue'
import { useConfig } from '@/composables/config'
import { useItems } from '@/composables/items'
import type { Config } from '@/config/index.js'
import { gapPx, imageHeight, paddingPx, parseRatio, speedPxPerSecond, visibleCount } from '@/utils/layout'

const { t } = useI18n()
const { application, config, error } = useConfig()
const { thresholds } = useDisplay()

// embedded, the app lets its host paint the background
const embedded = window.self !== window.top
const capture = !!window.triggerCapture

const rootRef = ref<HTMLElement | null>(null)
const { width: rootWidth, height: rootHeight } = useElementSize(rootRef)
const contentRef = ref<HTMLElement | null>(null)
const { height: contentHeight } = useElementSize(contentRef)
const { height: viewportHeight } = useWindowSize()

const visible = computed(() => visibleCount(rootWidth.value, config.value.visible, thresholds.value))
// spacing and padding only apply with several images side by side
const gap = computed(() => visible.value > 1 ? gapPx[config.value.gap ?? 'none'] ?? 0 : 0)
const padding = computed(() => (config.value.visible ?? 1) > 1 ? paddingPx[config.value.padding ?? 'none'] ?? 0 : 0)
const continuous = computed(() => config.value.scroll?.mode === 'continuous')
// image by image with several images: 56px margins on each side hold the controls
const controlsWidth = computed(() => !continuous.value && visible.value > 1 ? 112 : 0)
// the width of an image box on the whole frame: image by image, each cell keeps half a gap on
// both sides; continuous, the gap is between the boxes
const fullSlideWidth = computed(() => Math.max(1, continuous.value
  ? (rootWidth.value - gap.value * (visible.value - 1)) / visible.value
  : (rootWidth.value - controlsWidth.value) / visible.value - gap.value))

// Height. "fill": the images take the height of the frame, nothing is announced. "ratio" and
// "fixed": the app announces the height it wants (sizer below, data-iframe-height) and renders
// in the frame it really has, so that a page that does not follow the announce (fixed height
// block, aspect ratio, external site) never cuts the images: a ratio is kept in the available
// height with margins on the sides of each image, a fixed height becomes the height of the frame.
const heightType = computed(() => config.value.height?.type === 'ratio' || config.value.height?.type === 'fixed' ? config.value.height.type : 'fill')
const sized = computed(() => heightType.value !== 'fill')
const wantedMediaHeight = computed(() => imageHeight(config.value.height, fullSlideWidth.value, padding.value))
// what the slides add under the images (caption below), measured on the rendered content
const extraHeight = ref(0)
const availableMediaHeight = computed(() => Math.max(40, viewportHeight.value - extraHeight.value))
const mediaHeight = computed(() => {
  if (wantedMediaHeight.value === undefined) return undefined
  if (heightType.value === 'fixed') return availableMediaHeight.value
  return Math.min(wantedMediaHeight.value, availableMediaHeight.value)
})
watch(contentHeight, (height) => {
  if (mediaHeight.value !== undefined && height) extraHeight.value = Math.max(0, Math.round(height - mediaHeight.value))
})
const announcedHeight = computed(() => sized.value && wantedMediaHeight.value !== undefined ? wantedMediaHeight.value + extraHeight.value : 0)
provide('carousel-media-height', mediaHeight)
const slideWidth = fullSlideWidth
// a ratio squeezed by the frame: the image keeps its ratio, narrower and centered in its box.
// The box, its controls and its caption keep the whole width: a caption narrowed with the image
// would wrap on more lines and take more height from it.
const imageWidth = computed(() => {
  const height = config.value.height
  if (height?.type !== 'ratio' || mediaHeight.value === undefined) return undefined
  const ratio = parseRatio(height.ratio ?? '16/9')
  if (!ratio) return undefined
  const width = Math.round((mediaHeight.value - 2 * padding.value) * ratio)
  return width < slideWidth.value - 2 * padding.value - 1 ? Math.max(1, width) : undefined
})
provide('carousel-image-width', imageWidth)
// nothing before the first measure: a 1px slide would ask the lines with tiny thumbnails
const slideSize = computed(() => rootWidth.value
  ? { width: slideWidth.value, height: mediaHeight.value ?? rootHeight.value }
  : { width: 0, height: 0 })

const { items, loading, dataError, linesError, markFailed } = useItems(slideSize)
provide('carousel-mark-failed', markFailed)

type Scroll = NonNullable<Config['scroll']>
const stepScroll = computed(() => (config.value.scroll ?? {}) as Extract<Scroll, { mode?: 'step' }>)
const continuousScroll = computed(() => (config.value.scroll ?? {}) as Extract<Scroll, { mode?: 'continuous' }>)
const label = computed(() => application?.title || t('carousel'))

const emptyState = computed(() => {
  if (error.value) return { headline: t('incompleteConfig'), title: t(error.value), icon: mdiImageMultiple }
  if (dataError.value) return { headline: t('missingData'), title: t(dataError.value), icon: mdiImageOff }
  if (linesError.value) return { headline: t('loadError'), title: getErrorMsg(linesError.value), icon: mdiImageOff }
  if (!loading.value && rootWidth.value && !items.value.length) return { headline: t('noImage'), title: t('noImageDetail'), icon: mdiImageOff }
  return null
})

// report the configuration errors to data-fair in draft mode
if (reactiveSearchParams.draft === 'true') {
  watch([error, dataError, linesError], ([cfgErr, dataErr, fetchErr]) => {
    const message = cfgErr ? t(cfgErr) : dataErr ? t(dataErr) : fetchErr ? getErrorMsg(fetchErr) : null
    if (message) ofetch(window.APPLICATION.href + '/error', { body: { message }, method: 'POST' }).catch(() => {})
  }, { immediate: true })
}

// capture service: a still image once the visible images are loaded, whatever the outcome
if (capture) {
  let triggered = false
  const trigger = () => {
    if (triggered) return
    triggered = true
    window.triggerCapture!(false)
  }
  watch([emptyState, items, loading, () => !!rootWidth.value], async () => {
    if (emptyState.value) return trigger()
    // the slides are only rendered once the frame is measured: attachments are known at once
    if (loading.value || !items.value.length || !rootWidth.value) return
    await nextTick()
    const images = Array.from(rootRef.value?.querySelectorAll('img') ?? [])
    await Promise.race([
      Promise.all(images.map(img => img.complete ? null : new Promise(resolve => { img.onload = img.onerror = resolve }))),
      new Promise(resolve => setTimeout(resolve, 5000))
    ])
    trigger()
  }, { immediate: true })
}
</script>

<template>
  <v-app :class="{ 'bg-transparent': embedded }">
    <v-main class="h-screen overflow-hidden">
      <!-- the height the app wants, announced to the parent frame whatever the frame it has now -->
      <div
        v-if="sized && announcedHeight"
        class="carousel-sizer position-absolute top-0 left-0"
        :style="{ height: `${announcedHeight}px` }"
        data-iframe-height
        aria-hidden="true"
      />
      <!-- measured here, not on v-main, which the application wrap stretches to the viewport -->
      <div
        ref="rootRef"
        class="h-100"
        :class="{ 'd-flex flex-column justify-center': sized }"
      >
        <v-empty-state
          v-if="emptyState"
          :headline="emptyState.headline"
          :title="emptyState.title"
          :icon="emptyState.icon"
          data-iframe-height
        />
        <div
          v-else-if="rootWidth && items.length"
          ref="contentRef"
          :class="{ 'h-100': !sized }"
        >
          <continuous-carousel
            v-if="continuous"
            :items="items"
            :visible="visible"
            :width="slideWidth"
            :height="mediaHeight ?? rootHeight"
            :gap="gap"
            :speed="speedPxPerSecond(continuousScroll.speed)"
            :reverse="!!continuousScroll.reverse"
            :fade-edges="continuousScroll.fadeEdges !== false"
            :label="label"
            :capture="capture"
          />
          <step-carousel
            v-else
            :items="items"
            :visible="visible"
            :width="slideWidth"
            :interval="stepScroll.interval ?? 6"
            :reverse="!!stepScroll.reverse"
            :label="label"
            :capture="capture"
          />
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
/* invisible, and out of the way of the pointer: it only carries the announced height */
.carousel-sizer {
  width: 1px;
  visibility: hidden;
  pointer-events: none;
}
</style>

<i18n lang="yaml">
fr:
  carousel: Carrousel
  incompleteConfig: Configuration incomplète
  missingData: Données manquantes
  loadError: Erreur de chargement
  noImage: Aucune image
  noImageDetail: Aucune ligne du jeu de données n'a d'image avec les filtres actuels.
  noDataset: Choisissez un jeu de données.
  noAttachment: Ajoutez des fichiers dans l'onglet « Pièces jointes » de l'application, puis choisissez-les dans la liste « Images » de la configuration.
  noImageColumn: Le jeu de données n'a pas de colonne portant le concept « Image » ou « Document numérique attaché ».
en:
  carousel: Carousel
  incompleteConfig: Incomplete configuration
  missingData: Missing data
  loadError: Loading error
  noImage: No image
  noImageDetail: No line of the dataset has an image with the current filters.
  noDataset: Choose a dataset.
  noAttachment: Add files in the "Attachments" tab of the application, then choose them in the "Images" list of the configuration.
  noImageColumn: The dataset has no column with the "Image" or "Attached digital document" concept.
</i18n>
