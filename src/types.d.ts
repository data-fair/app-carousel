/// <reference types="vite/client" />

import type { Application } from '@data-fair/lib-common-types/application/index.js'
import type { FullSiteInfo } from '@data-fair/lib-vue/session.js'

declare global {
  interface Window {
    APPLICATION: Application & { href: string }
    vIframeOptions?: { reactiveParams: Record<string, string> }
    // set by _public.js, which the session reads instead of the deprecated fetch
    __PUBLIC_SITE_INFO?: FullSiteInfo
    // installed by the capture service before the page loads
    triggerCapture?: (animationSupported?: boolean) => Promise<boolean>
  }
}
