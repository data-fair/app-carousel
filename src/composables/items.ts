import type { Ref } from 'vue'
import type { Filter } from '@data-fair/lib-utils/filters/index.js'
import { computed, ref, watch } from 'vue'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { getConceptFilters } from '@data-fair/lib-vue/concept-filters.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { filters2params } from '@data-fair/lib-utils/filters/index.js'
import { useConfig } from '@/composables/config'
import { normalizeLink, thumbnailSize } from '@/utils/layout'

export interface CarouselItem {
  key: string
  src: string
  title?: string
  description?: string
  link?: string
  // background color read from the data
  color?: string
}

const concepts = {
  image: 'http://schema.org/image',
  document: 'http://schema.org/DigitalDocument',
  label: 'http://www.w3.org/2000/01/rdf-schema#label',
  description: 'http://schema.org/description',
  webPage: 'https://schema.org/WebPage',
  color: 'https://schema.org/color'
}

const text = (value: unknown) => value != null && String(value).trim() !== '' ? String(value).trim() : undefined
// a color read from the data goes into a style: only what the browser accepts as a color
const cssColor = (value: unknown) => {
  const color = text(value)
  return color && globalThis.CSS?.supports?.('color', color) ? color : undefined
}

// maximum number of lines read from a dataset
const maxImages = 100

const isSvg = (url: string) => /\.svg(\?|#|$)/i.test(url)

// a filter whose column is stored as a bare key in old configurations
function normalizeFilters (filters: unknown[] | undefined): Filter[] {
  return (filters ?? []).filter(Boolean).map((f: any) => typeof f.field === 'string' ? { ...f, field: { key: f.field } } : f) as Filter[]
}

export function useItems (measuredSize: Ref<{ width: number, height: number }>) {
  const { application, config, dataset, fields } = useConfig()

  // the thumbnail size is part of the lines query: wait for the first measure, then debounce
  // the resizes so that dragging a window does not refetch every image
  const itemSize = ref<{ width: number, height: number } | null>(null)
  let resizeTimer: ReturnType<typeof setTimeout> | undefined
  watch(measuredSize, (size) => {
    if (!size.width || !size.height) return
    clearTimeout(resizeTimer)
    if (!itemSize.value) itemSize.value = { ...size }
    else resizeTimer = setTimeout(() => { itemSize.value = { ...size } }, 500)
  }, { immediate: true, deep: true })

  // images that failed to load leave the rotation instead of showing an empty slide
  const failed = ref(new Set<string>())
  const markFailed = (key: string) => {
    if (failed.value.has(key)) return
    failed.value = new Set([...failed.value, key])
  }

  const fromDataset = computed(() => config.value.source !== 'attachments')
  const fieldsList = computed(() => Object.values(fields.value))
  // thumbnails only exist for the image concept, a row attachment is shown as is
  const imageField = computed(() => fieldsList.value.find(f => f['x-refersTo'] === concepts.image))
  const documentField = computed(() => imageField.value ? undefined : fieldsList.value.find(f => f['x-refersTo'] === concepts.document))
  // a column chosen in the configuration, else the one carrying the concept
  const pickField = (chosen: { key?: string } | undefined, concept: string) =>
    (chosen?.key && fields.value[chosen.key]) || fieldsList.value.find(f => f['x-refersTo'] === concept)
  const labelField = computed(() => pickField(config.value.titleField, concepts.label))
  const descriptionField = computed(() => config.value.showDescription ? pickField(config.value.descriptionField, concepts.description) : undefined)
  const webPageField = computed(() => pickField(config.value.linkField, concepts.webPage))
  const colorField = computed(() => {
    const background = config.value.background
    if (background?.type !== 'field') return undefined
    return pickField(background.field, concepts.color)
  })

  const contain = computed(() => config.value.fit === 'contain')

  const linesUrl = computed(() => {
    if (!fromDataset.value || !dataset.value?.href) return null
    if (!imageField.value && !documentField.value) return null
    if (imageField.value && !itemSize.value) return null
    return `${dataset.value.href}/lines`
  })

  const linesQuery = computed(() => {
    const imgField = imageField.value ?? documentField.value
    if (!imgField) return {}
    const select = [imgField.key]
    for (const field of [labelField.value, descriptionField.value, webPageField.value, colorField.value]) {
      if (field && !select.includes(field.key)) select.push(field.key)
    }
    const query: Record<string, string | number> = {
      // filters of the page (df:filter-concepts): _c_* as is, _d_<this dataset>_* unprefixed
      ...getConceptFilters(reactiveSearchParams, dataset.value?.id),
      ...filters2params(normalizeFilters(config.value.staticFilters)),
      [`${imgField.key}_exists`]: ' ',
      size: maxImages,
      select: select.join(',')
    }
    if (imageField.value && itemSize.value) query.thumbnail = thumbnailSize(itemSize.value.width, itemSize.value.height)
    // the real value or nothing: an empty finalizedAt is cached forever by the service worker
    if (dataset.value?.finalizedAt) query.finalizedAt = dataset.value.finalizedAt
    if (config.value.sortField?.key) query.sort = (config.value.sortDesc ? '-' : '') + config.value.sortField.key
    return query
  })

  const lines = useFetch<{ results: Record<string, unknown>[] }>(linesUrl, { query: linesQuery, notifError: false })

  const allItems = computed<CarouselItem[]>(() => {
    if (!fromDataset.value) {
      return (config.value.images ?? [])
        .filter(image => image.attachment)
        .map((image, i) => ({
          key: `${i}-${image.attachment}`,
          src: `${application.href}/attachments/${encodeURIComponent(image.attachment)}`,
          title: text(image.title),
          description: config.value.showDescription ? text(image.description) : undefined,
          link: normalizeLink(image.link)
        }))
    }
    return (lines.data.value?.results ?? []).flatMap((line, i) => {
      let src: string | undefined
      if (imageField.value) {
        const original = line[imageField.value.key]
        if (typeof original === 'string' && isSvg(original)) {
          // vector: no thumbnail needed, and the server rasterizes the SVG text without its fonts
          src = original
        } else {
          src = line._thumbnail as string | undefined
          // the default thumbnail is cropped to the requested size, a logo must stay whole
          if (src && contain.value) src += '&fit=inside'
        }
      } else if (documentField.value) {
        src = line._attachment_url as string | undefined
      }
      if (!src) return []
      return [{
        key: (line._id as string) ?? String(i),
        src,
        title: labelField.value ? text(line[labelField.value.key]) : undefined,
        description: descriptionField.value ? text(line[descriptionField.value.key]) : undefined,
        link: webPageField.value ? normalizeLink(line[webPageField.value.key]) : undefined,
        color: colorField.value ? cssColor(line[colorField.value.key]) : undefined
      }]
    })
  })

  const items = computed(() => allItems.value.filter(item => !failed.value.has(item.key)))

  const dataError = computed(() => {
    if (!fromDataset.value || !dataset.value) return null
    if (!imageField.value && !documentField.value) return 'Le jeu de données n\'a pas de colonne portant le concept « Image » ou « Document numérique attaché »'
    return null
  })

  const loading = computed(() => fromDataset.value && (!lines.data.value || lines.loading.value) && (!!linesUrl.value || (!!imageField.value && !itemSize.value)))

  return { items, loading, dataError, linesError: lines.error, markFailed }
}
