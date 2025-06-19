import websocketService from '@/utils/websocket';
import { callManager } from '@/utils/call';

const state = {
  isConnected: false,
  onlineUsers: [],
  currentUser: null,
  typingUsers: new Map(),
  unreadMessages: new Map()
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
  }
};

const actions = {
  initWebSocket({ commit }, token) {
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

    // 注册通话相关事件处理器，确保 callManager 能收到这些事件
    websocketService.on('incoming-call', (data) => {
      console.log('Store 收到来电事件:', data);
      // callManager 会自动处理这个事件，因为它已经在 setupCallEventListeners 中注册了监听器
    });

    websocketService.on('call-accepted', (data) => {
      console.log('Store 收到通话接受事件:', data);
    });

    websocketService.on('call-rejected', (data) => {
      console.log('Store 收到通话拒绝事件:', data);
    });

    websocketService.on('call-ended', (data) => {
      console.log('Store 收到通话结束事件:', data);
    });

    websocketService.on('ice-candidate', (data) => {
      console.log('Store 收到ICE候选者事件:', data);
    });

    websocketService.on('offer', (data) => {
      console.log('Store 收到Offer事件:', data);
    });

    websocketService.on('answer', (data) => {
      console.log('Store 收到Answer事件:', data);
    });
  },

  sendMessage({ state }, { chatId, content, messageType = 'text', fileUrl = '', duration = 0 }) {
    websocketService.sendChatMessage(chatId, content, messageType, fileUrl, duration);
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
  }
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}; 