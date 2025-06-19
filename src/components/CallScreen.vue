<template>
  <view class="call-screen" v-if="visible">
    <view class="call-content">
      <!-- 头像和状态 -->
      <view class="user-info">
        <view class="avatar-container">
          <image class="user-avatar" :src="remoteUser?.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
          <view class="call-indicator" :class="{ 'connected': status === CallStatus.CONNECTED }"></view>
        </view>
        <text class="user-name">{{ remoteUser?.username }}</text>
        <text class="call-status">{{ getStatusText }}</text>
      </view>
      
      <!-- 通话时长 -->
      <view class="duration-container" v-if="status === CallStatus.CONNECTED">
        <text class="call-duration">{{ formatDuration(callTimer) }}</text>
      </view>
      
      <!-- 控制按钮 -->
      <view class="control-buttons">
        <!-- 麦克风控制 -->
        <view class="control-button" :class="{ 'active': !isMicEnabled }" @click="toggleMic" v-if="status === CallStatus.CONNECTED">
          <view class="button-icon">
            <u-icon :name="isMicEnabled ? 'mic' : 'close'" color="#fff" size="20"></u-icon>
          </view>
          <text class="button-text">麦克风</text>
        </view>
        
        <!-- 扬声器控制 -->
        <view class="control-button" :class="{ 'active': isSpeakerEnabled }" @click="toggleSpeaker" v-if="status === CallStatus.CONNECTED">
          <view class="button-icon">
            <u-icon :name="isSpeakerEnabled ? 'volume-up' : 'volume-off'" color="#fff" size="20"></u-icon>
          </view>
          <text class="button-text">扬声器</text>
        </view>
        
        <!-- 接听按钮 - 仅在来电时显示 -->
        <view class="accept-button" @click="acceptCall" v-if="status === CallStatus.INCOMING">
          <view class="button-icon">
            <u-icon name="checkmark" color="#fff" size="20"></u-icon>
          </view>
          <text class="button-text">接听</text>
        </view>
        
        <!-- 挂断按钮 -->
        <view class="end-button" @click="endCall">
          <view class="button-icon">
            <u-icon name="close" color="#fff" size="20"></u-icon>
          </view>
          <text class="button-text">挂断</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { callManager, CallStatus } from '@/utils/call'

export default {
  name: 'CallScreen',
  setup() {
    const isMicEnabled = ref(true)
    const isSpeakerEnabled = ref(false)
    const visible = ref(false)
    const audioElement = ref(null)

    // 监听通话状态变化
    watch(() => callManager.status.value, (newStatus) => {
      visible.value = newStatus !== CallStatus.IDLE
      
      // 如果通话结束，重置控制状态
      if (newStatus === CallStatus.IDLE) {
        isMicEnabled.value = true
        isSpeakerEnabled.value = false
      }
    })

    // 监听远程音频流变化
    watch(() => callManager.remoteStream.value, (newStream) => {
      if (newStream) {
        console.log('收到远程音频流')
        // #ifdef H5
        if (newStream instanceof MediaStream) {
          console.log('H5: 收到MediaStream，开始播放音频')
          playH5Audio(newStream)
        }
        // #endif

        // #ifdef APP-PLUS
        if (newStream.tempFilePath) {
          console.log('APP: 收到音频文件路径:', newStream.tempFilePath)
          playAppAudio(newStream.tempFilePath)
        }
        // #endif
      }
    })

    // H5环境播放音频
    const playH5Audio = (stream) => {
      // #ifdef H5
      try {
        if (!audioElement.value) {
          audioElement.value = document.createElement('audio')
          audioElement.value.autoplay = true
          audioElement.value.controls = false
          document.body.appendChild(audioElement.value)
        }
        
        audioElement.value.srcObject = stream
        audioElement.value.play().then(() => {
          console.log('H5音频播放成功')
        }).catch(error => {
          console.error('H5音频播放失败:', error)
        })
      } catch (error) {
        console.error('H5音频播放错误:', error)
      }
      // #endif
    }

    // APP环境播放音频
    const playAppAudio = (filePath) => {
      // #ifdef APP-PLUS
      try {
        const audioContext = uni.createInnerAudioContext()
        audioContext.src = filePath
        audioContext.autoplay = true
        audioContext.play()
        console.log('APP音频播放成功')
      } catch (error) {
        console.error('APP音频播放失败:', error)
      }
      // #endif
    }

    // 监听显示CallScreen事件
    const handleShowCallScreen = async (data) => {
      console.log('收到显示CallScreen事件:', data)
      visible.value = true
      
      // 如果是自动接听的来电
      if (data.isIncoming && data.autoAnswer) {
        console.log('自动接听来电')
        try {
          await callManager.acceptCall()
        } catch (error) {
          console.error('自动接听失败:', error)
          uni.showToast({
            title: '自动接听失败',
            icon: 'none'
          })
        }
      }
    }

    onMounted(() => {
      // 初始化时检查当前状态
      visible.value = callManager.status.value !== CallStatus.IDLE
      
      // 注册显示CallScreen事件监听
      uni.$on('showCallScreen', handleShowCallScreen)
      
      // 检查是否已有远程流
      if (callManager.remoteStream.value) {
        console.log('初始化时已有远程流')
        // #ifdef H5
        if (callManager.remoteStream.value instanceof MediaStream) {
          playH5Audio(callManager.remoteStream.value)
        }
        // #endif
      }
    })

    onUnmounted(() => {
      // 移除事件监听
      uni.$off('showCallScreen', handleShowCallScreen)
      
      // 清理音频资源
      // #ifdef H5
      if (audioElement.value) {
        audioElement.value.pause()
        audioElement.value.srcObject = null
        document.body.removeChild(audioElement.value)
        audioElement.value = null
      }
      // #endif

      // 组件卸载时结束通话
      if (callManager.status.value !== CallStatus.IDLE) {
        callManager.endCall()
      }
    })

    // 计算属性：远程用户信息
    const remoteUser = computed(() => callManager.remoteUser.value)

    // 计算属性：通话状态
    const status = computed(() => callManager.status.value)

    // 计算属性：通话时长
    const callTimer = computed(() => callManager.callTimer.value)

    // 计算属性：状态文本
    const getStatusText = computed(() => {
      switch (status.value) {
        case CallStatus.OUTGOING:
          return '正在等待对方接听...'
        case CallStatus.INCOMING:
          return '来电...'
        case CallStatus.CONNECTED:
          return '通话中'
        default:
          return ''
      }
    })

    // 切换麦克风
    const toggleMic = async () => {
      try {
        isMicEnabled.value = await callManager.toggleMicrophone()
      } catch (error) {
        console.error('切换麦克风失败:', error)
        uni.showToast({
          title: '切换麦克风失败',
          icon: 'none'
        })
      }
    }

    // 切换扬声器
    const toggleSpeaker = async () => {
      try {
        isSpeakerEnabled.value = await callManager.toggleSpeaker()
      } catch (error) {
        console.error('切换扬声器失败:', error)
        uni.showToast({
          title: '切换扬声器失败',
          icon: 'none'
        })
      }
    }

    // 接听电话
    const acceptCall = async () => {
      try {
        await callManager.acceptCall()
      } catch (error) {
        console.error('接听电话失败:', error)
        uni.showToast({
          title: error.message || '接听电话失败',
          icon: 'none'
        })
      }
    }

    // 结束通话
    const endCall = () => {
      callManager.endCall()
    }

    // 格式化通话时长
    const formatDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    }

    return {
      isMicEnabled,
      isSpeakerEnabled,
      visible,
      remoteUser,
      status,
      CallStatus,
      callTimer,
      getStatusText,
      toggleMic,
      toggleSpeaker,
      acceptCall,
      endCall,
      formatDuration
    }
  }
}
</script>

<style scoped>
.call-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.call-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 60rpx 40rpx;
  box-sizing: border-box;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
  animation: slideDown 0.4s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-30rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.avatar-container {
  position: relative;
  margin-bottom: 40rpx;
}

.user-avatar {
  width: 180rpx;
  height: 180rpx;
  border-radius: 90rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.call-indicator {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  width: 24rpx;
  height: 24rpx;
  border-radius: 12rpx;
  background-color: #ff6b6b;
  border: 3rpx solid #fff;
  animation: pulse 2s infinite;
}

.call-indicator.connected {
  background-color: #51cf66;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.user-name {
  font-size: 36rpx;
  color: #fff;
  font-weight: 600;
  margin-bottom: 16rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.call-status {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

.duration-container {
  margin-bottom: 100rpx;
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    transform: translateY(20rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.call-duration {
  font-size: 32rpx;
  color: #fff;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-weight: 500;
  letter-spacing: 2rpx;
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  width: 100%;
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.control-button,
.end-button,
.accept-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  min-width: 120rpx;
}

.control-button.active {
  background-color: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.accept-button {
  background-color: rgba(76, 175, 80, 0.8);
  border-color: rgba(76, 175, 80, 0.6);
}

.end-button {
  background-color: rgba(244, 67, 54, 0.8);
  border-color: rgba(244, 67, 54, 0.6);
}

.button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 24rpx;
  background-color: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.control-button.active .button-icon {
  background-color: rgba(255, 255, 255, 0.2);
}

.accept-button .button-icon {
  background-color: rgba(255, 255, 255, 0.2);
}

.end-button .button-icon {
  background-color: rgba(255, 255, 255, 0.2);
}

.button-text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 500;
  text-align: center;
}

.control-button:active,
.end-button:active,
.accept-button:active {
  transform: scale(0.95);
  opacity: 0.8;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
  .control-buttons {
    gap: 30rpx;
  }
  
  .control-button,
  .end-button,
  .accept-button {
    min-width: 100rpx;
    padding: 20rpx;
  }
  
  .button-icon {
    width: 40rpx;
    height: 40rpx;
  }
  
  .button-text {
    font-size: 20rpx;
  }
}
</style> 