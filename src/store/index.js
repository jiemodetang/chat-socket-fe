import { createStore } from 'vuex'
import api from '../utils/api'
import websocket from './modules/websocket'
import { loginTUICallKit } from '../utils/tuiCallKit'
import { updateContactsBadge } from '../utils/badgeManager'
import { watch } from 'vue'

const store = createStore({
  state: {
    user: null,
    token: uni.getStorageSync('token') || '',
    chats: [],
    currentChat: null,
    messages: {},
    friends: [],
    allUsers: [],
    unreadMessages: {},
    friendRequests: [], // 添加好友请求列表
    // unreadMessages 格式: { chatId: count }
  },
  mutations: {
    // 用户相关
    SET_USER(state, user) {
      state.user = user
    },
    SET_TOKEN(state, token) {
      state.token = token
      uni.setStorageSync('token', token)
    },
    CLEAR_USER_DATA(state) {
      state.user = null
      state.token = ''
      state.chats = []
      state.currentChat = null
      state.messages = {}
      state.friends = []
      state.allUsers = []
      state.unreadMessages = {}
      state.friendRequests = []
      uni.removeStorageSync('token')
    },
    // 聊天相关
    SET_CHATS(state, chats) {
      state.chats = Array.isArray(chats) ? chats : []
    },
    ADD_CHAT(state, chat) {
      const exists = state.chats.find(c => c._id === chat._id)
      if (!exists) {
        state.chats.push(chat)
      }
    },
    REMOVE_CHAT(state, chatId) {
      state.chats = state.chats.filter(c => c._id !== chatId);
      // 清除相关消息
      if (state.messages[chatId]) {
        delete state.messages[chatId];
      }
      // 清除未读计数
      if (state.unreadMessages[chatId]) {
        delete state.unreadMessages[chatId];
      }
      // 如果正在查看该聊天，清除当前聊天
      if (state.currentChat === chatId) {
        state.currentChat = null;
      }
    },
    SET_CURRENT_CHAT(state, chatId) {
      state.currentChat = chatId
      // 设置当前聊天时，清除该聊天的未读消息计数
      if (chatId) {
        // 无论是否有未读消息，都设置为0
        state.unreadMessages[chatId] = 0
        
        // 更新聊天列表中的未读计数
        const chatIndex = state.chats.findIndex(c => c._id === chatId)
        if (chatIndex !== -1) {
          state.chats[chatIndex].unreadCount = 0
        }
      }
    },
    SET_MESSAGES(state, { chatId, messages }) {
      state.messages = {
        ...state.messages,
        [chatId]: messages
      }
    },
    ADD_MESSAGE(state, { chatId, message }) {
      if (!state.messages[chatId]) {
        state.messages[chatId] = []
      }
      
      // Check if message already exists to prevent duplicates
      const messageExists = state.messages[chatId].some(m => m._id === message._id)
      if (!messageExists) {
        state.messages[chatId].push(message)
        
        // 更新聊天列表中的最后一条消息
        const chatIndex = state.chats.findIndex(c => c._id === chatId)
        if (chatIndex !== -1) {
          state.chats[chatIndex].latestMessage = message
        }
      }
    },
    // 增加未读消息计数
    INCREMENT_UNREAD(state, { chatId }) {
      // 如果是当前聊天，不增加未读计数
      if (state.currentChat === chatId) return
      
      // 初始化或增加未读计数
      if (!state.unreadMessages[chatId]) {
        state.unreadMessages[chatId] = 1
      } else {
        state.unreadMessages[chatId]++
      }
      
      // 更新聊天列表中的未读计数
      const chatIndex = state.chats.findIndex(c => c._id === chatId)
      if (chatIndex !== -1) {
        // 确保未读计数属性存在并正确初始化
        if (state.chats[chatIndex].unreadCount === undefined) {
          state.chats[chatIndex].unreadCount = 0
        }
        // 更新未读计数
        state.chats[chatIndex].unreadCount = state.unreadMessages[chatId]
      }
    },
    // 清除未读消息计数
    CLEAR_UNREAD(state, chatId) {
      // 确保初始化为0，而不是undefined
      state.unreadMessages[chatId] = 0
      
      // 更新聊天列表中的未读计数
      const chatIndex = state.chats.findIndex(c => c._id === chatId)
      if (chatIndex !== -1) {
        // 确保未读计数属性存在并设置为0
        state.chats[chatIndex].unreadCount = 0
      }
    },
    // 好友相关
    SET_FRIENDS(state, friends) {
      state.friends = friends
    },
    ADD_FRIEND(state, friendData) {
      // 检查是否已存在该好友
      const index = state.friends.findIndex(f => f.user._id === friendData.user._id)
      if (index === -1) {
        // 不存在则添加
        state.friends.push(friendData)
      } else {
        // 存在则更新
        state.friends[index] = friendData
      }
    },
    REMOVE_FRIEND(state, friendId) {
      state.friends = state.friends.filter(f => f.user._id !== friendId)
    },
    UPDATE_FRIEND_REMARK(state, { friendId, remark }) {
      console.log('UPDATE_FRIEND_REMARK mutation called with:', { friendId, remark })
      console.log('Current friends state:', JSON.stringify(state.friends))
      // 先尝试通过user._id查找
      let friendIndex = state.friends.findIndex(f => f.user._id === friendId)
      
      // 如果没找到，尝试直接通过_id查找
      if (friendIndex === -1) {
        friendIndex = state.friends.findIndex(f => f._id === friendId)
      }
      
      // 如果仍然没找到，再尝试通过user对象进行查找
      if (friendIndex === -1) {
        friendIndex = state.friends.findIndex(f => {
          return f.user && (f.user._id === friendId || f.user.id === friendId)
        })
      }
      
      console.log('Found friend index:', friendIndex)
      if (friendIndex !== -1) {
        state.friends[friendIndex].remark = remark
        console.log('Updated friend remark successfully')
      } else {
        console.error('Friend not found in state with ID:', friendId)
        console.log('Available friend IDs:', state.friends.map(f => f.user?._id || 'undefined'))
      }
    },
    // 好友请求相关
    SET_FRIEND_REQUESTS(state, requests) {
      state.friendRequests = requests
    },
    ADD_FRIEND_REQUEST(state, request) {
      // 检查是否已存在相同的请求
      const exists = state.friendRequests.some(req => req._id === request._id)
      if (!exists) {
        state.friendRequests.push(request)
      }
    },
    REMOVE_FRIEND_REQUEST(state, requestId) {
      state.friendRequests = state.friendRequests.filter(request => request._id !== requestId)
    },
    // 所有用户相关
    SET_ALL_USERS(state, users) {
      state.allUsers = Array.isArray(users) ? users : []
    },
    MARK_MESSAGE_READ(state, { messageId, userId }) {
      // 遍历所有聊天中的消息，更新已读状态
      for (const chatId in state.messages) {
        const messages = state.messages[chatId]
        const messageIndex = messages.findIndex(m => m._id === messageId)
        if (messageIndex !== -1) {
          if (!messages[messageIndex].readBy.includes(userId)) {
            messages[messageIndex].readBy.push(userId)
          }
        }
      }
    },
    // 更新完整的好友数据
    UPDATE_FRIEND_DATA(state, friendData) {
      console.log('UPDATE_FRIEND_DATA called with:', friendData)
      if (!friendData || !friendData._id) {
        console.error('Invalid friend data provided')
        return
      }
      
      // 查找是否存在这个好友
      const index = state.friends.findIndex(f => f._id === friendData._id)
      if (index !== -1) {
        // 更新现有好友数据
        console.log(`Updating friend at index ${index}`)
        state.friends[index] = friendData
      } else {
        // 可能是新的好友，添加到列表中
        console.log('Friend not found in state, adding to friends list')
        state.friends.push(friendData)
      }
    }
  },
  actions: {
    // 认证相关
    async register({ commit }, userData) {
      try {
        const response = await api.auth.register(userData)
        const { user, token } = response
        commit('SET_USER', user)
        commit('SET_TOKEN', token)
        return { success: true }
      } catch (error) {
        // 提取错误信息
        let errorMessage = '注册失败';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && error.message) {
          errorMessage = error.message;
        }
        
        return { success: false, message: errorMessage }
      }
    },

    async login({ commit, dispatch }, credentials) {
      try {
        const response = await api.auth.login(credentials)
        const { user, token } = response
        commit('SET_USER', user)
        commit('SET_TOKEN', token)
        // 初始化WebSocket连接
        dispatch('websocket/initWebSocket', token, { root: true })
        // 初始化TUICallKit
       // #ifndef H5
        if (user) {
          loginTUICallKit(user,
            () => console.log('App Launch: TUICallKit登录成功'),
            (err) => console.error('App Launch: TUICallKit登录失败:', err)
          )
        }
        return { success: true }
      } catch (error) {
           // 提取错误信息
           let errorMessage = '登录失败';
           if (error instanceof Error) {
             errorMessage = error.message;
           } else if (typeof error === 'string') {
             errorMessage = error;
           } else if (error && error.message) {
             errorMessage = error.message;
           }
        return { success: false, message:errorMessage }
      }
    },

    async fetchCurrentUser({ commit, state }) {
      if (!state.token) return { success: false }

      try {
        const user = await api.auth.getCurrentUser()
        commit('SET_USER', user.user)
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    },

    async logout({ commit, dispatch }) {
      try {
        await api.auth.logout()
      } catch (error) {
        console.error('Logout error:', error)
      }

      // 关闭WebSocket连接
      dispatch('websocket/closeConnection', null, { root: true })
      commit('CLEAR_USER_DATA')
    },

    // 聊天相关
    async fetchChats({ commit, state }) {
      try {
        const chats = await api.chats.getAll()
        const chatList = Array.isArray(chats?.chats) ? chats.chats : []
        
        // 保存当前的未读消息计数
        const unreadCounts = {}
        chatList.forEach(chat => {
          if (state.unreadMessages[chat._id]) {
            unreadCounts[chat._id] = state.unreadMessages[chat._id]
          } else if (chat.unreadCount) {
            unreadCounts[chat._id] = chat.unreadCount
          }
        })
        
        const updatedChats = chatList.map(chat => ({
          ...chat,
          unreadCount: unreadCounts[chat._id] || 0
        }))
        
        commit('SET_CHATS', updatedChats)
        return { success: true }
      } catch (error) {
        console.error('Failed to fetch chats:', error)
        commit('SET_CHATS', [])
        return { success: false }
      }
    },

    async createSingleChat({ commit }, userId) {
      try {
        const chat = await api.chats.createPrivateChat(userId)
        commit('ADD_CHAT', chat.chat)
        return { success: true, chat: chat.chat }
      } catch (error) {
        return { success: false }
      }
    },

    async createGroupChat({ commit }, groupData) {
      try {
        const chat = await api.chats.createGroupChat(groupData)
        commit('ADD_CHAT', chat.chat)
        return  { success: true, chat: chat.chat }
      } catch (error) {
        return { success: false }
      }
    },

    async fetchMessages({ commit }, chatId) {
      try {
        const messages = await api.chats.getMessages(chatId)
        commit('SET_MESSAGES', { chatId, messages: messages.messages })
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    },

    // 用户和好友相关
    async fetchAllUsers({ commit }) {
      try {
        const users = await api.users.getAll()
        commit('SET_ALL_USERS', users.users)
        return { success: true }
      } catch (error) {
        console.error('Failed to fetch all users:', error)
        return { success: false }
      }
    },

    async searchUsers(_, query) {
      try {
        const response = await api.users.search(query)
        return { 
          success: true, 
          users: response.users || [],
        }
      } catch (error) {
        return { 
          success: false, 
          message: error.message || '搜索失败'
        }
      }
    },

    async fetchFriends({ commit }) {
      try {
        const response = await api.users.getFriends()
        commit('SET_FRIENDS', response.friends)
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    },

    // 发送好友请求
    async sendFriendRequest({ commit }, friendId) {
      try {
        const response = await api.users.sendFriendRequest(friendId)
        return { 
          success: true, 
          message: response.message || '好友请求已发送'
        }
      } catch (error) {
        return { 
          success: false, 
          message: error.message || '发送好友请求失败'
        }
      }
    },

    // 获取好友请求列表
    async fetchFriendRequests({ commit }) {
      try {
        const response = await api.users.getFriendRequests()
        commit('SET_FRIEND_REQUESTS', response.requests)
        
        // 更新通讯录Tab角标
        updateContactsBadge(response.requests.length)
        
        return { 
          success: true, 
          requests: response.requests 
        }
      } catch (error) {
        return { 
          success: false, 
          message: error.message || '获取好友请求失败'
        }
      }
    },
    
    // 接受好友请求
    async acceptFriendRequest({ commit, dispatch }, requestId) {
      try {
        const response = await api.users.acceptFriendRequest(requestId)
        commit('REMOVE_FRIEND_REQUEST', requestId)
        
        // 更新好友列表
        await dispatch('fetchFriends')
        
        // 更新通讯录Tab角标
        const requestCount = store.state.friendRequests.length
        updateContactsBadge(requestCount)
        
        return { 
          success: true, 
          message: response.message || '已接受好友请求',
          user: response.user
        }
      } catch (error) {
        return { 
          success: false, 
          message: error.message || '接受好友请求失败'
        }
      }
    },
    
    // 拒绝好友请求
    async rejectFriendRequest({ commit }, requestId) {
      try {
        const response = await api.users.rejectFriendRequest(requestId)
        commit('REMOVE_FRIEND_REQUEST', requestId)
        
        // 更新通讯录Tab角标
        const requestCount = store.state.friendRequests.length
        updateContactsBadge(requestCount)
        
        return { 
          success: true, 
          message: response.message || '已拒绝好友请求'
        }
      } catch (error) {
        return { 
          success: false, 
          message: error.message || '拒绝好友请求失败'
        }
      }
    },

    async removeFriend({ commit }, friendId) {
      try {
        const response = await api.users.removeFriend(friendId)
        commit('REMOVE_FRIEND', friendId)
        return { success: true, user: response.user }
      } catch (error) {
        return { success: false, message: error.message || '删除好友失败' }
      }
    },

    // 更新用户资料
    async updateUserProfile({ commit }, userData) {
      try {
        const response = await api.users.updateProfile(userData)
        commit('SET_USER', response.user)
        return { success: true }
      } catch (error) {
        throw new Error(error.response?.data?.message || '更新失败')
      }
    },

    async updateFriendRemark({ commit }, { friendId, remark }) {
      console.log('updateFriendRemark called with:', { friendId, remark })
      try {
        console.log('Calling API to update friend remark')
        const response = await api.users.updateFriendRemark(friendId, remark)
        console.log('API response:', response)
        
        if (response && response.success) {
          // 如果API返回了更新后的好友数据，使用它来更新状态
          if (response.friendData) {
            console.log('Using friendData from API response')
            commit('UPDATE_FRIEND_DATA', response.friendData)
          } else {
            // 否则使用传入的参数更新状态
            commit('UPDATE_FRIEND_REMARK', { friendId, remark })
          }
          return { success: true, friendData: response.friendData }
        } else {
          throw new Error(response?.message || '服务器未返回成功状态')
        }
      } catch (error) {
        console.error('Error updating friend remark:', error)
        return { success: false, message: error.message || '更新好友备注失败' }
      }
    }
  },
  getters: {
    isAuthenticated: state => !!state.token,
    currentUser: state => state.user,
    currentChat: state => state.currentChat,
    currentChatMessages: state => state.messages[state.currentChat] || [],
    unreadCount: state => Object.values(state.unreadMessages).reduce((a, b) => a + b, 0),
    friendsList: state => state.friends || [],
    allUsersList: state => state.allUsers || [],
    pendingFriendRequests: state => state.friendRequests || [],
    pendingFriendRequestsCount: state => state.friendRequests.length,
    sortedChats: state => {
      if (!state.chats || !Array.isArray(state.chats)) return []
      
      return [...state.chats].sort((a, b) => {
        const aTime = a?.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0
        const bTime = b?.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0
        return bTime - aTime
      })
    }
  },
  modules: {
    websocket
  }
})

export default store