<template>
  <div class="head">
    <div class="title-wrapper">
      <div class="title">华中科技大学文件管理系统</div>
      <div class="sub-title">HUST THESIS MANAGEMENT SYSTEM</div>
    </div>
    <div class="nav" @click="navJump">
      <div :class="['nav-item',navIndex === 0?'blue':'']" data-item="0">首页</div>
      <div v-if="role===0" :class="['nav-item',navIndex === 1?'blue':'']" data-item="1">用户中心</div>
      <div v-else :class="['nav-item',navIndex === 1?'blue':'']" data-item="1">论文审核</div>

      <div v-if="role===0" :class="['nav-item',navIndex === 2?'blue':'']" data-item="2">文件管理</div>
      <div v-else :class="['nav-item',navIndex === 2?'blue':'']" data-item="2">编辑会议</div>
    </div>
    <div class="tel-wrapper">
      tel:
      <div class="tel">15798015790</div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    role: {
      default: 0,
      type: Number

    }

  },
  data () {
    return {
      navIndex: 0
    }
  },
  computed: {

  },
  watch: {
    $route (newV) {
      if (newV.name === 'userCenter' || newV.name === 'paperRequest') {
        this.navIndex = 1
      } else if (newV.name === 'Login' || newV.name === 'Admin') {
        this.navIndex = 0
      } else if (newV.name === 'fileManagement' || newV.name === 'editMeeting') {
        this.navIndex = 2
      }
    }

  },
  methods: {
    navJump (e) {
      if (this.role === 0) {
        if (e.target.dataset.item === '0') {
          this.$router.push('/')
        } else if (e.target.dataset.item === '1') {
          this.$router.push('/userCenter')
        } else if (e.target.dataset.item === '2') {
          this.$router.push('/fileManagement')
        }
      } else if (e.target.dataset.item === '0') {
        this.$router.push('/admin')
      } else if (e.target.dataset.item === '1') {
        this.$router.push('/admin/paperRequest')
      } else if (e.target.dataset.item === '2') {
        this.$router.push('/admin/editMeeting')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.head {
  margin-left: 15%;
  width: 70%;
  height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  .title-wrapper {
    height: 35px;
    .title {
      font-size: 18px;
      font-weight: 400;
    }
    .sub-title {
      font-size: 12px;
      color: rgb(149, 151, 153);
    }
  }
  .nav {
    display: flex;
    font-size: 16px;
    .nav-item {
      margin-right: 30px;
      cursor: pointer;
    }
    .blue {
      color: #409eff;
    }
  }
  .tel-wrapper {
    display: flex;
    color: gray;
    align-items: center;
    .tel {
      margin-left: 10px;
    }
  }
}
</style>
