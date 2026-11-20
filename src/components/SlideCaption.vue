<script setup lang="ts">
import type { CarouselItem } from '@/composables/items'

// title, description and button of a slide, over the image (on a scrim) or below it
const { item, overlay, showTitle, showButton, buttonLabel, buttonLabelFull, target, width, layout } = defineProps<{
  item: CarouselItem
  overlay: boolean
  showTitle: boolean
  showButton: boolean
  buttonLabel: string
  // the button text completed with the title, for screen readers (RGAA 6.1)
  buttonLabelFull: string
  target: string
  // width of the slide in px, to size the texts
  width: number
  // spread: text on the left, button on the right; left / center: text above the button
  layout: string
}>()

const titleClass = () => {
  if (!overlay) return 'text-title-small'
  if (width >= 840) return 'text-headline-small'
  if (width >= 420) return 'text-title-large'
  return 'text-title-medium'
}
const buttonSize = () => !overlay ? 'small' : width >= 840 ? 'large' : width >= 420 ? 'default' : 'small'
const classes = () => ({
  spread: { box: 'flex-row flex-nowrap align-center', text: 'text-left flex-grow-1 carousel-caption__text', button: 'ml-auto' },
  left: { box: 'flex-column align-start', text: 'text-left', button: '' },
  center: { box: 'flex-column align-center', text: 'text-center', button: '' }
} as Record<string, { box: string, text: string, button: string }>)[layout] ?? { box: 'flex-column align-center', text: 'text-center', button: '' }
</script>

<template>
  <div
    class="d-flex ga-2"
    :class="[classes().box, overlay ? 'carousel-caption--overlay position-absolute bottom-0 left-0 right-0 px-4 pt-8 pb-3' : 'px-2 pt-2']"
  >
    <div
      v-if="(showTitle && item.title) || item.description"
      :class="classes().text"
    >
      <div
        v-if="showTitle && item.title"
        class="carousel-caption__clamp-2"
        :class="titleClass()"
        :title="item.title"
      >
        {{ item.title }}
      </div>
      <div
        v-if="item.description"
        class="carousel-caption__clamp-3"
        :class="overlay ? 'text-body-medium' : 'text-body-small'"
      >
        {{ item.description }}
      </div>
    </div>
    <v-btn
      v-if="showButton"
      :href="item.link"
      :target="target"
      :rel="target === '_blank' ? 'noopener' : undefined"
      :size="buttonSize()"
      :aria-label="buttonLabelFull"
      :color="overlay ? undefined : 'primary'"
      variant="outlined"
      class="flex-shrink-0"
      :class="classes().button"
    >
      {{ buttonLabel }}
    </v-btn>
  </div>
</template>

<style scoped>
/* only what Vuetify has no utility class for */

/* scrim under the caption, in the inverse surface of the theme (no utility class makes a
   gradient); the title and the outlined button take its text color */
.carousel-caption--overlay {
  background: linear-gradient(to top,
    rgba(var(--v-theme-surface-variant), .92) 0%,
    rgba(var(--v-theme-surface-variant), .7) 60%,
    rgba(var(--v-theme-surface-variant), 0) 100%);
  color: rgb(var(--v-theme-on-surface-variant));
}
@media (forced-colors: active) {
  .carousel-caption--overlay { background: Canvas; color: CanvasText; }
}
/* next to the button, the text shrinks (and its lines wrap) instead of pushing it out */
.carousel-caption__text {
  min-width: 0;
}
/* a long title stops after 2 lines, a description after 3, instead of covering the image or
   overflowing the frame; the whole text stays in the DOM (screen readers, tooltip, link name) */
.carousel-caption__clamp-2,
.carousel-caption__clamp-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.carousel-caption__clamp-2 { -webkit-line-clamp: 2; }
.carousel-caption__clamp-3 { -webkit-line-clamp: 3; }
</style>
