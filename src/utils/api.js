import { currentConfig } from '../config/index.js'

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

    const baseUrl = currentConfig.apiUrl
    const url = `${baseUrl}/api${options.url}`

    uni.request({
      url: url,
      method: options.method || 'GET',
      data: options.data,
      header: header,
      success: (res) => {
        // 处理业务层面的错误
        
        // 提取错误信息的辅助函数
        const extractErrorMessage = (data) => {
          if (typeof data === 'string' && data.includes('<!DOCTYPE html>')) {
            // 从HTML响应中提取错误信息
            const match = data.match(/Error: (.*?)<br>/);
            return match ? match[1].trim() : '服务器返回了错误信息';
          }
          return data?.message || data?.error || '请求失败';
        };

        // 处理 HTTP 状态码错误
        if (res.statusCode >= 400) {
          const errorMessage = extractErrorMessage(res.data);
          console.log(errorMessage);
          
          // 根据不同的状态码处理不同的错误
          switch (res.statusCode) {
            case 400:
              uni.showToast({
                title: errorMessage,
                icon: 'none',
                duration: 2000
              });
              break;
            case 401:
              // 清除登录状态
              uni.removeStorageSync('token');
              uni.removeStorageSync('user');
              
              // 如果不是登录接口，才跳转到登录页
              if (!options.url.includes('/auth/login')) {
                uni.reLaunch({
                  url: '/pages/login/index'
                });
              }
              break;
            case 403:
              uni.showToast({
                title: errorMessage || '没有权限执行此操作',
                icon: 'none',
                duration: 2000
              });
              break;
            case 404:
              uni.showToast({
                title: errorMessage || '请求的资源不存在',
                icon: 'none',
                duration: 2000
              });
              break;
            case 500:
              uni.showToast({
                title: errorMessage || '服务器内部错误',
                icon: 'none',
                duration: 2000
              });
              break;
            default:
              uni.showToast({
                title: errorMessage,
                icon: 'none',
                duration: 2000
              });
          }
          
          reject(new Error(errorMessage));
          return;
        }

        // 处理业务逻辑错误
        if (res.data?.status === 'error' || res.data?.error) {
          const errorMessage = extractErrorMessage(res.data);
          uni.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 2000
          });
          reject(new Error(errorMessage));
          return;
        }

        // 处理成功响应
        resolve(res.data?.data || res.data);
      },
      fail: (err) => {
        console.error('Request error:', err);
        const errorMessage = err.errMsg || '网络请求失败，请稍后再试';
        uni.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        });
        reject(err);
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