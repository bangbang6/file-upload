<template>
  <div class="user-center" />
</template>

<script>
export default {
  data () {
    return {
    }
  },
  async mounted () {
    await this.$http.get('/user/info')
  }
}
</script>

<style lang="scss" scoped>
</style>
