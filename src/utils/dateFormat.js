/**
 * 格式化日期
 * @param {string|number|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return ''

  try {
    const date = new Date(timestamp)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    // 如果是今天
    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      // 今天只显示时间
      return formatTime(timestamp)
    }

    // 如果是昨天
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return '昨天'
    }
    
    // 如果是本周的消息
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const dayDiff = Math.floor((now - date) / (24 * 60 * 60 * 1000))
    if (dayDiff < 7) {
      return `周${weekDays[date.getDay()]}`
    }

    // 其他日期
    return `${date.getMonth() + 1}月${date.getDate()}日`
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * 格式化时间
 * @param {string|number|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return ''

  try {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${hours}:${minutes}`
  } catch (error) {
    console.error('Error formatting time:', error)
    return ''
  }
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