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
      :bounces="false"
      @scroll="handleScroll"
    >
   
      <view class="message-wrapper">
        <view v-if="messages.length === 0" class="empty-state">
          <text class="empty-text">暂无消息，开始聊天吧</text>
        </view>

        <view v-else class="messages-container">
          <template v-for="(message, index) in messages" :key="message._id">
            <!-- 日期分割线 -->
            <view v-if="showDateDivider(message, index)" class="date-divider">
              <text>{{ formatDate(message.createdAt) }}</text>
            </view>

            <!-- 消息项 -->
            <view :id="`msg-${message._id}`" class="message-item" 
              :class="{ 'message-mine': isSelfMessage(message), 'message-other': !isSelfMessage(message) }">
              <!-- 消息内容 -->
              <view class="message-bubble">
                <!-- 头像 -->
                <image class="avatar" :src="getSenderAvatar(message)" mode="aspectFill"></image>

                <!-- 消息内容区域 -->
                <view class="message-content">
                  <!-- 发送者名称 -->
                  <text v-if="isGroupChat && !isSelfMessage(message)" class="sender-name">
                    {{ getSenderName(message) }}
                  </text>

                  <view class="message-text" :class="{ 'self-message-text': isSelfMessage(message) }">
                    <!-- 文本消息 -->
                    <text v-if="message.messageType === 'text'" class="text-content">{{ message.content }}</text>

                    <!-- 通话记录 -->
                    <view v-else-if="message.messageType === 'call'" class="call-record">
                      <view class="call-record-content">
                        <u-icon :name="message.content.includes('视频') ? 'movie' : 'phone-fill'" size="20" :color="isSelfMessage(message) ? '#fff' : '#666'"></u-icon>
                        <text class="call-text">{{ message.content }}</text>
                      </view>
                    </view>

                    <!-- 图片消息 -->
                    <view v-else-if="message.messageType === 'image'" class="image-container">
                      <image :src="message.fileUrl" 
                        mode="widthFix" class="message-image" @click="previewImage(message.fileUrl)"
                        @load="handleImageLoad"></image>
                    </view>

                    <!-- 音频消息 -->
                    <view v-else-if="message.messageType === 'audio'" class="audio-message" 
                      @click="playAudio(message)">
                      <view class="audio-icon">
                        <u-icon :name="isPlaying(message._id) ? 'pause' : 'play-right'" size="24"
                          :color="isSelfMessage(message) ? '#fff' : '#666'"></u-icon>
                      </view>
                      <view class="audio-wave" v-if="isPlaying(message._id)">
                        <view class="wave-bar"></view>
                        <view class="wave-bar"></view>
                        <view class="wave-bar"></view>
                      </view>
                      <text class="audio-duration">{{ formatDuration(message.duration) }}″</text>
                    </view>

                    <!-- 文件消息 -->
                    <view v-else-if="message.messageType === 'file'" class="file-message" :class="{'self-file-message': isSelfMessage(message)}">
                      <view class="file-icon" :class="getFileIconClass(message.content)">
                        <u-icon :name="getFileIconName(message.content)" size="28" color="#ffffff"></u-icon>
                      </view>
                      <view class="file-info">
                        <text class="file-name" :class="{'self-file-text': isSelfMessage(message)}">{{ message.content }}</text>
                        <text class="file-size" :class="{'self-file-text': isSelfMessage(message)}">{{ formatFileSize(message.fileSize) }}</text>
                      </view>
                      <view class="download-btn-wrapper" @click.stop="downloadFile(message)">
                        <view class="download-btn" :class="{'self-download-btn': isSelfMessage(message)}">
                          <u-icon name="download" size="20" :color="isSelfMessage(message) ? '#1989fa' : '#ffffff'"></u-icon>
                        </view>
                      </view>
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
          </template>
        </view>
      </view>
    </scroll-view>

    <!-- 输入框区域 -->
    <view class="input-area">
      <view class="input-wrapper">
        <!-- 录音组件 -->
        <VoiceRecorder :onAudioRecorded="handleAudioRecorded" />

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
          <!-- 只在单聊中显示语音和视频通话 -->
          <template v-if="!isGroupChat">
            <view class="grid-item" @click="startVoiceCall">
              <view class="grid-item-icon">
                <u-icon name="phone-fill" size="32" color="#666"></u-icon>
              </view>
              <text class="grid-item-text">语音通话</text>
            </view>
            <view class="grid-item" @click="startVideoCall">
              <view class="grid-item-icon">
                <u-icon name="movie" size="32" color="#666"></u-icon>
              </view>
              <text class="grid-item-text">视频通话</text>
            </view>
          </template>
        </view>
      </view>
    </u-popup>


  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useStore } from 'vuex'
import { onLoad } from '@dcloudio/uni-app'
import { currentConfig } from '../../config'
import { useWebSocket } from '@/composables/useWebSocket'
import { chooseAndUploadImage, uploadChatFile } from '@/utils/upload'
import { formatDate, formatTime, formatDuration, formatFileSize } from '@/utils/dateFormat'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import AudioMessage from '@/components/AudioMessage.vue'
import { genTestUserSig } from '@/debug/GenerateTestUserSig.js'
import { loginTUICallKit, startCall as tuiStartCall, onCallEvent, offCallEvent, formatCallDuration } from '@/utils/tuiCallKit'

// 导入TUICallKit插件
let TUICallKit;
try {
  // #ifdef APP-PLUS
  TUICallKit = uni.requireNativePlugin('TencentCloud-TUICallKit');
  uni.$TUICallKit = TUICallKit;
  // #endif
} catch (error) {
  console.error('TUICallKit 插件加载失败:', error);
}

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
    
    // 滚动到底部，使用立即滚动
    scrollToBottom(true)
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    uni.showToast({
      title: '获取消息失败',
      icon: 'none'
    })
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

// 监听消息列表变化
watch(() => messages.value?.length, (newLength, oldLength) => {
  if (newLength > oldLength || !oldLength) {
    nextTick(() => {
     setTimeout(() => {
      scrollToBottom(true)
     }, 300);
    })
  }
}, { immediate: true })

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
  
  // 标记所有消息为已读
  if (chatId.value) {
    store.commit('CLEAR_UNREAD', chatId.value);
    markMessagesAsRead();
  }
  
  // 仅在APP环境下初始化TUICallKit
  // #ifdef APP-PLUS
  // 登录TUICallKit
  loginTUICallKitWrapper();
  
  // 添加通话事件监听
  setupCallEventListeners();
  // #endif
})

// 登录TUICallKit
const loginTUICallKitWrapper = () => {
  if (!currentUser.value || !currentUser.value._id) return;
  loginTUICallKit(currentUser.value, 
    () => { console.log('[TUICallKit] 登录成功'); },
    (err) => { console.error('[TUICallKit] 登录失败:', err); }
  );
}

// 页面卸载
onUnmounted(() => {
  // 清除当前聊天
  store.commit('SET_CURRENT_CHAT', null)
  
  // 仅在APP环境下移除TUICallKit事件监听
  // #ifdef APP-PLUS
  // 移除通话事件监听
  removeCallEventListeners();
  // #endif
})

// 设置通话事件监听
const setupCallEventListeners = () => {
  onCallEvent('onCallEnd', callEndHandler);
  onCallEvent('onUserReject', callRejectedHandler);
  onCallEvent('onUserNoResponse', callNoResponseHandler);
  onCallEvent('onUserLineBusy', callBusyHandler);
  onCallEvent('onCallCancelled', callCancelledHandler);
}

// 防止重复发送通话消息的标志
let callMessageSent = false;
let callMessageTimer = null;

// 重置通话消息状态
const resetCallMessageStatus = () => {
  callMessageSent = false;
  if (callMessageTimer) {
    clearTimeout(callMessageTimer);
    callMessageTimer = null;
  }
};

// 发送通话消息，带防重复机制
const sendCallMessage = (message) => {
  if (callMessageSent || !chatId.value) return;
  
  callMessageSent = true;
  sendWebSocketMessage(chatId.value, message, 'call', {});
  
  // 5秒后重置状态，允许发送新的通话消息
  callMessageTimer = setTimeout(() => {
    resetCallMessageStatus();
  }, 5000);
};

// 通话结束事件处理
const callEndHandler = (res) => {
  console.log('[TUICallKit] 通话结束:', res);
  resetCallMessageStatus(); // 重置状态，确保能发送通话时长
  
  // 发送通话记录消息（仿微信简约风格）
  if (chatId.value && res.code === 0 && res.data && res.data.duration) {
    const duration = Math.floor(res.data.duration / 1000); // 转换为秒
    if (duration > 0) {
      // 使用formatCallDuration函数已经包含"通话时长"前缀
      const durationText = formatCallDuration(duration);
      sendWebSocketMessage(chatId.value, durationText, 'call', {});
    } else {
      sendWebSocketMessage(chatId.value, '通话时长 0秒', 'call', {});
    }
  } else {
    // 通话未接通或异常结束，不发送消息，因为其他事件会处理
  }
};

// 通话被拒绝事件处理
const callRejectedHandler = (res) => {
  console.log('[TUICallKit] 通话被拒绝:', res);
  // 仿微信简约风格
  sendCallMessage('对方已拒绝');
};

// 通话无人接听事件处理
const callNoResponseHandler = (res) => {
  console.log('[TUICallKit] 通话无人接听:', res);
  // 仿微信简约风格
  sendCallMessage('对方无人接听');
};

// 通话忙线事件处理
const callBusyHandler = (res) => {
  console.log('[TUICallKit] 通话忙线:', res);
  // 仿微信简约风格
  sendCallMessage('对方忙线中');
};

// 通话取消事件处理
const callCancelledHandler = (res) => {
  console.log('[TUICallKit] 通话已取消:', res);
  // 仿微信简约风格
  sendCallMessage('已取消');
};

// 发送消息
const sendMessage = async () => {
  if (!messageText.value.trim() || !chatId.value) return
  
  const content = messageText.value.trim()
  messageText.value = ''
  
  try {
    // 发送消息到WebSocket
    sendWebSocketMessage(chatId.value, content, 'text', {})
    
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

// 修改滚动到底部的逻辑
const scrollToBottom = (immediate = false) => {
  if (!messages.value || messages.value.length === 0) return

  nextTick(() => {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage._id) {
      // 先设置滚动到指定消息
      scrollIntoView.value = `msg-${lastMessage._id}`
      
      // 使用 nextTick 确保视图已更新
      nextTick(() => {
        // 设置一个较大的值确保滚动到底部
        scrollTop.value = 999999
        
        // 如果是立即滚动，添加额外的延时确保滚动生效
        if (immediate) {
          setTimeout(() => {
            scrollTop.value = 999999
          }, 50)
        }
      })
    }
  })
}

// 处理输入框获取焦点
const handleInputFocus = () => {
  isKeyboardShow.value = true
  nextTick(() => {
    scrollToBottom(true)
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
  
  // 如果是自己发送的消息，显示自己的头像
  if (isSelfMessage(message)) {
    return currentUser.value?.avatar || '/static/default-avatar.png'
  }
  
  // 如果是群聊中他人发送的消息，显示发送者头像
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

// 预览图片
const previewImage = (url) => {
  uni.previewImage({
    urls: [url],
    current: url
  })
}

// 下载文件
const downloadFile = async (message) => {
  // 防止事件冒泡
  event?.stopPropagation?.();
  
  try {
    // 显示下载提示
    uni.showLoading({
      title: '文件下载中...',
      mask: true
    });
    
    const res = await uni.downloadFile({
      url: message.fileUrl,
      success: (res) => {
        uni.hideLoading();
        if (res.statusCode === 200) {
          // 显示成功提示
          uni.showToast({
            title: '下载成功',
            icon: 'success',
            duration: 1500
          });
          
          setTimeout(() => {
            // 尝试打开文件
            uni.openDocument({
              filePath: res.tempFilePath,
              showMenu: true,
              success: () => {
                console.log('打开文档成功');
              },
              fail: (err) => {
                console.error('打开文档失败', err);
                uni.showToast({
                  title: '无法打开此类型文件',
                  icon: 'none'
                });
              }
            });
          }, 500);
        } else {
          uni.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        uni.hideLoading();
        console.error('下载失败:', err);
        uni.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  } catch (error) {
    uni.hideLoading();
    console.error('文件下载错误:', error);
    uni.showToast({
      title: '下载失败',
      icon: 'none'
    });
  }
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
  // 使用新的上传方法
  uploadChatFile(filePath, 'image', (progress) => {
    console.log('Upload progress:', progress)
  }).then(result => {
    if (result && result.status === 'success') {
      // 检查response格式，兼容两种数据结构
      const fileData = result.data?.file || result.data
      if (fileData) {
        // 构建完整的图片URL并解码文件名
        const fileUrl = fileData.url
        const fullUrl = fileUrl.startsWith('http') ? fileUrl : currentConfig.apiUrl + fileUrl
        const decodedFileName = decodeFileName(fileData.fileName)
        sendWebSocketMessage(chatId.value, decodedFileName || '图片', 'image', {
          fileUrl: fullUrl
        })
      }
    }
  }).catch(error => {
    uni.showToast({
      title: error.message || '上传失败',
      icon: 'none'
    })
  })
}

// 处理录音完成
const handleAudioRecorded = (filePath, duration) => {
  // 使用新的上传方法
  uploadChatFile(filePath, 'audio', (progress) => {
    console.log('Upload progress:', progress)
  }).then(result => {
    if (result && result.status === 'success') {
      // 检查response格式，兼容两种数据结构
      const fileData = result.data?.file || result.data
      if (fileData) {
        // 构建完整的音频URL并解码文件名
        const fileUrl = fileData.url
        const fullUrl = fileUrl.startsWith('http') ? fileUrl : currentConfig.apiUrl + fileUrl
        const decodedFileName = decodeFileName(fileData.fileName)
        // 发送音频消息，duration 已经是毫秒单位
        sendWebSocketMessage(chatId.value, decodedFileName || '语音消息', 'audio', {
          fileUrl: fullUrl,
          duration: duration
        })
      }
    }
  }).catch(error => {
    uni.showToast({
      title: error.message || '上传失败',
      icon: 'none'
    })
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
      
      // 使用新的上传方法
      uploadChatFile(tempFilePath, 'file', (progress) => {
        console.log('Upload progress:', progress)
      }).then(result => {
        if (result && result.status === 'success') {
          // 检查response格式，兼容两种数据结构
          const fileData = result.data?.file || result.data
          if (fileData) {
            // 构建完整的文件URL并解码文件名
            const fileUrl = fileData.url
            const fullUrl = fileUrl.startsWith('http') ? fileUrl : currentConfig.apiUrl + fileUrl
            const decodedFileName = decodeFileName(fileData.fileName)
            
            // 发送消息，包括额外字段
            sendWebSocketMessage(
              chatId.value, 
              decodedFileName || '文件消息', 
              'file', 
              {
                fileUrl: fullUrl,
                fileSize: fileInfo.size || 0,
                fileType: fileData.fileType || '',
                fileExt: fileData.fileName ? fileData.fileName.split('.').pop() : '',
                originalFileName: fileData.fileName || decodedFileName || '文件消息'
              }
            )
          }
        }
      }).catch(error => {
        uni.showToast({
          title: error.message || '上传失败',
          icon: 'none'
        })
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

// 处理滚动事件
const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.detail
  // 判断是否滚动到底部（允许有10px的误差）
  isScrolledToBottom.value = scrollHeight - scrollTop - clientHeight < 20
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

// 处理图片加载完成
const handleImageLoad = () => {
  if (isScrolledToBottom.value) {
    scrollToBottom(true)
  }
}

// 跳转到通话页面
const goToCallPage = (callType = 1) => {
  showPopup.value = false

  // 检查插件是否可用
  if (!uni.$TUICallKit) {
    uni.showToast({
      title: '通话功能仅在APP中可用',
      icon: 'none'
    });
    return;
  }

  // 获取当前聊天对象的用户ID
  const chat = store.state.chats.find(c => c._id === chatId.value)
  if (chat && !chat.isGroupChat) {
    const otherUser = chat.users.find(u => u._id !== currentUser.value._id)
    if (otherUser && otherUser._id && typeof otherUser._id === 'string') {
      console.log('[TUICallKit] 发起通话，目标用户ID:', otherUser._id);
      // 发起通话，callType: 1-语音通话，2-视频通话
      startCall(otherUser._id, callType);
      return;
    } else {
      console.error('[TUICallKit] 无法获取有效的用户ID:', otherUser);
      uni.showToast({
        title: '无法获取有效的用户ID',
        icon: 'none'
      });
      return;
    }
  }

  // 如果是群聊或没找到对方用户ID，提示错误
  uni.showToast({
    title: '暂不支持群聊通话',
    icon: 'none'
  });
}

// 发起语音通话
const startVoiceCall = () => {
  goToCallPage(1); // 1表示语音通话
}

// 发起视频通话
const startVideoCall = () => {
  goToCallPage(2); // 2表示视频通话
}

// 发起通话
const startCall = (targetUserId, callType = 1) => {
  if (!targetUserId || typeof targetUserId !== 'string' || targetUserId === currentUser.value._id) {
    console.error('[TUICallKit] 无效的通话对象ID:', targetUserId);
    uni.showToast({ title: '无效的通话对象', icon: 'none' });
    return;
  }

  // 确保用户ID是字符串类型
  const userId = String(targetUserId).trim();
  
  console.log('[TUICallKit] 开始发起通话，目标用户ID:', userId, '通话类型:', callType);
  
  // 设置默认参数
  const params = {
    roomID: Math.floor(Math.random() * 1000000) + 1,
    strRoomID: String(Date.now()),
    timeout: 30
  };
  
  // 重置通话消息状态，确保能发送新消息
  resetCallMessageStatus();
  
  tuiStartCall(userId, callType, params, (res) => {
    if (res.code === 0) {
      // 仿微信发送简约的通话消息
      const callTypeText = callType === 1 ? '语音通话' : '视频通话';
      sendWebSocketMessage(chatId.value, callTypeText, 'call', {});
    } else {
      console.error('[TUICallKit] 发起通话失败:', res.msg, '用户ID:', userId);
      uni.showToast({
        title: '发起通话失败: ' + res.msg,
        icon: 'none'
      });
    }
  });
}

// 移除通话事件监听
const removeCallEventListeners = () => {
  offCallEvent('onCallEnd', callEndHandler);
  offCallEvent('onUserReject', callRejectedHandler);
  offCallEvent('onUserNoResponse', callNoResponseHandler);
  offCallEvent('onUserLineBusy', callBusyHandler);
  offCallEvent('onCallCancelled', callCancelledHandler);
  
  // 清除定时器
  if (callMessageTimer) {
    clearTimeout(callMessageTimer);
    callMessageTimer = null;
  }
}

// 获取文件图标类
const getFileIconClass = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
    case 'doc':
    case 'docx':
      return 'doc';
    case 'pdf':
      return 'pdf';
    case 'txt':
      return 'txt';
    case 'ppt':
    case 'pptx':
      return 'ppt';
    case 'xls':
    case 'xlsx':
      return 'xls';
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'png':
      return 'png';
    case 'gif':
      return 'gif';
    case 'mp4':
    case 'mp3':
      return 'video';
    default:
      return 'file';
  }
}

// 获取文件图标名称
const getFileIconName = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
    case 'doc':
    case 'docx':
      return 'file-text';
    case 'pdf':
      return 'file-text';
    case 'txt':
      return 'file-text';
    case 'ppt':
    case 'pptx':
      return 'file-text';
    case 'xls':
    case 'xlsx':
      return 'file-text';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'photo';
    case 'mp4':
      return 'video';
    case 'mp3':
    case 'wav':
      return 'volume';
    case 'zip':
    case 'rar':
      return 'folder';
    default:
      return 'file-text';
  }
}

</script>

<style scoped>
.chat-container {
  flex: 1;
  overflow-y: auto;
  /* #ifdef APP-PLUS */
  height: calc(100vh - 88rpx); /* APP端减去输入框高度 */
  /* #endif */
  
  /* #ifndef APP-PLUS */
  height: calc(100vh - 188rpx); /* 其他端减去输入框高度 */
  /* #endif */
  padding: 20rpx;
  box-sizing: border-box;
}

.message-list {
  flex: 1;
  position: relative;
  height: 100%; /* 使用100%填充父容器 */
}

.message-wrapper {
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.messages-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.message-item {
  margin: 20rpx 0;
  padding: 0 24rpx;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.date-divider {
  display: flex;
  justify-content: center;
  padding: 20rpx 0;
  margin: 0;
}

.date-divider text {
  font-size: 24rpx;
  color: #999;
  background-color: rgba(0, 0, 0, 0.03);
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  max-width: 70%;
  position: relative;
}

.message-bubble.self-message {
  flex-direction: row;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  min-width: 80rpx;
  max-width: calc(100% - 90rpx); /* Account for avatar width + gap */
  position: relative;
}

.sender-name {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 4rpx;
  margin-left: 16rpx;
}

.message-text {
  background-color: #ffffff;
  padding: 16rpx 24rpx;
  border-radius: 16rpx 4rpx 16rpx 16rpx;
  font-size: 32rpx;
  color: #333;
  word-break: break-word;
  word-wrap: break-word;
  position: relative;
  line-height: 44rpx;
  margin-left: 16rpx;
  width: fit-content;
  max-width: 100%;
}

.text-content {
  display: inline-block;
  white-space: pre-wrap;
  min-width: 40rpx; /* 设置最小宽度 */
}

.self-message-text {
  background-color: #1989fa;
  color: #ffffff;
  border-radius: 4rpx 16rpx 16rpx 16rpx;
  margin-right: 16rpx;
}

.message-status {
  display: flex;
  align-items: center;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #b2b2b2;
  padding: 0 4rpx;
}

.message-mine .message-status {
  justify-content: flex-end;
  margin-right: 16rpx;
  margin-left: 0;
}

.message-other .message-status {
  justify-content: flex-start;
  margin-left: 16rpx;
  margin-right: 0;
}

.status-time {
  font-size: 24rpx;
}

.read-status {
  margin-left: 8rpx;
  font-size: 24rpx;
}

/* 图片容器样式 */
.image-container {
  padding: 8rpx;
  background-color: transparent;
}

/* 图片消息样式 */
.message-image {
  max-width: 240rpx;
  min-width: 200rpx;
  width: 240rpx;
  height: auto;
  border-radius: 8rpx;
  background-color: #f5f5f5;
  display: block;
  object-fit: contain;
}

/* 音频消息样式 */
.audio-message {
  display: flex;
  align-items: center;
  min-width: 120rpx;
  max-width: 300rpx;
  width: fit-content;
  cursor: pointer;
  border-radius: 8rpx;
}

.audio-icon {
  margin-right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-wave {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin: 0 12rpx;
}

.wave-bar {
  width: 4rpx;
  height: 16rpx;
  background-color: currentColor;
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
    height: 16rpx;
  }
  50% {
    height: 24rpx;
  }
}

.audio-duration {
  font-size: 24rpx;
  color: currentColor;
  margin-left: 8rpx;
}

/* 文件消息样式 */
.file-message {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background-color: #ffffff;
  border-radius: 12rpx;
  width: fit-content;
  max-width: calc(100% - 100rpx); /* Adjusted to prevent avatar overlap */
  min-width: 240rpx;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
  transition: all 0.2s ease;
  position: relative;
}

.message-mine .message-bubble .message-content .file-message,
.message-other .message-bubble .message-content .file-message {
  margin: 0;
  max-width: 100%;
  width: initial;
}

.file-message:active {
  opacity: 0.9;
  transform: scale(0.98);
}

.self-file-message {
  background-color: #e5f1ff;
  border: 1px solid rgba(25, 137, 250, 0.2);
}

.message-mine .self-file-message {
  background-color: #e5f1ff;
  border-radius: 12rpx 12rpx 4rpx 12rpx;
  margin-left: 16rpx;
}

.message-other .file-message {
  background-color: #ffffff;
  border-radius: 12rpx 12rpx 12rpx 4rpx;
  margin-right: 16rpx;
  border: 1px solid rgba(0,0,0,0.1);
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  border-radius: 8rpx;
  margin-right: 16rpx;
  background-color: #f5f5f5;
}

.file-icon.doc, .file-icon.docx { background-color: #4285f4; }
.file-icon.pdf { background-color: #ea4335; }
.file-icon.txt { background-color: #34a853; }
.file-icon.ppt, .file-icon.pptx { background-color: #fbbc05; }
.file-icon.xls, .file-icon.xlsx { background-color: #34a853; }
.file-icon.jpg, .file-icon.jpeg, .file-icon.png, .file-icon.gif { background-color: #9c27b0; }
.file-icon.mp4, .file-icon.mp3, .file-icon.wav { background-color: #ff5722; }
.file-icon.zip, .file-icon.rar { background-color: #795548; }

.file-info {
  flex: 1;
  overflow: hidden;
  padding-right: 8rpx;
}

.file-name {
  font-size: 28rpx;
  color: #6b6b6b !important;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.self-file-text {
  color: #1989fa;
}

.file-size {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.download-btn-wrapper {
  margin-left: 12rpx;
}

.download-btn {
  width: 50rpx;
  height: 50rpx;
  border-radius: 25rpx;
  background-color: #1989fa;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2rpx 6rpx rgba(25, 137, 250, 0.3);
  transition: all 0.3s;
}

.download-btn:active {
  transform: scale(0.9);
  box-shadow: 0 1rpx 3rpx rgba(25, 137, 250, 0.2);
}

.self-download-btn {
  background-color: #ffffff;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
}

.self-download-btn:active {
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.05);
}

.call-record {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 0;
}

.call-record-content {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.call-text {
  font-size: 28rpx;
  color: inherit;
}

/* 输入区域样式调整 */
.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 24rpx;
  background-color: #f7f7f7;
  border-top: 1rpx solid #e5e5e5;
  z-index: 100;
  height: 100rpx; /* 44px */
  display: flex;
  align-items: center;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  height: 68rpx; /* 34px */
}

.message-input {
  flex: 1;
  background-color: #ffffff;
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
  font-size: 28rpx;
  height: 68rpx; /* 34px */
  line-height: 40rpx;
}

.send-btn {
  width: 100rpx;
  height: 68rpx; /* 34px */
  background-color: #07c160;
  color: #ffffff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.plus-btn {
  width: 68rpx; /* 34px */
  height: 68rpx; /* 34px */
  display: flex;
  align-items: center;
  justify-content: center;
  color: #07c160;
}

/* 消息布局调整 */
.message-mine {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.message-other {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
}

.message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  max-width: 70%;
}

.message-mine .message-bubble {
  flex-direction: row-reverse;
}

.message-mine .message-content {
  align-items: flex-end; /* 内容靠右对齐 */
}

.message-mine .message-text {
  margin-right: 0; /* 移除右边距，靠近头像 */
  margin-left: 16rpx;
  border-radius: 16rpx 16rpx 4rpx 16rpx; /* 调整气泡尖角位置 */
}

.message-other .message-text {
  margin-left: 0; /* 移除左边距，靠近头像 */
  margin-right: 16rpx;
  border-radius: 16rpx 16rpx 16rpx 4rpx; /* 调整气泡尖角位置 */
}

.message-mine .message-status {
  justify-content: flex-end;
  margin-right: 0;
  padding-right: 4rpx;
}

.message-other .message-status {
  justify-content: flex-start;
  margin-left: 0;
  padding-left: 4rpx;
}

.message-mine .sender-name {
  text-align: right;
  margin-right: 0;
  padding-right: 4rpx;
}

.message-other .sender-name {
  text-align: left;
  margin-left: 0;
  padding-left: 4rpx;
}

/* 特殊消息类型样式调整 */
.message-mine .file-message {
  margin-right: 0;
  margin-left: 16rpx;
  border-radius: 16rpx 16rpx 4rpx 16rpx;
}

.message-other .file-message {
  margin-left: 0;
  margin-right: 16rpx;
  border-radius: 16rpx 16rpx 16rpx 4rpx;
}

.message-mine .audio-message {
  margin-right: 0;
  margin-left: 16rpx;
  border-radius: 16rpx 16rpx 4rpx 16rpx;
}

.message-other .audio-message {
  margin-left: 0;
  margin-right: 16rpx;
  border-radius: 16rpx 16rpx 16rpx 4rpx;
}

/* 其他样式保持不变 */
.self-message-text .text-content,
.self-message-text .audio-duration,
.self-message-text .file-name,
.self-message-text .call-record-content text {
  color: #ffffff;
}

.self-message .file-message {
  background-color: #1989fa;
}

.self-message .file-name,
.self-message .file-size {
  color: #ffffff;
}

.self-message .download-btn {
  color: #ffffff;
}

.popup-content {
  padding: 30rpx 0;
}

.popup-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 30rpx;
}

.grid-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
}

.grid-item-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16rpx;
}

.grid-item-text {
  font-size: 24rpx;
  color: #333;
}
</style>