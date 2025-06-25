<template>
  <view class="new-friends-container">
    <!-- 顶部提示 -->
    <view class="tips-bar" v-if="friendRequests.length > 0">
      <text class="tips-text">{{friendRequests.length}}个好友请求</text>
    </view>
    
    <!-- 空状态 -->
    <view v-if="friendRequests.length === 0 && !isLoading" class="empty-state">
      <u-icon name="info-circle" size="80" color="#c0c4cc"></u-icon>
      <text class="empty-text">暂无好友请求</text>
    </view>
    
    <!-- 好友请求列表 -->
    <scroll-view 
      v-else 
      scroll-y 
      class="request-list"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="isLoading" class="loading-state">
        <u-loading-icon mode="circle" size="40"></u-loading-icon>
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="friendRequests.length === 0" class="empty-state">
        <u-icon name="info-circle" size="80" color="#c0c4cc"></u-icon>
        <text class="empty-text">暂无好友请求</text>
      </view>
      
      <view v-else>
        <view 
          v-for="request in friendRequests" 
          :key="request._id"
          class="request-item"
        >
          <view class="user-info">
            <image class="avatar" :src="request.sender.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
            <view class="info-content">
              <text class="username">{{request.sender.username}}</text>
              <text class="email">{{request.sender.email}}</text>
              <text class="time">{{ formatTime(request.createdAt) }}</text>
            </view>
          </view>
          
          <view class="action-buttons">
            <button 
              class="action-btn reject" 
              @click="handleReject(request._id)"
              :disabled="isProcessing[request._id]"
            >拒绝</button>
            <button 
              class="action-btn accept" 
              @click="handleAccept(request._id)"
              :disabled="isProcessing[request._id]"
            >接受</button>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useStore } from 'vuex'

const store = useStore()
const isLoading = ref(true)
const isRefreshing = ref(false)
const isProcessing = ref({}) // 跟踪每个请求的处理状态

// 获取好友请求列表
const friendRequests = computed(() => store.getters.pendingFriendRequests)

// 页面加载时获取好友请求
onMounted(async () => {
  // 检查是否已登录
  if (!store.getters.isAuthenticated) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }
  
  await fetchFriendRequests()
})

onShow(async () => {
  await fetchFriendRequests()
})

// 获取好友请求
const fetchFriendRequests = async () => {
  isLoading.value = true
  try {
    await store.dispatch('fetchFriendRequests')
  } catch (error) {
    console.error('Failed to fetch friend requests:', error)
    uni.showToast({
      title: '获取好友请求失败',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
  }
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  try {
    await fetchFriendRequests()
  } finally {
    isRefreshing.value = false
  }
}

// 接受好友请求
const handleAccept = async (requestId) => {
  // 设置处理状态
  isProcessing.value = { ...isProcessing.value, [requestId]: true }
  
  try {
    // 通过API接受好友请求
    const response = await store.dispatch('acceptFriendRequest', requestId)
    
    if (response.success) {
      // 获取请求信息
      const request = friendRequests.value.find(req => req._id === requestId)
      if (request && request.sender) {
        // 发送WebSocket通知
        store.dispatch('websocket/sendFriendRequestResponseNotification', {
          senderId: request.sender._id,
          response: 'accepted'
        })
      }
      
      uni.showToast({
        title: response.message || '已添加为好友',
        icon: 'success'
      })
      
      // 更新好友请求数量，以便更新角标
      await store.dispatch('fetchFriendRequests')
    } else {
      uni.showToast({
        title: response.message || '接受好友请求失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('Failed to accept friend request:', error)
    uni.showToast({
      title: '接受好友请求失败',
      icon: 'none'
    })
  } finally {
    // 清除处理状态
    const newProcessing = { ...isProcessing.value }
    delete newProcessing[requestId]
    isProcessing.value = newProcessing
  }
}

// 拒绝好友请求
const handleReject = async (requestId) => {
  // 设置处理状态
  isProcessing.value = { ...isProcessing.value, [requestId]: true }
  
  try {
    // 通过API拒绝好友请求
    const response = await store.dispatch('rejectFriendRequest', requestId)
    
    if (response.success) {
      // 获取请求信息
      const request = friendRequests.value.find(req => req._id === requestId)
      if (request && request.sender) {
        // 发送WebSocket通知
        store.dispatch('websocket/sendFriendRequestResponseNotification', {
          senderId: request.sender._id,
          response: 'rejected'
        })
      }
      
      uni.showToast({
        title: response.message || '已拒绝好友请求',
        icon: 'success'
      })
      
      // 更新好友请求数量，以便更新角标
      await store.dispatch('fetchFriendRequests')
    } else {
      uni.showToast({
        title: response.message || '拒绝好友请求失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('Failed to reject friend request:', error)
    uni.showToast({
      title: '拒绝好友请求失败',
      icon: 'none'
    })
  } finally {
    // 清除处理状态
    const newProcessing = { ...isProcessing.value }
    delete newProcessing[requestId]
    isProcessing.value = newProcessing
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = (now - date) / 1000 // 秒数
  
  if (diff < 60) {
    return '刚刚'
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}分钟前`
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}小时前`
  } else if (diff < 604800) {
    return `${Math.floor(diff / 86400)}天前`
  } else {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
</script>

<style scoped>
.new-friends-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.tips-bar {
  padding: 20rpx 30rpx;
  background-color: #f0f9ff;
  border-bottom: 1rpx solid #e5e5e5;
}

.tips-text {
  font-size: 28rpx;
  color: #2979ff;
  font-weight: 500;
}

.request-list {
  flex: 1;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80%;
}

/* Using uview-plus icon component */

.empty-text {
  font-size: 30rpx;
  color: #999;
  margin-top: 20rpx;
}

.loading-state {
  padding: 60rpx 0;
}

/* Using uview-plus loading component */

.loading-text {
  font-size: 30rpx;
  color: #999;
  margin-top: 20rpx;
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 2rpx;
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
  background-color: #f0f0f0;
  object-fit: cover;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.info-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.username {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 8rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time {
  font-size: 24rpx;
  color: #c0c4cc;
}

.action-buttons {
  display: flex;
}

.action-btn {
  min-width: 120rpx;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  margin-left: 20rpx;
  border: none;
  padding: 0 30rpx;
  font-weight: 500;
}

.action-btn.reject {
  background-color: #f8f8f8;
  color: #666;
  border: 1rpx solid #e5e5e5;
}

.action-btn.accept {
  background-color: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 4rpx 10rpx rgba(41, 121, 255, 0.2);
}

.action-btn:disabled {
  opacity: 0.6;
}
</style>