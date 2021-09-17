<template>
  <v-carousel
    v-if="data && data.length"
    v-model="current"
    :hide-delimiters="true"
    :cycle="config.interval > 0"
    :height="windowHeight"
    :interval="config.interval > 0 ? config.interval*1000 : 1000"
  >
    <v-carousel-item
      v-for="item,i of data"
      :key="i"
      :eager="eager(current, i)"
    >
      <v-img
        :src="item._thumbnail"
        height="100%"
      >
        <v-overlay
          v-if="labelField || webPageField"
          :style="`height:${overlayHeight}px;top:${windowHeight-overlayHeight}px`"
        >
          <v-row
            class="white--text"
            align="center"
            :style="`width:${windowWidth}px`"
          >
            <v-col
              v-if="labelField"
              :class="`text-${$vuetify.breakpoint.xs ? 'center' : 'right'} px-6 py-1`"
            >
              <h4
                :class="typography[$vuetify.breakpoint.name]"
              >
                {{ item[labelField.key] }}
              </h4>
            </v-col>
            <v-col
              v-if="webPageField"
              :cols="12"
              :sm="labelField ? 4 : 12"
              :md="labelField ? 3 : 12"
              :xl="labelField ? 2 : 12"
              class="text-center px-6 py-1"
            >
              <v-btn

                :href="item[webPageField.key]"
                :x-large="$vuetify.breakpoint.mdAndUp"
                :large="$vuetify.breakpoint.sm"
                outlined
              >
                <h4>En savoir plus</h4>
              </v-btn>
            </v-col>
          </v-row>
        </v-overlay>
      </v-img>
    </v-carousel-item>
  </v-carousel>
</template>

<script>
  import { mapState, mapGetters, mapActions } from 'vuex'

  export default {
    name: 'HelloWorld',
    data: () => ({
      current: 0,
      typography: {
        xs: '',
        sm: 'text-h6',
        md: 'text-h5',
        lg: 'text-h4',
        xl: 'text-h4',
      },
    }),
    computed: {
      ...mapState(['data']),
      ...mapGetters(['config', 'labelField', 'webPageField']),
      overlayHeight () {
        if (this.$vuetify.breakpoint.xs) return 120
        return 100
      },
    },
    created () {
      this.$store.dispatch('init', { windowWidth: this.windowWidth, windowHeight: this.windowHeight })
    },
    methods: {
      ...mapActions(['fetchData']),
      // try to preload items next to current item
      eager (current, i) {
        if (i === (current - 1 + this.data.length) % this.data.length) return true
        if (i === (current + 1) % this.data.length) return true
        if (i === (current + 2) % this.data.length) return true
        return false
      },
    },
  }
</script>
