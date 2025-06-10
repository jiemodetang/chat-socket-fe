<template>
  <view class="chat-container" >


    <!-- 聊天消息列表 -->
    <scroll-view 
      scroll-y 
      class="message-list" 
      :scroll-top="scrollTop" 
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      :enhanced="true"
      :show-scrollbar="false"
      @scroll="handleScroll"
    >
    <!-- 
        @scrolltolower="loadMoreMessages" 
      refresher-enabled 
    :refresher-triggered="isRefreshing"
    @refresherrefresh="onRefresh" -->
      <view v-if="isLoadingMore" class="loading-more">
        <text>加载更多...</text>
      </view>

      <view v-if="messages.length === 0 " class="empty-state">
        <text class="empty-text">暂无消息，开始聊天吧</text>
      </view>

      <view v-else>
        <view v-for="(message, index) in messages" :key="message._id" :id="`msg-${message._id}`" class="message-item"
          :class="{ 'message-mine': isSelfMessage(message) }">
          <!-- 日期分割线 -->
          <view v-if="showDateDivider(message, index)" class="date-divider">
            <text>{{ formatDate(message.createdAt) }}</text>
          </view>

          <!-- 消息气泡 -->
          <view class="message-bubble" :class="{ 'self-message': isSelfMessage(message) }">
            <!-- 头像 -->
            <image v-if="!isSelfMessage(message)" class="avatar"
              :src="getSenderAvatar(message)" mode="aspectFill"></image>

            <!-- 消息内容 -->
            <view class="message-content">
              <!-- 发送者名称 -->
              <text v-if="isGroupChat && !isSelfMessage(message)" class="sender-name">{{ getSenderName(message) }}</text>

              <!-- 消息内容区域 -->
              <view class="message-text" :class="{ 'self-message-text': isSelfMessage(message) }">
                <!-- 文本消息 -->
                <text v-if="message.messageType === 'text'">{{ message.content }}</text>

                <!-- 图片消息 -->
                <image v-else-if="message.messageType === 'image'" :src="message.fileUrl" mode="widthFix"
                  class="message-image" @click="previewImage(message.fileUrl)"></image>

                <!-- 音频消息 -->
                <view v-else-if="message.messageType === 'audio'" class="audio-message" @click="playAudio(message)">
                  <view class="audio-icon">
                    <u-icon :name="isPlaying(message._id) ? 'pause' : 'play-right'" size="24" :color="isSelfMessage(message) ? '#fff' : '#666'"></u-icon>
                  </view>
                  <view class="audio-wave" v-if="isPlaying(message._id)">
                    <view class="wave-bar"></view>
                    <view class="wave-bar"></view>
                    <view class="wave-bar"></view>
                  </view>
                  <text class="audio-duration">{{ formatDuration(message.duration) }}″</text>
                </view>

                <!-- 文件消息 -->
                <view v-else-if="message.messageType === 'file'" class="file-message">
                  <view class="file-icon">
                    <text class="iconfont icon-file"></text>
                  </view>
                  <view class="file-info">
                    <text class="file-name">{{ message.content }}</text>
                    <text class="file-size">{{ formatFileSize(message.fileSize) }}</text>
                  </view>
                  <button class="download-btn" @click="downloadFile(message)">下载</button>
                </view>
              </view>

              <!-- 消息状态 -->
              <view class="message-status">
                <text class="status-time">{{ formatTime(message.createdAt) }}</text>
                <text v-if="message.readBy && message.readBy.length > 0" class="read-status">
                  {{ getReadStatus(message) }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 输入框区域 -->
    <view class="input-area">
      <view class="input-wrapper">
        <!-- 录音按钮 -->
        <view v-if="isRecorderSupported" 
          class="voice-btn" 
          @touchstart.prevent="startRecording" 
          @touchend.prevent="stopRecording" 
          @touchcancel.prevent="cancelRecording"
          @touchmove.prevent="handleTouchMove">
          <u-icon name="mic" size="24" color="#666"></u-icon>
        </view>

        <textarea 
          class="message-input" 
          v-model="messageText" 
          placeholder="输入消息..." 
          :adjust-position="false"
          :cursor-spacing="20" 
          :show-confirm-bar="false" 
          :auto-height="false"
          :maxlength="-1" 
          @confirm="sendMessage"
          @focus="handleInputFocus" 
          @blur="handleInputBlur" 
          @input="handleTyping"
        />

        <!-- 加号按钮 -->
        <view class="plus-btn" @click="showActionSheet">
          <u-icon name="plus" size="24" color="#666"></u-icon>
        </view>

        <view class="send-btn" :class="{ 'active': canSend }" @click="sendMessage">
          <text>发送</text>
        </view>
      </view>
    </view>

    <!-- 录音提示 -->
 
  </view>
  <u-popup :show="showRecordingTip" mode="center" :closeable="false">
      <view class="recording-tip">
        <view class="recording-icon">
          <u-icon name="mic" size="48" color="#fff"></u-icon>
        </view>
        <text class="recording-text">{{ recordingTipText }}</text>
      </view>
    </u-popup>

    <!-- 底部弹出菜单 -->
    <u-popup :show="showPopup" mode="bottom" @close="showPopup = false" :safe-area-inset-bottom="true">
      <view class="popup-content">
        <view class="popup-grid">
          <view class="grid-item" @click="chooseImage">
            <view class="grid-item-icon">
              <u-icon name="photo" size="32" color="#666"></u-icon>
            </view>
            <text class="grid-item-text">相册</text>
          </view>
          <view class="grid-item" @click="takePhoto">
            <view class="grid-item-icon">
              <u-icon name="camera" size="32" color="#666"></u-icon>
            </view>
            <text class="grid-item-text">拍摄</text>
          </view>
          <view class="grid-item" @click="chooseFile">
            <view class="grid-item-icon">
              <u-icon name="file-text" size="32" color="#666"></u-icon>
            </view>
            <text class="grid-item-text">文件</text>
          </view>
        </view>
      </view>
    </u-popup>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useStore } from 'vuex'
import { onLoad } from '@dcloudio/uni-app'
import { currentConfig } from '../../config'
import { useWebSocket } from '@/composables/useWebSocket'
import { uploadFile } from '@/utils/upload'

const store = useStore()
const {
  initWebSocket,
  sendMessage: sendWebSocketMessage,
  sendTypingStatus,
  sendStopTypingStatus,
  markMessageAsRead,
  isConnected,
  onlineUsers,
  currentUser: wsCurrentUser,
  getTypingUsers,
  getUnreadMessageCount
} = useWebSocket()

const chatId = ref('')
const messageText = ref('')
const isRefreshing = ref(false)
const isLoadingMore = ref(false)
const scrollTop = ref(0)
const scrollIntoView = ref('')
const isKeyboardShow = ref(false)
const showPopup = ref(false)
const showRecordingTip = ref(false)
const recordingTipText = ref('按住说话')
const recorderManager = ref(null)
const tempFilePath = ref('')
const isRecorderSupported = ref(false)
const isScrolledToBottom = ref(true)

// 获取当前用户
const currentUser = computed(() => {
  const user = store.getters.currentUser;
  if (!user || !user._id) {
    console.warn('Current user is not properly initialized');
    return null;
  }
  return user;
})

// 获取当前聊天的消息
const messages = computed(() => store.getters.currentChatMessages)

// 判断是否为群聊
const isGroupChat = computed(() => {
  const chat = store.state.chats.find(c => c._id === chatId.value)
  return chat ? chat.isGroupChat : false
})

// 判断是否可以发送消息
const canSend = computed(() => messageText.value.trim().length > 0)

// 设置聊天标题
const setChatTitle = (chat) => {
  if (!chat) return
  
  let title = ''
  if (chat.isGroupChat) {
    title = chat.chatName || '群聊'
  } else {
    // 在单聊中，显示对方的名称
    const currentUserEmail = store.getters.currentUser?.email
    const otherUser = chat.users.find(u => u.email !== currentUserEmail)
    title = otherUser ? otherUser.username : '未知用户'
  }
  
  // 设置导航栏标题
  uni.setNavigationBarTitle({
    title: title
  })
}

// 获取聊天消息
const fetchMessages = async () => {
  if (!chatId.value) return
  
  try {
    isLoadingMore.value = true
    const result = await store.dispatch('fetchMessages', chatId.value)
    if (!result.success) {
      throw new Error('获取消息失败')
    }
    
    // 标记消息为已读
    store.commit('CLEAR_UNREAD', chatId.value)
    markMessagesAsRead()
    
    // 通过socket通知服务器消息已读
    if (messages.value && currentUser.value) {
      messages.value.forEach(msg => {
        if (msg.readBy && !msg.readBy.includes(currentUser.value._id)) {
          markMessageAsRead(chatId.value, msg._id)
        }
      })
    }
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    uni.showToast({
      title: '获取消息失败',
      icon: 'none'
    })
  } finally {
    isLoadingMore.value = false
  }
}

// 加载更多消息
const loadMoreMessages = async () => {
  if (isLoadingMore.value) return
  
  try {
    isLoadingMore.value = true
    const result = await store.dispatch('loadMoreMessages', chatId.value)
    if (!result.success) {
      throw new Error('加载更多消息失败')
    }
  } catch (error) {
    console.error('Failed to load more messages:', error)
    uni.showToast({
      title: '加载更多消息失败',
      icon: 'none'
    })
  } finally {
    isLoadingMore.value = false
  }
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  try {
    await fetchMessages()
  } finally {
    isRefreshing.value = false
  }
}

// 页面加载时获取聊天ID
onLoad((option) => {
  if (option.id) {
    chatId.value = option.id
    store.commit('SET_CURRENT_CHAT', option.id)

    // 设置导航栏标题
    const chat = store.state.chats.find(c => c._id === option.id)
    if (chat) {
      setChatTitle(chat)
    }

    // 获取聊天消息
    fetchMessages()
  }
})

// 监听当前聊天变化
watch(() => store.state.currentChat, (newChatId) => {
  if (newChatId && newChatId !== chatId.value) {
    chatId.value = newChatId
    fetchMessages()

    // 设置导航栏标题
    const chat = store.state.chats.find(c => c._id === newChatId)
    if (chat) {
      setChatTitle(chat)
    }
  }
})

// 监听消息列表变化，自动滚动到底部
watch(() => messages.value?.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}, { immediate: true })

// 检查是否支持录音功能
const checkRecorderSupport = () => {
  // #ifdef APP-PLUS || MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
  isRecorderSupported.value = true
  // #endif
  
  // #ifdef H5
  isRecorderSupported.value = false
  // #endif
}

// 开始录音
const startRecording = () => {
  if (!isRecorderSupported.value) {
    uni.showToast({
      title: '当前平台不支持录音功能',
      icon: 'none'
    })
    return
  }

  showRecordingTip.value = true
  recordingTipText.value = '松开结束'

  // 开始录音
  recorderManager.value.start({
    duration: 60000, // 最长录音时间，单位ms
    sampleRate: 44100,
    numberOfChannels: 1,
    encodeBitRate: 192000,
    format: 'mp3'
  })
}

// 停止录音
const stopRecording = () => {
  if (!showRecordingTip.value) return
  
  showRecordingTip.value = false
  recordingTipText.value = '按住说话'
  
  // 停止录音
  recorderManager.value.stop()
}

// 取消录音
const cancelRecording = () => {
  if (!showRecordingTip.value) return
  
  showRecordingTip.value = false
  recordingTipText.value = '按住说话'
  
  // 停止录音
  recorderManager.value.stop()
  
  uni.showToast({
    title: '已取消录音',
    icon: 'none'
  })
}

// 初始化录音管理器
const initRecorderManager = () => {
  if (!isRecorderSupported.value) {
    console.log('当前平台不支持录音功能')
    return
  }

  try {
    // #ifdef APP-PLUS || MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
    recorderManager.value = uni.getRecorderManager()
    
    // 监听录音开始事件
    recorderManager.value.onStart(() => {
      console.log('录音开始')
    })
    
    // 监听录音结束事件
    recorderManager.value.onStop((res) => {
      console.log('录音结束:', res)
      if (res.duration < 1000) {
        uni.showToast({
          title: '录音时间太短',
          icon: 'none'
        })
        return
      }
      
      tempFilePath.value = res.tempFilePath
      // 上传音频文件，并传入录音时长
      uploadAudio(res.tempFilePath, res.duration)
    })

    // 监听录音错误事件
    recorderManager.value.onError((res) => {
      console.error('录音错误:', res)
      uni.showToast({
        title: '录音失败',
        icon: 'none'
      })
      showRecordingTip.value = false
    })

    // 监听录音帧数据
    recorderManager.value.onFrameRecorded((res) => {
      const { frameBuffer, isLastFrame } = res
      console.log('录音帧数据:', frameBuffer, isLastFrame)
    })
    // #endif
  } catch (error) {
    console.error('初始化录音管理器失败:', error)
  }
}

// 页面加载完成
onMounted(() => {
  // 检查是否已登录

  if (!store.getters.isAuthenticated || !store.getters.currentUser?._id) {
    uni.redirectTo({
      url: '/pages/login/index'
    });
    return;
  }
  
  // 初始化WebSocket连接
  initWebSocket(store.state.token);
  
  // 检查录音支持
  checkRecorderSupport();
  // 初始化录音管理器
  initRecorderManager();
  
  // 标记所有消息为已读
  if (chatId.value) {
    store.commit('CLEAR_UNREAD', chatId.value);
    markMessagesAsRead();
  }
})

// 页面卸载
onUnmounted(() => {
  // 清除当前聊天
  store.commit('SET_CURRENT_CHAT', null)
})

// 发送消息
const sendMessage = async () => {
  if (!messageText.value.trim() || !chatId.value) return
  
  const content = messageText.value.trim()
  messageText.value = ''
  
  try {
    // 发送消息到WebSocket
    sendWebSocketMessage(chatId.value, content, 'text')
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    console.error('Failed to send message:', error)
    uni.showToast({
      title: '发送消息失败',
      icon: 'none'
    })
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messages.value && messages.value.length > 0) {
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage && lastMessage._id) {
        scrollIntoView.value = `msg-${lastMessage._id}`
        // 使用一个较大的 scrollTop 值确保滚动到底部
        scrollTop.value = 999999
        // 添加多个延时，确保在不同情况下都能正确滚动
        setTimeout(() => {
          scrollTop.value = 999999
        }, 100)
        setTimeout(() => {
          scrollTop.value = 999999
        }, 300)
        setTimeout(() => {
          scrollTop.value = 999999
        }, 500)
      }
    }
  })
}

// 处理输入框获取焦点
const handleInputFocus = () => {
  isKeyboardShow.value = true
  nextTick(() => {
    scrollToBottom()
  })
}

// 处理输入框失去焦点
const handleInputBlur = () => {
  isKeyboardShow.value = false
}

// 判断是否显示日期分割线
const showDateDivider = (message, index) => {
  if (index === 0) return true

  const currentDate = new Date(message.createdAt)
  const prevDate = new Date(messages.value[index - 1].createdAt)

  return (
    currentDate.getDate() !== prevDate.getDate() ||
    currentDate.getMonth() !== prevDate.getMonth() ||
    currentDate.getFullYear() !== prevDate.getFullYear()
  )
}

// 判断是否是自己发送的消息
const isSelfMessage = (message) => {
  if (!message || !message.sender || !currentUser.value || !currentUser.value._id) return false;
  return message.sender._id === currentUser.value._id;
}

// 获取发送者头像
const getSenderAvatar = (message) => {
  if (!message || !message.sender) return '/static/default-avatar.png'
  
  // 如果是群聊，显示发送者头像
  if (isGroupChat.value) {
    return message.sender.avatar || '/static/default-avatar.png'
  }
  
  // 如果是单聊，显示对方头像
  const currentUserEmail = store.getters.currentUser?.email
  const otherUser = store.state.chats.find(c => c._id === chatId.value)?.users.find(u => u.email !== currentUserEmail)
  return otherUser?.avatar || '/static/default-avatar.png'
}

// 获取发送者名称
const getSenderName = (message) => {
  if (!message || !message.sender) return '未知用户'
  
  // 如果是群聊，显示发送者名称
  if (isGroupChat.value) {
    return message.sender.username || '未知用户'
  }
  
  // 如果是单聊，显示对方名称
  const currentUserEmail = store.getters.currentUser?.email
  const otherUser = store.state.chats.find(c => c._id === chatId.value)?.users.find(u => u.email !== currentUserEmail)
  return otherUser?.username || '未知用户'
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return ''

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
    return '今天'
  }

  // 如果是昨天
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return '昨天'
  }

  // 其他日期
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 预览图片
const previewImage = (url) => {
  uni.previewImage({
    urls: [url],
    current: url
  })
}

// 下载文件
const downloadFile = async (message) => {
  try {
    const res = await uni.downloadFile({
      url: message.fileUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          uni.openDocument({
            filePath: res.tempFilePath,
            success: () => {
              console.log('打开文档成功')
            }
          })
        }
      }
    })
  } catch (error) {
    uni.showToast({
      title: '下载失败',
      icon: 'none'
    })
  }
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (!size) return '未知大小'
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index++
  }
  return `${size.toFixed(2)} ${units[index]}`
}

// 处理输入状态
const handleTyping = () => {
  if (messageText.value.trim().length > 0) {
    sendTypingStatus(chatId.value)
  } else {
    sendStopTypingStatus(chatId.value)
  }
}

// 显示底部菜单
const showActionSheet = () => {
  showPopup.value = true
}

// 拍照功能
const takePhoto = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      await uploadImage(tempFilePath)
      showPopup.value = false
    }
  })
}

// 修改选择图片函数
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      await uploadImage(tempFilePath)
      showPopup.value = false
    }
  })
}

// 解码文件名
const decodeFileName = (fileName) => {
  try {
    // 尝试解码文件名
    return decodeURIComponent(escape(fileName))
  } catch (error) {
    console.error('Failed to decode filename:', error)
    return fileName
  }
}

// 上传图片
const uploadImage = async (filePath) => {
  uploadFile({
    filePath,
    type: 'image',
    token: store.state.token,
    onSuccess: (file) => {
      // 拼接完整的图片URL并解码文件名
      const fullUrl = currentConfig.apiUrl + file.url
      const decodedFileName = decodeFileName(file.fileName)
      sendWebSocketMessage(chatId.value, decodedFileName || '图片', 'image', fullUrl)
    },
    onError: (error) => {
      uni.showToast({
        title: error,
        icon: 'none'
      })
    }
  })
}

// 上传音频文件
const uploadAudio = async (filePath, duration) => {
  uploadFile({
    filePath,
    type: 'audio',
    token: store.state.token,
    onSuccess: (file) => {
      // 拼接完整的音频URL并解码文件名
      const fullUrl = currentConfig.apiUrl + file.url
      const decodedFileName = decodeFileName(file.fileName)
      // 发送音频消息，包含录音时长
      sendWebSocketMessage(chatId.value, decodedFileName || '语音消息', 'audio', fullUrl, duration)
    },
    onError: (error) => {
      uni.showToast({
        title: error,
        icon: 'none'
      })
    }
  })
}

const chooseFile = () => {
  // #ifdef APP-PLUS || H5
  uni.chooseFile({
    count: 1,
    type: 'all',
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      const fileInfo = res.tempFiles[0]
      
      uploadFile({
        filePath: tempFilePath,
        type: 'file',
        token: store.state.token,
        onSuccess: (file) => {
          // 拼接完整的文件URL并解码文件名
          const fullUrl = currentConfig.apiUrl + file.url
          const decodedFileName = decodeFileName(file.fileName)
          sendWebSocketMessage(chatId.value, decodedFileName || '文件消息', 'file', fullUrl, fileInfo.size)
        },
        onError: (error) => {
          uni.showToast({
            title: error,
            icon: 'none'
          })
        }
      })
      showPopup.value = false
    }
  })
  // #endif
  
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
  uni.showToast({
    title: '小程序暂不支持选择文件',
    icon: 'none'
  })
  // #endif
}

// 音频播放相关
const audioContext = ref(null)
const currentPlayingId = ref(null)

// 初始化音频上下文
const initAudioContext = () => {
  audioContext.value = uni.createInnerAudioContext()
  audioContext.value.onEnded(() => {
    currentPlayingId.value = null
  })
  audioContext.value.onError((res) => {
    console.error('音频播放错误:', res)
    uni.showToast({
      title: '音频播放失败',
      icon: 'none'
    })
    currentPlayingId.value = null
  })
}

// 判断是否正在播放
const isPlaying = (messageId) => {
  return currentPlayingId.value === messageId
}

// 播放音频
const playAudio = (message) => {
  if (!audioContext.value) {
    initAudioContext()
  }

  if (isPlaying(message._id)) {
    audioContext.value.stop()
    currentPlayingId.value = null
  } else {
    audioContext.value.src = message.fileUrl
    audioContext.value.play()
    currentPlayingId.value = message._id
  }
}

// 格式化音频时长
const formatDuration = (duration) => {
  if (!duration) return '0'
  return Math.ceil(duration / 1000)
}

// 在组件挂载时初始化音频上下文
onMounted(() => {
  initAudioContext()
})

// 在组件卸载时销毁音频上下文
onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.destroy()
  }
})

// 处理滚动事件
const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.detail
  // 判断是否滚动到底部
  isScrolledToBottom.value = scrollHeight - scrollTop - clientHeight < 50

}

// 获取消息已读状态文本
const getReadStatus = (message) => {
  if (!message || !message.readBy || !currentUser.value || !currentUser.value._id) return '';
  
  const readCount = message.readBy.length;
  const chat = store.state.chats.find(c => c._id === chatId.value);
  const totalCount = isGroupChat.value ? (chat?.users?.length || 0) : 2;
  
  if (isGroupChat.value) {
    return `已读 ${readCount}/${totalCount}`;
  } else {
    return readCount > 1 ? '已读' : '';
  }
}

// 标记消息为已读
const markMessagesAsRead = () => {
  if (!messages.value || !currentUser.value || !currentUser.value._id || !chatId.value) return;
  
  messages.value.forEach(msg => {
    if (msg && msg.readBy && !msg.readBy.includes(currentUser.value._id)) {
      markMessageAsRead(chatId.value, msg._id);
    }
  });
}

// 处理触摸移动
const handleTouchMove = (e) => {
  if (!showRecordingTip.value) return
  
  const touch = e.touches[0]
  const startY = e.target.offsetTop
  const moveY = touch.clientY
  
  // 如果上滑超过50px，显示"松开手指，取消发送"
  if (startY - moveY > 50) {
    recordingTipText.value = '松开手指，取消发送'
  } else {
    recordingTipText.value = '松开结束'
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  position: relative;
  height: calc(100vh - 176rpx);
  overflow: hidden;
}

.message-list {
  flex: 1;
  padding: 20rpx 0;
  background: #f5f7fa;
  height:100%;
  overflow-y: auto;
  position: relative;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-more {
  text-align: center;
  padding: 20rpx 0;
  color: #999;
  font-size: 24rpx;
}

.date-divider {
  display: flex;
  justify-content: center;
  margin: 20rpx 0;
}

.date-divider text {
  font-size: 24rpx;
  color: #999;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.message-item {
  margin-bottom: 20rpx;
  padding: 0 20rpx;
}

.message-mine {
  flex-direction: row-reverse;
}

.message-bubble {
  display: flex;
  align-items: flex-start;
  max-width: 70%;
  margin-bottom: 16rpx;
}

.message-bubble.self-message {
  flex-direction: row-reverse;
  margin-left: auto;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 8rpx;
  background-color: #f0f0f0;
  margin: 0 16rpx;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 104rpx);
}

.sender-name {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
  padding-left: 4rpx;
}

.message-text {
  background-color: #ffffff;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  word-break: break-all;
  word-wrap: break-word;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  line-height: 1.4;
}

.message-mine .message-text {
  background-color: var(--primary-color);
  color: #ffffff;
}

.message-image {
  max-width: 400rpx;
  max-height: 400rpx;
  min-width: 200rpx;
  min-height: 200rpx;
  border-radius: 8rpx;
  width: auto;
  height: auto;
  display: block;
  margin: 0;
  padding: 0;
  object-fit: contain;
}

.message-mine .message-text .message-image {
  margin: 0;
  padding: 0;
  max-width: 400rpx;
  max-height: 400rpx;
  min-width: 200rpx;
  min-height: 200rpx;
  width: auto;
  height: auto;
  object-fit: contain;
}

.file-message {
  display: flex;
  align-items: center;
  background-color: #f8f8f8;
  padding: 16rpx;
  border-radius: 8rpx;
  max-width: 100%;
}

.file-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.file-name {
  font-size: 26rpx;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

.download-btn {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  background-color: var(--primary-color);
  color: #ffffff;
  border-radius: 6rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.message-status {
  display: flex;
  align-items: center;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
  justify-content: flex-end;
}

.read-status {
  margin-left: 12rpx;
  font-size: 20rpx;
}

.message-mine .message-status {
  justify-content: flex-end;
}

.message-mine .sender-name {
  text-align: right;
  padding-right: 4rpx;
}

.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8rpx 20rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e5e5;
  z-index: 100;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  height: 88rpx;
  box-sizing: border-box;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
}

.message-input {
  flex: 1;
  background-color: #f5f5f5;
  border-radius: 28rpx;
  padding: 8rpx 20rpx;
  font-size: 26rpx;
  height: 52rpx;
  line-height: 36rpx;
  overflow-y: auto;
}

.send-btn {
  width: 80rpx;
  height: 52rpx;
  background-color: #e0e0e0;
  color: #ffffff;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  transition: all 0.3s ease;
}

.send-btn.active {
  background-color: var(--primary-color);
  transform: scale(1.05);
}

.plus-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.voice-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.popup-content {
  padding: 30rpx;
  background-color: #f8f8f8;
  border-radius: 24rpx 24rpx 0 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 101;
}

.popup-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 0;
}

.grid-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}

.grid-item-icon {
  width: 100rpx;
  height: 100rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.grid-item-text {
  font-size: 24rpx;
  color: #666;
  margin-top: 10rpx;
}

.recording-tip {
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 12rpx;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 200rpx;
  width: 200rpx;
  justify-content: center;
}

.recording-icon {
  width: 80rpx;
  height: 80rpx;
  background-color: #ff4d4f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
  box-shadow: 0 0 12rpx rgba(255, 77, 79, 0.3);
}

.recording-text {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 500;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
}

.audio-message {
  display: flex;
  align-items: center;
  min-width: 120rpx;
  background-color: #ffffff;
  border-radius: 8rpx;
  cursor: pointer;
}

.audio-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  margin-right: 12rpx;
}

.audio-wave {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-right: 12rpx;
}

.wave-bar {
  width: 4rpx;
  height: 20rpx;
  background-color: currentColor;
  border-radius: 2rpx;
  animation: wave 1s infinite ease-in-out;
}

.wave-bar:nth-child(2) {
  animation-delay: 0.2s;
}

.wave-bar:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes wave {
  0%, 100% {
    height: 20rpx;
  }
  50% {
    height: 10rpx;
  }
}

.audio-duration {
  font-size: 22rpx;
  color: currentColor;
}

.message-mine .audio-message {
  background-color: var(--primary-color);
  color: #ffffff;
}

.new-message-notification {
  position: fixed;
  top: 20rpx;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 16rpx 32rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>