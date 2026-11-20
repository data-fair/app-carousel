<script setup lang="ts">
import type { CarouselItem } from '@/composables/items'
import type { Ref } from 'vue'
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElementSize, usePreferredReducedMotion } from '@vueuse/core'
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'
import CarouselSlide from '@/components/CarouselSlide.vue'
import PauseButton from '@/components/PauseButton.vue'
import { useConfig } from '@/composables/config'
import { gapClass } from '@/utils/layout'

// One track holding [last `visible` items, items, first `visible` items]: moving past an end
// lands on a copy, then the track jumps without transition to the real item. The slides
// never leave the flow, so the controls cannot move during a transition.

const { items, visible, width, interval, reverse = false, label, capture = false } = defineProps<{
  items: CarouselItem[]
  visible: number
  // slide width in px
  width: number
  // seconds, 0 = no autoplay
  interval: number
  reverse?: boolean
  label: string
  capture?: boolean
}>()

const { t } = useI18n()
const { config } = useConfig()
// provided by App: set when the app sizes itself instead of filling the frame
const mediaHeight = inject<Ref<number | undefined>>('carousel-media-height', ref(undefined))
const reducedMotion = usePreferredReducedMotion()

const count = computed(() => items.length)
const scrolling = computed(() => count.value > visible)
const cells = computed(() => {
  if (!scrolling.value) return items.map((item, i) => ({ item, index: i, copy: false }))
  return [
    ...items.slice(count.value - visible).map((item, i) => ({ item, index: count.value - visible + i, copy: true })),
    ...items.map((item, i) => ({ item, index: i, copy: false })),
    ...items.slice(0, visible).map((item, i) => ({ item, index: i, copy: true }))
  ]
})

const position = ref(visible)
const animated = ref(true)
const moving = ref(false)
let fallbackTimer: ReturnType<typeof setTimeout> | undefined

// a resize or an image leaving the rotation keeps the current image in place
watch(() => [count.value, visible] as const, ([, newVisible], previous) => {
  let index = 0
  if (previous && previous[0] > previous[1]) {
    const [oldCount, oldVisible] = previous
    index = (((position.value - oldVisible) % oldCount) + oldCount) % oldCount
  }
  animated.value = false
  moving.value = false
  position.value = scrolling.value ? newVisible + Math.min(index, count.value - 1) : 0
}, { immediate: true })

const current = computed(() => scrolling.value ? (((position.value - visible) % count.value) + count.value) % count.value : 0)
const transition = computed(() => animated.value && reducedMotion.value !== 'reduce')
const trackStyle = computed(() => ({
  transform: `translateX(${-position.value * 100 / visible}%)`,
  transition: transition.value ? 'transform .6s cubic-bezier(0.25, 0.8, 0.5, 1)' : 'none'
}))

function settle () {
  clearTimeout(fallbackTimer)
  moving.value = false
  if (position.value >= visible + count.value) {
    animated.value = false
    position.value -= count.value
  } else if (position.value < visible) {
    animated.value = false
    position.value += count.value
  }
}

function go (delta: number) {
  if (!scrolling.value) return
  // a click during a transition counts: wrap around first if the previous move ended on a copy
  if (moving.value) settle()
  // after a jump without transition, this move is not animated either: animating it would
  // slide the track back across every image
  if (!animated.value) {
    position.value += delta
    settle()
    return
  }
  moving.value = true
  position.value += delta
  if (!transition.value) settle()
  // transitionend never fires in a hidden tab
  else fallbackTimer = setTimeout(settle, 800)
}

function onTransitionEnd (e: TransitionEvent) {
  if (e.target === e.currentTarget && e.propertyName === 'transform') settle()
}

// re-enable the transition once the jump without transition is painted
watch(animated, async (value) => {
  if (value) return
  await nextTick()
  requestAnimationFrame(() => requestAnimationFrame(() => { animated.value = true }))
})

// autoplay: stopped by the pause button, the mouse over the carousel, the keyboard focus inside
// it (RGAA 13.8), a reduced motion preference and the capture service
const userPaused = ref(reducedMotion.value === 'reduce')
const hovering = ref(false)
const focused = ref(false)
const autoplay = computed(() => scrolling.value && interval > 0)
const playing = computed(() => autoplay.value && !userPaused.value && !hovering.value && !focused.value && !capture)
// the pause button is always there for the keyboard but only seen when the mouse or the focus
// is on the carousel, or once paused; invisible rather than removed, the arrow above it stays put
const hasPause = computed(() => autoplay.value && !capture)
const pauseSeen = computed(() => hovering.value || focused.value || userPaused.value)
let timer: ReturnType<typeof setTimeout> | undefined
watch([playing, position, () => interval], () => {
  clearTimeout(timer)
  if (playing.value) timer = setTimeout(() => go(reverse ? -1 : 1), interval * 1000)
}, { immediate: true })
onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(fallbackTimer)
})

function onFocusout (e: FocusEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) focused.value = false
}

function onKeydown (e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
  else return
  e.preventDefault()
}

// swipe on touch screens and drag with the mouse; a drag must not follow the link under it
let dragStart: number | null = null
let dragged = false
function onPointerdown (e: PointerEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('.carousel-controls')) return
  dragStart = e.clientX
  dragged = false
}
function onPointerup (e: PointerEvent) {
  if (dragStart === null) return
  const delta = e.clientX - dragStart
  dragStart = null
  if (Math.abs(delta) < 40) return
  dragged = true
  go(delta < 0 ? 1 : -1)
}
function onClickCapture (e: MouseEvent) {
  if (!dragged) return
  dragged = false
  e.preventDefault()
  e.stopPropagation()
}

// several images side by side: the controls get their own margins instead of covering the
// first and last ones; a single photo keeps them over the image
const gutters = computed(() => visible > 1)
const buttonSize = computed(() => width < 300 ? 'small' : 'default')
// in the gutter, the pause button goes under the next arrow, which stays centered like the
// previous one; a frame too low for both puts it in the corner, over the images
const sectionRef = ref<HTMLElement | null>(null)
const { height: sectionHeight } = useElementSize(sectionRef)
const pauseInGutter = computed(() => gutters.value && sectionHeight.value >= 140)

function isShown (cellIndex: number) {
  return cellIndex >= position.value && cellIndex < position.value + visible
}
</script>

<template>
  <section
    ref="sectionRef"
    class="step-carousel position-relative overflow-hidden"
    :class="{ 'h-100': !mediaHeight, 'px-14': scrolling && gutters }"
    :aria-label="label"
    :aria-roledescription="t('carousel')"
    @pointerenter="e => { if (e.pointerType === 'mouse') hovering = true }"
    @pointerleave="hovering = false"
    @focusin="focused = true"
    @focusout="onFocusout"
    @keydown="onKeydown"
    @pointerdown="onPointerdown"
    @pointerup="onPointerup"
    @pointercancel="dragStart = null"
    @click.capture="onClickCapture"
  >
    <!-- controls first in the DOM, as in the WAI-ARIA carousel pattern; placed by CSS -->
    <template v-if="scrolling">
      <div class="step-carousel__controls carousel-controls position-absolute top-0 bottom-0 left-0 ml-2 d-flex align-center">
        <v-btn
          :icon="mdiChevronLeft"
          :aria-label="t('previous')"
          :size="buttonSize"
          color="surface"
          @click="go(-1)"
        />
      </div>
      <div class="step-carousel__controls carousel-controls position-absolute top-0 bottom-0 right-0 mr-2 d-flex align-center">
        <v-btn
          :icon="mdiChevronRight"
          :aria-label="t('next')"
          :size="buttonSize"
          color="surface"
          @click="go(1)"
        />
        <pause-button
          v-if="hasPause && pauseInGutter"
          v-model="userPaused"
          class="step-carousel__pause-below position-absolute"
          :class="{ 'opacity-0': !pauseSeen }"
        />
      </div>
      <pause-button
        v-if="hasPause && !pauseInGutter"
        v-model="userPaused"
        class="step-carousel__controls position-absolute top-0 right-0"
        :class="[gutters ? 'mt-1 mr-16' : 'ma-2', { 'opacity-0': !pauseSeen }]"
      />
    </template>
    <div
      class="overflow-hidden"
      :class="{ 'h-100': !mediaHeight }"
    >
      <div
        class="d-flex"
        :class="{ 'h-100': !mediaHeight, 'justify-center': !scrolling }"
        :style="scrolling ? trackStyle : undefined"
        @transitionend="onTransitionEnd"
      >
        <div
          v-for="(cell, i) in cells"
          :key="(cell.copy ? 'copy-' + i + '-' : '') + cell.item.key"
          :class="[visible > 1 ? gapClass[config.gap ?? 'none'] : '', { 'h-100': !mediaHeight }]"
          :style="{ flex: `0 0 ${100 / visible}%`, minWidth: 0 }"
          role="group"
          :aria-roledescription="t('slideRole')"
          :aria-label="t('slide', { index: cell.index + 1, count })"
          :aria-hidden="scrolling && !isShown(i) ? 'true' : undefined"
          :inert="scrolling && !isShown(i)"
        >
          <carousel-slide
            :item="cell.item"
            :width="width"
            :load="!scrolling || Math.abs(i - position) <= visible + 1"
          />
        </div>
      </div>
    </div>
    <p
      v-if="scrolling"
      class="d-sr-only"
      :aria-live="playing ? 'off' : 'polite'"
    >
      {{ t('current', { index: current + 1, count }) }}
    </p>
  </section>
</template>

<style scoped>
/* only what Vuetify has no utility class for */

/* horizontal swipes are ours, vertical ones still scroll the page */
.step-carousel {
  touch-action: pan-y;
}
/* the translated track is a stacking context painted after the controls: keep them above it */
/* under the next arrow without moving it off the center (no utility for a calc offset) */
.step-carousel__pause-below {
  top: calc(50% + 28px);
  left: 50%;
  transform: translateX(-50%);
}
.step-carousel__controls {
  z-index: 1;
}
</style>

<i18n lang="yaml">
fr:
  carousel: carrousel
  slideRole: diapositive
  previous: Image précédente
  next: Image suivante
  slide: "{index} sur {count}"
  current: "Image {index} sur {count}"
en:
  carousel: carousel
  slideRole: slide
  previous: Previous image
  next: Next image
  slide: "{index} of {count}"
  current: "Image {index} of {count}"
</i18n>
