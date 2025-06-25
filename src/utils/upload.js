import { currentConfig } from '../config'

/**
 * 通用文件上传函数 - Promise版本
 * @param {Object} options - 上传选项
 * @param {String} options.url - 上传地址
 * @param {String} options.filePath - 文件路径
 * @param {String} options.name - 文件对应的 key
 * @param {Object} options.formData - 附加的表单数据
 * @param {Function} options.onProgress - 上传进度回调
 * @returns {Promise} 上传结果Promise
 */
export const uploadFilePromise = (options) => {
  const token = uni.getStorageSync('token')
  const baseUrl = currentConfig.apiUrl
  
  return new Promise((resolve, reject) => {
    const uploadTask = uni.uploadFile({
      url: `${baseUrl}${options.url}`,
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData || {},
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          // 尝试解析返回的JSON数据
          const data = JSON.parse(res.data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data)
          } else {
            reject(data || { message: '上传失败' })
          }
        } catch (error) {
          reject({ message: '解析响应数据失败' })
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
    
    // 监听上传进度
    if (options.onProgress && uploadTask) {
      uploadTask.onProgressUpdate((res) => {
        options.onProgress(res.progress)
      })
    }
  })
}

/**
 * 通用文件上传函数 - 回调版本（兼容旧代码）
 * @param {Object} options 上传选项
 * @param {string} options.filePath 文件路径
 * @param {string} options.type 文件类型 (image/audio/file)
 * @param {string} options.token 用户token
 * @param {Function} options.onSuccess 上传成功回调
 * @param {Function} options.onError 上传失败回调
 * @param {Function} options.onComplete 上传完成回调
 */
export const uploadFile = (options) => {
  uni.showLoading({ title: '上传中...' })
  
  const token = options.token || uni.getStorageSync('token')
  
  uni.uploadFile({
    url: currentConfig.apiUrl + '/api/chats/upload',
    filePath: options.filePath,
    name: 'file',
    header: {
      'Authorization': `Bearer ${token}`
    },
    formData: {
      type: options.type
    },
    success: (res) => {
      console.log('Upload response:', res)
      
      try {
        const result = JSON.parse(res.data)
        if (res.statusCode === 201 || res.statusCode === 200) {
          if (result.status === 'success') {
            // 兼容处理：检查是否有file字段，如果有则使用file，否则使用整个result.data
            const fileData = result.data?.file || result.data
            if (fileData) {
              options.onSuccess?.(fileData)
            } else {
              console.error('Invalid response format:', result)
              options.onError?.('服务器返回数据格式错误')
            }
          } else {
            console.error('Upload failed with status:', result.status)
            options.onError?.(result.message || '上传失败')
          }
        } else {
          console.error('Upload failed with status code:', res.statusCode)
          options.onError?.(`上传失败 (${res.statusCode})`)
        }
      } catch (parseError) {
        console.error('Parse response error:', parseError)
        options.onError?.('解析响应数据失败')
      }
    },
    fail: (error) => {
      console.error('Upload request failed:', error)
      options.onError?.('上传失败')
    },
    complete: () => {
      uni.hideLoading()
      options.onComplete?.()
    }
  })
}

/**
 * 上传头像
 * @param {String} filePath - 图片文件路径
 * @param {Function} onProgress - 上传进度回调
 * @returns {Promise} 上传结果Promise
 */
export const uploadAvatar = (filePath, onProgress) => {
  return uploadFilePromise({
    url: '/api/users/avatar',
    filePath,
    name: 'avatar',
    onProgress
  })
}

/**
 * 上传聊天文件
 * @param {String} filePath - 文件路径
 * @param {String} type - 文件类型 (image/audio/file)
 * @param {Function} onProgress - 上传进度回调
 * @returns {Promise} 上传结果Promise
 */
export const uploadChatFile = (filePath, type, onProgress) => {
  return uploadFilePromise({
    url: '/api/chats/upload',
    filePath,
    name: 'file',
    formData: { type },
    onProgress
  })
}

/**
 * 选择并上传图片
 * @param {Object} options - 选项
 * @param {String} options.count - 最多可以选择的图片张数，默认1
 * @param {Array} options.sizeType - original 原图，compressed 压缩图，默认二者都有
 * @param {Array} options.sourceType - album 从相册选图，camera 使用相机，默认二者都有
 * @param {Function} options.onProgress - 上传进度回调
 * @param {Function} options.beforeUpload - 上传前的回调，返回false将取消上传
 * @param {String} options.uploadType - 上传类型：'avatar'或'chat'，默认'avatar'
 * @param {String} options.fileType - 文件类型，当uploadType为'chat'时使用，默认'image'
 * @returns {Promise} 上传结果Promise
 */
export const chooseAndUploadImage = (options = {}) => {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: options.count || 1,
      sizeType: options.sizeType || ['original', 'compressed'],
      sourceType: options.sourceType || ['album', 'camera'],
      success: async (res) => {
        try {
          const tempFilePath = res.tempFilePaths[0]
          
          // 上传前回调
          if (options.beforeUpload && options.beforeUpload(tempFilePath) === false) {
            return reject({ message: '上传已取消' })
          }
          
          // 根据上传类型选择不同的上传方法
          let result
          if (options.uploadType === 'chat') {
            result = await uploadChatFile(tempFilePath, options.fileType || 'image', options.onProgress)
          } else {
            result = await uploadAvatar(tempFilePath, options.onProgress)
          }
          
          resolve(result)
        } catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}