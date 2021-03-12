// 这个文件是扩展原来内置的axios 的功能 plugin插件就是扩展功能
import Vue from 'vue'
import axios from 'axios'
import { MessageBox } from 'element-ui'

const service = axios.create({
  baseURL: '/api'
})
export default ({ redirect }) => {
  service.interceptors.response.use(
    (response) => {
      if (response.data.code === -666) {
        MessageBox.confirm('登录已过期', '过期', {
          confirmButtonText: '登录',
          showCancelButton: false,
          type: 'warning'
        }).then(() => {
          localStorage.removeItem('token')
          redirect({ path: '/login' })
        })
      }
      return response.data
    }
  )
  service.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.common.Authorization = 'Bearer' + token
      }
      return config
    }
  )
}

Vue.prototype.$http = service // 挂在到this上
export const http = service
