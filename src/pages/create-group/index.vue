<template>
  <view class="create-group-container">
    <!-- 顶部输入区域 -->
    <view class="input-area">
      <view class="group-name-input">
        <text class="input-label">群聊名称</text>
        <input type="text" v-model="groupName" placeholder="请输入群聊名称" maxlength="20" />
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <u-icon name="search" size="20" color="#999"></u-icon>
        <input class="search-input" type="text" v-model="searchQuery" placeholder="搜索好友" />
        <text v-if="searchQuery" class="clear-icon" @click="clearSearch">×</text>
      </view>
    </view>

    <!-- 已选择的好友展示区域 -->
    <view class="selected-friends-container" v-if="selectedFriends.length > 0">
      <view class="section-header">
        <text class="section-title">已选择的好友</text>
        <text class="selected-count">{{ selectedFriends.length }}人</text>
      </view>
      <scroll-view scroll-x class="selected-scroll">
        <view class="selected-list">
          <view v-for="friend in selectedFriends" :key="friend._id" class="selected-item">
            <view class="avatar-container">
              <image class="selected-avatar" :src="friend.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <view class="remove-btn" @click.stop="removeSelectedFriend(friend)">
                <text class="remove-icon">×</text>
              </view>
            </view>
            <text class="selected-name">{{ friend.displayName }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 好友列表 -->
    <view class="friend-list-container">
      <view class="section-header" v-if="filteredFriends.length > 0">
        <text class="section-title">选择好友</text>
      </view>
      <scroll-view scroll-y class="friend-list" :class="{ 'has-selected': selectedFriends.length > 0 }" :style="{ height: 'calc(100vh - 300rpx)' }">
        <!-- 加载状态 -->
        <view v-if="isLoading" class="loading-state">
          <u-loading-icon mode="circle" size="40"></u-loading-icon>
          <text class="loading-text">加载中...</text>
        </view>
        
        <!-- 空状态 -->
        <view v-else-if="filteredFriends.length === 0" class="empty-state">
          <u-icon name="info-circle" size="80" color="#c0c4cc"></u-icon>
          <text class="empty-text">{{ searchQuery ? '未找到匹配的好友' : '暂无好友' }}</text>
        </view>

        <view v-else>
          <view v-for="friend in filteredFriends" :key="friend._id" class="friend-item"
            :class="{ 'selected': isSelected(friend._id) }" @click="toggleSelectFriend(friend)">
            <view class="friend-info">
              <image class="avatar" :src="friend.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <view class="info-content">
                <text class="username">{{ friend.displayName }}</text>
                <text v-if="friend.originalName && friend.originalName !== friend.displayName" class="original-name">{{ friend.originalName }}</text>
              </view>
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
      <button 
        class="create-btn" 
        :class="{ 'active': canCreate }" 
        :disabled="!canCreate"
        @tap="handleCreateGroup"
        :style="{ opacity: canCreate ? 1 : 0.6 }"
      >
        创建群聊 ({{ selectedFriends.length }})
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { onShow } from '@dcloudio/uni-app'

const store = useStore()
const groupName = ref('')
const searchQuery = ref('')
const selectedFriends = ref([])
const isLoading = ref(true)
const maxGroupMembers = 200 // 设置群聊最大成员数量

// 获取好友列表
const friends = computed(() => {
  // 转换好友数据结构，使其适配现有UI
  return store.state.friends.map(friendData => {
    if (!friendData || !friendData.user) return null
    
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
  }).filter(Boolean) // 过滤掉null值
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
    (friend.email && friend.email.toLowerCase().includes(query))
  )
})

// 是否可以创建群聊
const canCreate = computed(() => {
  const hasValidName = groupName.value.trim().length > 0;
  const hasEnoughFriends = selectedFriends.value.length > 1;
  const notTooManyFriends = selectedFriends.value.length <= maxGroupMembers;
  
  console.log('Can create check:', {
    hasValidName,
    hasEnoughFriends,
    notTooManyFriends,
    selectedCount: selectedFriends.value.length
  });
  
  return hasValidName && hasEnoughFriends && notTooManyFriends;
})

// 自动生成群名称
const generateGroupName = () => {
  if (selectedFriends.value.length > 0) {
    const names = selectedFriends.value.slice(0, 3).map(friend => friend.displayName)
    groupName.value = names.join('、')
    
    if (selectedFriends.value.length > 3) {
      groupName.value += `等${selectedFriends.value.length}人`
    }
  } else {
    groupName.value = ''
  }
}

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

// 页面显示时刷新数据
onShow(async () => {
  if (store.getters.isAuthenticated) {
    await fetchFriends()
  }
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

// 判断好友是否已选择
const isSelected = (friendId) => {
  return selectedFriends.value.some(friend => friend._id === friendId)
}

// 切换选择好友
const toggleSelectFriend = (friend) => {
  const index = selectedFriends.value.findIndex(f => f._id === friend._id)

  if (index === -1) {
    // 检查是否超出最大成员数量
    if (selectedFriends.value.length >= maxGroupMembers) {
      uni.showToast({
        title: `群成员不能超过${maxGroupMembers}人`,
        icon: 'none'
      })
      return
    }
    
    selectedFriends.value.push(friend)
    
    // 自动生成群名称
    if (groupName.value === '') {
      nextTick(() => {
        generateGroupName()
      })
    }
  } else {
    selectedFriends.value.splice(index, 1)
    
    // 如果没有手动修改过群名，则自动更新
    if (groupName.value.includes('、') || groupName.value.includes('等')) {
      nextTick(() => {
        generateGroupName()
      })
    }
  }
}

// 移除已选择的好友
const removeSelectedFriend = (friend) => {
  const index = selectedFriends.value.findIndex(f => f._id === friend._id)
  if (index !== -1) {
    selectedFriends.value.splice(index, 1)
    
    // 如果没有手动修改过群名，则自动更新
    if (groupName.value.includes('、') || groupName.value.includes('等')) {
      nextTick(() => {
        generateGroupName()
      })
    }
  }
}

// 创建群聊
const handleCreateGroup = async () => {
  console.log('Create button clicked, canCreate:', canCreate.value);
  
  if (!canCreate.value) {
    console.log('Cannot create group - validation failed');
    if (selectedFriends.value.length < 2) {
      uni.showToast({
        title: '请至少选择2个好友',
        icon: 'none'
      });
    } else if (groupName.value.trim().length === 0) {
      uni.showToast({
        title: '请输入群聊名称',
        icon: 'none'
      });
    }
    return;
  }
  
  try {
    uni.showLoading({
      title: '创建中...',
      mask: true
    });
    
    // 将用户ID数组提取出来
    const participants = selectedFriends.value.map(friend => friend._id);
    console.log('Creating group with participants:', participants);
    
    const result = await store.dispatch('createGroupChat', {
      name: groupName.value.trim(),
      users: JSON.stringify(participants), // 转换为JSON字符串形式
      groupAvatar: '/static/qunliao.png'
    });
    
    uni.hideLoading();
    console.log('Group creation result:', result);
    
    if (result && result.success) {
      uni.showToast({
        title: '群聊创建成功',
        icon: 'success'
      });
      
      // 跳转到聊天页面
      setTimeout(() => {
        uni.navigateTo({
          url: `/pages/chat/index?id=${result.chat._id}`
        });
      }, 500);
    } else {
      uni.showToast({
        title: result?.message || '创建群聊失败',
        icon: 'none'
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('Failed to create group chat:', error);
    uni.showToast({
      title: '创建群聊失败',
      icon: 'none'
    });
  }
}
</script>

<style scoped>
.create-group-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
  position: relative;
  overflow: hidden;
}

.input-area {
  background-color: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.group-name-input {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
}

.input-label {
  width: 160rpx;
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.input-area input {
  flex: 1;
  height: 80rpx;
  font-size: 30rpx;
  color: #333;
  border: none;
}

.search-bar {
  background-color: #ffffff;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 20rpx;
  height: 72rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  margin-left: 10rpx;
}

.clear-icon {
  font-size: 28rpx;
  color: #999;
  padding: 10rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-friends-container {
  background-color: #ffffff;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.section-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.selected-count {
  font-size: 26rpx;
  color: #999;
}

.selected-scroll {
  padding: 20rpx 0;
  white-space: nowrap;
}

.selected-list {
  display: flex;
  padding: 0 30rpx;
}

.selected-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 30rpx;
  width: 120rpx;
}

.avatar-container {
  position: relative;
  margin-bottom: 10rpx;
}

.selected-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
}

.selected-name {
  font-size: 24rpx;
  color: #333;
  width: 100%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  position: absolute;
  top: -15rpx;
  right: -15rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.remove-icon {
  color: #ffffff;
  font-size: 28rpx;
  line-height: 1;
}

.friend-list-container {
  flex: 1;
  background-color: #ffffff;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 130rpx;
}

.friend-list {
  flex: 1;
  height: calc(100vh - 300rpx);
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.loading-text, .empty-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 20rpx;
}

.friend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.friend-item.selected {
  background-color: rgba(25, 137, 250, 0.05);
}

.friend-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.info-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
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

.original-name {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox.checked {
  background-color: var(--primary-color, #1989fa);
  border-color: var(--primary-color, #1989fa);
}

.check-icon {
  color: #ffffff;
  font-size: 24rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e5e5;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.create-btn {
  width: 100%;
  height: 90rpx;
  background-color: #e0e0e0;
  color: #999;
  border-radius: 45rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  border: none;
  margin-bottom: env(safe-area-inset-bottom); /* Add safe area for notched phones */
  position: relative;
  z-index: 101;
  padding: 0;
  outline: none;
}

.create-btn.active {
  background-color: var(--primary-color, #1989fa);
  color: #ffffff;
}

:deep(.uni-scroll-view) {
  overflow: inherit !important;
}
</style>