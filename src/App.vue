<template>
  <v-app>
    <v-main>
      <div v-if="application">
        <template v-if="!configureError">
          <carousel />
        </template>
        <v-img v-else-if="params('draft') === 'true'">
          <v-container class="px-5">
            <v-col class="text-center px-5 mb-5">
              <v-alert
                :value="true"
                type="warning"
                outlined
              >
                <h3>{{ configureError }}</h3>
              </v-alert>
            </v-col>
          </v-container>
        </v-img>
      </div>
    </v-main>
  </v-app>
</template>

<script>
  import { mapState, mapGetters } from 'vuex'
  import Carousel from './components/Carousel.vue'

  export default {
    name: 'App',
    components: {
      Carousel,
    },
    computed: {
      ...mapState(['application']),
      ...mapGetters(['config', 'datasetUrl']),
      configureError () {
        if (!this.datasetUrl) return 'Veuillez sélectionner une source de données'
        return null
      },
    },
    methods: {
      params (p) {
        const params = new URLSearchParams(window.location.search)
        return params.get(p)
      },
    },
  }
</script>
