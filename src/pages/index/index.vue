<template>
  <view class="chat-list-container">
    <!-- 顶部搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <u-icon name="search" size="28" color="#666"></u-icon>
        <input 
          class="search-input" 
          type="text" 
          v-model="searchText" 
          placeholder="搜索"
          confirm-type="search"
          @confirm="handleSearch"
        />
      </view>
    </view>
    
    <!-- 会话列表 -->
    <scroll-view 
      scroll-y 
      class="chat-list"
      @scrolltolower="loadMoreChats"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="chats.length === 0 && !isLoading" class="empty-state">
        <image class="empty-icon" src="/static/empty-chat.svg" mode="aspectFit"></image>
        <text class="empty-text">暂无会话</text>
        <button class="start-chat-btn" @click="goToContacts">开始聊天</button>
      </view>
      
      <view v-else>
        <view 
          v-for="(chat, index) in chats" 
          :key="chat._id" 
          class="chat-item"
          :class="{ 'border-bottom': index !== chats.length - 1 }"
          @click="goToChat(chat._id)"
        >
          <!-- 头像 -->
          <view class="avatar-container">
            <image 
              v-if="chat.isGroupChat" 
              class="avatar" 
              src="/static/qunliao.png" 
              mode="aspectFill"
            ></image>
            <view v-else class="avatar-wrapper">
              <image 
                class="avatar" 
                :src="getChatAvatar(chat)" 
                mode="aspectFill"
              ></image>
              <view class="status-dot" :class="{ 'online': getChatUserStatus(chat) === 'online' }"></view>
            </view>
          </view>
          
          <!-- 会话信息 -->
          <view class="chat-info">
            <view class="chat-header">
              <text class="chat-name text-ellipsis">{{ getChatName(chat) }}</text>
              <text class="chat-time">{{ formatChatTime(chat.latestMessage?.createdAt) }}</text>
            </view>
            
            <view class="chat-content">
              <text class="chat-message text-ellipsis">{{ getLastMessage(chat) }}</text>
              
              <view v-if="chat.unreadCount > 0" class="unread-badge">
                <text>{{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}</text>
              </view>
            </view>
          </view>
        </view>
        
        <view v-if="isLoadingMore" class="loading-more">
          <text>加载更多...</text>
        </view>
      </view>
    </scroll-view>
    
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { formatTime, formatDate } from '@/utils/dateFormat'
import { updateConversationTabBadge } from '@/utils/badgeManager'

const store = useStore()
const searchText = ref('')
const isLoading = ref(true)
const isRefreshing = ref(false)
const isLoadingMore = ref(false)

// 获取排序后的聊天列表
const chats = computed(() => {
  const sortedChats = store.getters.sortedChats
  return Array.isArray(sortedChats) ? sortedChats : []
})

// 页面加载时获取聊天列表
onShow(async () => {
  try {
    // 检查是否已登录
    if (!store.getters.isAuthenticated) {
      uni.redirectTo({
        url: '/pages/login/index'
      })
      return
    }
    
    // 获取聊天列表
    await fetchChats()
    
    // 清除会话tab的角标，因为用户已经看到了会话列表
    // 但保留各个会话的未读计数
    updateConversationTabBadge(0)
  } catch (error) {
    console.error('Failed to initialize chat list:', error)
    uni.showToast({
      title: '初始化失败',
      icon: 'none'
    })
  }
})

// 监听未读消息数量变化
watch(() => store.getters.unreadCount, (newCount) => {
  // 更新Tab角标
  updateConversationTabBadge(newCount)
})

// 获取聊天列表
const fetchChats = async () => {
  isLoading.value = true
  try {
    const result = await store.dispatch('fetchChats')
    if (!result.success) {
      throw new Error('获取聊天列表失败')
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to fetch chats:', error)
    uni.showToast({
      title: '获取聊天列表失败',
      icon: 'none'
    })
    return { success: false }
  } finally {
    isLoading.value = false
  }
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  try {
    // 重新获取聊天列表
    const result = await store.dispatch('fetchChats')
    if (!result.success) {
      throw new Error('刷新聊天列表失败')
    }
    
    // 显示刷新成功提示
    uni.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 1500
    })
  } catch (error) {
    console.error('Failed to refresh chats:', error)
    uni.showToast({
      title: '刷新失败',
      icon: 'none'
    })
  } finally {
    isRefreshing.value = false
  }
}

// 加载更多聊天
const loadMoreChats = () => {
  // 这里可以实现分页加载更多聊天
  // 目前API没有提供分页功能，所以这里只是一个示例
  if (isLoadingMore.value) return
  
  isLoadingMore.value = true
  setTimeout(() => {
    isLoadingMore.value = false
  }, 1000)
}

// 搜索聊天
const handleSearch = () => {
  if (!searchText.value.trim()) {
    // 如果搜索内容为空，恢复显示所有聊天
    store.dispatch('fetchChats')
    return
  }
  
  // 过滤聊天列表，匹配好友名字或群聊名称
  const filteredChats = store.state.chats.filter(chat => {
    if (chat.isGroupChat) {
      // 群聊匹配群名称
      return chat.chatName?.includes(searchText.value)
    } else {
      // 单聊匹配好友名字
      const currentUserEmail = store.getters.currentUser?.email
      const otherUser = chat.users.find(u => u.email !== currentUserEmail)
      return otherUser?.username?.includes(searchText.value)
    }
  })
  
  // 更新显示的聊天列表
  store.commit('SET_CHATS', filteredChats)
}

// 获取聊天名称
const getChatName = (chat) => {
  if (chat.isGroupChat) {
    return chat.chatName || '群聊'
  } else {
    // 在单聊中，显示对方的名称
    const currentUser = store.getters.currentUser
    if (!currentUser) return '未知用户'
    
    // 确保找到的是对方用户，并且确保chat.users存在
    const otherUser = chat.users && chat.users.length > 0 
      ? chat.users.find(u => u._id !== currentUser._id)
      : null
    
    if (!otherUser) return '未知用户'
    
    // 查找好友数据，优先使用备注
    const friendData = store.state.friends.find(f => f.user._id === otherUser._id)
    
    // 优先使用备注，如果没有备注则使用用户名
    if (friendData && friendData.remark) {
      return friendData.remark
    }
    
    return otherUser.username || '未知用户'
  }
}

// 获取聊天头像
const getChatAvatar = (chat) => {
  if (chat.isGroupChat) {
    return chat.groupAvatar || '/static/group-avatar.png'
  } else {
    const currentUserEmail = store.getters.currentUser?.email
    const otherUser = chat.users.find(u => u.email !== currentUserEmail)
    return otherUser?.avatar || '/static/default-avatar.png'
  }
}

// 获取最后一条消息内容
const getLastMessage = (chat) => {
  // 优先使用lastMessage（来自socket通知），其次使用latestMessage（来自API）
  const lastMsg = chat.lastMessage || chat.latestMessage

  if (!lastMsg) return '暂无消息'

  // 根据消息类型返回不同的显示内容
  switch (lastMsg.messageType) {
    case 'text':
      return lastMsg.content || '新消息'
    case 'image':
      return '[图片]'
    case 'audio':
      return '[语音]'
    case 'file':
      return `[文件] ${lastMsg.content || '未知文件'}`
    case 'call':
      if (lastMsg.content.includes('视频')) {
        return '[视频通话]'
      } else if (lastMsg.content.includes('语音')) {
        return '[语音通话]'
      } else if (lastMsg.content.includes('通话时长')) {
        return '[通话记录]'
      } else if (lastMsg.content.includes('已拒绝')) {
        return '[通话已拒绝]'
      } else if (lastMsg.content.includes('无人接听')) {
        return '[通话未接听]'
      } else if (lastMsg.content.includes('已取消')) {
        return '[通话已取消]'
      } else {
        return '[通话]'
      }
    default:
      return '新消息'
  }
}

// 显示操作菜单
const showActionSheet = () => {
  uni.showActionSheet({
    itemList: ['发起群聊', '添加好友'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 发起群聊
        uni.navigateTo({
          url: '/pages/contacts/create-group'
        })
      } else if (res.tapIndex === 1) {
        // 添加好友
        uni.navigateTo({
          url: '/pages/add-friend/index'
        })
      }
    }
  })
}

// 跳转到聊天详情页
const goToChat = (chatId) => {
  // 设置当前聊天
  store.commit('SET_CURRENT_CHAT', chatId)
  // 清除未读消息计数
  store.commit('CLEAR_UNREAD', chatId)
  
  uni.navigateTo({
    url: `/pages/chat/index?id=${chatId}`
  })
}

// 跳转到通讯录
const goToContacts = () => {
  uni.switchTab({
    url: '/pages/contacts/index'
  })
}

// 获取聊天对象的在线状态
const getChatUserStatus = (chat) => {
  if (chat.isGroupChat) return null
  const currentUserEmail = store.getters.currentUser?.email
  const otherUser = chat.users.find(u => u.email !== currentUserEmail)
  return otherUser?.status || 'offline'
}

// 格式化聊天时间
const formatChatTime = (timestamp) => {
  return formatDate(timestamp)
}
</script>

<style lang="scss" scoped>
.chat-list-container {
  min-height: 100vh;
  background-color: #fff;
  
  .search-bar {
    padding: 20rpx;
    background-color: #fff;
    
    .search-input-wrapper {
      display: flex;
      align-items: center;
      background-color: #f5f5f5;
      border-radius: 32rpx;
      padding: 16rpx 24rpx;
      
      .search-input {
        flex: 1;
        margin-left: 16rpx;
        font-size: 28rpx;
      }
    }
  }
  
  .float-btn-container {
    position: fixed;
    right: 40rpx;
    bottom: 100rpx;
    z-index: 999;
  }
  
  .float-btn {
    width: 110rpx !important;
    height: 110rpx !important;
    box-shadow: 0 8rpx 24rpx rgba(60, 156, 255, 0.5);
    transition: all 0.3s ease;
    
    &:active {
      transform: scale(0.9);
      box-shadow: 0 4rpx 12rpx rgba(60, 156, 255, 0.3);
    }
  }
}

.chat-list {
  flex: 1;
  background-color: #ffffff;
}

.chat-item {
  display: flex;
  padding: 24rpx 30rpx;
  background-color: #ffffff;
}

.avatar-container {
  margin-right: 24rpx;
}

.avatar-wrapper {
  position: relative;
  width: 96rpx;
  height: 96rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
}

.chat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.chat-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  max-width: 400rpx;
}

.chat-time {
  font-size: 24rpx;
  color: #999;
}

.chat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-message {
  font-size: 28rpx;
  color: #999;
  max-width: 450rpx;
}

.unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  background-color: #ff5252;
  color: #ffffff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
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

.start-chat-btn {
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

.loading-more {
  text-align: center;
  padding: 20rpx 0;
  color: #999;
  font-size: 24rpx;
}

.border-bottom {
  border-bottom: 1rpx solid #f5f5f5;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background-color: #999;
  border: 2rpx solid #fff;
}

.status-dot.online {
  background-color: #09BB07;
}
</style>