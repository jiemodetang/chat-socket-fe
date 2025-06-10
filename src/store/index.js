import { createStore } from 'vuex'
import io from 'socket.io-client'
import api from '../utils/api'
import { currentConfig } from '../config'

const store = createStore({
  state: {
    socket: null,
    isConnected: false,
    user: null,
    token: uni.getStorageSync('token') || '',
    chats: [],
    currentChat: null,
    messages: {},
    friends: [],
    friendRequests: [],
    allUsers: [],
    unreadMessages: {}
    // unreadMessages 格式: { chatId: count }
  },
  mutations: {
    // Socket相关
    SOCKET_CONNECT(state, socket) {
      state.socket = socket
      state.isConnected = true
    },
    SOCKET_DISCONNECT(state) {
      state.socket = null
      state.isConnected = false
    },
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
      console.log(state.currentChat === chatId);
      
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
      state.friends = Array.isArray(friends) ? friends : [];

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
    SET_FRIEND_REQUESTS(state, requests) {
      state.friendRequests = requests
    },
    ADD_FRIEND_REQUEST(state, request) {
      state.friendRequests.push(request)
    },
    REMOVE_FRIEND_REQUEST(state, requestId) {
      state.friendRequests = state.friendRequests.filter(r => r._id !== requestId)
    },
    SET_ALL_USERS(state, users) {
      state.allUsers = users
    },
    MARK_MESSAGE_READ(state, { messageId, userId }) {
      // 遍历所有聊天中的消息，更新已读状态
      for (const chatId in state.messages) {
        const messages = state.messages[chatId];
        const messageIndex = messages.findIndex(m => m._id === messageId);
        if (messageIndex !== -1) {
          if (!messages[messageIndex].readBy.includes(userId)) {
            messages[messageIndex].readBy.push(userId);
          }
        }
      }
    }
  },
  actions: {
    // 连接Socket
    connectSocket({ commit, state }) {
      if (state.socket) return

      const socket = io(currentConfig.socketServerUrl, {
        auth: {
          token: state.token
        }
      })

      socket.on('connect', () => {
        console.log('connect')
        commit('SOCKET_CONNECT', socket)
        
        // 如果有当前聊天，则加入聊天室
        if (state.currentChat) {
          socket.emit('join-chat', state.currentChat)
        }
      })

      socket.on('disconnect', () => {
        commit('SOCKET_DISCONNECT')
      })

      // 新增监听 new-message 事件
      socket.on('new-message', (message) => {
        const chatId = message.chat._id
        commit('ADD_MESSAGE', { chatId, message })
        // Only increment unread if not current chat
        if (state.currentChat !== chatId) {
          commit('INCREMENT_UNREAD', { chatId })
        }
      })

      // 监听消息通知事件
      socket.on('message-notification', ({ chat, message }) => {
        const chatId = chat._id || chat
        // 如果不是当前聊天，增加未读计数
        const chatExists = state.chats.some(c => c._id === chatId)
        if (!chatExists) {
          commit('ADD_CHAT', chat)
        }
        commit('ADD_MESSAGE', { chatId, message })
        // Only increment unread if not current chat
        if (state.currentChat !== chatId) {
          commit('INCREMENT_UNREAD', { chatId })
        }
      })

      socket.on('friendRequest', (request) => {
        commit('ADD_FRIEND_REQUEST', request)
      })
      socket.on('error', (err) => {
        console.log(err);
        
      })
      
      // 新增输入中提示事件
      socket.on('typing', ({ chatId, user }) => {
        // 可在 state 中维护 typingUsers，或通过事件总线通知页面
        // 这里只做简单打印，具体UI由页面实现
        console.log(`${user.username} 正在输入...`, chatId)
      })
      socket.on('stop-typing', ({ chatId, user }) => {
        console.log(`${user.username} 停止输入`, chatId)
      })
      socket.on('message-read', ({ messageId, userId }) => {
        // 更新消息的已读状态
        commit('MARK_MESSAGE_READ', { messageId, userId });
      });
    },

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
        console.log("login",user);
        
        commit('SET_USER', user)
        commit('SET_TOKEN', token)
        dispatch('connectSocket')
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

    async logout({ commit, state }) {
      if (state.token) {
        try {
          await api.auth.logout()
        } catch (error) {
          console.error('Logout error:', error)
        }
      }

      if (state.socket) {
        state.socket.disconnect()
      }

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
          // 如果state中已有未读计数，使用state中的值
          if (state.unreadMessages[chat._id]) {
            unreadCounts[chat._id] = state.unreadMessages[chat._id]
          }
          // 否则使用chat中的unreadCount
          else if (chat.unreadCount) {
            unreadCounts[chat._id] = chat.unreadCount
          }
        })
        
        // 更新chats，保持未读计数
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
        commit('SET_MESSAGES', { chatId, messages:messages.messages })
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    },

    async sendMessage({ commit }, { chatId, content }) {
      // try {
      //   const message = await api.chats.sendMessage({ chatId, content })
      //   const msg = message.message
        
      //   commit('ADD_MESSAGE', { chatId,  message: msg })
      //   return { success: true, message: msg  }
      // } catch (error) {
      //   return { success: false }
      // }
    },
   
    markMessageRead({ state }, messageId) {
      if (state.socket && state.isConnected) {
        state.socket.emit('mark-read', messageId);
      }
    },
    
    // 用户和好友相关
    async fetchAllUsers({ commit }) {
      try {
        const users = await api.users.getAll()
        commit('SET_ALL_USERS', users.users)
        return { success: true }
      } catch (error) {
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

    // 好友请求相关
    async fetchFriendRequests({ commit }) {
      try {
        // 这个API端点需要在后端实现
        // 暂时使用模拟数据
        const requests = []
        commit('SET_FRIEND_REQUESTS', requests)
        return { success: true }
      } catch (error) {
        return { success: false }
      }
    },

    async respondToFriendRequest({ commit }, { requestId, accept }) {
      try {
        // 这个API端点需要在后端实现
        // 暂时使用模拟逻辑
        if (accept) {
          commit('ADD_FRIEND', response.friend)
        }
        commit('REMOVE_FRIEND_REQUEST', requestId)
        return { success: true }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '操作失败' }
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
    sortedChats: state => {
      if (!state.chats || !Array.isArray(state.chats)) return []
      
      return [...state.chats].sort((a, b) => {
        const aTime = a?.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0
        const bTime = b?.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0
        return bTime - aTime
      })
    }
  }
})

export default store