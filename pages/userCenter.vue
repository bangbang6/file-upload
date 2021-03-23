<template>
  <div class="user-center">
    <div ref="drag" class="drag">
      <!-- eslint-disable-next-line -->
      <input type="file" name="file" @change="handleFileChange" class="input" />
    </div>
    <div class="progress">
      文件上传
      <el-progress :text-inside="true" :stroke-width="20" :percentage="percentage" />
    </div>
    <div class="progress">
      计算hash
      <el-progress :text-inside="true" :stroke-width="20" :percentage="process" />
    </div>
    <div class="progress">
      计算hash2
      <el-progress :text-inside="true" :stroke-width="20" :percentage="process2" />
    </div>
    <button @click="uploadFile">上传</button>
  </div>
</template>

<script>
import sparkMD5 from 'spark-md5'
const CHUNK_SIZE = 0.1 * 1024 * 1024 // 0.5M
export default {
  data () {
    return {
      file: null,
      percentage: 0,
      process: 0,
      process2: 0,
      hash: ''
    }
  },
  async mounted () {
    await this.$http.get('/user/info')
    this.bindEvents()
  },
  beforeDestroy () {

  },
  methods: {
    blobToString (blob) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = function () {
          console.log('reader.result', reader.result) // 读取到的字符串
          // 读取好的string split开 然后转成asci码(10进制) 然后转成16进制 最后加0 去比对
          const ret = reader.result.split('').map(v => v.charCodeAt()).map(v => v.toString(16).toUpperCase()).map(v => v.padStart(2, '0')).join(' ')
          resolve(ret)
        }
        reader.readAsBinaryString(blob) // 把blob读取成string
      })
    },
    async isImage (file) {
      return await this.isGif(file) || await this.isPng(file) || await this.isJpg(file)
    },
    async isGif (file) {
      // 前面的6个16进制 '47 49 46 38 39 61' || '47 49 46 38 37 61' 转成字符串分别为gif89a,gif87a这六个字符

      const ret = await this.blobToString(file.slice(0, 6)) // file截取前六个字符串的blob blob必须通过fileReader才能读取
      console.log('ret1', ret)
      const isGif = (ret === '47 49 46 38 39 61') || (ret === '47 49 46 38 37 61')

      return isGif
    },
    async isPng (file) {
      const ret = await this.blobToString(file.slice(0, 8)) // file截取前六个字符串的blob blob必须通过fileReader才能读取
      console.log('ret2', ret)
      const isPng = (ret === '89 50 4E 47 0D 0A 1A 0A')

      return isPng
    },
    async isJpg (file) {
      const len = file.size
      const start = await this.blobToString(file.slice(0, 2))
      const end = await this.blobToString(file.slice(-2, len))

      const isJpg = (start === 'FF 08') && (end === 'ff D9')
      return isJpg
    },
    bindEvents () {
      const drag = this.$refs.drag
      // 拖拽事件的散步
      drag.addEventListener('dragover', (e) => {
        drag.style.borderColor = 'red'
        e.preventDefault()
      })
      drag.addEventListener('drop', (e) => {
        e.preventDefault()
        this.file = e.dataTransfer.files[0]
      })
      drag.addEventListener('dragleave', (e) => {
        drag.style.borderColor = 'black'
        e.preventDefault()
      })
    },
    handleFileChange (e) {
      const [file] = e.target.files
      if (!file) { return }
      this.file = file
    },
    createFileChunk (file, size) {
      const chunks = []
      let cur = 0
      // file默认都是blob
      while (cur < file.size) {
        chunks.push({ index: cur, file: file.slice(cur, cur + size) })
        cur += size
      }
      return chunks
    },
    calculateHashWorker (chunks) {
      const worker = new Worker('/hash.js')
      worker.postMessage({
        chunks
      })
      worker.onmessage = (e) => {
        const { process, hash } = e.data
        this.process = process
        if (hash) {
          this.hash = hash
          console.log('this.hash', this.hash)
        }
      }
    },
    calculateHashIdel (chunks) {
      const spark = new sparkMD5.ArrayBuffer()
      let count = 0
      function appendSpark (blobs) {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            spark.append(e.target.result)
            resolve()
          }
          reader.readAsArrayBuffer(blobs)
        })
      }
      const wookloop = async (deadline) => {
        while (count < chunks.length && deadline.timeRemaining() > 1) {
          await appendSpark(chunks[count].file)
          count++
          if (count < chunks.length) {
            this.process2 = Number((100 * count / chunks.length).toFixed(2))
          }
        }
        if (count === chunks.length) {
          this.process2 = 100.00
          this.hash2 = spark.end()
          console.log('this.hash2', this.hash2)
        } else {
          window.requestIdleCallback(wookloop)
        }
      }
      window.requestIdleCallback(wookloop)
    },
    async uploadFile () {
      if (!this.isImage(this.file)) {
        alert('文件格式不对')
        return
      }
      const chunks = this.createFileChunk(this.file, CHUNK_SIZE)
      this.calculateHashWorker(chunks)
      /* this.calculateHashIdel(chunks) */

      /*  const form = new FormData()
      form.append('name', 'file')
      form.append('file', this.file)
      // axios自带的配置 钩子事件
      await this.$http.post('/uploadfile', form, {
        onUploadProgress: (progress) => {
          this.percentage = Number(((progress.loaded / progress.total) * 100).toFixed(2))
        }
      }) */
    }
  }
}
</script>

<style lang="scss" scoped>
.drag {
  height: 400px;
  width: 600px;
  margin: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px dotted black;
  .input {
    width: 380px;
  }
}
.progress {
  width: 60%;
  margin-left: 20%;
  margin-top: 20px;
}
</style>
