import { createStore } from 'vuex'
import api from '../utils/api'
import websocket from './modules/websocket'
import { loginTUICallKit } from '../utils/tuiCallKit'

const store = createStore({
  state: {
    user: null,
    token: uni.getStorageSync('token') || '',
    chats: [],
    currentChat: null,
    messages: {},
    friends: [],
    allUsers: [],
    unreadMessages: {}
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
    SET_CURRENT_CHAT(state, chatId) {
      state.currentChat = chatId
      // 设置当前聊天时，清除该聊天的未读消息计数
      if (state.unreadMessages[chatId]) {
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
        // 初始化未读计数属性
        if (!state.chats[chatIndex].unreadCount) {
          state.chats[chatIndex].unreadCount = 0
        }
        state.chats[chatIndex].unreadCount = state.unreadMessages[chatId]
      }
    },
    // 清除未读消息计数
    CLEAR_UNREAD(state, chatId) {
      state.unreadMessages[chatId] = 0
      
      // 更新聊天列表中的未读计数
      const chatIndex = state.chats.findIndex(c => c._id === chatId)
      if (chatIndex !== -1) {
        state.chats[chatIndex].unreadCount = 0
      }
    },
    // 好友相关
    SET_FRIENDS(state, friends) {
      state.friends = Array.isArray(friends) ? friends : []
    },
    ADD_FRIEND(state, friend) {
      const exists = state.friends.find(f => f._id === friend._id)
      if (!exists) {
        state.friends.push(friend)
      }
    },
    REMOVE_FRIEND(state, friendId) {
      state.friends = state.friends.filter(f => f._id !== friendId)
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
        return { success: false, message: error.response?.data?.message || '注册失败' }
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
        loginTUICallKit(user, 
          () => console.log('TUICallKit登录成功'), 
          (err) => console.error('TUICallKit登录失败:', err)
        )
        return { success: true }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '登录失败' }
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
        return chat.chat
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
        const users = await api.users.search(query)
        return { success: true, users: users.users }
      } catch (error) {
        return { success: false }
      }
    },

    async fetchFriends({ commit }) {
      try {
        const friends = await api.users.getFriends()
        commit('SET_FRIENDS', friends.friends)
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    },

    async sendFriendRequest({ commit }, friendId) {
      try {
        const friend = await api.users.addFriend(friendId)
        commit('ADD_FRIEND', friend.user)
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    },

    async removeFriend({ commit }, friendId) {
      try {
        await api.users.removeFriend(friendId)
        commit('REMOVE_FRIEND', friendId)
        return { success: true }
      } catch (error) {
        return { success: false }
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