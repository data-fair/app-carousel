<template>
  <v-app>
    <v-main>
      <carousel />
    </v-main>
  </v-app>
</template>

<script>
  import Carousel from './components/Carousel.vue'

  export default {
    name: 'App',
    components: {
      Carousel,
    },
    data: () => ({}),
  }
</script>
