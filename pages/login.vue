<template>
  <div :model="form" class="login">
    <el-card shadow="always">
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
        <el-button
          type="primary"
          :disable="timer>0"
          class="btn"
          @click="sendEmailCode"
        >{{ sendEmailText }}</el-button>
      </div>
      <div class="btn-wrapper">
        <el-button type="primary">去注册</el-button>
        <el-button type="primary" @click.native.prevent="login">登录</el-button>
        <!-- //prevent阻止button的原生点击事件的默认事件，有form的时候这里一般是提交表单跳转到页面  -->
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
        password: '',
        captcha: '',
        email: ''
      },
      disable: false,
      timer: 0

    }
  },
  computed: {
    sendEmailText () {
      if (this.timer <= 0) {
        return '发送'
      }
      return `${this.timer}s后发送`
    }
  },
  methods: {
    async sendEmailCode () {
      if (!this.form.email) { return }
      await this.$http.post('/user/sendEmailCode', {
        email: this.form.email
      })
      this.timer = 10
      const timer = setInterval(() => {
        this.timer -= 1
        if (this.timer === 0) {
          clearInterval(timer)
        }
      }, 1000)
    },
    changeCapcha () {
      this.captchaUrl = '/api/captcha?_t=' + new Date().getTime()
    },
    async login () {
      const res = await this.$http.post('/user/login', {
        email: this.form.email,
        password: md5(this.form.password),
        captcha: this.form.captcha
      })
      if (res.code === 0) {
        this.$alert('登录成功')
        localStorage.setItem('token', res.data.token)
        setTimeout(() => {
          this.$router.push('/upload')
        }, 500)
      } else {
        this.$alert('登录失败')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.login {
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
      height: 60%;
      .btn {
        width: 100px;
        height: 40%;
        margin-left: 20px;
        display: inline-block;
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
