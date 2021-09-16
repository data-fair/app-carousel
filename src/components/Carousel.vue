<template>
  <v-carousel
    v-if="data && data.length"
    v-model="current"
    :hide-delimiters="true"
    :cycle="true"
    :height="windowHeight"
  >
    <v-carousel-item
      v-for="item,i of data"
      :key="i"
    >
      <v-img
        :src="item._thumbnail"
        height="100%"
      >
        <v-overlay
          v-if="labelField || webPageField"
          style="height:20%;top:80%"
        >
          <v-row
            class="white--text"
            align="end"
            style="width:100%"
          >
            <h3
              v-if="!webPageField"
              class="text-h3"
            >
              {{ item[labelField.key] }}
            </h3>
            <v-btn
              v-else-if="!webPageField"
              :href="item[webPageField.key]"
              large
            >
              Accéder
            </v-btn>
            <a
              v-else
              class="text-h3"
              :href="item[webPageField.key]"
            >{{ item[labelField.key] }}</a>
            <v-row />
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
    }),
    computed: {
      ...mapState(['data']),
      ...mapGetters(['imageField', 'labelField', 'webPageField']),
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
