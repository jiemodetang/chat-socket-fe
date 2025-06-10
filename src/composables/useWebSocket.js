import { computed } from 'vue';
import { useStore } from 'vuex';

export function useWebSocket() {
  const store = useStore();

  // 初始化WebSocket连接
  const initWebSocket = (token) => {
    store.dispatch('websocket/initWebSocket', token);
  };

  // 发送消息
  const sendMessage = (chatId, content, messageType = 'text', fileUrl = '', duration = 0) => {
    store.dispatch('websocket/sendMessage', {
      chatId,
      content,
      messageType,
      fileUrl,
      duration
    });
  };

  // 发送正在输入状态
  const sendTypingStatus = (chatId) => {
    store.dispatch('websocket/sendTypingStatus', chatId);
  };

  // 发送停止输入状态
  const sendStopTypingStatus = (chatId) => {
    store.dispatch('websocket/sendStopTypingStatus', chatId);
  };

  // 标记消息为已读
  const markMessageAsRead = (chatId, messageId) => {
    store.dispatch('websocket/markMessageAsRead', { chatId, messageId });
  };

  // 关闭连接
  const closeConnection = () => {
    store.dispatch('websocket/closeConnection');
  };

  // 计算属性
  const isConnected = computed(() => store.getters['websocket/isConnected']);
  const onlineUsers = computed(() => store.getters['websocket/onlineUsers']);
  const currentUser = computed(() => store.getters['websocket/currentUser']);
  const getTypingUsers = (chatId) => store.getters['websocket/getTypingUsers'](chatId);
  const getUnreadMessageCount = (chatId) => store.getters['websocket/getUnreadMessageCount'](chatId);

  return {
    // 方法
    initWebSocket,
    sendMessage,
    sendTypingStatus,
    sendStopTypingStatus,
    markMessageAsRead,
    closeConnection,

    // 计算属性
    isConnected,
    onlineUsers,
    currentUser,
    getTypingUsers,
    getUnreadMessageCount
  };
} 