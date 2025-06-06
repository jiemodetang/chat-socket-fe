import { config } from '../config/index.js'

// 创建请求函数
const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    }
    
    if (token) {
      header.Authorization = `Bearer ${token}`
    }

    uni.request({
      url: config.socketServerUrl + '/api' + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: header,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data.data)
        } else if (res.statusCode === 401) {
          // 未授权，清除token并跳转到登录页
          uni.removeStorageSync('token')
          uni.removeStorageSync('user')
          uni.reLaunch({
            url: '/pages/login/index'
          })
          reject(new Error('未授权'))
        } else {
          reject(new Error(res.data.message || '请求失败'))
        }
      },
      fail: (err) => {
        console.error('Request error:', err)
        uni.showToast({
          title: '网络请求失败，请稍后再试',
          icon: 'none',
          duration: 2000
        })
        reject(err)
      }
    })
  })
}

// API服务
const apiService = {
  // 认证相关
  auth: {
    // 注册
    register: (userData) => request({
      url: '/auth/register',
      method: 'POST',
      data: userData
    }),
    
    // 登录
    login: (credentials) => request({
      url: '/auth/login',
      method: 'POST',
      data: credentials
    }),
    
    // 获取当前用户信息
    getCurrentUser: () => request({
      url: '/auth/me',
      method: 'GET'
    }),
    
    // 登出
    logout: () => request({
      url: '/auth/logout',
      method: 'POST'
    })
  },
  
  // 用户相关
  users: {
    // 获取所有用户
    getAll: () => request({
      url: '/users',
      method: 'GET'
    }),
    
    // 搜索用户
    search: (query) => request({
      url: '/users/search',
      method: 'GET',
      data: { keyword: query }
    }),
    
    // 获取好友列表
    getFriends: () => request({
      url: '/users/friends',
      method: 'GET'
    }),
    
    // 添加好友
    addFriend: (friendId) => request({
      url: '/users/friends',
      method: 'POST',
      data: { friendId }
    }),
    
    // 删除好友
    removeFriend: (friendId) => request({
      url: `/users/friends/${friendId}`,
      method: 'DELETE'
    }),

    // 更新用户资料
    updateProfile: (userData) => request({
      url: '/users/update',
      method: 'PATCH',
      data: userData
    })
  },
  
  // 聊天相关
  chats: {
    // 获取所有聊天
    getAll: () => request({
      url: '/chats',
      method: 'GET'
    }),
    
    // 创建单聊
    createPrivateChat: (userId) => request({
      url: '/chats',
      method: 'POST',
      data: { userId }
    }),
    
    // 创建群聊
    createGroupChat: (groupData) => request({
      url: '/chats/group',
      method: 'POST',
      data: groupData
    }),
    
    // 获取聊天消息
    getMessages: (chatId) => request({
      url: `/chats/${chatId}/messages`,
      method: 'GET'
    }),
    
    // 发送消息
    sendMessage: ({ chatId, content, type }) => request({
      url: '/chats/message',
      method: 'POST',
      data: { chatId, content, type }
    })
  }
}

export default apiService