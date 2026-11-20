// replaces 'vuetify/styles': compiles Vuetify with the site font (--d-body-font-family from _theme.css)
import '@data-fair/lib-vuetify/style/global.scss'
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { createConfig } from '@/composables/config'
import App from './App.vue'

// Lets the v-iframe-compat shim injected by data-fair apply the parent's updateSrc to the
// URL params instead of reloading the whole page (flicker) when the app is embedded.
// Module level, before createApp().
window.vIframeOptions = { reactiveParams: reactiveSearchParams }

// never a scrollbar: a frame smaller than the images cuts them instead of scrolling
document.documentElement.classList.add('overflow-hidden')

async function init () {
  const session = await createSession({
    directoryUrl: '/simple-directory',
    // _public.js sets window.__PUBLIC_SITE_INFO; siteInfo calls the deprecated refreshSiteInfo
    siteInfo: !window.__PUBLIC_SITE_INFO
  })
  const i18n = createI18n({
    legacy: false,
    locale: session.lang.value,
    fallbackLocale: 'en'
  })
  const app = createApp(App)
  app.use(createVuetify({
    ...vuetifySessionOptions(session),
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  }))
    .use(session)
    .use(i18n)
    .use(createUiNotif())
    .use(createConfig())
  app.mount('#app')
}

init()
