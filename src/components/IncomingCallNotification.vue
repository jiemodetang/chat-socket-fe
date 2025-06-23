<template>
  <view class="incoming-call-notification" v-if="visible">
    <view class="notification-content" :class="{ 'slide-in': visible }">
      <!-- 左侧头像 -->
      <view class="avatar-container">
        <image class="caller-avatar" :src="callerAvatar" mode="aspectFill"></image>
        <view class="avatar-ring"></view>
      </view>
      
      <!-- 中间信息 -->
      <view class="call-info">
        <text class="caller-name">{{ callerName }}</text>
        <text class="call-status">语音通话</text>
      </view>
      
      <!-- 右侧按钮 -->
      <view class="action-buttons">
        <view class="reject-btn" @click="handleReject" :class="{ 'btn-pulse': true }">
          <u-icon name="close" color="#fff" size="24"></u-icon>
        </view>
        <view class="accept-btn" @click="handleAccept" :class="{ 'btn-pulse': true }">
          <u-icon name="phone" color="#fff" size="24"></u-icon>
        </view>
      </view>
    </view>
  </view>
  

</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { callManager } from '@/utils/call'
import { useStore } from 'vuex'
import websocketService from '@/utils/websocket'

export default {
  name: 'IncomingCallNotification',
  setup() {
    const store = useStore()
    const visible = ref(false)
    const callerInfo = ref(null)

    // 计算属性：来电者头像
    const callerAvatar = computed(() => {
      return callerInfo.value?.avatar || '/static/default-avatar.png'
    })

    // 计算属性：来电者名称
    const callerName = computed(() => {
      return callerInfo.value?.username || '未知用户'
    })

    // 监听来电事件
    const handleIncomingCall = (data) => {
      console.log('IncomingCallNotification 收到来电事件:', data)
      callerInfo.value = data.caller
      visible.value = true
      console.log('当前 visible 状态:', visible.value)
    }

    // 监听隐藏来电事件
    const handleHideIncomingCall = () => {
      console.log('IncomingCallNotification 收到隐藏事件')
      visible.value = false
    }

    // 监听通话结束事件
    const handleCallEnded = () => {
      console.log('IncomingCallNotification 收到通话结束事件')
      visible.value = false
      callerInfo.value = null
    }

    // 组件挂载时注册事件监听器
    onMounted(() => {
      console.log('IncomingCallNotification 组件挂载，注册事件监听器')
      uni.$on('incomingCall', handleIncomingCall)
      uni.$on('hideIncomingCall', handleHideIncomingCall)
      uni.$on('callEnded', handleCallEnded)
    })

    // 处理接听
    const handleAccept = async () => {
      console.log('IncomingCallNotification: 用户点击接听按钮');
      visible.value = false;
      
      // 从store中找到与来电者的聊天
      const chat = store.state.chats.find(chat => {
        if (!chat.isGroupChat) {
          return chat.users.some(user => user._id === callerInfo.value._id);
        }
        return false;
      });

      if (!chat?._id) {
        console.error('未找到对应的聊天会话');
        uni.showToast({
          title: '未找到聊天会话',
          icon: 'none'
        });
        return;
      }
      
      // 发送通话记录消息
      websocketService.sendChatMessage(chat._id, '语音通话', 'call');
      
      // 跳转到聊天页面并触发通话界面显示
      uni.navigateTo({
        url: `/pages/chat/index?id=${chat._id}`,
        success: () => {
          // 在页面跳转成功后，发出显示CallScreen的事件
          uni.$emit('showCallScreen', {
            type: 'voice',
            peer: callerInfo.value,
            isIncoming: true,
            autoAnswer: true // 标记这是自动接听
          });
        },
        fail: (error) => {
          console.error('页面跳转失败:', error);
          // 即使页面跳转失败，也尝试接受通话
          callManager.acceptCall().catch(err => {
            console.error('接听失败:', err);
          });
        }
      });
    }

    // 处理拒绝
    const handleReject = () => {
      visible.value = false
      callManager.rejectCall(callerInfo.value._id)
    }

    // 组件销毁时清理事件监听器
    onUnmounted(() => {
      console.log('IncomingCallNotification 组件卸载，清理事件监听器')
      uni.$off('incomingCall', handleIncomingCall)
      uni.$off('hideIncomingCall', handleHideIncomingCall)
      uni.$off('callEnded', handleCallEnded)
    })

    return {
      visible,
      callerAvatar,
      callerName,
      handleAccept,
      handleReject
    }
  }
}
</script>

<style scoped>
.incoming-call-notification {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 20rpx;
  /* #ifdef APP-PLUS */
  padding-top: 44px; /* 适配APP状态栏 */
  /* #endif */
}

.notification-content {
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  animation: slideDown 0.3s ease;
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.notification-content.slide-in {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.avatar-container {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  margin-right: 20rpx;
}

.caller-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.avatar-ring {
  position: absolute;
  top: -4rpx;
  left: -4rpx;
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  border: 2rpx solid #07c160;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.7;
  }
}

.call-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.caller-name {
  font-size: 32rpx;
  color: #ffffff;
  margin-bottom: 4rpx;
  font-weight: 500;
}

.call-status {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.action-buttons {
  display: flex;
  gap: 20rpx;
}

.reject-btn,
.accept-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.reject-btn {
  background-color: #ff4d4f;
  box-shadow: 0 4rpx 12rpx rgba(255, 77, 79, 0.3);
}

.reject-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 79, 0.4);
}

.accept-btn {
  background-color: #07c160;
  box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.3);
}

.accept-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.4);
}

.btn-pulse {
  animation: buttonPulse 2s infinite;
}

@keyframes buttonPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.test-button {
  position: fixed;
  bottom: 20rpx;
  left: 20rpx;
  right: 20rpx;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 