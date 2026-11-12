/// <reference types="vite/client" />

import type { Config } from './config/.type/index.js'
import type { Application } from '@data-fair/lib-common-types/application/index.js'
import type { FullSiteInfo } from '@data-fair/lib-vue/session.js'

export type AnyConfig = Config

declare global {
  interface Window {
    APPLICATION: Application & { href: string }
    vIframeOptions?: { reactiveParams: Record<string, string> }
    // set by _public.js, which the session reads instead of the deprecated fetch
    __PUBLIC_SITE_INFO?: FullSiteInfo
  }
}
