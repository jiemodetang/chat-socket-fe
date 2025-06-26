<template>
  <view class="create-group-container">
    <!-- 顶部输入区域 -->
    <view class="input-area">
      <view class="group-name-input">
        <text class="input-label">群聊名称</text>
        <input type="text" v-model="groupName" placeholder="请输入群聊名称" maxlength="20" />
      </view>

      <!-- 已选择的好友展示区域 -->
      <view class="selected-friends" v-if="selectedFriends.length > 0">
        <scroll-view scroll-x class="selected-scroll">
          <view class="selected-list">
            <view v-for="friend in selectedFriends" :key="friend._id" class="selected-item">
              <image class="selected-avatar" :src="friend.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <text class="selected-name">{{ friend.displayName }}</text>
              <view class="remove-btn" @click.stop="removeSelectedFriend(friend)">
                <text class="remove-icon">×</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 搜索框 -->
      <view class="search-bar">
        <u-icon name="search" size="20" color="#999"></u-icon>
        <input class="search-input" type="text" v-model="searchQuery" placeholder="搜索好友" />
      </view>
    </view>

    <!-- 好友列表 -->
    <view class="friend-list-container">
      <scroll-view scroll-y class="friend-list" :class="{ 'has-selected': selectedFriends.length > 0 }">
        <!-- 空状态 -->
        <view v-if="filteredFriends.length === 0" class="empty-state">
          <text class="empty-text">{{ isLoading ? '加载中...' : '暂无好友' }}</text>
        </view>

        <view v-else>
          <view v-for="friend in filteredFriends" :key="friend._id" class="friend-item"
            :class="{ 'selected': isSelected(friend._id) }" @click="toggleSelectFriend(friend)">
            <view class="friend-info">
              <image class="avatar" :src="friend.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <text class="username">{{ friend.displayName }}</text>
            </view>

            <view class="checkbox" :class="{ 'checked': isSelected(friend._id) }">
              <text v-if="isSelected(friend._id)" class="check-icon">✓</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <button class="create-btn" :class="{ 'active': canCreate }" :disabled="!canCreate"
        @click="handleCreateGroup">创建群聊</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const groupName = ref('')
const searchQuery = ref('')
const selectedFriends = ref([])
const isLoading = ref(true)

// 获取好友列表
const friends = computed(() => {
  // 转换好友数据结构，使其适配现有UI
  return store.state.friends.map(friendData => {
    const user = friendData.user
    // 如果有备注，则使用备注作为显示名称
    if (friendData.remark) {
      return {
        ...user,
        displayName: friendData.remark,
        originalName: user.username
      }
    }
    return {
      ...user,
      displayName: user.username
    }
  })
})

// 过滤后的好友列表
const filteredFriends = computed(() => {
  if (!searchQuery.value) {
    return friends.value
  }

  const query = searchQuery.value.toLowerCase()
  return friends.value.filter(friend =>
    friend.displayName.toLowerCase().includes(query) ||
    (friend.originalName && friend.originalName.toLowerCase().includes(query)) ||
    friend.email.toLowerCase().includes(query)
  )
})

// 是否可以创建群聊
const canCreate = computed(() => {
  return groupName.value.trim().length > 0 && selectedFriends.value.length > 1
}
)

// 页面加载完成
onMounted(async () => {
  // 检查是否已登录
  if (!store.getters.isAuthenticated) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }

  // 获取好友列表
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

// 清空搜索
const clearSearch = () => {
  searchQuery.value = ''
}

// 过滤好友
const filterFriends = () => {
  // 已经在 computed 中实现
}

// 判断好友是否已选择
const isSelected = (friendId) => {
  return selectedFriends.value.some(friend => friend._id === friendId)
}

// 切换选择好友
const toggleSelectFriend = (friend) => {
  const index = selectedFriends.value.findIndex(f => f._id === friend._id)

  if (index === -1) {
    selectedFriends.value.push(friend)
  } else {
    selectedFriends.value.splice(index, 1)
  }
}

// 创建群聊
const handleCreateGroup = async () => {
  if (!canCreate.value) return
  // 将用户ID数组转为JSON字符串
  const participants = JSON.stringify(selectedFriends.value.map(friend => friend._id))
  try {
    const chat = await store.dispatch('createGroupChat', {
      name: groupName.value.trim(),
      users: participants,
      groupAvatar:'/static/qunliao.png'
    })

    uni.showToast({
      title: '群聊创建成功',
      icon: 'success'
    })
    // 跳转到聊天页面
    uni.navigateTo({
      url: `/pages/chat/index?id=${chat._id}`
    })
  } catch (error) {
    console.error('Failed to create group chat:', error)
    uni.showToast({
      title: '创建群聊失败',
      icon: 'none'
    })
  }
}
</script>

<style scoped>
.create-group-container {
  display: flex;
  flex-direction: column;
  height: 95vh;
  background-color: #f5f7fa;
}

.input-area {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.group-name-input {
  display: flex;
  align-items: center;
}

.input-label {
  width: 160rpx;
  font-size: 30rpx;
  color: #333;
}

.selected-friends {
  margin-bottom: 20rpx;
}

.form-input {
  flex: 1;
  height: 80rpx;
  font-size: 30rpx;
  color: #333;
}

.select-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.section-title {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.selected-count {
  font-size: 26rpx;
  color: #999;
}

.search-bar {
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.search-input-wrapper {
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

.selected-friends {
  white-space: nowrap;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  background-color: #f9f9f9;
}

.selected-friend-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 30rpx;
  position: relative;
}

.selected-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
  margin-bottom: 10rpx;
}

.selected-name {
  font-size: 24rpx;
  color: #333;
  width: 100rpx;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-icon {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.friend-list {
  flex: 1;
}

.friend-list.has-selected {
  height: calc(100% - 180rpx);
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.friend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.friend-item.selected {
  background-color: rgba(var(--primary-rgb), 0.05);
}

.friend-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
  margin-right: 20rpx;
}

.username {
  font-size: 30rpx;
  color: #333;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox.checked {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.check-icon {
  color: #ffffff;
  font-size: 24rpx;
}

.bottom-bar {
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e5e5;
}

.create-btn {
  width: 100%;
  height: 90rpx;
  background-color: #e0e0e0;
  color: #ffffff;
  border-radius: 45rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  border: none;
}

.create-btn.active {
  background-color: var(--primary-color);
}

:deep(.uni-scroll-view) {
  overflow: inherit !important;
}
</style>