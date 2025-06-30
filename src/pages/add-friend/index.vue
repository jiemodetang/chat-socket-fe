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
      <view v-if="isLoadingAllUsers || isSearching" class="loading-state">
        <u-loading-icon mode="circle" size="40"></u-loading-icon>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 初始状态 -->
      <view v-else-if="!hasSearched && displayUsers.length === 0" class="initial-state">
        <u-icon name="search" size="80" color="#c0c4cc"></u-icon>
        <text class="initial-text">搜索用户名或邮箱添加好友</text>
      </view>

      <!-- 空搜索结果 -->
      <view v-else-if="hasSearched && displayUsers.length === 0" class="empty-state">
        <u-icon name="info-circle" size="80" color="#c0c4cc"></u-icon>
        <text class="empty-text">未找到匹配的用户</text>
      </view>

      <!-- 用户列表 -->
      <scroll-view v-else scroll-y class="user-list" :key="'user-list-' + displayUsers.length" ref="userListScroll">
        <view v-for="user in displayUsers" :key="user._id" class="user-item">
          <view class="user-info">
            <view class="avatar-container">
              <image class="avatar" :src="user.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <view class="online-dot" :class="{ 'online': user.status === 'online' }"></view>
            </view>
            <view class="info-content">
              <view class="name-container">
                <text class="username">{{ user.username }}</text>
                <text v-if="isFriend(user._id) && getFriendRemark(user._id)" class="remark">({{ getFriendRemark(user._id) }})</text>
                <text v-if="isFriend(user._id)" class="friend-tag">好友</text>
              </view>
              <text class="email">{{ user.email }}</text>
            </view>
          </view>

          <view class="action-buttons">
            <text v-if="isCurrentUser(user._id)" class="status-text">自己</text>
            <button v-else-if="isFriend(user._id)" class="action-btn chat" @click="handleStartChat(user._id)">聊天</button>
            <button v-else-if="hasReceivedRequest(user._id)" class="action-btn accept" @click="handleAcceptRequest(user._id)">接受</button>
            <button v-else-if="hasSentRequest(user._id)" class="status-text">已发送</button>
            <button v-else class="action-btn add" @click="handleSendRequest(user._id)">添加</button>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useStore } from 'vuex'
// 确保已在main.js中全局引入uview-plus

const store = useStore()
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)
const userListScroll = ref(null)

// 获取好友列表
const friends = computed(() => store.state.friends)

// 获取好友请求列表
const pendingRequests = computed(() => store.getters.pendingFriendRequests || [])

const allUsers = computed(() => store.state.allUsers)
const isLoadingAllUsers = ref(false)

// 计算要显示的用户列表
const displayUsers = computed(() => {
  // 如果已经搜索过，显示所有搜索结果
  if (hasSearched.value && searchQuery.value.trim()) {
    return searchResults.value;
  }
  // 显示好友列表，确保处理正确的数据结构
  if (!friends.value || !Array.isArray(friends.value)) {
    return [];
  }
  return friends.value.map(friend => {
    if (friend && friend.user) {
      return {
        ...friend.user,
        remark: friend.remark || ''
      };
    }
    return null;
  }).filter(Boolean); // 过滤掉null值
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
    // 获取好友列表和好友请求
    await Promise.all([
      store.dispatch('fetchFriends'),
      store.dispatch('fetchFriendRequests')
    ])
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    isLoadingAllUsers.value = false
  }
})

// 每次页面显示时刷新数据
onShow(async () => {
  if (store.getters.isAuthenticated) {
    try {
      await Promise.all([
        store.dispatch('fetchFriends'),
        store.dispatch('fetchFriendRequests')
      ])
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
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
    // 使用API接口搜索用户
    const response = await store.dispatch('searchUsers', searchQuery.value.trim())
    if (response.success && response.users) {
      console.log(response.users);
      
      // 处理搜索结果，标记是否为好友
      searchResults.value = response.users.map(user => {
        // 检查是否为好友
        const friend = friends.value.find(f => f.user._id === user._id);
        if (friend) {
          return {
            ...user,
            remark: friend.remark || ''
          };
        }
        return user;
      });
      
      // 等待DOM更新后再进行滚动操作
      await nextTick();
      
      // 不需要在这里显示toast，因为已经有空状态UI了
    } else {
      searchResults.value = []
      uni.showToast({
        title: response.message || '未找到匹配用户',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('Failed to search users:', error)
    searchResults.value = []
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
  if (!friends.value || !Array.isArray(friends.value) || !userId) {
    return false;
  }
  return friends.value.some(friend => friend && friend.user && friend.user._id === userId);
}

// 获取好友备注
const getFriendRemark = (userId) => {
  if (!friends.value || !Array.isArray(friends.value) || !userId) {
    return '';
  }
  const friend = friends.value.find(friend => friend && friend.user && friend.user._id === userId);
  return friend && friend.remark ? friend.remark : '';
}

const isCurrentUser = (userId) => {
  return store.state.user?._id === userId
}

// 判断是否已发送好友请求
const hasSentRequest = (userId) => {
  // 在实际应用中，你可能需要从服务器获取已发送的请求
  return false // 暂时假设没有发送过
}

// 判断是否已接收到好友请求
const hasReceivedRequest = (userId) => {
  if (!pendingRequests.value || !Array.isArray(pendingRequests.value) || !userId) {
    return false;
  }
  return pendingRequests.value.some(request => request && request.sender && request.sender._id === userId);
}

// 发送好友请求
const handleSendRequest = async (userId) => {
  try {
    // 通过API发送好友请求
    const response = await store.dispatch('sendFriendRequest', userId)
    if (response.success) {
      // 发送WebSocket通知
      store.dispatch('websocket/sendFriendRequestNotification', userId)
      
      uni.showToast({
        title: response.message || '好友请求已发送',
        icon: 'success'
      })
    } else {
      uni.showToast({
        title: response.message || '发送请求失败',
        icon: 'none'
      })
    }
    
    // 刷新搜索结果
    if (searchQuery.value.trim()) {
      await handleSearch()
    }
  } catch (error) {
    console.error('Failed to send friend request:', error)
    uni.showToast({
      title: '发送请求失败',
      icon: 'none'
    })
  }
}

// 接受好友请求
const handleAcceptRequest = async (userId) => {
  if (!pendingRequests.value || !Array.isArray(pendingRequests.value) || !userId) {
    return;
  }
  
  // 找到对应的请求ID
  const request = pendingRequests.value.find(req => req && req.sender && req.sender._id === userId);
  if (!request) return;
  
  try {
    const response = await store.dispatch('acceptFriendRequest', request._id);
    if (response.success) {
      uni.showToast({
        title: response.message || '已添加好友',
        icon: 'success'
      });
      
      // 刷新数据
      await Promise.all([
        store.dispatch('fetchFriends'),
        store.dispatch('fetchFriendRequests')
      ]);
      
      // 刷新搜索结果
      if (searchQuery.value.trim()) {
        await handleSearch();
      }
    } else {
      uni.showToast({
        title: response.message || '添加好友失败',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('Failed to accept friend request:', error);
    uni.showToast({
      title: '添加好友失败',
      icon: 'none'
    });
  }
}

// 开始聊天
const handleStartChat = async (userId) => {
  try {
    const result = await store.dispatch('createSingleChat', userId)
    if (result.success) {
      // 设置当前聊天
      store.commit('SET_CURRENT_CHAT', result.chat._id)
      
      // 跳转到聊天页面
      uni.navigateTo({
        url: `/pages/chat/index?id=${result.chat._id}`
      })
    } else {
      uni.showToast({
        title: '创建聊天失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('Failed to create chat:', error)
    uni.showToast({
      title: '创建聊天失败',
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
  background-color: #07c160;
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
  height: 80%;
}

.initial-text,
.empty-text {
  font-size: 30rpx;
  color: #999;
  margin-top: 20rpx;
}

.loading-text {
  font-size: 30rpx;
  color: #999;
  margin-top: 20rpx;
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

.name-container {
  display: flex;
  align-items: center;
}

.username {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
  font-weight: 500;
}

.remark {
  font-size: 26rpx;
  color: #999;
  margin-left: 8rpx;
}

.friend-tag {
  font-size: 22rpx;
  color: #ffffff;
  background-color: #1989fa;
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
  margin-left: 12rpx;
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
  background-color: #07c160;
  color: #ffffff;
}

.action-btn.accept {
  background-color: #09BB07;
  color: #ffffff;
}

.action-btn.chat {
  background-color: #1989fa;
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