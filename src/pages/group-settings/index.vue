<template>
  <view class="settings-container">
    <!-- 顶部导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-left" @click="goBack">
        <u-icon name="arrow-left" size="19" color="#000"></u-icon>
      </view>
      <view class="navbar-title">
        <text>群聊设置</text>
      </view>
      <view class="navbar-right"></view>
    </view>

    <!-- 重命名群聊区域 -->
    <view class="section">
      <view class="section-title">群聊名称</view>
      <view class="rename-area">
        <input 
          type="text" 
          v-model="chatName" 
          placeholder="请输入群聊名称" 
          maxlength="20" 
          class="rename-input"
        />
        <button class="rename-btn" @click="handleRename">保存</button>
      </view>
    </view>

    <!-- 成员管理区域 -->
    <view class="section">
      <view class="section-header">
        <view class="section-title-row">
          <text class="section-title">群成员 ({{groupMembers.length}})</text>
          <text v-if="isGroupAdmin" class="admin-badge">管理员</text>
        </view>
        <view class="section-actions" v-if="isGroupAdmin">
          <view class="action-btn" @click="showAddMemberSheet">
            <u-icon name="plus" size="18" color="#07c160"></u-icon>
            <text class="action-text">添加</text>
          </view>
          <view class="action-btn" @click="toggleRemoveMode">
            <u-icon :name="removeMode ? 'checkmark' : 'minus'" size="18" :color="removeMode ? '#07c160' : '#ff3b30'"></u-icon>
            <text class="action-text">{{ removeMode ? '完成' : '移除' }}</text>
          </view>
        </view>
      </view>
      
      <!-- 成员搜索框 -->
      <view class="members-search" v-if="groupMembers.length > 10">
        <view class="search-input-wrapper">
          <u-icon name="search" size="20" color="#999"></u-icon>
          <input class="search-input" type="text" v-model="memberSearchQuery" placeholder="搜索群成员" />
          <text v-if="memberSearchQuery" class="clear-icon" @click="clearMemberSearch">×</text>
        </view>
      </view>
      
      <!-- 群成员网格视图 -->
      <scroll-view scroll-y class="members-grid-container">
        <view class="members-grid">
          <view v-for="member in filteredMembers" :key="member._id" class="member-card" @click="memberAction(member)">
            <view class="member-avatar-container">
              <image class="member-avatar" :src="member.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <view v-if="removeMode && isGroupAdmin && member._id !== currentUser._id" class="remove-badge">
                <u-icon name="minus-circle" size="20" color="#ff3b30"></u-icon>
              </view>
            </view>
            <view class="member-info">
              <text class="member-name">{{ getMemberName(member) }}</text>
              <text v-if="isAdmin(member)" class="admin-tag">群主</text>
            </view>
          </view>
          
          <!-- 添加成员卡片，仅管理员可见 -->
          <view v-if="isGroupAdmin && !removeMode" class="member-card add-card" @click="showAddMemberSheet">
            <view class="member-avatar-container add-container">
              <u-icon name="plus" size="32" color="#999"></u-icon>
            </view>
            <text class="member-name">添加</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 退出群聊按钮 -->
    <view class="section exit-section">
      <button class="exit-btn" @click="handleExitGroup">
        {{ isGroupAdmin ? '解散群聊' : '退出群聊' }}
      </button>
    </view>

    <!-- 添加成员弹出层 -->
    <u-popup :show="showAddMember" mode="bottom" @close="hideAddMemberSheet" :safe-area-inset-bottom="true">
      <view class="popup-content">
        <view class="popup-header">
          <view class="header-left" @click="hideAddMemberSheet">
            <text class="cancel-text">取消</text>
          </view>
          <text class="popup-title">添加群成员</text>
          <view class="header-right" @click="hideAddMemberSheet">
            <text class="done-text">完成</text>
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
        
        <!-- 搜索结果列表 -->
        <scroll-view scroll-y class="friends-list">
          <view v-if="isLoading" class="loading-state">
            <u-loading-icon mode="circle" size="40"></u-loading-icon>
            <text class="loading-text">加载中...</text>
          </view>
          
          <view v-else-if="filteredFriends.length === 0" class="empty-state">
            <u-icon name="info-circle" size="80" color="#c0c4cc"></u-icon>
            <text class="empty-text">{{ searchQuery ? '未找到匹配的好友' : '暂无可添加的好友' }}</text>
          </view>
          
          <view v-else>
            <view v-for="friend in filteredFriends" :key="friend._id" class="friend-item"
              @click="addMember(friend)">
              <image class="avatar" :src="friend.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
              <view class="friend-info">
                <text class="username">{{ friend.displayName || friend.username }}</text>
                <text v-if="friend.originalName && friend.originalName !== friend.displayName" class="original-name">{{ friend.originalName }}</text>
              </view>
              <view class="add-btn">
                <view v-if="isAlreadyMember(friend)" class="already-added">已在群内</view>
                <view v-else class="add-icon">
                  <u-icon name="plus" size="16" color="#07c160"></u-icon>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </u-popup>

    <!-- 确认移除成员弹窗 -->
    <u-modal 
      :show="showRemoveModal"
      :title="'移除 ' + (selectedMember ? getMemberName(selectedMember) : '')" 
      :content="'确定将该成员从群聊中移除吗？'" 
      show-cancel-button 
      confirm-color="#ff3b30"
      @confirm="confirmRemove"
      @cancel="showRemoveModal = false"
    ></u-modal>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { currentConfig } from '../../config'

const store = useStore()
const chatId = ref('')
const chatName = ref('')
const groupMembers = ref([])
const searchQuery = ref('')
const isLoading = ref(true)
const memberSearchQuery = ref('')
const removeMode = ref(false)
const showAddMember = ref(false)
const showRemoveModal = ref(false)
const selectedMember = ref(null)

// 获取当前用户
const currentUser = computed(() => store.getters.currentUser)

// 判断是否为群管理员
const isGroupAdmin = computed(() => {
  // 从聊天信息中查找groupAdmin字段
  const chat = store.state.chats.find(c => c._id === chatId.value);
  
  if (!chat || !currentUser.value) return false;
  
  // 检查当前用户是否为群管理员
  if (chat.groupAdmin && chat.groupAdmin._id === currentUser.value._id) {
    return true;
  }
  
  return false;
})

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

// 过滤后的好友列表（排除已经在群里的成员）
const filteredFriends = computed(() => {
  let result = friends.value;
  
  // 过滤搜索结果
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(friend =>
      friend.displayName.toLowerCase().includes(query) ||
      (friend.originalName && friend.originalName.toLowerCase().includes(query)) ||
      (friend.email && friend.email.toLowerCase().includes(query))
    );
  }
  
  return result;
})

// 过滤后的群成员
const filteredMembers = computed(() => {
  if (!memberSearchQuery.value) {
    return groupMembers.value;
  }
  
  const query = memberSearchQuery.value.toLowerCase();
  return groupMembers.value.filter(member => {
    const displayName = getMemberName(member).toLowerCase();
    return displayName.includes(query) || 
           (member.username && member.username.toLowerCase().includes(query)) || 
           (member.email && member.email.toLowerCase().includes(query));
  });
});

// 页面加载
onLoad((option) => {
  if (option.id) {
    chatId.value = option.id;
    fetchGroupInfo();
  }
})

// 页面显示时刷新数据
onShow(() => {
  if (chatId.value) {
    fetchGroupInfo();
  }
})

// 获取群聊信息
const fetchGroupInfo = async () => {
  isLoading.value = true;
  try {
    // 从store中获取当前群聊信息
    const chat = store.state.chats.find(c => c._id === chatId.value);
    
    if (chat) {
      // 设置群聊名称
      chatName.value = chat.chatName || '群聊';
      
      // 设置群成员
      groupMembers.value = chat.users || [];
    } else {
      // 如果找不到群聊信息，尝试重新加载聊天列表
      await store.dispatch('fetchChats');
      const refreshedChat = store.state.chats.find(c => c._id === chatId.value);
      
      if (refreshedChat) {
        chatName.value = refreshedChat.chatName || '群聊';
        groupMembers.value = refreshedChat.users || [];
      } else {
        uni.showToast({
          title: '获取群聊信息失败',
          icon: 'none'
        });
        setTimeout(() => {
          goBack();
        }, 1500);
      }
    }
    
    // 加载好友列表
    await store.dispatch('fetchFriends');
  } catch (error) {
    console.error('获取群聊信息失败:', error);
    uni.showToast({
      title: '获取群聊信息失败',
      icon: 'none'
    });
  } finally {
    isLoading.value = false;
  }
}

// 获取成员显示名称
const getMemberName = (member) => {
  // 先查找是否是好友
  const friendData = store.state.friends.find(f => f.user._id === member._id);
  
  // 优先显示备注名
  if (friendData && friendData.remark) {
    return friendData.remark;
  }
  
  // 否则显示用户名
  return member.username || '未知用户';
}

// 清除搜索
const clearSearch = () => {
  searchQuery.value = '';
}

// 检查用户是否已经是群成员
const isAlreadyMember = (user) => {
  return groupMembers.value.some(member => member._id === user._id);
}

// 清除成员搜索
const clearMemberSearch = () => {
  memberSearchQuery.value = '';
}

// 显示添加成员面板
const showAddMemberSheet = () => {
  showAddMember.value = true;
}

// 隐藏添加成员面板
const hideAddMemberSheet = () => {
  showAddMember.value = false;
}

// 切换移除模式
const toggleRemoveMode = () => {
  removeMode.value = !removeMode.value;
}

// 成员操作
const memberAction = (member) => {
  console.log('成员操作被触发', member.username);
  
  // 如果在移除模式，且是管理员，且不是自己
  if (removeMode.value && isGroupAdmin.value && member._id !== currentUser.value._id) {
    console.log('符合移除条件，准备显示确认框');
    selectedMember.value = member;
    setTimeout(() => {
      showRemoveModal.value = true;
      console.log('确认框显示状态:', showRemoveModal.value);
    }, 100);
  } else {
    console.log('不符合移除条件', {
      removeMode: removeMode.value,
      isAdmin: isGroupAdmin.value,
      isSelf: member._id === currentUser.value._id
    });
  }
}

// 确认移除用户
const confirmRemove = () => {
  console.log('确认移除被触发', selectedMember.value?.username);
  
  try {
    if (selectedMember.value && selectedMember.value._id) {
      console.log('准备移除用户:', selectedMember.value._id);
      removeMember(selectedMember.value._id);
    }
  } catch (err) {
    console.error('移除用户失败:', err);
    uni.showToast({
      title: '移除用户失败',
      icon: 'none'
    });
  } finally {
    selectedMember.value = null;
    showRemoveModal.value = false;
    console.log('关闭确认框');
  }
}

// 移除群成员
const removeMember = async (userId) => {
  try {
    uni.showLoading({
      title: userId === currentUser.value._id ? '退出中...' : '移除中...',
      mask: true
    });
    
    const response = await uni.request({
      url: `${currentConfig.apiUrl}/api/chats/group/remove`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${store.state.token}`
      },
      data: {
        chatId: chatId.value,
        userId: userId
      }
    });
    
    uni.hideLoading();
    
    if (response.statusCode === 200) {
      // 如果是当前用户退出群聊
      if (userId === currentUser.value._id) {
        uni.showToast({
          title: '已退出群聊',
          icon: 'success'
        });
        
        // 删除对应的聊天
        store.commit('REMOVE_CHAT', chatId.value);
        
        // 返回到聊天列表页（返回两次，跳过聊天页面）
        setTimeout(() => {
          uni.navigateBack({
            delta: 2
          });
        }, 1000);
      } else {
        // 如果是移除其他成员
        uni.showToast({
          title: '成员已移除',
          icon: 'success'
        });
        
        // 更新本地群成员列表
        groupMembers.value = groupMembers.value.filter(member => member._id !== userId);
        
        // 自动关闭移除模式
        removeMode.value = false;
      }
      
      // 刷新聊天列表
      await store.dispatch('fetchChats');
    } else {
      throw new Error(response.data?.message || (userId === currentUser.value._id ? '退出群聊失败' : '移除成员失败'));
    }
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || (userId === currentUser.value._id ? '退出群聊失败' : '移除成员失败'),
      icon: 'none'
    });
  }
}

// 重命名群聊
const handleRename = async () => {
  const newChatName = chatName.value.trim();
  
  if (!newChatName) {
    uni.showToast({
      title: '请输入群聊名称',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({
      title: '更新中...',
      mask: true
    });
    
    const response = await uni.request({
      url: `${currentConfig.apiUrl}/api/chats/group/rename`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${store.state.token}`
      },
      data: {
        chatId: chatId.value,
        chatName: newChatName
      }
    });
    
    uni.hideLoading();
    
    if (response.statusCode === 200) {
      uni.showToast({
        title: '群聊已重命名',
        icon: 'success'
      });
      
      // 更新本地聊天列表
      await store.dispatch('fetchChats');
    } else {
      throw new Error(response.data?.message || '重命名群聊失败');
    }
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || '重命名群聊失败',
      icon: 'none'
    });
  }
}

// 添加成员到群聊
const addMember = async (user) => {
  // 检查是否是群管理员
  if (!isGroupAdmin.value) {
    uni.showToast({
      title: '只有群管理员可以添加成员',
      icon: 'none'
    });
    return;
  }

  if (isAlreadyMember(user)) {
    uni.showToast({
      title: '该用户已在群内',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({
      title: '添加中...',
      mask: true
    });
    
    const response = await uni.request({
      url: `${currentConfig.apiUrl}/api/chats/group/add`,
      method: 'PUT',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${store.state.token}`
      },
      data: {
        chatId: chatId.value,
        userId: user._id
      }
    });
    
    uni.hideLoading();
    
    if (response.statusCode === 200) {
      uni.showToast({
        title: '成员已添加',
        icon: 'success'
      });
      
      // 更新本地群成员列表
      if (!isAlreadyMember(user)) {
        groupMembers.value.push(user);
      }
      
      // 自动关闭添加成员弹出层
      hideAddMemberSheet();
      
      // 刷新聊天列表
      await store.dispatch('fetchChats');
    } else {
      throw new Error(response.data?.message || '添加成员失败');
    }
  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: error.message || '添加成员失败',
      icon: 'none'
    });
  }
}

// 返回上一页
const goBack = () => {
  uni.navigateBack();
}

// 页面加载完成
onMounted(async () => {
  // 检查是否已登录
  if (!store.getters.isAuthenticated) {
    uni.redirectTo({
      url: '/pages/login/index'
    });
    return;
  }

  // 获取好友列表
  if (chatId.value) {
    fetchGroupInfo();
  }
})

// 处理退出群聊
const handleExitGroup = () => {
  uni.showModal({
    title: '退出群聊',
    content: `确定要退出"${chatName.value || '群聊'}"吗？`,
    confirmText: '退出',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        // 使用移除用户API来退出群聊（移除自己）
        if (currentUser.value && currentUser.value._id) {
          removeMember(currentUser.value._id);
        }
      }
    }
  });
}

// 判断成员是否为群管理员
const isAdmin = (member) => {
  const chat = store.state.chats.find(c => c._id === chatId.value);
  if (!chat || !chat.groupAdmin) return false;
  
  return chat.groupAdmin._id === member._id;
}
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
  position: relative;
  overflow-y: auto;
  padding-bottom: 120rpx;
}

/* 自定义导航栏样式 */
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  padding-top: var(--status-bar-height, 20px);
  display: flex;
  align-items: center;
  padding-left: 5px;
  padding-right: 10px;
  z-index: 999;
  background-color: #F8F8F8;
  border-bottom: 1px solid #e5e5e5;
  box-sizing: content-box;
}

.navbar-left {
  width: 40px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 5px;
}

.navbar-right {
  width: 40px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbar-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #000;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 10px;
}

.section {
  margin: 20rpx;
  background-color: #ffffff;
  padding: 20rpx;
  border-radius: 12rpx;
}

.section:first-child {
  margin-top: calc(var(--status-bar-height, 20px) + 44px + 20rpx);
}

/* 分区头部样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
}

.section-title-row {
  display: flex;
  align-items: center;
}

.section-title {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.section-actions {
  display: flex;
  gap: 30rpx;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.action-text {
  font-size: 22rpx;
  color: #333;
  margin-top: 8rpx;
}

/* 成员网格样式 */
.members-search {
  margin: 10rpx 0 20rpx;
}

.members-grid-container {
  max-height: 450rpx;
}

.members-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 10rpx 0;
}

.member-card {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}

.member-avatar-container {
  position: relative;
  margin-bottom: 12rpx;
}

.member-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 10rpx;
  background-color: #f0f0f0;
}

.member-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.member-name {
  font-size: 24rpx;
  color: #333;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 5rpx rgba(0,0,0,0.2);
}

.add-container {
  width: 100rpx;
  height: 100rpx;
  background-color: #f5f5f5;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 弹出层样式 */
.popup-content {
  padding: 10px;
  background-color: #ffffff;
  border-radius: 20rpx 20rpx 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx 24rpx;
  border-bottom: 1px solid #f5f5f5;
  position: relative;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-left, .header-right {
  min-width: 100rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  z-index: 1;
}

.header-left {
  justify-content: flex-start;
}

.header-right {
  justify-content: flex-end;
}

.cancel-text {
  font-size: 32rpx;
  color: #666;
}

.done-text {
  font-size: 32rpx;
  color: #07c160;
  font-weight: 500;
}

/* 管理员标识 */
.admin-badge {
  background-color: #ff3b30;
  color: #ffffff;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  margin-left: 12rpx;
}

.admin-tag {
  background-color: #ff3b30;
  color: #ffffff;
  padding: 2rpx 8rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
  margin-top: 4rpx;
}

/* 弹窗高度调整 */
.friends-list {
  max-height: 60vh;
  padding: 0 20rpx;
  width:auto ;
}

/* 重命名区域 */
.rename-area {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 10rpx;
}

.rename-input {
  flex: 1;
  height: 80rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
  border: 1px solid #e5e5e5;
}

.rename-btn {
  width: 160rpx;
  height: 80rpx;
  background-color: #07c160;
  color: #ffffff;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  flex-shrink: 0;
}

/* 退出群聊按钮 */
.exit-section {
  margin: 40rpx 20rpx 80rpx 20rpx;
  position: relative;
  z-index: 10;
}

.exit-btn {
  width: 100%;
  height: 90rpx;
  background-color: #ff3b30;
  color: #ffffff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  border: none;
}

/* 搜索框 */
.search-bar {
  margin-top: 20rpx;
  margin-bottom: 20rpx;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 20rpx;
  height: 72rpx;
  border: 1px solid #e5e5e5;
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

/* 好友列表样式 */
.friend-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f5f5f5;
}

.friend-item:last-child {
  border-bottom: none;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background-color: #f0f0f0;
}

.friend-info {
  flex: 1;
  margin-left: 20rpx;
  overflow: hidden;
}

.username {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.original-name {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e8f8f1;
  border-radius: 30rpx;
  border: 1px solid #07c160;
}

.already-added {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 20rpx;
}

/* 加载和空状态 */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.loading-text, .empty-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 20rpx;
}
</style> 