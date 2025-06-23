<template>
  <view class="profile-container">
    <!-- 用户信息卡片 -->
    <view class="user-card bg-white rounded-lg shadow">
      <view class="user-info">
        <image 
          class="avatar" 
          :src="user?.avatar || 'static/default-avatar.png'" 
          mode="aspectFill"
        ></image>
        
        <view class="user-details">
          <text class="username">{{ user?.username || '未登录' }}</text>
          <br />
          <text class="email">{{ user?.email || '' }}</text>
        </view>
      </view>
      
      <view class="edit-profile" @click="editProfile">
        <text class="edit-text">编辑资料</text>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>
    </view>
    
    <!-- 功能列表 -->
    <view class="feature-list bg-white rounded-lg shadow margin-top">

      <view class="feature-item border-bottom" @click="goToSettings">
        <view class="feature-icon settings-icon">
          <u-icon name="setting" size="24" color="#2979ff"></u-icon>
        </view>
        <text class="feature-name">设置</text>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>
      
      <view class="feature-item border-bottom" @click="goToHelp">
        <view class="feature-icon help-icon">
          <u-icon name="question-circle" size="24" color="#2979ff"></u-icon>
        </view>
        <text class="feature-name">帮助与反馈</text>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>
      
      <view class="feature-item" @click="goToAbout">
        <view class="feature-icon about-icon">
          <u-icon name="info-circle" size="24" color="#2979ff"></u-icon>
        </view>
        <text class="feature-name">关于</text>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>
    </view>
    
    <!-- 退出登录按钮 -->
    <view class="logout-section margin-top-lg">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

// 获取当前用户信息
const user = computed(() => store.getters.currentUser)

// 页面加载时检查登录状态
onMounted(() => {
  // 检查是否已登录
  if (!store.getters.isAuthenticated) {
    uni.redirectTo({
      url: '/pages/login/index'
    })
    return
  }
  
  // 获取最新的用户信息
  store.dispatch('fetchCurrentUser')

})

// 编辑个人资料
const editProfile = () => {
  uni.navigateTo({
    url: '/pages/edit-user/index'
  })
}


// 跳转到设置页面
const goToSettings = () => {
  uni.navigateTo({
    url: '/pages/settings/index'
  })
}

// 跳转到帮助页面
const goToHelp = () => {
  uni.showToast({
    title: '帮助功能开发中',
    icon: 'none'
  })
}

// 跳转到关于页面
const goToAbout = () => {
  uni.navigateTo({
    url: '/pages/about/index'
  })
}

// 处理退出登录
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        await store.dispatch('logout')
        
        uni.redirectTo({
          url: '/pages/login/index'
        })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.profile-container {
  padding: 40rpx 30rpx;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.user-card {
  padding: 40rpx 30rpx;
  border-radius: 16rpx;
  background-color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
}

.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 20rpx;
  background-color: #f0f0f0;
  margin-right: 30rpx;
}

.user-details {
  flex: 1;
}

.username {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}

.email {
  font-size: 28rpx;
  color: #666;
}

.edit-profile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-top: 1rpx solid #f0f0f0;
}

.edit-text {
  font-size: 32rpx;
  color: #333;
}

.feature-list {
  border-radius: 16rpx;
  background-color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  
  .feature-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    background-color: rgba(41, 121, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
  }
  
  .feature-name {
    flex: 1;
    font-size: 32rpx;
    color: #333;
  }
}

.border-bottom {
  border-bottom: 1rpx solid #f0f0f0;
}

.logout-section {
  margin-top: 60rpx;
  padding: 0 30rpx;
  
  .logout-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    background-color: #fff;
    color: #ff4d4f;
    font-size: 32rpx;
    border-radius: 44rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  }
}
</style>