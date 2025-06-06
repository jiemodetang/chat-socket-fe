<template>
  <view class="about-container">
    <!-- 应用信息 -->
    <view class="app-info">
      <image class="app-logo" src="/static/logo.png" mode="aspectFit"></image>
      <text class="app-name">Chat Simple</text>
      <text class="app-version">Version 1.0.0</text>
    </view>

    <!-- 功能列表 -->
    <view class="about-list">
      <view class="about-item" @click="handleCheckUpdate">
        <view class="item-left">
          <text class="item-label">检查更新</text>
          <text class="item-desc">当前已是最新版本</text>
        </view>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>

      <view class="about-item" @click="handleUserAgreement">
        <view class="item-left">
          <text class="item-label">用户协议</text>
          <text class="item-desc">了解我们的服务条款</text>
        </view>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>

      <view class="about-item" @click="handlePrivacyPolicy">
        <view class="item-left">
          <text class="item-label">隐私政策</text>
          <text class="item-desc">了解我们如何保护您的隐私</text>
        </view>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>

      <view class="about-item" @click="handleFeedback">
        <view class="item-left">
          <text class="item-label">意见反馈</text>
          <text class="item-desc">帮助我们改进产品</text>
        </view>
        <u-icon name="arrow-right" size="20" color="#999"></u-icon>
      </view>
    </view>

    <!-- 版权信息 -->
    <view class="copyright">
      <text class="copyright-text">Copyright © 2024 Chat Simple</text>
      <text class="copyright-text">All Rights Reserved</text>
    </view>
  </view>
</template>

<script setup>
// 检查更新
const handleCheckUpdate = () => {
  uni.showToast({
    title: '当前已是最新版本',
    icon: 'none'
  })
}

// 用户协议
const handleUserAgreement = () => {
  uni.showModal({
    title: '用户协议',
    content: '欢迎使用Chat Simple！\n\n• 请文明交流，禁止发布违法信息\n• 保护账号安全，请勿分享给他人\n• 尊重他人隐私，禁止骚扰行为\n• 遵守平台规则，共建良好环境',
    showCancel: false,
    confirmText: '我知道了'
  })
}

// 隐私政策
const handlePrivacyPolicy = () => {
  uni.showModal({
    title: '隐私政策',
    content: '我们重视您的隐私\n\n• 仅收集必要的账号信息\n• 严格保护您的聊天内容\n• 不会向第三方分享数据\n• 您可以随时删除账号数据',
    showCancel: false,
    confirmText: '我知道了'
  })
}

// 意见反馈
const handleFeedback = () => {
  uni.showModal({
    title: '意见反馈',
    content: '感谢您的反馈！\n\n您可以通过以下方式联系我们：\n\n邮箱：943990462@qq.com\n\n我们会认真对待每一条反馈，并尽快回复您。',
    showCancel: false,
    confirmText: '我知道了'
  })
}
</script>

<style lang="scss" scoped>
.about-container {
  padding: 40rpx 30rpx;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.app-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.app-logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 30rpx;
  border-radius: 40rpx;
}

.app-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.app-version {
  font-size: 28rpx;
  color: #666;
}

.about-list {
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 40rpx;
}

.about-item {
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

.copyright {
  text-align: center;
  padding: 40rpx 0;
}

.copyright-text {
  font-size: 24rpx;
  color: #999;
  line-height: 1.8;
  display: block;
}
</style> 