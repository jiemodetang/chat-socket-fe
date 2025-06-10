import { currentConfig } from '../config'

/**
 * 通用文件上传函数
 * @param {Object} options 上传选项
 * @param {string} options.filePath 文件路径
 * @param {string} options.type 文件类型 (image/audio/file)
 * @param {string} options.token 用户token
 * @param {Function} options.onSuccess 上传成功回调
 * @param {Function} options.onError 上传失败回调
 * @param {Function} options.onComplete 上传完成回调
 */
export const uploadFile = ({
  filePath,
  type,
  token,
  onSuccess,
  onError,
  onComplete
}) => {
  uni.showLoading({ title: '上传中...' })
  
  uni.uploadFile({
    url: currentConfig.apiUrl + '/api/chats/upload',
    filePath: filePath,
    name: 'file',
    header: {
      'Authorization': `Bearer ${token}`
    },
    formData: {
      type: type
    },
    success: (res) => {
      console.log('Upload response:', res)
      
      // 检查状态码是否为201（创建成功）
      if (res.statusCode === 201) {
        try {
          const result = JSON.parse(res.data)
          if (result.status === 'success' && result.data?.file) {
            onSuccess?.(result.data.file)
          } else {
            console.error('Invalid response format:', result)
            onError?.('服务器返回数据格式错误')
          }
        } catch (parseError) {
          console.error('Parse response error:', parseError)
          onError?.('解析响应数据失败')
        }
      } else {
        console.error('Upload failed with status:', res.statusCode)
        onError?.(`上传失败 (${res.statusCode})`)
      }
    },
    fail: (error) => {
      console.error('Upload request failed:', error)
      onError?.('上传失败')
    },
    complete: () => {
      uni.hideLoading()
      onComplete?.()
    }
  })
} 