self.importScripts('spark-md5.min.js')

self.onmessage = (e) => {
  const { chunks } = e.data
  const spark = new self.SparkMD5.ArrayBuffer() // arraybuffer形式的spark 对应filereader读取出的类型
  let count = 0
  let process = 0
  calNext(0)
  function calNext (index) {
    const reader = new FileReader()
    reader.readAsArrayBuffer(chunks[index].file) // 将blobs转成arraybuffer
    reader.onload = (e) => {
      count++

      spark.append(e.target.result) // spark追加result数组
      if (count === chunks.length) {
        self.postMessage({
          process: 100,
          hash: spark.end()
        })
      } else {
        process += 100 / (chunks.length)
        self.postMessage({
          process

        })
        calNext(index + 1)
      }
    }
  }
}
