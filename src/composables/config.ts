import { inject, computed, ref, type App, type Ref } from 'vue'
import type { Application, Dataset, Field } from '@data-fair/lib-common-types/application/index.js'
import type { Config } from '@/config/.type/index.js'
import type { AnyConfig } from '@/types'

export interface ConfigState {
  application: Application & { href: string }
  config: Ref<AnyConfig>
  setConfig: (newConfig: AnyConfig) => void
  notifyConfigChange: (field: string, value: unknown) => void
  dataset: Ref<Dataset | undefined>
  fields: Ref<Record<string, Field>>
  datasetUrl: Ref<string | undefined>
  finalizedAt: Ref<string | undefined>
  error: Ref<string | null>
}

export function createConfig () {
  const application = window.APPLICATION as Application & { href: string }
  const config = ref<AnyConfig>((application?.configuration || {}) as AnyConfig)

  const dataset = computed(() => config.value?.datasets?.[0] as Dataset | undefined)
  const fields = computed(() => dataset.value?.schema?.reduce((a: Record<string, Field>, b: Field) => { a[b.key] = b; return a }, {}) ?? {})
  const datasetUrl = computed(() => dataset.value?.href)
  const finalizedAt = computed(() => dataset.value?.finalizedAt)

  const error = computed(() => {
    if (!config.value) return 'Il n\'y a pas de configuration définie'
    if (!dataset.value) return 'Veuillez sélectionner une source de données'
    return null
  })

  function setConfig (newConfig: AnyConfig) {
    config.value = newConfig
  }

  function notifyConfigChange (field: string, value: unknown) {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'set-config',
        content: { field, value }
      }, '*')
    }
  }

  function setByPath (obj: Record<string, unknown>, path: string, value: unknown) {
    const keys = path.split('.')
    let current: Record<string, unknown> = obj
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {}
      } else {
        current[key] = Array.isArray(current[key]) ? [...current[key] as unknown[]] : { ...current[key] as Record<string, unknown> }
      }
      current = current[key] as Record<string, unknown>
    }
    current[keys[keys.length - 1]] = value
  }

  return {
    install (app: App) {
      app.provide('data-fair-app-config', {
        application,
        config,
        setConfig,
        notifyConfigChange,
        dataset,
        fields,
        datasetUrl,
        finalizedAt,
        error
      })

      window.addEventListener('message', (event) => {
        if (event.data?.type === 'set-config' && event.data?.content) {
          const { content } = event.data
          if (content.configuration) {
            config.value = content.configuration
          } else if (content.chart || content.datasets || content.layers || content.metrics) {
            config.value = content
          } else if (content.field && 'value' in content) {
            const newConfig = JSON.parse(JSON.stringify(config.value))
            setByPath(newConfig, content.field, content.value)
            config.value = newConfig
          }
        }
      })
    }
  }
}

export function useConfig (): ConfigState {
  const config = inject<ConfigState>('data-fair-app-config')
  if (!config) throw new Error('useConfig requires using the plugin createConfig')
  return config
}

export default useConfig
