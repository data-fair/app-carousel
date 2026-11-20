import type { App, Ref } from 'vue'
import type { Application, Dataset, Field } from '@data-fair/lib-common-types/application/index.js'
import type { Config } from '@/config/index.js'
import { inject, computed, ref } from 'vue'
import { upgradeLegacyConfig } from '@/utils/legacy-config'

export type { Config }

export interface ConfigState {
  application: Application & { href: string }
  config: Ref<Config>
  dataset: Ref<Dataset | undefined>
  fields: Ref<Record<string, Field>>
  // key of the configuration error, translated by App.vue
  error: Ref<'noAttachment' | 'noDataset' | null>
}

function setByPath (obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (typeof current[key] !== 'object' || current[key] === null) current[key] = {}
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
}

export function createConfig () {
  const application = window.APPLICATION
  const config = ref<Config>(upgradeLegacyConfig((application?.configuration || {}) as Config))

  const dataset = computed(() => config.value?.datasets?.[0] as Dataset | undefined)
  const fields = computed(() => (dataset.value?.schema ?? []).reduce((a: Record<string, Field>, f: Field) => { a[f.key] = f; return a }, {}))

  const error = computed(() => {
    if (config.value?.source === 'attachments') {
      if (!config.value.images?.some(i => i.attachment)) return 'noAttachment'
      return null
    }
    if (!dataset.value) return 'noDataset'
    return null
  })

  return {
    install (app: App) {
      app.provide('data-fair-app-config', { application, config, dataset, fields, error })

      // live configuration in draft mode (df:sync-config)
      window.addEventListener('message', (event) => {
        if (event.data?.type !== 'set-config' || !event.data?.content) return
        const { content } = event.data
        if (content.configuration) {
          config.value = upgradeLegacyConfig(content.configuration)
        } else if (content.field && 'value' in content) {
          const newConfig = JSON.parse(JSON.stringify(config.value))
          setByPath(newConfig, content.field, content.value)
          config.value = upgradeLegacyConfig(newConfig)
        } else if (typeof content === 'object') {
          // the whole configuration (data-fair and df-dev-server always send it whole): replaced,
          // not merged, or a property removed by the form (an emptied list) would stay
          config.value = upgradeLegacyConfig(content)
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
