<script setup lang="ts">
import type { CarouselItem } from '@/composables/items'
import type { Ref } from 'vue'
import { computed, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion } from '@vueuse/core'
import { VInfiniteCarousel } from 'vuetify/labs/VInfiniteCarousel'
import CarouselSlide from '@/components/CarouselSlide.vue'
import PauseButton from '@/components/PauseButton.vue'

const { items, visible, width, height, gap, speed, reverse = false, fadeEdges = true, label, capture = false } = defineProps<{
  items: CarouselItem[]
  visible: number
  // slide size in px
  width: number
  height: number
  gap: number
  // px per second
  speed: number
  reverse?: boolean
  fadeEdges?: boolean
  label: string
  capture?: boolean
}>()

const { t } = useI18n()
// provided by App: set when the app sizes itself instead of filling the frame
const mediaHeight = inject<Ref<number | undefined>>('carousel-media-height', ref(undefined))
const reducedMotion = usePreferredReducedMotion()

// fewer images than places: a static row, a loop would show the same image twice
const scrolling = computed(() => items.length > visible)
// VInfiniteCarousel also stops on hover and keyboard focus by itself, and never moves under a
// reduced motion preference: the pause button would then do nothing, it is not shown
const userPaused = ref(false)
// the pause button is always there for the keyboard, only seen with the mouse or the focus on the strip, or once paused
const hovering = ref(false)
const focused = ref(false)
const hasPause = computed(() => scrolling.value && !capture && reducedMotion.value !== 'reduce')
const pauseSeen = computed(() => hovering.value || focused.value || userPaused.value)
function onFocusout (e: FocusEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) focused.value = false
}
const mask = computed(() => fadeEdges ? Math.round(Math.min(64, (width * visible) * 0.06)) : false)
// filling the frame: the frame height; sized by the app: the natural height (image + caption)
const slideStyle = computed(() => ({ width: `${width}px`, height: mediaHeight.value ? undefined : `${height}px` }))
</script>

<template>
  <section
    class="continuous-carousel position-relative d-flex align-center"
    :class="{ 'h-100': !mediaHeight }"
    :aria-label="label"
    :aria-roledescription="t('carousel')"
    @pointerenter="e => { if (e.pointerType === 'mouse') hovering = true }"
    @pointerleave="hovering = false"
    @focusin="focused = true"
    @focusout="onFocusout"
  >
    <v-infinite-carousel
      v-if="scrolling"
      :speed="speed"
      :reverse="reverse"
      :paused="userPaused || capture"
      :mask="mask"
      :gap="gap"
      draggable
      pause-on-hover
    >
      <div
        v-for="(item, i) in items"
        :key="item.key"
        :style="slideStyle"
        role="group"
        :aria-roledescription="t('slideRole')"
        :aria-label="t('slide', { index: i + 1, count: items.length })"
      >
        <carousel-slide
          :item="item"
          :width="width"
        />
      </div>
    </v-infinite-carousel>
    <div
      v-else
      class="d-flex justify-center w-100"
      :class="{ 'ga-2': gap === 8, 'ga-4': gap === 16, 'ga-8': gap === 32 }"
    >
      <div
        v-for="item in items"
        :key="item.key"
        :style="slideStyle"
      >
        <carousel-slide
          :item="item"
          :width="width"
        />
      </div>
    </div>
    <!-- over the faded right edge, where it hides the least -->
    <div class="continuous-carousel__controls position-absolute top-0 bottom-0 right-0 mr-2 d-flex align-center">
      <pause-button
        v-if="hasPause"
        v-model="userPaused"
        :class="{ 'opacity-0': !pauseSeen }"
      />
    </div>
  </section>
</template>

<style scoped>
/* the animated track is a stacking context painted after the button: keep it above */
.continuous-carousel__controls {
  z-index: 1;
}
</style>

<i18n lang="yaml">
fr:
  carousel: carrousel
  slideRole: diapositive
  slide: "{index} sur {count}"
en:
  carousel: carousel
  slideRole: slide
  slide: "{index} of {count}"
</i18n>
