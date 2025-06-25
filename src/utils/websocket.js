import { currentConfig } from '../config'

class WebSocketService {
  constructor() {
    this.socketTask = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.messageHandlers = new Map();
    this.token = '';
    // 将 ws:// 或 wss:// 添加到 apiUrl
    const wsProtocol = currentConfig.apiUrl.startsWith('https') ? 'wss://' : 'ws://'
    const wsUrl = currentConfig.apiUrl.replace(/^https?:\/\//, '')
    this.baseUrl = `${wsProtocol}${wsUrl}`;
    this.isConnecting = false;
    this.heartbeatInterval = null;
    this.heartbeatTimeout = 30000; // 30秒
    this.lastPongTime = 0;
    this.connectionTimeout = null;
  }

  // 初始化WebSocket连接
  init(token) {
    if (!token) {
      console.error('WebSocket初始化失败: 未提供token');
      return;
    }
    if (this.isConnected) {
      console.log('WebSocket已经连接，跳过初始化');
      return;
    }
    this.token = token;
    this.connect();
  }

  // 建立WebSocket连接
  connect() {
    if (this.isConnecting) {
      console.log('WebSocket正在连接中，跳过重复连接');
      return;
    }

    if (this.socketTask) {
      console.log('关闭已存在的连接');
      this.socketTask.close();
      this.socketTask = null;
    }

    this.isConnecting = true;
    const wsUrl = `${this.baseUrl}?token=${this.token}`;
    console.log('正在连接WebSocket:', wsUrl);
    
    try {
      this.socketTask = uni.connectSocket({
        url: wsUrl,
        success: () => {
          console.log('WebSocket连接创建成功');
        },
        fail: (error) => {
          console.error('WebSocket连接创建失败:', error);
          this.handleReconnect();
        }
      });

      this.setupEventListeners();
      
      // 设置连接超时
      this.connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          console.error('WebSocket连接超时');
          this.handleReconnect();
        }
      }, 10000); // 10秒超时
    } catch (error) {
      console.error('WebSocket连接异常:', error);
      this.handleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  // 设置事件监听器
  setupEventListeners() {
    if (!this.socketTask) {
      console.error('WebSocket未初始化');
      return;
    }

    this.socketTask.onOpen(() => {
      console.log('WebSocket连接已打开');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.lastPongTime = Date.now();
      this.startHeartbeat();
      
      // 清除连接超时
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // 连接成功后发送认证消息
      this.sendMessage('auth', { token: this.token });
    });

    this.socketTask.onClose((res) => {
      console.log('WebSocket连接已关闭:', res);
      this.isConnected = false;
      this.stopHeartbeat();
      
      // 只有在非正常关闭时才重连
      if (res.code !== 1000) {
        this.handleReconnect();
      }
    });

    this.socketTask.onError((error) => {
      console.error('WebSocket错误:', error);
      this.isConnected = false;
      this.stopHeartbeat();
      this.handleReconnect();
    });

    this.socketTask.onMessage((res) => {
      try {
        const message = JSON.parse(res.data);
        console.log('收到WebSocket消息:', message);
        
        // 处理心跳响应
        if (message.type === 'pong') {
          this.handlePong();
          return;
        }
        
        this.handleMessage(message);
      } catch (error) {
        console.error('消息解析错误:', error, '原始数据:', res.data);
      }
    });
  }

  // 开始心跳检测
  startHeartbeat() {
    this.stopHeartbeat(); // 清除可能存在的旧定时器
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        const now = Date.now();
        // 如果超过60秒没有收到pong响应，认为连接已断开
        if (now - this.lastPongTime > 60000) {
          console.error('心跳超时，重新连接');
          this.handleReconnect();
          return;
        }
        this.sendMessage('ping', { timestamp: now });
      }
    }, this.heartbeatTimeout);
  }

  // 停止心跳检测
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 处理心跳响应
  handlePong() {
    this.lastPongTime = Date.now();
    console.log('收到心跳响应');
  }

  // 处理重连
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('达到最大重连次数，停止重连');
      // 通知用户连接失败
      uni.showToast({
        title: '网络连接失败，请检查服务器是否运行',
        icon: 'none',
        duration: 2000
      });
    }
  }

  // 发送消息
  sendMessage(type, data) {
    if (!this.isConnected) {
      console.error('WebSocket未连接');
      return;
    }

    const message = {
      type,
      data
    };

    try {
      this.socketTask.send({
        data: JSON.stringify(message),
        success: () => {
          console.log('消息发送成功:', message);
        },
        fail: (error) => {
          console.error('消息发送失败:', error);
          this.handleReconnect();
        }
      });
    } catch (error) {
      console.error('消息发送异常:', error);
      this.handleReconnect();
    }
  }

  // 处理接收到的消息
  handleMessage(message) {
    const { type, data } = message;
    console.log('WebSocket 处理消息:', { type, data });
    
    const handlers = this.messageHandlers.get(type) || [];
    console.log(`消息类型 ${type} 的处理器数量:`, handlers.length);
    
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`处理消息类型 ${type} 时出错:`, error);
      }
    });
  }

  // 注册消息处理器
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }

  // 移除消息处理器
  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 发送聊天消息
  sendChatMessage(chatId, content, messageType = 'text', extraFields = {}) {
    this.sendMessage('send-message', {
      chatId,
      content,
      messageType,
      timestamp: Date.now(),
      ...extraFields  // 包含 fileUrl, duration 和其他字段
    });
  }

  // 发送正在输入状态
  sendTypingStatus(chatId) {
    this.sendMessage('typing', { chatId });
  }

  // 发送停止输入状态
  sendStopTypingStatus(chatId) {
    this.sendMessage('stop-typing', { chatId });
  }

  // 标记消息为已读
  markMessageAsRead(messageId) {
    this.sendMessage('mark-read', { messageId });
  }

  // 关闭连接
  close() {
    this.stopHeartbeat();
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.socketTask) {
      this.socketTask.close();
      this.socketTask = null;
      this.isConnected = false;
    }
  }

  // 发送好友请求通知
  sendFriendRequestNotification(targetUserId) {
    this.sendMessage('friend-request', { targetUserId });
  }

  // 发送好友请求响应通知
  sendFriendRequestResponseNotification(senderId, response) {
    this.sendMessage('friend-request-response', { senderId, response });
  }

  // 以下方法已移除，现在通过API接口实现
  // 只保留接收服务器推送的事件功能
}

// 创建单例实例
const websocketService = new WebSocketService();

export default websocketService; 