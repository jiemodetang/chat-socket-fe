import websocketService from '@/utils/websocket';

const state = {
  isConnected: false,
  onlineUsers: [],
  currentUser: null,
  typingUsers: new Map(),
  unreadMessages: new Map(),
  latestFriendRequest: null
};

const mutations = {
  SET_CONNECTION_STATUS(state, status) {
    state.isConnected = status;
  },
  SET_ONLINE_USERS(state, users) {
    state.onlineUsers = users;
  },
  SET_CURRENT_USER(state, user) {
    state.currentUser = user;
  },
  ADD_TYPING_USER(state, { chatId, user }) {
    if (!state.typingUsers.has(chatId)) {
      state.typingUsers.set(chatId, new Set());
    }
    state.typingUsers.get(chatId).add(user);
  },
  REMOVE_TYPING_USER(state, { chatId, user }) {
    if (state.typingUsers.has(chatId)) {
      state.typingUsers.get(chatId).delete(user);
    }
  },
  ADD_UNREAD_MESSAGE(state, { chatId, messageId }) {
    if (!state.unreadMessages.has(chatId)) {
      state.unreadMessages.set(chatId, new Set());
    }
    state.unreadMessages.get(chatId).add(messageId);
  },
  CLEAR_UNREAD_MESSAGES(state, chatId) {
    state.unreadMessages.delete(chatId);
  },
  ADD_MESSAGE(state, { chatId, message }) {
    // Implementation of ADD_MESSAGE mutation
  },
  INCREMENT_UNREAD(state, { chatId }) {
    if (!state.unreadMessages.has(chatId)) {
      state.unreadMessages.set(chatId, new Set());
    }
    state.unreadMessages.get(chatId).size++;
  },
  SET_LATEST_FRIEND_REQUEST(state, request) {
    state.latestFriendRequest = request;
  }
};

const actions = {
  initWebSocket({ commit, dispatch }, token) {
    websocketService.init(token);

    // 注册消息处理器
    websocketService.on('connected', (data) => {
      commit('SET_CURRENT_USER', data);
      commit('SET_CONNECTION_STATUS', true);
    });

    websocketService.on('users-online', (users) => {
      commit('SET_ONLINE_USERS', users);
    });

    websocketService.on('new-message', (message) => {
      // 如果消息不是当前用户发送的，标记为未读
      if (message.sender._id !== state.currentUser._id) {
        // 增加未读消息计数
        commit('INCREMENT_UNREAD', {
          chatId: message.chat._id
        }, { root: true });
      }
      // 将消息添加到主store
      commit('ADD_MESSAGE', {
        chatId: message.chat._id,
        message
      }, { root: true });
    });

    websocketService.on('typing', ({ chatId, user }) => {
      commit('ADD_TYPING_USER', { chatId, user });
    });

    websocketService.on('stop-typing', ({ chatId, user }) => {
      commit('REMOVE_TYPING_USER', { chatId, user });
    });

    websocketService.on('message-read', ({ messageId, userId }) => {
      // 处理消息已读状态
    });

    // 好友请求通知 - 当收到新的好友请求时
    websocketService.on('friend-request-notification', (data) => {
      // 保存发送者信息
      commit('SET_LATEST_FRIEND_REQUEST', {
        sender: data.sender,
        createdAt: new Date()
      });
      
      // 显示通知
      uni.showToast({
        title: `收到来自 ${data.sender.username} 的好友请求`,
        icon: 'none',
        duration: 3000
      });
      
      // 震动提示
      if (uni.getSystemInfoSync().platform !== 'devtools') {
        uni.vibrateLong();
      }
      
      // 更新好友请求列表 - 通过API获取最新的好友请求列表
      dispatch('fetchFriendRequests', null, { root: true });
    });

    // 好友请求被接受通知
    websocketService.on('friend-request-accepted-notification', (data) => {
      // 显示通知
      uni.showToast({
        title: `${data.user.username} 已接受您的好友请求`,
        icon: 'success',
        duration: 3000
      });
      
      // 更新好友列表 - 通过API获取最新的好友列表
      dispatch('fetchFriends', null, { root: true });
    });

    // 好友请求被拒绝通知
    websocketService.on('friend-request-rejected-notification', (data) => {
      // 显示通知
      uni.showToast({
        title: `用户已拒绝您的好友请求`,
        icon: 'none',
        duration: 3000
      });
    });
  },

  sendMessage({ state }, { chatId, content, messageType = 'text', ...extraFields }) {
    websocketService.sendChatMessage(chatId, content, messageType, extraFields);
  },

  sendTypingStatus({ state }, chatId) {
    websocketService.sendTypingStatus(chatId);
  },

  sendStopTypingStatus({ state }, chatId) {
    websocketService.sendStopTypingStatus(chatId);
  },

  markMessageAsRead({ state, commit }, { chatId, messageId }) {
    websocketService.markMessageAsRead(messageId);
    commit('CLEAR_UNREAD_MESSAGES', chatId);
  },

  closeConnection({ commit }) {
    websocketService.close();
    commit('SET_CONNECTION_STATUS', false);
    commit('SET_CURRENT_USER', null);
    commit('SET_ONLINE_USERS', []);
  },

  fetchFriendRequests({ commit }) {
    // Implementation of fetchFriendRequests action
  },

  fetchFriends({ commit }) {
    // Implementation of fetchFriends action
  },

  // 发送好友请求通知
  sendFriendRequestNotification({ state }, targetUserId) {
    websocketService.sendFriendRequestNotification(targetUserId);
  },
  
  // 发送好友请求响应通知
  sendFriendRequestResponseNotification({ state }, { senderId, response }) {
    websocketService.sendFriendRequestResponseNotification(senderId, response);
  }
};

const getters = {
  isConnected: state => state.isConnected,
  onlineUsers: state => state.onlineUsers,
  currentUser: state => state.currentUser,
  getTypingUsers: state => chatId => {
    return state.typingUsers.get(chatId) || new Set();
  },
  getUnreadMessageCount: state => chatId => {
    return state.unreadMessages.get(chatId)?.size || 0;
  },
  latestFriendRequest: state => state.latestFriendRequest
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}; 