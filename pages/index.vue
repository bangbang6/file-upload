<template>
  <div class="index">
    <virtual-list :size="150" :list-data="listData" />
  </div>
</template>

<script>
import VirtualList from '../components/VirtualList'
export default {
  components: { VirtualList },
  data () {
    return {
      listData: [1, 2, 3, 4, 5, 6, 7, 8]
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
