<template>
  <view class="edit-profile-container">
    <view class="form-container bg-white rounded-lg shadow">
      <view class="form-item">
        <text class="label">用户名</text>
        <input 
          class="input" 
          v-model="formData.username" 
          placeholder="请输入用户名"
        />
      </view>
      
      <view class="form-item">
        <text class="label">邮箱</text>
        <input 
          class="input" 
          v-model="formData.email" 
          placeholder="请输入邮箱"
          type="email"
        />
      </view>
    </view>

    <view class="button-container">
      <button class="save-btn" @click="handleSave">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const formData = ref({
  username: '',
  email: ''
})

// 页面加载时获取当前用户信息
onMounted(async () => {
  try {
    // 确保用户已登录
    if (!store.getters.isAuthenticated) {
      uni.redirectTo({
        url: '/pages/login/index'
      })
      return
    }

    // 获取最新的用户信息
    await store.dispatch('fetchCurrentUser')
    
    const currentUser = store.getters.currentUser
    if (currentUser) {
      formData.value = {
        username: currentUser.username || '',
        email: currentUser.email || ''
      }
    }
  } catch (error) {
    console.error('Failed to fetch user data:', error)
    uni.showToast({
      title: '获取用户信息失败',
      icon: 'none'
    })
  }
})

// 保存用户信息
const handleSave = async () => {
  try {
    // 表单验证
    if (!formData.value.username?.trim()) {
      uni.showToast({
        title: '用户名不能为空',
        icon: 'none'
      })
      return
    }

    if (!formData.value.email?.trim()) {
      uni.showToast({
        title: '邮箱不能为空',
        icon: 'none'
      })
      return
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.value.email)) {
      uni.showToast({
        title: '请输入有效的邮箱地址',
        icon: 'none'
      })
      return
    }

    // 调用更新接口
    await store.dispatch('updateUserProfile', formData.value)
    
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    })

    // 返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error) {
    console.error('Save profile error:', error)
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none'
    })
  }
}
</script>

<style lang="scss" scoped>
.edit-profile-container {
  padding: 40rpx 30rpx;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.form-container {
  padding: 30rpx;
  border-radius: 16rpx;
}

.form-item {
  margin-bottom: 30rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.input {
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
  background-color: #fff;
}

.button-container {
  margin-top: 60rpx;
  padding: 0 30rpx;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background-color: #2979ff;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  
  &:active {
    opacity: 0.8;
  }
}
</style> 