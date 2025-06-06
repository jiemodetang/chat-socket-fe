<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/logo.svg" mode="aspectFit"></image>
      <text class="title">聊天应用</text>
      <text class="subtitle">登录您的账户</text>
    </view>
    
    <view class="login-form">
      <view class="form-item">
        <text class="label">邮箱/用户名</text>
        <input 
          class="input" 
          type="text" 
          v-model="email" 
          placeholder="请输入邮箱"
        />
      </view>
      
      <view class="form-item">
        <text class="label">密码</text>
        <input 
          class="input" 
          type="password" 
          v-model="password" 
          placeholder="请输入密码"
        />
      </view>
      
      <button 
        class="login-btn" 
        :disabled="isLoading" 
        @click="handleLogin"
      >
        {{ isLoading ? '登录中...' : '登录' }}
      </button>
      
      <view class="register-link">
        <text>还没有账户？</text>
        <text class="link" @click="goToRegister">立即注册</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const email = ref('')
const password = ref('')
const isLoading = ref(false)

// 处理登录
const handleLogin = async () => {
  if (!email.value || !password.value) {
    uni.showToast({
      title: '请输入邮箱和密码',
      icon: 'none'
    })
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await store.dispatch('login', {
      email: email.value,
      password: password.value
    })
    
    if (result.success) {
      uni.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      // 登录成功后跳转到首页
      uni.switchTab({
        url: '/pages/index/index'
      })
    } else {
      uni.showToast({
        title: result.message || '登录失败',
        icon: 'none'
      })
    }
  } catch (error) {
    uni.showToast({
      title: '登录失败，请稍后再试',
      icon: 'none'
    })
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}

// 跳转到注册页面
const goToRegister = () => {
  uni.navigateTo({
    url: '/pages/register/index'
  })
}
</script>

<style scoped>
.login-container {
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #ffffff;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
  margin-top: 60rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 30rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: var(--dark-color);
  margin-bottom: 20rpx;
}

.subtitle {
  font-size: 32rpx;
  color: var(--content-color);
}

.login-form {
  width: 100%;
}

.form-item {
  margin-bottom: 40rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: var(--dark-color);
  margin-bottom: 16rpx;
  font-weight: 500;
}

.input {
  width: 100%;
  height: 90rpx;
  background-color: #f5f7fa;
  border-radius: 12rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
  color: var(--dark-color);
  box-sizing: border-box;
}

.login-btn {
  width: 100%;
  height: 90rpx;
  background-color: var(--primary-color);
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 60rpx;
  margin-bottom: 40rpx;
}

.login-btn:active {
  opacity: 0.8;
}

.login-btn[disabled] {
  opacity: 0.6;
  background-color: var(--primary-color);
  color: #ffffff;
}

.register-link {
  display: flex;
  justify-content: center;
  font-size: 28rpx;
  color: var(--content-color);
}

.link {
  color: var(--primary-color);
  margin-left: 10rpx;
}
</style>