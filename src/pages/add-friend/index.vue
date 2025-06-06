<template>
  <view class="add-friend-container">
    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input class="search-input" type="text" v-model="searchQuery" placeholder="搜索用户名或邮箱" confirm-type="search"
          @confirm="handleSearch" />
        <text v-if="searchQuery.length > 0" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <button class="search-btn" @click="handleSearch">搜索</button>
    </view>

    <!-- 用户列表 -->
    <view class="users-container">
      <!-- 加载状态 -->
      <view v-if="isLoadingAllUsers" class="loading-state">
        <text>加载中...</text>
      </view>

      <!-- 初始状态 -->
      <view v-else-if="!hasSearched && displayUsers.length === 0" class="initial-state">
        <image class="initial-icon" src="/static/search-friends.png" mode="aspectFit"></image>
        <text class="initial-text">搜索用户名或邮箱添加好友</text>
      </view>

      <!-- 用户列表 -->
      <scroll-view v-else scroll-y class="user-list">
        <view v-for="user in displayUsers" :key="user._id" class="user-item">
          <view class="user-info">
            <view class="avatar-container">
              <image class="avatar" :src="user.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <view class="online-dot" :class="{ 'online': user.status === 'online' }"></view>
            </view>
            <view class="info-content">
              <text class="username">{{ user.username }}</text>
              <text class="email">{{ user.email }}</text>
            </view>
          </view>

          <view class="action-buttons">
            <text v-if="isCurrentUser(user._id)" class="status-text">自己</text>
            <button v-else-if="!isFriend(user._id)" class="action-btn add"
              @click="handleAddFriend(user._id)">添加</button>
            <text v-else-if="isFriend(user._id)" class="status-text">已是好友</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)

// 获取好友列表
const friends = computed(() => store.state.friends)

// 获取好友请求列表
const friendRequests = computed(() => store.state.friendRequests)

const allUsers = computed(() => store.state.allUsers)
const isLoadingAllUsers = ref(false)

// 计算要显示的用户列表
const displayUsers = computed(() => {
  if (hasSearched.value && searchQuery.value.trim()) {
    return searchResults.value
  }
  return allUsers.value
})

onMounted(async () => {
  if (!store.getters.isAuthenticated) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }

  try {
    isLoadingAllUsers.value = true
    await store.dispatch('fetchAllUsers')
  } catch (error) {
    console.error('Failed to fetch all users:', error)
  } finally {
    isLoadingAllUsers.value = false
  }
})

// 搜索用户
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    // 清空搜索结果但保留已搜索状态
    searchResults.value = []
    hasSearched.value = true
    return
  }

  isSearching.value = true
  hasSearched.value = true

  try {
    const response = await store.dispatch('searchUsers', searchQuery.value.trim())
    searchResults.value = response.users
  } catch (error) {
    console.error('Failed to search users:', error)
    uni.showToast({
      title: '搜索失败',
      icon: 'none'
    })
  } finally {
    isSearching.value = false
  }
}

// 清空搜索
const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false
}

// 判断是否已经是好友
const isFriend = (userId) => {
  return friends.value.some(friend => friend._id === userId)
}

const isCurrentUser = (userId) => {
  return store.state.user?._id === userId
}

// 添加好友
const handleAddFriend = async (userId) => {
  try {
    await store.dispatch('sendFriendRequest', userId)
    uni.showToast({
      title: '已添加好友',
      icon: 'success'
    })
    await store.dispatch('fetchFriends')
  } catch (error) {
    console.error('Failed to send friend request:', error)
    uni.showToast({
      title: '发送请求失败',
      icon: 'none'
    })
  }
}
</script>

<style scoped>
.add-friend-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e5e5;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 20rpx;
  height: 72rpx;
}

.search-icon {
  font-size: 32rpx;
  color: #999;
  margin-right: 10rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.clear-icon {
  font-size: 28rpx;
  color: #999;
  padding: 10rpx;
}

.search-btn {
  width: 120rpx;
  height: 72rpx;
  background-color: var(--primary-color);
  color: #ffffff;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 20rpx;
  font-size: 28rpx;
  border: none;
}

.users-container {
  flex: 1;
  position: relative;
}

.initial-state,
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.initial-icon,
.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.initial-text,
.empty-text {
  font-size: 30rpx;
  color: #999;
}

.loading-state text {
  font-size: 30rpx;
  color: #999;
}

.user-list {
  height: 100%;
}

.user-item {
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

.avatar-container {
  position: relative;
  width: 100rpx;
  height: 100rpx;
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

.action-btn {
  min-width: 120rpx;
  height: 70rpx;
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  border: none;
}

.action-btn.add {
  background-color: var(--primary-color);
  color: #ffffff;
}

.status-text {
  font-size: 28rpx;
  color: #999;
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background-color: #999;
  border: 2rpx solid #fff;
}

.online-dot.online {
  background-color: #09BB07;
}

:deep(.uni-scroll-view) {
  overflow: auto !important;
}
</style>