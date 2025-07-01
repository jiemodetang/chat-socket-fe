<template>
  <view class="chat-container">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-left" @click="goBack">
        <u-icon name="arrow-left" size="19" color="#000"></u-icon>
      </view>
      <view class="navbar-title">
        <text>{{ chatTitle }}</text>
      </view>
      <view class="navbar-right" @click="showMoreOptions">
        <u-icon name="more-dot-fill" size="20" color="#000"></u-icon>
      </view>
    </view>
    
    <!-- 聊天消息列表 -->
    <scroll-view 
      id="messageScrollView"
      ref="scrollViewRef"
      scroll-y 
      class="message-list" 
      :style="{ 
        height: `calc(100vh - 100rpx - ${inputAreaBottom}px)`,
        paddingBottom: '10px'
      }"
      :scroll-into-view="toView"
      :scroll-with-animation="true"
      :scroll-anchoring="true"
      :refresher-enabled="false"
      :show-scrollbar="false"
      :enhanced="true"
      :bounces="false"
      @scroll="handleScroll"
      @scrolltolower="onScrollToLower"
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
                        @load="handleImageLoad" :lazy-load="false"></image>
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
                    <view v-else-if="message.messageType === 'file'" class="file-message" :class="{'self-file-message': isSelfMessage(message)}" @click="downloadFile(message)">
                      <view class="file-icon" :class="getFileIconClass(message.content)">
                        <u-icon :name="getFileIconName(message.content)" size="28" color="#ffffff"></u-icon>
                      </view>
                      <view class="file-info">
                        <text class="file-name" :class="{'self-file-text': isSelfMessage(message)}">{{ message.content }}</text>
                        <text class="file-size" :class="{'self-file-text': isSelfMessage(message)}">{{ formatFileSize(message.fileSize) }}</text>
                      </view>
                      <view class="download-btn-wrapper">
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
          <!-- 占位，防止最后一条被输入框遮挡 -->
          <view class="message-placeholder" id="message-bottom">
            <!-- <view style="height: 5rpx;"></view> -->
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 输入框区域 -->
    <view 
      class="input-area" 
      :style="{ 
        bottom: `${inputAreaBottom}px`,
        position: 'fixed',
        left: 0,
        right: 0,
        zIndex: 1000
      }"
    >
      <view class="input-wrapper">
        <!-- 语音/键盘切换按钮 -->
        <view class="voice-switch-btn" @click="toggleVoiceMode">
          <u-icon :name="isVoiceMode ? 'list-dot' : 'mic'" size="24" color="#666"></u-icon>
        </view>

        <!-- 文本输入框 (键盘模式) -->
        <textarea 
          v-if="!isVoiceMode"
          class="message-input" 
          v-model="messageText" 
          placeholder="输入消息..." 
          :adjust-position="false"
          :cursor-spacing="10" 
          :show-confirm-bar="false" 
          :auto-height="true"
          :fixed="true"
          :maxlength="-1" 
          @confirm="sendMessage"
          @focus="handleInputFocus" 
          @blur="handleInputBlur" 
          @input="handleTyping"
        />
        
        <!-- 按住说话按钮 (语音模式) -->
        <view 
          v-else
          class="voice-record-btn"
          @touchstart.prevent="startRecording" 
          @touchend.prevent="stopRecording" 
          @touchcancel.prevent="cancelRecording"
          @touchmove.prevent="handleTouchMove"
        >
          <text>按住 说话</text>
        </view>

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
    <u-popup :show="showRecordingTip" mode="center" :closeable="false">
      <view class="recording-tip">
        <view class="recording-icon">
          <u-icon name="mic" size="48" color="#fff"></u-icon>
        </view>
        <text class="recording-text">{{ recordingTipText }}</text>
        <text v-if="recordingTipText === '松开手指，取消发送'" class="cancel-record-tip">手指上滑，取消发送</text>
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

    <!-- 页面底部隐藏 xe-upload 组件 -->
    <XeUpload ref="xeUploadRef" :options="uploadOptions" @callback="handleUploadCallback" style="display:none" />

    <!-- 更多选项弹出菜单 -->
    <u-popup :show="showMorePopup" mode="bottom" @close="showMorePopup = false" :safe-area-inset-bottom="true">
      <view class="popup-content">
        <view class="popup-list">
          <view class="popup-item" @click="handleAddRemark">
            <text class="popup-item-text">设置备注</text>
          </view>
          <view class="popup-item" v-if="!isGroupChat" @click="handleDeleteFriend">
            <text class="popup-item-text danger">删除好友</text>
          </view>
          <view class="popup-item" v-else @click="handleExitGroup">
            <text class="popup-item-text danger">退出群聊</text>
          </view>
        </view>
        <view class="popup-cancel" @click="showMorePopup = false">
          <text>取消</text>
        </view>
      </view>
    </u-popup>

    <!-- 自定义备注弹窗 -->
    <u-popup :show="showRemarkPopup" mode="bottom" @close="showRemarkPopup = false" :safe-area-inset-bottom="true">
      <view class="popup-content remark-popup">
        <view class="popup-header">
          <view class="header-left" @click="showRemarkPopup = false">
            <text class="cancel-text">取消</text>
          </view>
          <text class="popup-title">设置备注</text>
          <view class="header-right" @click="saveRemark">
            <text class="save-text" :class="{ 'save-active': remarkText.trim().length > 0 }">保存</text>
          </view>
        </view>
        <view class="popup-body">
          <view class="input-container">
            <view class="input-label">备注名</view>
            <view class="input-wrapper">
              <textarea 
                :value="remarkText" 
                placeholder="请输入备注名" 
                :adjust-position="false"
                :cursor-spacing="20" 
                :show-confirm-bar="false" 
                :auto-height="true"
                :maxlength="30" 
                class="remark-input"
                @input="handleRemarkInput"
              ></textarea>
            </view>
            <view class="remark-tips">
              <text>好的备注让你更容易记住和区分好友</text>
              <text class="remark-count" :class="{ 'count-warning': remarkText.length > 25 }">{{ remarkText.length }}/30</text>
            </view>
          </view>
          
          <view class="preview-section">
            <view class="preview-title">预览效果</view>
            <view class="preview-card">
              <image class="preview-avatar" :src="remarkTarget?.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <view class="preview-info">
                <text class="preview-name">{{ remarkText || remarkTarget?.username || '未设置' }}</text>
                <text class="preview-original">昵称：{{ remarkTarget?.username || '' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { formatDate, formatTime, formatDuration, formatFileSize } from '@/utils/dateFormat'
import { formatCallDuration } from '@/utils/tuiCallKit'
import { uploadChatFile } from '@/utils/upload'
import { openDocument } from '@/utils/fileUpload'
import { useWebSocket } from '@/composables/useWebSocket'
import { loginTUICallKit, onCallEvent, offCallEvent } from '@/utils/tuiCallKit'
import { currentConfig } from '@/config'
import { recorder, isRecorderSupported } from '@/utils/recorder'
import XeUpload from '@/components/FileUploader.vue'

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
} = useWebSocket()

const chatId = ref('')
const messageText = ref('')
const isRefreshing = ref(false)
const isLoadingMore = ref(false)
const isKeyboardShow = ref(false)
const showPopup = ref(false)
const isScrolledToBottom = ref(true)
const xeUploadRef = ref(null)
const uploadOptions = ref({
  // url: '', // Optional: set your upload URL if needed
})
const toView = ref('message-bottom')
const scrollViewRef = ref(null)
const showMorePopup = ref(false)
const showRemarkPopup = ref(false)
const remarkTarget = ref(null)
const remarkText = ref('')

// 定义输入框的底部位置
const inputAreaBottom = ref(0)

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

// 聊天标题
const chatTitle = computed(() => {
  const chat = store.state.chats.find(c => c._id === chatId.value)
  if (!chat) return '聊天'
  
  if (chat.isGroupChat) {
    return chat.chatName || '群聊'
  } else {
    // 在单聊中，显示对方的名称
    const currentUserValue = store.getters.currentUser
    if (!currentUserValue) {
      return '未知用户'
    } else {
      const otherUser = chat.users.find(u => u._id !== currentUserValue._id)
      
      if (!otherUser) {
        return '未知用户'
      } else {
        // 查找好友数据，优先使用备注
        const friendData = store.state.friends.find(f => f.user._id === otherUser._id)
        
        // 优先使用备注，如果没有备注则使用用户名
        if (friendData && friendData.remark) {
          return friendData.remark
        } else {
          return otherUser.username || '未知用户'
        }
      }
    }
  }
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
    const currentUserValue = store.getters.currentUser
    if (!currentUserValue) {
      title = '未知用户'
    } else {
      const otherUser = chat.users.find(u => u._id !== currentUserValue._id)
      
      if (!otherUser) {
        title = '未知用户'
      } else {
        // 查找好友数据，优先使用备注
        const friendData = store.state.friends.find(f => f.user._id === otherUser._id)
        
        // 优先使用备注，如果没有备注则使用用户名
        if (friendData && friendData.remark) {
          title = friendData.remark
        } else {
          title = otherUser.username || '未知用户'
        }
      }
    }
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
    
    // 获取消息后滚动到底部
    nextTick(() => {
      // 确保在DOM更新后滚动到底部
      scrollToBottom()
    })
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

// 定义滚动到底部的逻辑
const scrollToBottom = () => {
  // 先清空，再设置，强制触发滚动
  toView.value = '';
  
  // 使用nextTick确保DOM已更新
  nextTick(() => {
    // 设置滚动目标为底部元素
    
    setTimeout(() => {
    toView.value = 'message-bottom';
     
    }, 800);
  });
}

// 处理滚动到底部事件
const onScrollToLower = () => {
  isScrolledToBottom.value = true;
}

// 监听消息列表变化
watch(() => messages.value?.length, (newLength, oldLength) => {
  if (newLength > oldLength || !oldLength) {
    // 消息数量增加时，延迟滚动到底部，确保新消息渲染完成
    setTimeout(() => {
      scrollToBottom();
      
      // 再次延迟滚动，处理可能的图片或文件消息
      setTimeout(() => {
        scrollToBottom();
      }, 500);
    }, 100);
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
  
  // 只有在WebSocket未连接时才初始化连接
  if (!isConnected.value) {
    initWebSocket(store.state.token);
  }
  
  // 标记所有消息为已读
  if (chatId.value) {
    store.commit('CLEAR_UNREAD', chatId.value);
    markMessagesAsRead();
  }
  
  // 获取状态栏高度并设置CSS变量
  uni.getSystemInfo({
    success: (res) => {
      const statusBarHeight = res.statusBarHeight || 20;
      document.documentElement.style.setProperty('--status-bar-height', `${statusBarHeight}px`);
    }
  });
  
  // 初始化录音功能
  checkRecorderAvailability();
  if (isRecorderEnabled.value) {
    initRecorderManager();
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
    
    // 立即滚动到底部，不使用延迟，确保新消息立即显示
    scrollToBottom()
  } catch (error) {
    console.error('Failed to send message:', error)
    uni.showToast({
      title: '发送消息失败',
      icon: 'none'
    })
  }
}


// 处理输入框获取焦点
const handleInputFocus = () => {
  isKeyboardShow.value = true;
  
  // 获取系统信息
  uni.getSystemInfo({
    success: (sysInfo) => {
      // 监听键盘高度变化
      if (typeof uni.onKeyboardHeightChange === 'function') {
        uni.onKeyboardHeightChange(res => {
          const keyboardHeight = res.height;
          console.log('键盘高度:', keyboardHeight);
          
          if (keyboardHeight > 0) {
            // 设置输入区域底部位置为键盘高度
            // 这样输入框会紧贴键盘上边缘
            inputAreaBottom.value = keyboardHeight;
            
            // 延迟滚动到底部，确保UI已更新
            setTimeout(() => {
              scrollToBottom();
            }, 50);
          } else {
            // 键盘收起时重置底部位置
            inputAreaBottom.value = 0;
          }
        });
      } else {
        // 不支持键盘高度监听的设备使用固定值
        // #ifdef APP-PLUS
        inputAreaBottom.value = 270; // App环境下的默认键盘高度
        // #endif
        
        // #ifdef H5
        inputAreaBottom.value = 270; // H5环境下的默认键盘高度
        // #endif
        
        // #ifdef MP-WEIXIN
        inputAreaBottom.value = 0; // 微信小程序环境下的处理
        // #endif
        
        setTimeout(() => {
          scrollToBottom();
        }, 300);
      }
    }
  });
  
  // 立即滚动到底部
  scrollToBottom();
}

// 处理输入框失去焦点
const handleInputBlur = () => {
  // 标记键盘已隐藏
  isKeyboardShow.value = false;
  
  // 重置输入区域位置
  inputAreaBottom.value = 0;
  
  // 移除键盘高度监听
  if (typeof uni.offKeyboardHeightChange === 'function') {
    uni.offKeyboardHeightChange();
  }
  
  // 延迟滚动到底部，确保UI已更新
  setTimeout(() => {
    scrollToBottom();
  }, 100);
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
    const sender = message.sender
    
    // 查找好友数据，优先使用备注
    const friendData = store.state.friends.find(f => f.user._id === sender._id)
    
    // 优先使用备注，如果没有备注则使用用户名
    if (friendData && friendData.remark) {
      return friendData.remark
    }
    
    return sender.username || '未知用户'
  }
  
  // 如果是单聊，显示对方名称
  const currentUser = store.getters.currentUser
  if (!currentUser) return '未知用户'
  
  const otherUser = store.state.chats.find(c => c._id === chatId.value)?.users.find(u => u._id !== currentUser._id)
  
  if (!otherUser) return '未知用户'
  
  // 查找好友数据，优先使用备注
  const friendData = store.state.friends.find(f => f.user._id === otherUser._id)
  
  // 优先使用备注，如果没有备注则使用用户名
  if (friendData && friendData.remark) {
    return friendData.remark
  }
  
  return otherUser.username || '未知用户'
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
  console.log('downloadFile called with message:', message);
  
  try {
    // 检查消息数据
    if (!message || !message.fileUrl) {
      console.error('Invalid message or missing fileUrl:', message);
      uni.showToast({
        title: '文件信息不完整',
        icon: 'none'
      });
      return;
    }
    
    // 使用工具函数打开文档
    const fileInfo = { 
      fileUrl: message.fileUrl,
      fileName: message.content
    };
    
    console.log('Opening document with fileInfo:', fileInfo);
    await openDocument(fileInfo);
  } catch (error) {
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
    return decodeURIComponent(fileName);
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
        
        // 延迟滚动到底部，确保图片加载完成
        setTimeout(() => {
          scrollToBottom();
        }, 300);
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
        
        // 延迟滚动到底部，确保消息渲染完成
        setTimeout(() => {
          scrollToBottom();
        }, 300);
      }
    }
  }).catch(error => {
    uni.showToast({
      title: error.message || '上传失败',
      icon: 'none'
    })
  })
}

// 修改选择文件函数
const chooseFile = () => {
  showPopup.value = false;
  xeUploadRef.value.upload('file', {});
}

// 处理文件上传成功
const handleUploadCallback = (e) => {
  if (e.type === 'choose' && e.data && e.data.length > 0) {
    const file = e.data[0];
    // 使用 uploadChatFile 上传
    uploadChatFile(file.tempFilePath, 'file', (progress) => {
      // 可选：显示进度
    }).then(result => {
      if (result && result.status === 'success') {
        const fileData = result.data?.file || result.data || result;
        if (fileData) {
          const fileUrl = fileData.url;
          const fullUrl = fileUrl.startsWith('http') ? fileUrl : currentConfig.apiUrl + fileUrl;
          const fileName = file.name || fileData.fileName || fileData.name || '文件消息';
          const decodedFileName = decodeFileName(fileName);
          sendWebSocketMessage(
            chatId.value,
            decodedFileName || '文件消息',
            'file',
            {
              fileUrl: fullUrl,
              fileSize: fileData.fileSize || fileData.size || file.size || 0,
              fileType: fileData.fileType || 'file',
              fileExt: fileData.fileExt || fileName.split('.').pop() || '',
              originalFileName: fileName || decodedFileName || '文件消息'
            }
          );
          
          // 延迟滚动到底部，确保消息渲染完成
          setTimeout(() => {
            scrollToBottom();
          }, 300);
        }
      }
    }).catch(error => {
      uni.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      });
    });
  }
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
  // 图片加载完成后再次滚动到底部
  setTimeout(() => {
    scrollToBottom();
  }, 200);
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
  // #ifdef APP-PLUS
  // 移除通话事件监听
  if (typeof offCallEvent === 'function') {
    offCallEvent('onCallEnd', callEndHandler);
    offCallEvent('onUserReject', callRejectedHandler);
    offCallEvent('onUserNoResponse', callNoResponseHandler);
    offCallEvent('onUserLineBusy', callBusyHandler);
    offCallEvent('onCallCancelled', callCancelledHandler);
  }
  // #endif
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

// 显示更多选项
const showMoreOptions = () => {
  console.log('Showing more options popup')
  
  // 如果是群聊，直接跳转到群聊设置页面
  if (isGroupChat.value) {
    uni.navigateTo({
      url: `/pages/group-settings/index?id=${chatId.value}`
    })
    return
  }
  
  // 非群聊显示原来的弹窗
  showMorePopup.value = true
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 处理添加备注
const handleAddRemark = () => {
  console.log('handleAddRemark called')
  showMorePopup.value = false
  
  // 获取当前聊天对象
  const chat = store.state.chats.find(c => c._id === chatId.value)
  console.log('Current chat:', chat)
  if (!chat) {
    console.error('Chat not found with ID:', chatId.value)
    return
  }
  
  let targetUser
  if (isGroupChat.value) {
    // 群聊设置群名称
    targetUser = { _id: chat._id, username: chat.chatName || '群聊' }
  } else {
    // 单聊设置好友备注
    const otherUser = chat.users.find(u => u._id !== currentUser.value._id)
    targetUser = otherUser
  }
  
  console.log('Target user for remark:', targetUser)
  if (!targetUser) {
    console.error('Target user not found')
    return
  }
  
  // 获取当前备注
  let currentRemark = ''
  if (!isGroupChat.value) {
    // 查找当前好友的备注
    console.log('Looking for friend with ID:', targetUser._id)
    console.log('Current friends in state:', JSON.stringify(store.state.friends))
    
    // 尝试多种方式查找好友数据
    let friendData = store.state.friends.find(f => f.user._id === targetUser._id)
    
    // 如果没找到，尝试不同的匹配方式
    if (!friendData) {
      console.log('Friend not found by user._id, trying other methods')
      friendData = store.state.friends.find(f => f._id === targetUser._id)
    }
    
    console.log('Found friend data:', friendData)
    if (friendData) {
      currentRemark = friendData.remark || ''
    } else {
      console.warn('Could not find friend data for user:', targetUser._id)
    }
  }
  
  console.log('Current remark:', currentRemark)
  
  // 显示自定义备注弹窗
  remarkTarget.value = targetUser
  remarkText.value = currentRemark
  showRemarkPopup.value = true
}

// 保存备注
const saveRemark = async () => {
  console.log('Saving remark for target:', remarkTarget.value)
  if (!remarkTarget.value || !remarkTarget.value._id) {
    console.error('No valid remark target found')
    uni.showToast({
      title: '无效的好友信息',
      icon: 'none'
    })
    return
  }
  
  try {
    // 确认好友关系存在
    const targetId = remarkTarget.value._id
    // 检查是否存在这个好友
    const friendExists = store.state.friends.some(f => 
      (f.user && f.user._id === targetId) || 
      f._id === targetId
    )
    
    if (!friendExists) {
      console.warn('Friend relationship might not exist, proceeding anyway')
    }
    
    console.log('Dispatching updateFriendRemark with:', {
      friendId: targetId,
      remark: remarkText.value.trim()
    })
    
    // 更新备注
    const result = await store.dispatch('updateFriendRemark', {
      friendId: targetId,
      remark: remarkText.value.trim()
    })
    
    console.log('Update remark result:', result)
    if (result.success) {
      uni.showToast({
        title: '备注已更新',
        icon: 'success'
      })
      showRemarkPopup.value = false
      
      // 更新聊天标题
      const chat = store.state.chats.find(c => c._id === chatId.value)
      if (chat) {
        setChatTitle(chat)
      }
    } else {
      uni.showToast({
        title: result.message || '更新备注失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('Failed to update remark:', error)
    uni.showToast({
      title: '更新备注失败',
      icon: 'none'
    })
  }
}

// 处理删除好友
const handleDeleteFriend = () => {
  showMorePopup.value = false
  
  // 获取好友信息
  const chat = store.state.chats.find(c => c._id === chatId.value)
  if (!chat || chat.isGroupChat) return
  
  const friend = chat.users.find(u => u._id !== currentUser.value._id)
  if (!friend) return
  
  uni.showModal({
    title: '删除好友',
    content: `确定要删除好友"${friend.username}"吗？删除后将无法接收对方的消息。`,
    confirmText: '删除',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        // 调用删除好友API
        deleteFriend(friend._id)
      }
    }
  })
}

// 处理退出群聊
const handleExitGroup = () => {
  showMorePopup.value = false
  
  // 获取群聊信息
  const chat = store.state.chats.find(c => c._id === chatId.value)
  if (!chat || !chat.isGroupChat) return
  
  uni.showModal({
    title: '退出群聊',
    content: `确定要退出"${chat.chatName || '群聊'}"吗？`,
    confirmText: '退出',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        // 调用退出群聊API
        exitGroup(chat._id)
      }
    }
  })
}

// 删除好友
const deleteFriend = async (friendId) => {
  try {
    // 使用store的方法删除好友
    const result = await store.dispatch('removeFriend', friendId)
    
    if (result.success) {
      uni.showToast({
        title: '已删除好友',
        icon: 'success'
      })
      
      // 删除对应的聊天
      store.commit('REMOVE_CHAT', chatId.value)
      
      // 返回到聊天列表页
      uni.navigateBack()
    } else {
      throw new Error(result.message || '删除好友失败')
    }
  } catch (error) {
    console.error('删除好友失败:', error)
    uni.showToast({
      title: '删除好友失败',
      icon: 'none'
    })
  }
}

// 退出群聊
const exitGroup = async (groupId) => {
  try {
    // 这里调用退出群聊的API
    const response = await uni.request({
      url: `${currentConfig.apiUrl}/api/chats/groups/${groupId}/exit`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${store.state.token}`
      }
    })
    
    if (response.statusCode === 200) {
      uni.showToast({
        title: '已退出群聊',
        icon: 'success'
      })
      
      // 删除对应的聊天
      store.commit('REMOVE_CHAT', chatId.value)
      
      // 返回到聊天列表页
      uni.navigateBack()
    } else {
      throw new Error('退出群聊失败')
    }
  } catch (error) {
    console.error('退出群聊失败:', error)
    uni.showToast({
      title: '退出群聊失败',
      icon: 'none'
    })
  }
}

// 处理备注输入
const handleRemarkInput = (e) => {
  console.log('Remark input event:', e)
  if (e.detail && e.detail.value !== undefined) {
    remarkText.value = e.detail.value
  } else if (typeof e === 'string') {
    remarkText.value = e
  }
}

// 语音相关功能
// 语音模式
const isVoiceMode = ref(false)
const showRecordingTip = ref(false)
const recordingTipText = ref('松开 结束')
const isRecorderEnabled = ref(false)

// 检查是否支持录音功能
const checkRecorderAvailability = () => {
  isRecorderEnabled.value = isRecorderSupported()
  if (!isRecorderEnabled.value) {
    console.log('当前平台不支持录音功能')
  }
}

// 初始化录音管理器
const initRecorderManager = () => {
  if (!isRecorderEnabled.value) {
    console.log('当前平台不支持录音功能')
    return
  }

  try {
    // 初始化录音管理器
    const isInitialized = recorder.init()
    if (!isInitialized) {
      console.error('录音管理器初始化失败')
      return
    }

    // 设置录音开始回调
    recorder.setOnStart(() => {
      console.log('录音开始')
    })

    // 设置录音结束回调
    recorder.setOnStop((res) => {
      console.log('录音结束:', JSON.stringify(res))
      if (res.duration < 1000) {
        uni.showToast({
          title: '录音时间太短',
          icon: 'none'
        })
        return
      }
      
      // 上传录音文件
      handleAudioRecorded(res.tempFilePath, res.duration)
    })

    // 设置录音错误回调
    recorder.setOnError((res) => {
      console.error('录音错误:', res)
      uni.showToast({
        title: '录音失败',
        icon: 'none'
      })
      showRecordingTip.value = false
    })
  } catch (error) {
    console.error('初始化录音管理器失败:', error)
  }
}

// 开始录音
const startRecording = () => {
  if (!isRecorderEnabled.value) {
    uni.showToast({
      title: '当前平台不支持录音功能',
      icon: 'none'
    })
    return
  }

  showRecordingTip.value = true
  recordingTipText.value = '松开 结束'

  // 开始录音
  recorder.start()
}

// 停止录音
const stopRecording = () => {
  if (!showRecordingTip.value) return
  
  showRecordingTip.value = false
  recordingTipText.value = '按住 说话'
  
  // 停止录音
  recorder.stop()
}

// 取消录音
const cancelRecording = () => {
  if (!showRecordingTip.value) return
  
  showRecordingTip.value = false
  recordingTipText.value = '按住 说话'
  
  // 停止录音
  recorder.stop()
  
  uni.showToast({
    title: '已取消录音',
    icon: 'none'
  })
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
    recordingTipText.value = '松开 结束'
  }
}

// 切换语音模式
const toggleVoiceMode = () => {
  isVoiceMode.value = !isVoiceMode.value
  
  // 如果切换到语音模式，检查录音功能
  if (isVoiceMode.value && !isRecorderEnabled.value) {
    checkRecorderAvailability()
    initRecorderManager()
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  background-color: #f7f7f7;
  overflow: hidden;
}

/* 自定义导航栏样式 */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  padding-top: var(--status-bar-height, 20px);
  display: flex;
  align-items: center;
  padding-left: 5px;
  padding-right: 10px;
  z-index: 999999999999;
  background-color: #F8F8F8;
  border-bottom: 1px solid #e5e5e5;
  box-sizing: content-box;
}

.navbar-left {
  width: 40px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 5px;
}

.navbar-right {
  width: 40px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbar-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #000;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 10px;
}

.message-list {
  flex: 1;
  height: calc(100vh - 100rpx); /* 减去输入框高度 */
  padding: 0;
  padding-top: calc(var(--status-bar-height, 20px) + 44px); /* 状态栏 + 导航栏高度 */
  padding-bottom: env(safe-area-inset-bottom); /* 添加安全区域底部边距 */
  position: relative;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch; /* 增加弹性滚动效果 */
  scroll-behavior: smooth; /* 平滑滚动 */
}

.message-wrapper {
  box-sizing: border-box;
  padding: 20rpx;
  min-height: 100%;
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

.message-placeholder {
  height: 0rpx; /* 增加底部留白高度 */
  width: 100%;
  flex-shrink: 0;
  margin-bottom: 30rpx;
  background-color: transparent;
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
  cursor: pointer;
}

.message-mine .message-bubble .message-content .file-message,
.message-other .message-bubble .message-content .file-message {
  margin: 0;
  max-width: 100%;
  width: initial;
}

.file-message:active {
  opacity: 0.8;
  transform: scale(0.98);
  background-color: #f5f5f5;
}

.self-file-message:active {
  background-color: #d1e7ff;
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
  width: 100%;
  padding: 12rpx 24rpx;
  background-color: #f7f7f7;
  border-top: 1rpx solid #e5e5e5;
  box-sizing: border-box;
  transition: all 0.2s ease-out;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f7f7f7;
  border-radius: 8rpx;
  padding: 0 12rpx;
  position: relative;
  height: 72rpx;
  width: 100%;
}

/* 录音按钮在输入框容器内的样式 */
.input-wrapper .voice-btn {
  width: 60rpx;
  height: 60rpx;
  margin-left: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  background: transparent;
  border: none;
}

.message-input {
  flex: 1;
  height: 72rpx;
  min-height: 36rpx;
  max-height: 160rpx;
  font-size: 30rpx;
  line-height: 36rpx;
  padding: 16rpx 0;
  box-sizing: border-box;
  background-color: #ffffff;
  border-radius: 8rpx;
  padding-left: 16rpx;
  padding-right: 16rpx;
  margin: 0 12rpx;
}

.send-btn {
  width: 100rpx;
  height: 60rpx;
  background-color: #07c160;
  color: #ffffff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.plus-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  background-color: #ffffff;
  border-radius: 20rpx 20rpx 0 0;
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

/* 更多选项弹出菜单样式 */
.popup-list {
  background-color: #ffffff;
  border-radius: 16rpx 16rpx 0 0;
  overflow: hidden;
}

.popup-item {
  height: 110rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid #f5f5f5;
}

.popup-item-text {
  font-size: 32rpx;
  color: #333;
}

.popup-item-text.danger {
  color: #ff3b30;
}

.popup-cancel {
  height: 110rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  margin-top: 16rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  color: #333;
}

/* 自定义备注弹窗样式 */
.remark-popup {
  padding: 0 !important;
  background-color: #ffffff;
  border-radius: 20rpx 20rpx 0 0;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 24rpx;
  border-bottom: 1px solid #f5f5f5;
  position: relative;
}

.popup-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #333;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-left, .header-right {
  min-width: 80rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  z-index: 1;
}

.header-left {
  justify-content: flex-start;
}

.header-right {
  justify-content: flex-end;
}

.cancel-text {
  font-size: 32rpx;
  color: #666;
}

.save-text {
  font-size: 32rpx;
  color: #999;
  font-weight: 500;
}

.save-active {
  color: #07c160;
}

.popup-body {
  padding: 30rpx 24rpx;
}

.input-container {
  margin-bottom: 40rpx;
}

.input-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.input-wrapper {
  border-radius: 8rpx;
  background-color: #f8f8f8;
  padding: 16rpx;
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  border-color: #07c160;
  box-shadow: 0 0 0 2px rgba(7, 193, 96, 0.1);
}

.remark-input {
  width: 100%;
  min-height: 120rpx;
  background-color: transparent;
  border: none;
  font-size: 30rpx;
  color: #333;
  line-height: 1.5;
}

.remark-tips {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 0 10rpx;
}

.remark-tips text {
  font-size: 24rpx;
  color: #999;
}

.remark-count {
  color: #666;
  transition: color 0.3s;
}

.count-warning {
  color: #ff9900;
}

.preview-section {
  margin-top: 40rpx;
  padding-top: 30rpx;
  border-top: 1px solid #f5f5f5;
}

.preview-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.preview-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.preview-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
  background-color: #e0e0e0;
}

.preview-info {
  flex: 1;
}

.preview-name {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
  font-weight: 500;
}

.preview-original {
  font-size: 26rpx;
  color: #999;
}

.voice-switch-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.voice-record-btn {
  width: 100%;
  height: 60rpx;
  background-color: #07c160;
  color: #ffffff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.recording-tip {
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 16rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 300rpx;
  width: 300rpx;
  justify-content: center;
}

.recording-icon {
  width: 120rpx;
  height: 120rpx;
  background-color: #07c160;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.recording-text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
  margin-top: 20rpx;
}

.cancel-record-tip {
  color: #ff4d4f;
  margin-top: 20rpx;
  font-size: 28rpx;
}

.voice-switch-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.voice-record-btn {
  flex: 1;
  height: 72rpx;
  background-color: #f7f7f7;
  color: #333333;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  margin: 0 12rpx;
  border: 1rpx solid #e5e5e5;
}
</style>