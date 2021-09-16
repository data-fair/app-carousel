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
      datasetUrl (state, getters) {
        return getters.config &&
          getters.config.datasets &&
          getters.config.datasets[0] &&
          getters.config.datasets[0].href
      },
      imageField (state) {
        return state.schema.find(f => f['x-refersTo'] === 'http://schema.org/image')
      },
      webPageField (state, getters) {
        return !getters.config.distactivateLinks && state.schema.find(f => f['x-refersTo'] === 'https://schema.org/WebPage')
      },
      labelField (state, getters) {
        return !getters.config.hideTitle && state.schema.find(f => f['x-refersTo'] === 'http://www.w3.org/2000/01/rdf-schema#label')
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
          const { data: schema } = await axios.get(getters.datasetUrl + '/schema')
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
          const select = [getters.imageField.key]
          if (getters.labelField) select.push(getters.labelField.key)
          if (getters.webPageField) select.push(getters.webPageField.key)
          const params = {
            qs: filters2qs(filters),
            finalizedAt: getters.config.datasets[0].finalizedAt, // for better caching
            size: 100,
            select: select.join(','),
            // round up 100px thumbnail size for better caching
            thumbnail: `${Math.ceil(state.windowWidth / 100) * 100}x${Math.ceil(state.windowHeight / 100) * 100}`,
            // resizeMode=fitIn or smartCrop or nothing ?
          }
          const { data } = await axios.get(getters.datasetUrl + '/lines', { params })
          commit('setAny', { data: data.results })
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
