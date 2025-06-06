<template>
  <view class="register-container">
    <view class="register-header">
      <image class="logo" src="/static/logo.svg" mode="aspectFit"></image>
      <text class="title">聊天应用</text>
      <text class="subtitle">创建新账户</text>
    </view>
    
    <view class="register-form">
      <view class="form-item">
        <text class="label">用户名</text>
        <input 
          class="input" 
          type="text" 
          v-model="username" 
          placeholder="请输入用户名"
        />
      </view>
      
      <view class="form-item">
        <text class="label">邮箱</text>
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
      
      <view class="form-item">
        <text class="label">确认密码</text>
        <input 
          class="input" 
          type="password" 
          v-model="confirmPassword" 
          placeholder="请再次输入密码"
        />
      </view>
      
      <button 
        class="register-btn" 
        :disabled="isLoading" 
        @click="handleRegister"
      >
        {{ isLoading ? '注册中...' : '注册' }}
      </button>
      
      <view class="login-link">
        <text>已有账户？</text>
        <text class="link" @click="goToLogin">立即登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)

// 处理注册
const handleRegister = async () => {
  // 表单验证
  if (!username.value || !email.value || !password.value || !confirmPassword.value) {
    uni.showToast({
      title: '请填写所有字段',
      icon: 'none'
    })
    return
  }
  
  if (password.value !== confirmPassword.value) {
    uni.showToast({
      title: '两次输入的密码不一致',
      icon: 'none'
    })
    return
  }
  
  // 邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    uni.showToast({
      title: '请输入有效的邮箱地址',
      icon: 'none'
    })
    return
  }
  
  // 密码长度验证
  if (password.value.length < 6) {
    uni.showToast({
      title: '密码长度至少为6位',
      icon: 'none'
    })
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await store.dispatch('register', {
      username: username.value,
      email: email.value,
      password: password.value,
      avatar: 'https://img2.baidu.com/it/u=3344192081,487201766&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'
    })
    
    if (result.success) {
      uni.showToast({
        title: '注册成功',
        icon: 'success'
      })
      
      // 注册成功后跳转到首页
      uni.switchTab({
        url: '/pages/index/index'
      })
    } else {
      uni.showToast({
        title: result.message || '注册失败',
        icon: 'none'
      })
    }
  } catch (error) {
    uni.showToast({
      title: '注册失败，请稍后再试',
      icon: 'none'
    })
    console.error('Register error:', error)
  } finally {
    isLoading.value = false
  }
}

// 跳转到登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index'
  })
}
</script>

<style scoped>
.register-container {
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #ffffff;
}

.register-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
  margin-top: 40rpx;
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

.register-form {
  width: 100%;
}

.form-item {
  margin-bottom: 30rpx;
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

.register-btn {
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
  margin-top: 50rpx;
  margin-bottom: 40rpx;
}

.register-btn:active {
  opacity: 0.8;
}

.register-btn[disabled] {
  opacity: 0.6;
  background-color: var(--primary-color);
  color: #ffffff;
}

.login-link {
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