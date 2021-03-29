<template>
  <div class="user-center">
    <div ref="drag" class="drag">
      <!-- eslint-disable-next-line -->
      <input type="file" name="file" @change="handleFileChange" class="input" ref="input" />
    </div>
    <div class="progress">
      文件上传
      <el-progress :text-inside="true" :stroke-width="20" :percentage="percentage" />
    </div>
    <div v-if="showCubeProcess" class="cube-progress" :style="{width:cubeWidth+'px'}">
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
    <div v-if="showHashProcess" class="progress">
      计算hash
      <el-progress :text-inside="true" :stroke-width="20" :percentage="process" />
    </div>

    <button @click="uploadFile">上传</button>
    <button v-if="!cancelStatus" @click="cancel">取消</button>
    <button v-else @click="uploadAgain">重新上传</button>
  </div>
</template>

<script>
import sparkMD5 from 'spark-md5' // 0.5M 必须是整数
import axios from 'axios'

export default {
  props: {
    uploadAction: {
      type: String,
      default: '/uploadfile'
    },
    checkFileAction: {
      type: String,
      default: '/checkFile'
    },
    mergeAction: {
      type: String,
      default: '/merge'
    },
    showHashProcess: {
      type: Boolean,
      default: true
    },
    showCubeProcess: {
      type: Boolean,
      default: true
    },
    hashType: {
      type: Number,
      default: 3
    },
    typeLimit: {
      type: Boolean,
      default: false
    },
    isCancel: {
      type: Boolean,
      default: true
    },
    errorLimit: {
      type: Number,
      default: 3
    },
    paralleLimit: {
      type: Number,
      default: 4
    }

  },
  data () {
    return {
      file: null,
      chunkSize: 0.5 * 1024 * 1024,
      process: 0,
      process2: 0,
      process3: 0,
      hash: '',
      hash2: '',
      hash3: '',
      chunks: [],
      cancelStatus: false
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
    // 消除监听器
  },
  methods: {
    async uploadAgain () {
      const { data: { uploaded, uploadedList } } = await this.$http.post(this.checkFileAction, { hash: this.hash, ext: this.file.name.split('.').pop() })
      // 这里的初始化才是响应式的 你没在这里写process 后面就不会根据process响应式 这里因为set函数里面会深层递归设置响应式
      if (uploaded) {
        // 秒传
        return this.$message.success('已存在文件,秒传成功')
      }
      // 没完全上传文件 或者没上传过文件

      this.chunks = this.chunks.map((chunk, index) => {
        const name = this.hash + '-' + index
        return {
          ...chunk,
          process: uploadedList.includes(name) ? 100 : 0
        }
      })
      this.cancelStatus = false
      // 已经上传过的chunks不需要上传
      await this.uploadChunks(this.chunks, uploadedList)
    },
    cancel () {
      this.source.cancel()
    },
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

      const isJpg = (start === 'FF D8') && (end === 'FF D9')
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
      return new Promise((resolve, reject) => {
        const worker = new Worker('/hash.js')
        worker.postMessage({
          chunks
        })
        worker.onmessage = (e) => {
          const { process, hash } = e.data
          this.process = process
          if (hash) {
            resolve(hash)
          }
        }
      })
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
      return new Promise((resolve, reject) => {
        const wookloop = async (deadline) => {
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            await appendSpark(chunks[count].file)
            count++

            if (count < chunks.length) {
              this.process = Number((100 * count / chunks.length).toFixed(2))
            }
          }
          if (count === chunks.length) {
            this.process = 100.00
            const hash = spark.end()
            resolve(hash)
          } else {
            window.requestIdleCallback(wookloop)
          }
        }
        window.requestIdleCallback(wookloop)
      })
    },
    calcHashSample (file) {
      // 布隆过滤器 hash一样可能是同一个文件 但是不一样一定不是同一个文件 这个数据结构方便用来查找
      return new Promise((resolve) => {
        const spark = new sparkMD5.ArrayBuffer()
        const reader = new FileReader()

        const size = file.size
        const offset = 2 * 1024 * 1024
        // 第一个2M，最后一个区块数据全要
        const chunks = [file.slice(0, offset)]

        let cur = offset
        while (cur < size) {
          if (cur + offset >= size) {
            // 最后一个区快
            chunks.push(file.slice(cur, cur + offset))
          } else {
            // 中间的区块
            const mid = cur + offset / 2
            const end = cur + offset
            chunks.push(file.slice(cur, cur + 2))
            chunks.push(file.slice(mid, mid + 2))
            chunks.push(file.slice(end - 2, end))
          }
          cur += offset
        }
        // 中间的，取前中后各2各字节
        reader.readAsArrayBuffer(new Blob(chunks))
        reader.onload = (e) => {
          spark.append(e.target.result)
          this.process = 100
          resolve(spark.end())
        }
      })
    },
    async mergeChunks () {
      await this.$http.post(this.mergeAction, { ext: this.file.name.split('.').pop(), size: this.chunkSize, hash: this.hash }) // 给后缀名和区块的size
    },
    async uploadChunks (chunks, uploadedList) {
      // !已经上传过的chunks不需要上传
      // 映射成promise
      const chunksFormData = chunks.filter(chunk => !uploadedList.includes(chunk.name)).map((chunk, index) => {
        const form = new FormData()
        form.append('hash', chunk.hash)
        form.append('name', chunk.name)
        form.append('chunk', chunk.chunk)
        form.append('index', chunk.index)
        return { form, index: chunk.index, errorCount: 0 } // errorCount这个区块的报错次数
      })
      /* .map(chunkForm => this.$http.post('/uploadfile', chunkForm.form, {
        onUploadProgress: (progress) => {
          // 直接取map的Index 永远是从0-len 永远都是前几个chunk在上传 我们应该取得是切块时候得index 那个才是chunk得唯一标识
          this.chunks[chunkForm.index].process = parseInt(((progress.loaded / progress.total) * 100).toFixed(2))
        }
      })) */
      // 一次性全部发出 有些在pending 这些都会申请tcp 申请tcp会很慢 是同时发起得upload导致卡 而不是多
      this.CancelToken = axios.CancelToken
      this.source = this.CancelToken.source()
      try {
        await this.sendRequest(chunksFormData, this.paralleLimit)
        // 所有切片传成功才会merge 才会有最后得文件 没全部时不会走到这得
        await this.mergeChunks()
      } catch (e) {
        if (axios.isCancel(e)) {
          this.$message.success('取消上传')
          this.cancelStatus = true
        } else { this.$message.success('文件重传大于三次') }
      }
    },
    // 限制并发数量
    sendRequest (chunksFormData, limit) {
      // !一个数组，长度是limit，完成一个干掉一个 失败就重传,数组长度一直保持为limit
      return new Promise((resolve, reject) => {
        const len = chunksFormData.length
        let counter = 0// 控制是否全部上传结束
        let isStop = false // 停止往上upload的标志位
        const start = async () => {
          if (isStop) { return }
          const chunkForm = chunksFormData.shift() // 弹出一个task
          if (chunkForm) {
            try {
              await this.$http.post(this.uploadAction, chunkForm.form, {
                cancelToken: this.source.token,
                onUploadProgress: (progress) => {
                  // 直接取map的Index 永远是从0-len 永远都是前几个chunk在上传 我们应该取得是切块时候得index 那个才是chunk得唯一标识

                  this.chunks[chunkForm.index].process = parseInt(((progress.loaded / progress.total) * 100).toFixed(2))
                }
              })
              // 执行完一个task 下面继续执行下一个task  但是报错啦是不会走start逻辑的 直接走catch
              if (counter === len - 1) {
                resolve()
              } else {
                counter += 1
                start() // 继续启动 递归  counter === len是递归终止条件
              }
            } catch (e) {
              // 当前区块上传报错则变红
              this.chunks[chunkForm.index].process = -1
              if (chunkForm.errorCount < this.errorLimit) {
                chunkForm.errorCount++
                chunksFormData.unshift(chunkForm) // 插入这个坏的
                start() // 再次启动
              } else {
                // 错误三次
                isStop = true
                reject(e)
              }
            }
          }
        }
        // 这里用for循环也行 保证有limit个start在发请求
        while (limit >= 0) {
          setTimeout(() => {
            start()
          }, limit * 1000)
          limit -= 1
        }
      })
    },
    async uploadFile () {
      if (!this.file) { return }

      if (this.typeLimit && !await this.isImage(this.file)) {
        alert('文件格式不对')
        return
      }

      const chunks = this.createFileChunk(this.file, this.chunkSize)

      /* this.calculateHashWorker(chunks) */
      /* /* this.calculateHashIdel(chunks) */
      if (this.type === 1) {
        this.hash = await this.calculateHashWorker(chunks) // 损失一部分精度去换取效率
      } else if (this.type === 2) {
        this.hash = await this.calculateHashIdel(chunks) // 损失一部分精度去换取效率
      } else {
        this.hash = await this.calcHashSample(this.file)
      }

      // 计算完hash 用这个hash去问后台这个文件上传过吗
      const { data: { uploaded, uploadedList } } = await this.$http.post(this.checkFileAction, { hash: this.hash, ext: this.file.name.split('.').pop() })
      // 这里的初始化才是响应式的 你没在这里写process 后面就不会根据process响应式 这里因为set函数里面会深层递归设置响应式
      if (uploaded) {
        // 秒传
        return this.$message.success('已存在文件,秒传成功')
      }
      // 没完全上传文件 或者没上传过文件
      this.chunks = chunks.map((chunk, index) => {
        const name = this.hash + '-' + index
        return {
          hash: this.hash,
          name,
          index,
          chunk: chunk.file,
          process: uploadedList.includes(name) ? 100 : 0 // 已经在后台有的切片设为100 没有则为0 不存在chunk的一半上传成功 因为这个chunk的http不成功的话后台不会保存这个chunk文件
        }
      })
      // 已经上传过的chunks不需要上传
      await this.uploadChunks(this.chunks, uploadedList)

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
