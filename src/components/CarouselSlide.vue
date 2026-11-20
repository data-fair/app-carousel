<script setup lang="ts">
import type { CarouselItem } from '@/composables/items'
import type { Ref } from 'vue'
import { computed, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfig } from '@/composables/config'
import SlideCaption from '@/components/SlideCaption.vue'
import { hostname, paddingClass } from '@/utils/layout'

const { item, width, load = true } = defineProps<{
  item: CarouselItem
  // width of the slide in px, to size the caption
  width: number
  // false keeps the image out of the DOM until the slide gets close to the visible ones
  load?: boolean
}>()

// mounted once and kept: going back to a slide must not reload its image
const mounted = ref(load)
watch(() => load, (value) => { if (value) mounted.value = true })
const loaded = ref(false)
// a new src (another thumbnail size) shows the loader until it is there
watch(() => item.src, () => { loaded.value = false })

// provided by App: the height of the images when the app sizes itself, undefined to fill the frame
const mediaHeight = inject<Ref<number | undefined>>('carousel-media-height', ref(undefined))

// provided by App: a broken image leaves the rotation
const markFailed = inject<(key: string) => void>('carousel-mark-failed', () => {})

const { t } = useI18n()
const { config } = useConfig()

const showTitle = computed(() => config.value.showTitle !== false && !!item.title)
const linkMode = computed(() => item.link ? (config.value.link ?? 'button') : 'none')
const showButton = computed(() => linkMode.value === 'button')
const hasCaption = computed(() => showTitle.value || !!item.description || showButton.value)
const overlay = computed(() => (config.value.textPosition ?? 'overlay') === 'overlay')
const target = computed(() => config.value.linksTarget ?? '_top')
const rel = computed(() => target.value === '_blank' ? 'noopener' : undefined)
const buttonLabel = computed(() => config.value.buttonLabel?.trim() || t('readMore'))
const buttonLabelFull = computed(() => item.title ? `${buttonLabel.value} : ${item.title}` : buttonLabel.value)

// a whole image as link: named by the visible title inside it, otherwise by an aria-label
const imageLinkLabel = computed(() => {
  if (linkMode.value !== 'image') return undefined
  if (overlay.value && showTitle.value) return undefined
  return item.title || t('openLink', { host: hostname(item.link!) })
})
// text alternative (RGAA 1.2/1.3): empty when a visible title or the link already says it,
// the title otherwise, even when it is not displayed
const alt = computed(() => {
  if (linkMode.value === 'image' || showTitle.value) return ''
  return item.title ?? ''
})

// a theme color is a class (bg-primary...), a custom color or one from the data a style
const background = computed<{ class?: string, style?: Record<string, string> } | undefined>(() => {
  const bg = config.value.background
  if (bg?.type === 'theme') return { class: `bg-${bg.color ?? 'surface'}` }
  if (bg?.type === 'custom' && bg.hexValue) return { style: { backgroundColor: bg.hexValue } }
  if (bg?.type === 'field' && item.color) return { style: { backgroundColor: item.color } }
  return undefined
})
const captionProps = computed(() => ({
  item,
  showTitle: showTitle.value,
  showButton: showButton.value,
  buttonLabel: buttonLabel.value,
  buttonLabelFull: buttonLabelFull.value,
  target: target.value,
  width,
  layout: config.value.textLayout ?? 'spread'
}))
// spacing and padding only make sense with several images side by side
const padding = computed(() => (config.value.visible ?? 1) > 1 ? paddingClass[config.value.padding ?? 'none'] : '')
</script>

<template>
  <figure
    class="carousel-slide d-flex flex-column ma-0"
    :class="{ 'h-100': !mediaHeight, 'carousel-slide--grayscale': config.grayscale }"
  >
    <component
      :is="linkMode === 'image' ? 'a' : 'div'"
      class="carousel-slide__media position-relative d-block overflow-hidden text-decoration-none"
      :class="[mediaHeight ? 'flex-shrink-0' : 'flex-grow-1', padding, background && ['carousel-slide__media--plate', 'rounded', background.class]]"
      :style="[background?.style, mediaHeight ? { height: `${mediaHeight}px` } : {}]"
      :href="linkMode === 'image' ? item.link : undefined"
      :target="linkMode === 'image' ? target : undefined"
      :rel="linkMode === 'image' ? rel : undefined"
      :aria-label="imageLinkLabel"
      draggable="false"
    >
      <img
        v-if="mounted"
        :src="item.src"
        :alt="alt"
        class="carousel-slide__img d-block w-100 h-100"
        :class="config.fit === 'contain' ? 'carousel-slide__img--contain' : 'carousel-slide__img--cover'"
        draggable="false"
        decoding="async"
        @load="loaded = true"
        @error="markFailed(item.key)"
      >
      <div
        v-if="!loaded"
        class="position-absolute top-0 bottom-0 left-0 right-0 d-flex align-center justify-center"
      >
        <v-progress-circular
          indeterminate
          size="32"
          width="3"
          :aria-label="t('loading')"
        />
      </div>
      <slide-caption
        v-if="hasCaption && overlay"
        v-bind="captionProps"
        overlay
      />
    </component>
    <figcaption v-if="hasCaption && !overlay">
      <slide-caption
        v-bind="captionProps"
        :overlay="false"
      />
    </figcaption>
  </figure>
</template>

<style scoped>
/* only what Vuetify has no utility class for */

/* a flex child shrinks below its image's intrinsic height only with this */
.carousel-slide__media {
  min-height: 0;
  color: inherit;
}
.carousel-slide__img--cover { object-fit: cover; }
.carousel-slide__img--contain { object-fit: contain; }
/* the chosen background stays under forced colors, which would replace it with the system
   background and hide the dark logos drawn for a light one */
.carousel-slide__media--plate {
  forced-color-adjust: none;
}
.carousel-slide--grayscale .carousel-slide__img {
  filter: grayscale(1);
  transition: filter .3s;
}
.carousel-slide--grayscale:hover .carousel-slide__img,
.carousel-slide--grayscale:focus-within .carousel-slide__img {
  filter: none;
}
</style>

<i18n lang="yaml">
fr:
  loading: Chargement de l'image
  readMore: En savoir plus
  openLink: "Ouvrir {host}"
en:
  loading: Loading the image
  readMore: Read more
  openLink: "Open {host}"
</i18n>
