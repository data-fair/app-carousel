<template>
  <v-carousel
    v-if="carouselItems && carouselItems.length"
    v-model="current"
    :hide-delimiters="true"
    :cycle="true"
    :height="windowHeight"
  >
    <v-carousel-item
      v-for="item,i of carouselItems"
      :key="i"
      :eager="eager(current, i)"
    >
      <v-img
        :src="item.image"
        height="100%"
        :eager="eager(current, i)"
      />
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
      ...mapState(['application']),
      ...mapGetters(['carouselItems']),
    },
    created () {
      this.$store.dispatch('init', { windowWidth: this.windowWidth, windowHeight: this.windowHeight })
    },
    methods: {
      ...mapActions(['fetchData']),
      // try to preload items next to current item
      eager (current, i) {
        if (i === (current - 1 + this.carouselItems.length) % this.carouselItems.length) return true
        if (i === (current + 1) % this.carouselItems.length) return true
        if (i === (current + 2) % this.carouselItems.length) return true
        return false
      },
    },
  }
</script>
