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
    <div class="cube-progress" :style="{width:cubeWidth+'px'}">
      <div v-for="chunk in chunks" :key="chunk.name" class="cube">
        <div
          :style="{height:chunk.process+'%'}"
          :class="{
            'uploading':chunk.process>0 && chunk.process<100,
            'success':chunk.process === 100,
            'error':chunk.process<0
          }"
        >
          <i
            v-if="chunk.process<100 && chunk.process>0"
            class="el-icon-loading"
            style="color:white"
          />
        </div>
      </div>
    </div>
    <div class="progress">
      计算hash
      <el-progress :text-inside="true" :stroke-width="20" :percentage="process" />
    </div>
    <div class="progress">
      计算hash2
      <el-progress :text-inside="true" :stroke-width="20" :percentage="process2" />
    </div>
    <div class="progress">
      计算hash3
      <el-progress :text-inside="true" :stroke-width="20" :percentage="process3" />
    </div>
    <button @click="uploadFile">上传</button>
  </div>
</template>

<script>
import sparkMD5 from 'spark-md5'
const CHUNK_SIZE = 0.5 * 1024 * 1024 // 0.5M 必须是整数
export default {
  data () {
    return {
      file: null,

      process: 0,
      process2: 0,
      process3: 0,
      hash: '',
      hash2: '',
      hash3: '',
      chunks: []
    }
  },
  computed: {
    cubeWidth () {
      return Math.ceil(Math.sqrt(this.chunks.length)) * 100 // 每个方框16px
    },
    percentage () {
      if (!this.file || !this.chunks.length) {
        return 0
      }

      const loaded = this.chunks.map((item) => {
        return item.process * item.chunk.size
      }).reduce((acc, cur) => acc + cur, 0)

      const fileSize = this.file.size

      const per = Number(((loaded) / fileSize).toFixed(2))

      return per
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
      //! 需要异步执行函数都封装在promise里面，然后reslove拿结果  或者定义一个async 函数 里面await去等待结果
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = function () {
          // arrayBuffer 可以以一般 Uint8Array 形式存储 Uint8Array 形式可以直接转成16进制
          const sexNumber = Array.prototype.map.call(new Uint8Array(reader.result), x => ('00' + x.toString(16).toUpperCase()).slice(-2)).join(' ')

          resolve(sexNumber)
        }

        reader.readAsArrayBuffer(blob) // 把blob读取成二进制string
      })
    },
    async isImage (file) {
      return await this.isGif(file) || await this.isPng(file) || await this.isJpg(file)
    },
    async isGif (file) {
      // 前面的6个16进制 '47 49 46 38 39 61' || '47 49 46 38 37 61' 转成字符串分别为gif89a,gif87a这六个字符

      const ret = await this.blobToString(file.slice(0, 6)) // file截取前六个字符串的blob blob必须通过fileReader才能读取
      const isGif = (ret === '47 49 46 38 39 61') || (ret === '47 49 46 38 37 61')

      return isGif
    },
    async isPng (file) {
      const ret = await this.blobToString(file.slice(0, 8)) // file截取前六个字符串的blob blob必须通过fileReader才能读取
      const isPng = (ret === '89 50 4E 47 0D 0A 1A 0A')

      return isPng
    },
    async isJpg (file) {
      const len = file.size
      const start = await this.blobToString(file.slice(0, 2))
      const end = await this.blobToString(file.slice(-2, len))

      const isJpg = (start === 'FF 08') && (end === 'FF D9')
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
        } else {
          window.requestIdleCallback(wookloop)
        }
      }
      window.requestIdleCallback(wookloop)
    },
    calcHashSample (file) {
      // 布隆过滤器 hash一样可能是同一个文件 但是不一样一定不是同一个文件 这个数据结构方便用来查找
      return new Promise((resolve) => {
        const len = file.size
        const offset = 0.1 * 1024 * 1024
        const spark = new sparkMD5.ArrayBuffer()
        let cur = offset
        const sparkCalc = (blobs, cur1) => {
          const reader = new FileReader()
          reader.readAsArrayBuffer(blobs)
          reader.onload = (e) => {
            spark.append(e.target.result)
            if (cur1 + offset >= len) {
              resolve(spark.end())
              this.process3 = 100
            } else {
              this.process3 = Number((100 * cur1 / len).toFixed(2))
            }
          }
        }
        sparkCalc(file.slice(0, offset), cur)

        while (cur < len) {
          if (cur + offset >= len) {
            sparkCalc(file.slice(cur, len), cur)
            break
          } else {
            const mid = cur + offset / 2
            const end = cur + offset
            sparkCalc(file.slice(cur, cur + 2), cur)
            sparkCalc(file.slice(mid, mid + 2), cur)
            sparkCalc(file.slice(end - 2, end), cur)
          }
          cur += offset
        }
      })
    },
    async mergeChunks () {
      await this.$http.post('merge', { ext: this.file.name.split('.').pop(), size: CHUNK_SIZE, hash: this.hash }) // 给后缀名和区块的size
    },
    async uploadChunks (chunks) {
      // 映射成promise
      const requestPromise = chunks.map((chunk, index) => {
        const form = new FormData()
        form.append('hash', chunk.hash)
        form.append('name', chunk.name)
        form.append('chunk', chunk.chunk)
        form.append('index', chunk.index)
        return form
      }).map((form, index) => this.$http.post('/uploadfile', form, {
        onUploadProgress: (progress) => {
          this.chunks[index].process = parseInt(((progress.loaded / progress.total) * 100).toFixed(2))
        }
      }))
      // 一次性全部发出 申请tcp会很慢
      await Promise.all(requestPromise).then((res) => {
      })
      await this.mergeChunks()
    },
    async uploadFile () {
      if (!this.isImage(this.file)) {
        alert('文件格式不对')
        return
      }
      const chunks = this.createFileChunk(this.file, CHUNK_SIZE)

      /* this.calculateHashWorker(chunks) */
      /* /* this.calculateHashIdel(chunks) */

      this.hash = await this.calcHashSample(this.file) // 损失一部分精度去换取效率
      // 这里的初始化才是响应式的 你没在这里写process 后面就不会根据process响应式 这里因为set函数里面会深层递归设置响应式
      this.chunks = chunks.map((chunk, index) => {
        return {
          hash: this.hash,
          name: this.hash + '-' + index,
          index,
          chunk: chunk.file,
          process: 0
        }
      })

      await this.uploadChunks(this.chunks)

      /*    const form = new FormData()
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
.cube-progress {
  width: 364px;
  height: 364px;
  .cube {
    float: left;
    width: 40px;
    height: 40px;
    background: #eee;
    margin-left: 20px;
    border: 1px solid black;
    display: flex;
    align-items: center;
    justify-content: center;
    .uploading {
      background: blue;
      width: 100%;
    }
    .success {
      background: green;
      width: 100%;
    }
    .error {
      background: red;
      width: 100%;
    }
  }
}
</style>
