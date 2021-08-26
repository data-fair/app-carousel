import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import { filters2qs, escape } from '@data-fair/components-app/filters/filters'

Vue.use(Vuex)

export default () => {
  return new Vuex.Store({
    modules: {},
    state: {
      application: window.APPLICATION,
      schema: null,
      data: null,
      windowHeight: null,
      windowWidth: null,
    },
    getters: {
      config (state) {
        return state.application && state.application.configuration
      },
      imageField (state) {
        return state.schema.find(f => f['x-refersTo'] === 'http://schema.org/image')
      },
      carouselItems (state, getters) {
        if (!state.data) return []
        // return state.data.results.map(result => ({ image: result[getters.imageField.key] }))
        return state.data.results.map(result => ({ image: result._thumbnail }))
      },
    },
    mutations: {
      setAny (state, params) {
        Object.assign(state, params)
      },
    },
    actions: {
      async init ({ state, getters, commit, dispatch }, { windowWidth, windowHeight }) {
        try {
          const { data: schema } = await axios.get(getters.config.datasets[0].href + '/schema')
          commit('setAny', { schema, windowWidth, windowHeight })
        } catch (err) {
          dispatch('setError', err)
        }
        dispatch('fetchData')
      },
      async fetchData ({ state, getters, commit, dispatch }) {
        try {
          if (!getters.imageField) throw new Error('le jeu ne contient pas de colonne image')
          const filters = (getters.config.staticFilters || []).concat([`_exists_:${escape(getters.imageField.key)}`])
          const params = {
            qs: filters2qs(filters),
            finalizedAt: getters.config.datasets[0].finalizedAt, // for better caching
            size: 100,
            select: getters.imageField.key,
            // round up 100px thumbnail size for better caching
            thumbnail: `${Math.ceil(state.windowWidth / 100) * 100}x${Math.ceil(state.windowHeight / 100) * 100}`,
            // resizeMode=fitIn or smartCrop or nothing ?
          }
          const { data } = await axios.get(getters.config.datasets[0].href + '/lines', { params })
          commit('setAny', { data })
        } catch (err) {
          dispatch('setError', err)
        }
      },
      async setError ({ state }, error) {
        const message = (error.response && error.response.data) || error.message || error
        console.error('report error', error.stack || message)
        try {
          axios.post(state.application.href + '/error', { message })
        } catch (err) {
          console.log('Failed to report error', err)
        }
      },
    },
  })
}
