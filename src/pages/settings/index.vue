<template>
  <view class="settings-container">
    <!-- 通知设置 -->
    <!-- <view class="settings-section">
      <view class="section-title">通知设置</view>
      <view class="settings-list">
        <view class="settings-item">
          <view class="item-left">
            <text class="item-label">新消息通知</text>
            <text class="item-desc">接收新消息时通知</text>
          </view>
          <switch :checked="settings.messageNotification" @change="handleMessageNotificationChange" color="#2979ff" />
        </view>
        
        <view class="settings-item">
          <view class="item-left">
            <text class="item-label">声音提醒</text>
            <text class="item-desc">接收消息时播放提示音</text>
          </view>
          <switch :checked="settings.soundNotification" @change="handleSoundNotificationChange" color="#2979ff" />
        </view>
        
        <view class="settings-item">
          <view class="item-left">
            <text class="item-label">震动提醒</text>
            <text class="item-desc">接收消息时震动提醒</text>
          </view>
          <switch :checked="settings.vibrationNotification" @change="handleVibrationNotificationChange" color="#2979ff" />
        </view>
      </view>
    </view> -->

    <!-- 隐私设置 -->
    <view class="settings-section">
      <view class="section-title">隐私设置</view>
      <view class="settings-list">
        <view class="settings-item">
          <view class="item-left">
            <text class="item-label">在线状态</text>
            <text class="item-desc">向好友显示在线状态</text>
          </view>
          <switch :checked="settings.showOnlineStatus" @change="handleOnlineStatusChange" color="#2979ff" />
        </view>
        
        <view class="settings-item">
          <view class="item-left">
            <text class="item-label">已读回执</text>
            <text class="item-desc">发送消息时显示已读状态</text>
          </view>
          <switch :checked="settings.readReceipt" @change="handleReadReceiptChange" color="#2979ff" />
        </view>
      </view>
    </view>

    <!-- 通用设置 -->
    <view class="settings-section">
      <view class="section-title">通用设置</view>
      <view class="settings-list">
        <view class="settings-item" @click="handleClearCache">
          <view class="item-left">
            <text class="item-label">清除缓存</text>
            <text class="item-desc">清除本地缓存数据</text>
          </view>
          <u-icon name="arrow-right" size="20" color="#999"></u-icon>
        </view>
        
        <view class="settings-item" @click="handleAbout">
          <view class="item-left">
            <text class="item-label">关于我们</text>
            <text class="item-desc">版本信息与开发者信息</text>
          </view>
          <u-icon name="arrow-right" size="20" color="#999"></u-icon>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

// 设置状态
const settings = ref({
  messageNotification: true,
  soundNotification: true,
  vibrationNotification: true,
  showOnlineStatus: true,
  readReceipt: true
})

// 页面加载时获取设置
onMounted(() => {
  // 从本地存储加载设置
  const savedSettings = uni.getStorageSync('userSettings')
  if (savedSettings) {
    settings.value = { ...settings.value, ...JSON.parse(savedSettings) }
  }
})

// 保存设置到本地存储
const saveSettings = () => {
  uni.setStorageSync('userSettings', JSON.stringify(settings.value))
}

// 处理消息通知开关
const handleMessageNotificationChange = (e) => {
  settings.value.messageNotification = e.detail.value
  saveSettings()
}

// 处理声音通知开关
const handleSoundNotificationChange = (e) => {
  settings.value.soundNotification = e.detail.value
  saveSettings()
}

// 处理震动通知开关
const handleVibrationNotificationChange = (e) => {
  settings.value.vibrationNotification = e.detail.value
  saveSettings()
}

// 处理在线状态开关
const handleOnlineStatusChange = (e) => {
  settings.value.showOnlineStatus = e.detail.value
  saveSettings()
}

// 处理已读回执开关
const handleReadReceiptChange = (e) => {
  settings.value.readReceipt = e.detail.value
  saveSettings()
}

// 处理清除缓存
const handleClearCache = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？',
    success: (res) => {
      if (res.confirm) {
        // 清除缓存
        uni.clearStorageSync()
        // 保留必要的登录信息
        const token = uni.getStorageSync('token')
        const userSettings = uni.getStorageSync('userSettings')
        if (token) uni.setStorageSync('token', token)
        if (userSettings) uni.setStorageSync('userSettings', userSettings)
        
        uni.showToast({
          title: '清除成功',
          icon: 'success'
        })
      }
    }
  })
}

// 处理关于我们
const handleAbout = () => {
  uni.showModal({
    title: '关于我们',
    content: 'Chat simple v1.0.0\n\n一个简单易用的即时通讯应用',
    showCancel: false
  })
}
</script>

<style lang="scss" scoped>
.settings-container {
  padding: 30rpx;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.settings-section {
  margin-bottom: 30rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
  padding-left: 20rpx;
}

.settings-list {
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.item-left {
  flex: 1;
  margin-right: 20rpx;
}

.item-label {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.item-desc {
  font-size: 24rpx;
  color: #999;
  display: block;
}
</style> 