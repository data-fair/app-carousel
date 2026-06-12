<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useWindowSize } from '@vueuse/core'
import { useConfig } from '@/composables/config'
import { useData } from '@/composables/useData'

const { config } = useConfig()
const { data, labelField, webPageField } = useData()
const { width, height: windowHeight } = useWindowSize()
const display = useDisplay()

const current = ref(0)

const carouselHeight = computed(() => windowHeight.value || 800)

const cycle = computed(() => (config.value?.interval ?? 0) > 0)
const interval = computed(() => {
  const v = config.value?.interval ?? 0
  return v > 0 ? v * 1000 : 1000
})

const overlayHeight = computed(() => display.xs.value ? 140 : 120)

const typography: Record<string, string> = {
  xs: '',
  sm: 'text-h6',
  md: 'text-h5',
  lg: 'text-h4',
  xl: 'text-h4'
}

const carouselWidth = computed(() => width.value || 1280)

const carouselAspectRatio = computed(() =>
  (carouselWidth.value || 1280) / (carouselHeight.value || 800)
)

function eager (i: number): boolean {
  if (!data.value.length) return false
  if (i === (current.value - 1 + data.value.length) % data.value.length) return true
  if (i === (current.value + 1) % data.value.length) return true
  if (i === (current.value + 2) % data.value.length) return true
  return false
}

function normalizeUrl (url: string) {
  return url.includes('http') ? url : `http://${url}`
}
</script>

<template>
  <v-carousel
    v-if="data && data.length"
    v-model="current"
    :hide-delimiters="true"
    :cycle="cycle"
    :height="carouselHeight"
    :interval="interval"
  >
    <v-carousel-item
      v-for="(item, i) of data"
      :key="i"
      :eager="eager(i)"
    >
      <v-img
        :src="item._thumbnail"
        :aspect-ratio="carouselAspectRatio"
        width="100%"
        height="100%"
        cover
      >
        <div
          v-if="labelField || webPageField"
          class="carousel-overlay"
          :style="`height:${overlayHeight}px`"
        >
          <v-row
            class="text-white ma-0 pt-4"
            align="center"
            no-gutters
            :style="`width:${carouselWidth}px`"
          >
            <v-col
              v-if="labelField"
              :class="`text-${(display.xs.value || !webPageField) ? 'center' : 'right'} px-6 py-1`"
            >
              <h4 :class="typography[display.name.value]">
                {{ item[labelField.key] }}
              </h4>
            </v-col>
            <v-col
              v-if="webPageField && item[webPageField.key]"
              :cols="12"
              :sm="labelField ? 4 : 12"
              :md="labelField ? 3 : 12"
              :xl="labelField ? 2 : 12"
              class="text-center px-6 py-1"
            >
              <v-btn
                :href="normalizeUrl(String(item[webPageField.key]))"
                :size="display.mdAndUp.value ? 'x-large' : (display.sm.value ? 'large' : 'default')"
                :target="config?.linksTarget || '_top'"
                variant="outlined"
              >
                <h4>En savoir plus</h4>
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </v-img>
    </v-carousel-item>
  </v-carousel>
</template>
