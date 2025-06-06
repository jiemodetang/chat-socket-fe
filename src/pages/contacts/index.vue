<template>
  <view class="contacts-container">
    <!-- 顶部搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <u-icon name="search" size="28" color="#666"></u-icon>
        <input 
          class="search-input" 
          type="text" 
          v-model="searchText" 
          placeholder="搜索好友"
          confirm-type="search"
          @confirm="handleSearch"
        />
      </view>
    </view>
    
    <!-- 功能入口 -->
    <view class="feature-section">
      <!-- <view class="feature-item" @click="goToNewFriends">
        <view class="feature-icon new-friend-icon">
          <u-icon name="account-fill" size="28" color="#fff"></u-icon>
        </view>
        <text class="feature-name">新朋友</text>
        <view v-if="pendingRequests > 0" class="badge">{{ pendingRequests }}</view>
      </view> -->
      
      <view class="feature-item" @click="goToAddFriend">
        <view class="feature-icon add-friend-icon">
          <u-icon name="plus" size="28" color="#fff"></u-icon>
        </view>
        <text class="feature-name">添加好友</text>
      </view>
      
      <view class="feature-item" @click="goToCreateGroup">
        <view class="feature-icon create-group-icon">
          <u-icon name="account-fill" size="28" color="#fff"></u-icon>
        </view>
        <text class="feature-name">创建群聊</text>
      </view>
    </view>
    
    <!-- 好友列表 -->
    <scroll-view 
      scroll-y 
      class="contacts-list"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="!friends || friends.length === 0 && !isLoading" class="empty-state">
        <image class="empty-icon" src="/static/empty-contacts.svg" mode="aspectFit"></image>
        <text class="empty-text">暂无好友</text>
        <button class="add-friend-btn" @click="goToAddFriend">添加好友</button>
      </view>
      
      <view v-else>
        <!-- 索引列表 -->
        <view v-for="(group, key) in groupedFriends" :key="key" class="index-group">
          <view class="index-title" :id="`index-${key}`">{{ key }}</view>
          
          <view 
            v-for="friend in group" 
            :key="friend._id" 
            class="contact-item"
            @click="handleContactClick(friend)"
          >
            <view class="avatar-wrapper">
              <image 
                class="contact-avatar" 
                :src="friend.avatar || '/static/default-avatar.png'" 
                mode="aspectFill"
              ></image>
              <view class="status-dot" :class="{ 'online': friend.status === 'online' }"></view>
            </view>
            
            <view class="contact-info">
              <text class="contact-name">{{ friend.username }}</text>
              <text v-if="friend.signature" class="contact-signature">{{ friend.signature }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    
    <!-- 右侧索引条 -->
    <view class="index-bar">
      <view 
        v-for="letter in indexList" 
        :key="letter" 
        class="index-item"
        @click="scrollToIndex(letter)"
      >
        {{ letter }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const searchText = ref('')
const isLoading = ref(true)
const isRefreshing = ref(false)
const pendingRequests = ref(0)

// 获取好友列表
const friends = computed(() => store.getters.friendsList)

// 索引列表
const indexList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#']

// 按首字母分组的好友列表
const groupedFriends = computed(() => {
  const groups = {}
  
  // 初始化所有字母分组
  indexList.forEach(letter => {
    groups[letter] = []
  })

  // 根据首字母分组
  friends.value.forEach(friend => {
    const firstLetter = getFirstLetter(friend.username)
    if (groups[firstLetter]) {
      groups[firstLetter].push(friend)
    } else {
      groups['#'].push(friend)
    }
  })
  
  // 过滤掉空的分组
  const filteredGroups = {}
  for (const key in groups) {
    if (groups[key].length > 0) {
      filteredGroups[key] = groups[key]
    }
  }
  
  return filteredGroups
})

// 获取名字的首字母（简单实现，实际应用中可能需要更复杂的拼音转换）
const getFirstLetter = (name) => {
  if (!name) return '#'
  
  const first = name.charAt(0).toUpperCase()
  if (/[A-Z]/.test(first)) {
    return first
  }
  
  // 这里简化处理，实际应用中应该使用拼音库
  return '#'
}

// 页面加载时获取好友列表
onMounted(async () => {
  // 检查是否已登录
  if (!store.getters.isAuthenticated) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }
  
  // await fetchFriends()
  pendingRequests.value = store.state.friendRequests.length
})
onShow(async () => {
  await fetchFriends()
})

// 获取好友列表
const fetchFriends = async () => {
  isLoading.value = true
  try {
    await store.dispatch('fetchFriends')
  } catch (error) {
    console.error('Failed to fetch friends:', error)
    uni.showToast({
      title: '获取好友列表失败',
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
    await fetchFriends()
    pendingRequests.value = store.state.friendRequests.length
  } finally {
    isRefreshing.value = false
  }
}

// 搜索好友
const handleSearch = () => {
  if (!searchText.value.trim()) return
  
  // 实现搜索逻辑
  uni.showToast({
    title: '搜索功能开发中',
    icon: 'none'
  })
}

// 点击联系人
const handleContactClick = async (friend) => {
  // 创建或获取与该好友的聊天
  try {
    
    const result = await store.dispatch('createSingleChat', friend._id)
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

// 滚动到指定索引
const scrollToIndex = (letter) => {
  const selector = uni.createSelectorQuery()
  selector.select(`#index-${letter}`).boundingClientRect()
  selector.selectViewport().scrollOffset()
  selector.exec(res => {
    if (res[0]) {
      uni.pageScrollTo({
        scrollTop: res[0].top + res[1].scrollTop - 100,
        duration: 300
      })
    }
  })
}

// 跳转到新朋友页面
const goToNewFriends = () => {
  uni.navigateTo({
    url: '/pages/new-friends/index'
  })
}

// 跳转到添加好友页面
const goToAddFriend = () => {
  uni.navigateTo({
    url: '/pages/add-friend/index'
  })
}

// 跳转到创建群聊页面
const goToCreateGroup = () => {
  uni.navigateTo({
    url: '/pages/create-group/index'
  })
}
</script>

<style scoped>
.contacts-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f8f8;
  position: relative;
}

.search-bar {
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 24rpx;
  height: 72rpx;
}

.icon-search {
  font-size: 36rpx;
  color: #999;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
}

.feature-section {
  display: flex;
  padding: 30rpx;
  background-color: #ffffff;
  margin-bottom: 20rpx;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 60rpx;
  position: relative;
}

.feature-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
  font-size: 48rpx;
  color: #ffffff;
}

.new-friend-icon {
  background-color: #ff9500;
}

.add-friend-icon {
  background-color: #34c759;
}

.create-group-icon {
  background-color: #007aff;
}

.feature-name {
  font-size: 28rpx;
  color: #333;
}

.badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  background-color: #ff3b30;
  color: #ffffff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
}

.contacts-list {
  flex: 1;
  background-color: #ffffff;
}

.index-group {
  padding-bottom: 20rpx;
}

.index-title {
  padding: 16rpx 30rpx;
  font-size: 28rpx;
  color: #999;
  background-color: #f8f8f8;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f5f5f5;
}

.avatar-wrapper {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  margin-right: 24rpx;
}

.contact-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 10rpx;
  background-color: #f0f0f0;
}

.contact-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.contact-name {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.contact-signature {
  font-size: 26rpx;
  color: #999;
}

.index-bar {
  position: fixed;
  right: 10rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.index-item {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: var(--primary-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 40rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.add-friend-btn {
  width: 300rpx;
  height: 80rpx;
  background-color: var(--primary-color);
  color: #ffffff;
  border-radius: 40rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #999;
  border: 2rpx solid #fff;
}

.status-dot.online {
  background-color: #09BB07;
}
</style>