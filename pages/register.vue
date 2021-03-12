<template>
  <div :model="form" class="register">
    <el-card shadow="always">
      <div class="name">
        <span>用户:</span>
        <el-input v-model="form.name" placeholder="用户名" />
      </div>
      <div class="email">
        <span>邮箱:</span>
        <el-input v-model="form.email" placeholder="邮箱" />
      </div>
      <div class="password">
        <span>密码:</span>
        <el-input v-model="form.password" placeholder="密码" type="password" />
      </div>
      <div class="captcha">
        <span>验证:</span>
        <el-input v-model="form.captcha" placeholder="验证码" />
        <!-- eslint-disable-next-line -->
        <img :src="captchaUrl" @click="changeCapcha" />
      </div>
      <div class="btn-wrapper">
        <el-button type="primary">去登录</el-button>
        <el-button type="primary" @click="register">注册</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import md5 from 'md5'

export default {

  layout: 'login',
  data () {
    return {
      captchaUrl: '/api/captcha?_t=' + new Date().getTime(),
      form: {
        name: '',
        password: '',
        captcha: '',
        email: ''
      }
    }
  },
  methods: {
    changeCapcha () {
      this.captchaUrl = '/api/captcha?_t=' + new Date().getTime()
    },
    async register () {
      const res = await this.$http.post('/user/register', {
        email: this.form.email,
        password: md5(this.form.password),
        captcha: this.form.captcha,
        name: this.form.name
      })

      if (res.code === 0) {
        this.$alert('注册成功', '成功', {
          confirmButtonText: '去登陆',
          callback: () => {
            this.$router.push('/login')
          }

        })
      } else {
        this.$alert(res.data.message, '注册失败', {
          confirmButtonText: '确定'

        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.register {
  height: 600px;
  width: 60%;
  margin-left: 20%;
  .el-card {
    height: 80%;
    width: 600px;
    margin-top: 20px;
    .captcha,
    .name,
    .email,
    .password {
      span {
        display: inline-block;
        width: 60px;
        font-size: 14px;
      }
    }

    .captcha {
      display: flex;
      align-items: center;
      img {
        cursor: pointer;
        margin-left: 20px;
      }
    }
    .btn-wrapper {
      display: flex;
      align-items: center;
      margin-top: 60px;
      justify-content: space-between;
    }
  }
}
</style>
<style lang="scss">
.el-input {
  margin-top: 10px;
  height: 30px;
  width: 400px;
  .el-input__inner {
    height: 100%;
  }
}
</style>
