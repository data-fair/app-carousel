<script setup lang="ts">
import { watch } from 'vue'
import { ofetch } from 'ofetch'
import { getErrorMsg } from '@data-fair/lib-vue/ui-notif.js'
import DfUiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import Carousel from '@/components/Carousel.vue'
import { useConfig } from '@/composables/config'
import { useData } from '@/composables/useData'

const { error } = useConfig()
const { dataError, linesError } = useData()

// Report config errors to DataFair in draft mode
if (reactiveSearchParams.draft === 'true') {
  watch([error, dataError, linesError], ([cfgErr, dataErr, fetchErr]) => {
    const message = cfgErr || dataErr || (fetchErr ? getErrorMsg(fetchErr) : null)
    if (message) {
      ofetch(window.APPLICATION.href + '/error', { body: { message }, method: 'POST' }).catch(() => {})
    }
  }, { immediate: true })
}
</script>

<template>
  <v-app>
    <v-main>
      <v-empty-state
        v-if="error"
        :title="error"
        headline="Configuration incomplète"
        icon="mdi-image-multiple"
      />
      <v-empty-state
        v-else-if="dataError"
        :title="dataError"
        headline="Données manquantes"
        icon="mdi-image-off"
      />
      <Carousel
        v-else
        style="height:100%"
      />
      <DfUiNotif />
    </v-main>
  </v-app>
</template>
