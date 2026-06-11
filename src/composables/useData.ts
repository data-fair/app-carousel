import { computed, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { filters2qs } from '@data-fair/lib-utils/filters'
import { useConfig } from '@/composables/config'

export interface CarouselItem {
  [key: string]: unknown
  _thumbnail: string
}

export interface LinesResponse {
  results: CarouselItem[]
}

function normalizeFilters (filters: any[]): any[] {
  return filters?.map((f) => {
    if (!f) return f
    if (typeof f.field === 'string') {
      return { ...f, field: { key: f.field } }
    }
    return f
  }) ?? []
}

function escapeKey (key: string) {
  return key.replace(/:/g, '\\:')
}

export function useData () {
  const { config, dataset, fields, datasetUrl, finalizedAt } = useConfig()
  const { width, height } = useWindowSize()

  const imageField = computed(() =>
    Object.values(fields.value).find((f) => f['x-refersTo'] === 'http://schema.org/image')
  )

  const webPageField = computed(() => {
    if (config.value?.distactivateLinks) return undefined
    return Object.values(fields.value).find((f) => f['x-refersTo'] === 'https://schema.org/WebPage')
  })

  const labelField = computed(() => {
    if (config.value?.hideTitle) return undefined
    return Object.values(fields.value).find((f) => f['x-refersTo'] === 'http://www.w3.org/2000/01/rdf-schema#label')
  })

  const linesUrl = computed(() => datasetUrl.value ? `${datasetUrl.value}/lines` : null)

  const linesQuery = computed(() => {
    const imgKey = imageField.value?.key
    if (!imgKey) return null
    const filters = normalizeFilters((config.value?.staticFilters || []) as any[])
    filters.push(`_exists_:${escapeKey(imgKey)}`)
    const select = [imgKey]
    if (labelField.value) select.push(labelField.value.key)
    if (webPageField.value) select.push(webPageField.value.key)
    const w = width.value || 1280
    const h = height.value || 800
    return {
      qs: filters2qs(filters as any),
      finalizedAt: finalizedAt.value,
      size: 100,
      select: select.join(','),
      thumbnail: `${Math.ceil(w / 100) * 100}x${Math.ceil(h / 100) * 100}`
    }
  })

  const { data: linesRaw, error: linesError } = useFetch<LinesResponse>(linesUrl, {
    query: linesQuery as any,
    notifError: false
  })

  const data = computed<CarouselItem[]>(() => linesRaw.value?.results ?? [])

  const dataError = computed(() => {
    if (!dataset.value) return null
    if (!imageField.value) return 'Le jeu de données ne contient pas de colonne image'
    return null
  })

  return {
    data,
    linesError,
    dataError,
    imageField,
    labelField,
    webPageField
  }
}

export default useData
