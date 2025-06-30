import websocketService from '@/utils/websocket';
import { updateContactsBadge } from '@/utils/badgeManager';

const state = {
  isConnected: false,
  onlineUsers: [],
  currentUser: null,
  typingUsers: new Map(),
  // Remove unreadMessages from websocket module state - use only the main store's counter
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
  // Removed ADD_UNREAD_MESSAGE and CLEAR_UNREAD_MESSAGES mutations
  // Now using only the main store's unread counter
    ADD_MESSAGE(state, { chatId, message }) {
    // Implementation of ADD_MESSAGE mutation
  },
  // Removed INCREMENT_UNREAD mutation - using only the main store's version
  SET_LATEST_FRIEND_REQUEST(state, request) {
    state.latestFriendRequest = request;
  }
};

const actions = {
  initWebSocket({ commit, dispatch, rootState }, token) {
    // 先清除可能存在的旧处理器
    websocketService.off('new-message');
    websocketService.off('typing');
    websocketService.off('stop-typing');
    websocketService.off('message-read');
    websocketService.off('friend-request-notification');
    websocketService.off('friend-request-accepted-notification');
    websocketService.off('friend-request-rejected-notification');
    
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
        // 增加未读消息计数 - 只在主store中增加，防止重复计数
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
      
      // 更新通讯录Tab角标 - 立即更新，因为API可能需要时间
      const currentCount = rootState.friendRequests.length + 1; // +1 因为新请求可能还未加载
      updateContactsBadge(currentCount);
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
    // Use the main store's CLEAR_UNREAD mutation
    commit('CLEAR_UNREAD', chatId, { root: true });
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

  latestFriendRequest: state => state.latestFriendRequest
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}; 