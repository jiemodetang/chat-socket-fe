/**
 * 格式化日期
 * @param {string|number|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  // 转换为本地时间
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)

  // 如果是今天
  if (
    localDate.getDate() === now.getDate() &&
    localDate.getMonth() === now.getMonth() &&
    localDate.getFullYear() === now.getFullYear()
  ) {
    return '今天'
  }

  // 如果是昨天
  if (
    localDate.getDate() === yesterday.getDate() &&
    localDate.getMonth() === yesterday.getMonth() &&
    localDate.getFullYear() === yesterday.getFullYear()
  ) {
    return '昨天'
  }

  // 其他日期
  return `${localDate.getFullYear()}年${localDate.getMonth() + 1}月${localDate.getDate()}日`
}

/**
 * 格式化时间
 * @param {string|number|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  // 转换为本地时间
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  
  const hours = localDate.getHours().toString().padStart(2, '0')
  const minutes = localDate.getMinutes().toString().padStart(2, '0')
  
  return `${hours}:${minutes}`
}

/**
 * 格式化音频时长
 * @param {number} duration - 音频时长（毫秒）
 * @returns {string} 格式化后的时长
 */
export const formatDuration = (duration) => {
  if (!duration) return '0'
  return Math.ceil(duration / 1000)
}

/**
 * 格式化文件大小
 * @param {number} size - 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (size) => {
  if (!size) return '未知大小'
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let fileSize = size

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }

  return `${fileSize.toFixed(2)} ${units[index]}`
} 