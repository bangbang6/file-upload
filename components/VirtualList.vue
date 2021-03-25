<template>
  <div ref="list" class="list" :style="{height:`${scrollHeight}px`}" @scroll="scrollEvent">
    <div class="list-scroll" :style="{height:listHeight+'px'}" />
    <div class="virtual-list" :style="{top:getTop}">
      <div v-for="item in virtualData" :key="item" :style="{height:size+'px'}">{{ item }}</div>
    </div>
  </div>
</template>

<script>
// list-scroll 起的是占位的作用 占了真实高度的位置 这样才能scroll 有scroolTop
export default {
  props: {
    size: {
      type: Number,
      default: 100
    },
    listData: {
      type: Array,
      default: () => []
    }

  },
  data () {
    return {
      start: 0,
      end: 4,
      startOffset: 0,
      scrollHeight: 800
    }
  },
  computed: {
    virtualData () {
      return this.listData.slice(this.start, Math.min(this.end, this.listData.length))
    },
    listHeight () {
      return this.size * this.listData.length
    },
    getTop () {
      return (this.startOffset) + 'px'
    },
    count () {
      return Math.ceil(this.scrollHeight / this.size)
    }

  },
  methods: {
    scrollEvent (e) {
      const scollTop = this.$refs.list.scrollTop // 滚动条距离上方多少

      this.start = Math.floor(scollTop / this.size)
      this.end = this.start + this.count
      this.startOffset = scollTop - (scollTop % this.size) // 取一个整数 *size
    }
  }
}
</script>

<style lang="scss" scoped>
.list {
  position: relative;
  overflow: auto;
  width: 400px;
  .list-scroll {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: -1;
  }
  .virtual-list {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
  }
}
</style>
