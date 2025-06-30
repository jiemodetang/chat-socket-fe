<template>
  <view>
    <view class="container">
      <router-view></router-view>
    </view>
  </view>
</template>

<script setup>
import { useStore } from 'vuex'
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { mapState, mapActions } from 'vuex'
import { loginTUICallKit } from '@/utils/tuiCallKit'
import { watch } from 'vue'
import { updateContactsBadge, updateConversationTabBadge, updateAllBadges } from '@/utils/badgeManager'

const store = useStore()

// 监听好友请求数量变化，更新通讯录角标
watch(() => store.getters.pendingFriendRequestsCount, (newCount) => {
  if (newCount !== undefined) {
    updateContactsBadge(newCount)
  }
})

// 监听未读消息数量变化，更新会话角标
watch(() => store.getters.unreadCount, (newCount) => {
  if (newCount !== undefined) {
    updateConversationTabBadge(newCount)
  }
})

// 监听好友备注变化，更新相关页面标题
watch(() => store.state.friends, () => {
  // 如果当前在聊天页面，更新标题
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  
  if (currentPage && currentPage.route && currentPage.route.includes('pages/chat/index')) {
    // 获取当前聊天ID
    const chatId = currentPage.$vm.chatId
    if (chatId) {
      // 找到对应的聊天
      const chat = store.state.chats.find(c => c._id === chatId)
      if (chat) {
        // 更新标题
        const currentUser = store.getters.currentUser
        if (!chat.isGroupChat && currentUser) {
          const otherUser = chat.users.find(u => u._id !== currentUser._id)
          if (otherUser) {
            // 查找好友数据
            const friendData = store.state.friends.find(f => f.user._id === otherUser._id)
            if (friendData) {
              const title = friendData.remark || otherUser.username || '未知用户'
              uni.setNavigationBarTitle({ title })
            }
          }
        }
      }
    }
  }
}, { deep: true })

// 应用启动时初始化
onLaunch(async () => {
  console.log('App Launch')

  // 禁用截屏和录屏功能
  disableScreenshotsAndRecording()
  
  // 检查是否有token，如果有则初始化WebSocket连接和获取用户信息
  const token = uni.getStorageSync('token')
  if (token) {
    // 初始化WebSocket连接
    store.dispatch('websocket/initWebSocket', token)
    
    // 获取用户信息
    try {
      const result = await store.dispatch('fetchCurrentUser')
      if (result.success) {
        // 确保用户信息获取成功后再初始化TUICallKit
        const user = store.getters.currentUser
        if (user) {
          loginTUICallKit(user,
            () => console.log('App Launch: TUICallKit登录成功'),
            (err) => console.error('App Launch: TUICallKit登录失败:', err)
          )
        }
        
        // 获取好友请求，并更新角标
        await store.dispatch('fetchFriendRequests')
        
        // 获取聊天列表，并更新角标
        await store.dispatch('fetchChats')
        
        // 更新所有角标
        updateAllBadges(store)
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      // 如果获取用户信息失败，可能是token过期，清除token并跳转到登录页
      uni.removeStorageSync('token')
      uni.redirectTo({
        url: '/pages/login/index'
      })
    }
  }
})

onShow(() => {
  console.log('App Show')
  // 应用显示时更新角标
  const friendRequestCount = store.getters.pendingFriendRequestsCount
  const unreadMessageCount = store.getters.unreadCount
  
  // 更新通讯录角标
  if (friendRequestCount !== undefined) {
    updateContactsBadge(friendRequestCount)
  }
  
  // 更新会话角标
  if (unreadMessageCount !== undefined) {
    updateConversationTabBadge(unreadMessageCount)
  }
})

onHide(() => {
  console.log('App Hide')
})

function disableScreenshotsAndRecording() {
    // #ifdef APP-PLUS && APP-ANDROID
    try {
        const activity = plus.android.runtimeMainActivity();
        const WindowManager = plus.android.importClass("android.view.WindowManager");
        const LayoutParams = WindowManager.LayoutParams;
        
        // 获取当前 Window
        const window = activity.getWindow();
        
        // 添加 FLAG_SECURE（禁止截屏和录屏）
        window.addFlags(LayoutParams.FLAG_SECURE);
        
        console.log("已禁用截屏和录屏");
    } catch (e) {
        console.error("禁用失败:", e);
    }
    // #endif
}


</script>

<style lang="scss">
 	@import "uview-plus/index.scss";
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei',
    sans-serif;
  --primary-color: #2979ff;
  --success-color: #19be6b;
  --warning-color: #ff9900;
  --error-color: #fa3534;
  --dark-color: #303133;
  --content-color: #606266;
  --tips-color: #909399;
  --light-color: #c0c4cc;
  --border-color: #e4e7ed;
  --bg-color: #f3f4f6;
  background-color: var(--bg-color);
  color: var(--dark-color);
}

/* 通用样式 */
.page-container {
  padding: 30rpx;
}

.flex-row {
  display: flex;
  flex-direction: row;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-around {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.flex-1 {
  flex: 1;
}

.text-primary {
  color: var(--primary-color);
}

.text-success {
  color: var(--success-color);
}

.text-warning {
  color: var(--warning-color);
}

.text-error {
  color: var(--error-color);
}

.text-dark {
  color: var(--dark-color);
}

.text-content {
  color: var(--content-color);
}

.text-tips {
  color: var(--tips-color);
}

.text-light {
  color: var(--light-color);
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.margin-top-sm {
  margin-top: 20rpx;
}

.margin-top {
  margin-top: 30rpx;
}

.margin-top-lg {
  margin-top: 40rpx;
}

.margin-bottom-sm {
  margin-bottom: 20rpx;
}

.margin-bottom {
  margin-bottom: 30rpx;
}

.margin-bottom-lg {
  margin-bottom: 40rpx;
}

.padding-sm {
  padding: 20rpx;
}

.padding {
  padding: 30rpx;
}

.padding-lg {
  padding: 40rpx;
}

.rounded {
  border-radius: 8rpx;
}

.rounded-lg {
  border-radius: 16rpx;
}

.rounded-circle {
  border-radius: 50%;
}

.shadow {
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
}

.bg-white {
  background-color: #ffffff;
}

.border {
  border: 2rpx solid var(--border-color);
}

.border-bottom {
  border-bottom: 2rpx solid var(--border-color);
}

.border-top {
  border-top: 2rpx solid var(--border-color);
}

.border-left {
  border-left: 2rpx solid var(--border-color);
}

.border-right {
  border-right: 2rpx solid var(--border-color);
}

.container {
  width: 100%;
  min-height: 100vh;
}
</style>
