<template>
  <div class="main">
    <div class="header">
      <Head />
    </div>
    <Nuxt />
  </div>
</template>

<script>
import Head from '../components/Head'
export default {
  components: {
    Head
  },
  data () {
    return {
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
