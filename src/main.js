import Vue from 'vue'
import App from './App.vue'
import store from './store'
import vuetify from './plugins/vuetify'
import VueWindowSize from 'vue-window-size'

Vue.config.productionTip = false

Vue.use(VueWindowSize)

new Vue({
  store,
  vuetify,
  render: h => h(App),
}).$mount('#app')
