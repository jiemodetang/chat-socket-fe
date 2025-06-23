// 服务器端代码更新
// 将这些代码添加到您的WebSocket服务器处理部分

// 示例函数，将这些代码集成到您现有的消息处理函数中
function handleWebSocketMessage(message, ws, user, onlineUsers, sendMessage) {
  // 处理音频数据消息
  if (message.type === 'audio-data') {
    // 处理音频数据
    const { targetUserId, audioData, roomId, timestamp } = message.data;
    
    // 查找目标用户
    const targetWs = onlineUsers.get(targetUserId);
    if (targetWs) {
      // 转发音频数据给对方
      sendMessage(targetWs, 'audio-data', {
        userId: user._id,
        roomId,
        audioData,
        timestamp
      });
    }
  }
  
  // 处理音频文件消息
  else if (message.type === 'audio-file') {
    // 处理音频文件
    const { targetUserId, audioData, roomId, format, timestamp } = message.data;
    
    // 查找目标用户
    const targetWs = onlineUsers.get(targetUserId);
    if (targetWs) {
      // 转发音频文件给对方
      sendMessage(targetWs, 'audio-file', {
        userId: user._id,
        roomId,
        audioData,
        format,
        timestamp
      });
    }
  }
  
  // 其他消息处理...
}

// 将这些代码添加到您的WebSocket消息处理函数中，与其他通话相关消息处理逻辑放在一起 