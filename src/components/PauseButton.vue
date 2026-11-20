<script setup lang="ts">
import { mdiPause, mdiPlay } from '@mdi/js'
import { useI18n } from 'vue-i18n'

// RGAA 13.8: any content that moves on its own can be paused and resumed
const paused = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <v-btn
    :icon="paused ? mdiPlay : mdiPause"
    :aria-label="paused ? t('play') : t('pause')"
    size="small"
    color="surface"
    @click="paused = !paused"
  />
</template>

<i18n lang="yaml">
fr:
  pause: Mettre en pause le défilement
  play: Reprendre le défilement
en:
  pause: Pause scrolling
  play: Resume scrolling
</i18n>
