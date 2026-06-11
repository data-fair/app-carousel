/// <reference types="vite/client" />

import type { Config } from './config/.type/index.js'
import type { Application } from '@data-fair/lib-common-types/application/index.js'

export type AnyConfig = Config

declare global {
  interface Window {
    APPLICATION: Application & { href: string }
    vIframeOptions?: { reactiveParams: Record<string, string> }
  }
}
