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

const store = useStore()

// 监听好友请求数量变化，更新角标
watch(() => store.getters.pendingFriendRequestsCount, (newCount) => {
  updateTabBarBadge(newCount)
})

// 更新Tab角标
const updateTabBarBadge = (count) => {
  if (count > 0) {
    // 设置角标
    uni.setTabBarBadge({
      index: 1, // 通讯录的索引
      text: count.toString()
    }).catch(err => {
      console.log('Failed to set badge:', err)
    })
  } else {
    // 移除角标
    uni.removeTabBarBadge({
      index: 1
    }).catch(err => {
      // 忽略可能的错误（如果角标不存在）
      console.log('No badge to remove')
    })
  }
}

onLaunch(async () => {
  console.log('App Launch')
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
        
        // 获取好友请求
        await store.dispatch('fetchFriendRequests')
        
        // 初始化角标
        updateTabBarBadge(store.getters.pendingFriendRequestsCount)
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
  const count = store.getters.pendingFriendRequestsCount
  if (count !== undefined) {
    updateTabBarBadge(count)
  }
})

onHide(() => {
  console.log('App Hide')
})
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
