<template>
  <view class="new-friends-container">
    <!-- 顶部提示 -->
    <view class="tips-bar" v-if="friendRequests.length > 0">
      <text class="tips-text">{{friendRequests.length}}个好友请求</text>
    </view>
    
    <!-- 空状态 -->
    <view v-if="friendRequests.length === 0 && !isLoading" class="empty-state">
      <image class="empty-icon" src="/static/empty-friends.png" mode="aspectFit"></image>
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
          </view>
        </view>
        
        <view class="action-buttons">
          <view 
            v-if="request.status === 'pending'" 
            class="action-group"
          >
            <button 
              class="action-btn reject" 
              @click="handleRejectRequest(request._id)"
            >拒绝</button>
            <button 
              class="action-btn accept" 
              @click="handleAcceptRequest(request._id)"
            >接受</button>
          </view>
          
          <text v-else-if="request.status === 'accepted'" class="status-text accepted">已添加</text>
          <text v-else-if="request.status === 'rejected'" class="status-text rejected">已拒绝</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const isLoading = ref(true)
const isRefreshing = ref(false)

// 获取好友请求列表
const friendRequests = computed(() => store.state.friendRequests)

// 页面加载完成
onMounted(async () => {
  // 检查是否已登录
  if (!store.getters.isAuthenticated) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }
  
  // 获取好友请求
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
const handleAcceptRequest = async (requestId) => {
  try {
    await store.dispatch('respondToFriendRequest', {
      requestId,
      accept: true
    })
    
    uni.showToast({
      title: '已添加好友',
      icon: 'success'
    })
  } catch (error) {
    console.error('Failed to accept friend request:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

// 拒绝好友请求
const handleRejectRequest = async (requestId) => {
  try {
    await store.dispatch('respondToFriendRequest', {
      requestId,
      accept: false
    })
    
    uni.showToast({
      title: '已拒绝请求',
      icon: 'success'
    })
  } catch (error) {
    console.error('Failed to reject friend request:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
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
  background-color: rgba(var(--primary-rgb), 0.1);
}

.tips-text {
  font-size: 28rpx;
  color: var(--primary-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 30rpx;
  color: #999;
}

.request-list {
  flex: 1;
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background-color: #ffffff;
  margin-bottom: 2rpx;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
  margin-right: 20rpx;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
  font-weight: 500;
}

.email {
  font-size: 26rpx;
  color: #999;
}

.action-buttons {
  display: flex;
  align-items: center;
}

.action-group {
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
}

.action-btn.reject {
  background-color: #f5f5f5;
  color: #666;
}

.action-btn.accept {
  background-color: var(--primary-color);
  color: #ffffff;
}

.status-text {
  font-size: 28rpx;
}

.status-text.accepted {
  color: var(--primary-color);
}

.status-text.rejected {
  color: #999;
}
</style>