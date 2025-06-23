import { ref } from 'vue'
import websocketService from './websocket'

// 通话状态枚举
export const CallStatus = {
  IDLE: 'idle',
  OUTGOING: 'outgoing',
  INCOMING: 'incoming',
  CONNECTED: 'connected'
}

class CallManager {
  constructor() {
    if (CallManager.instance) {
      return CallManager.instance
    }
    CallManager.instance = this
    
    // 状态管理
    this.status = ref(CallStatus.IDLE)
    this.currentRoom = ref(null)
    this.remoteUser = ref(null)
    this.localStream = ref(null) // 将由renderjs管理
    this.remoteStream = ref(null) // 将由renderjs管理
    this.callTimer = ref(0)
    this.timerInterval = null
    
    // 音频控制状态
    this.isMicrophoneMuted = ref(false)
    this.isSpeakerOn = ref(true)
    
    // WebRTC配置
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    }

    this.initWebRTC()
    this.setupCallEventListeners()
  }

  // 初始化WebRTC模块
  initWebRTC() {
    // #if defined(APP_PLUS) || defined(H5)
    uni.$emit('webrtc-init', this.configuration)
    // #endif
  }

  // 设置所有通话事件监听
  setupCallEventListeners() {
    // 监听信令服务器事件
    websocketService.on('incoming-call', (data) => {
      console.log('收到来电事件:', data);
      this.receiveCall(data);
    });
    
    websocketService.on('call-accepted', (data) => {
      console.log('收到接受通话事件:', data);
      this.handleCallAccepted(data);
    });
    
    websocketService.on('call-rejected', (data) => {
      console.log('收到拒绝通话事件:', data);
      this.handleCallRejected(data);
    });
    
    websocketService.on('call-ended', (data) => {
      console.log('收到结束通话事件:', data);
      this.handleCallEnded(data);
    });
    
    // 处理WebRTC信令 - 从后端的响应中提取实际的数据
    websocketService.on('ice-candidate', (data) => {
      console.log('收到ICE候选者事件:', data);
      if (data && data.candidate) {
        this.handleIceCandidate(data.candidate);
      } else {
        console.error('收到无效的ICE候选者数据:', data);
      }
    });
    
    websocketService.on('offer', (data) => {
      console.log('收到offer事件:', data);
      if (data && data.offer) {
        this.handleOffer(data.offer);
      } else {
        console.error('收到无效的offer数据:', data);
      }
    });
    
    websocketService.on('answer', (data) => {
      console.log('收到answer事件:', data);
      if (data && data.answer) {
        this.handleAnswer(data.answer);
      } else {
        console.error('收到无效的answer数据:', data);
      }
    });

    // 监听来自renderjs的WebRTC事件
    uni.$on('webrtc-offer-created', this.onOfferCreated.bind(this));
    uni.$on('webrtc-answer-created', this.onAnswerCreated.bind(this));
    uni.$on('webrtc-ice-candidate-created', this.onIceCandidateCreated.bind(this));
    uni.$on('webrtc-remote-stream', (stream) => {
      console.log('CallManager: 收到远程流', stream);
      this.remoteStream.value = stream;
    });
    uni.$on('webrtc-connection-state-change', this.onConnectionStateChange.bind(this));
    uni.$on('webrtc-error', (error) => {
      console.error('CallManager: WebRTC模块发生错误:', error);
      this.endCall(error);
    });
  }

  // 权限检查
  async checkPermissions() {
    // #ifdef APP-PLUS
    return new Promise(resolve => {
      if (uni.getSystemInfoSync().platform === 'android') {
        const permission = 'android.permission.RECORD_AUDIO'
        plus.android.requestPermissions([permission], (result) => {
          if (result.granted.includes(permission)) {
            resolve(true)
          } else {
            uni.showModal({ title: '权限提醒', content: '需要麦克风权限才能进行语音通话，请在设置中开启。', showCancel: false })
            resolve(false)
          }
        }, () => resolve(false))
      } else if (uni.getSystemInfoSync().platform === 'ios') {
        plus.ios.requestPermission('microphone', (result) => {
          if (result.authorized) {
            resolve(true)
          } else {
            uni.showModal({ title: '权限提醒', content: '需要麦克风权限才能进行语音通话，请在设置中开启。', showCancel: false })
            resolve(false)
          }
        })
      } else {
        resolve(true)
      }
    })
    // #endif
    // #ifndef APP-PLUS
    // 在H5中，权限请求会在getUserMedia调用时自动触发，通常我们相信用户会授权
    return true
    // #endif
  }
  
  // 发起呼叫
  async makeCall(targetUser) {
    try {
      if (this.status.value !== CallStatus.IDLE) throw new Error('当前已有通话')
      if (!await this.checkPermissions()) throw new Error('未获得麦克风权限')
      
      this.status.value = CallStatus.OUTGOING
      this.remoteUser.value = targetUser
      this.currentRoom.value = `call_${Date.now()}`
      
      websocketService.sendCallRequest(targetUser._id, 'audio', this.currentRoom.value)
      
      this.callTimeout = setTimeout(() => {
        if (this.status.value === CallStatus.OUTGOING) this.endCall('呼叫超时')
      }, 30000)
      
    } catch (error) {
      console.error('发起呼叫失败:', error)
      this.endCall(error.message)
    }
  }

  // 接收呼叫
  async receiveCall(callData) {
    try {
      if (this.status.value !== CallStatus.IDLE) {
        this.rejectCall(callData.caller._id, '正在通话中')
        return
      }
      
      this.status.value = CallStatus.INCOMING
      this.remoteUser.value = callData.caller
      this.currentRoom.value = callData.roomId
      
      this.showIncomingCallNotification(callData)
      
      this.incomingCallTimeout = setTimeout(() => {
        if (this.status.value === CallStatus.INCOMING) this.rejectCall(callData.caller._id, '来电超时')
      }, 30000)
      
    } catch (error) {
      console.error('接收呼叫失败:', error)
      this.endCall(error.message)
    }
  }

  // 显示来电通知弹框
  showIncomingCallNotification(callData) {
    try {
      uni.$emit('incomingCall', {
        caller: callData.caller,
        roomId: callData.roomId,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('显示来电通知失败:', error)
    }
  }

  // 播放来电铃声
  playIncomingCallSound() {
    try {
      // 创建音频上下文播放铃声
      if (!this.ringtoneAudio) {
        this.ringtoneAudio = uni.createInnerAudioContext()
        this.ringtoneAudio.loop = true
        this.ringtoneAudio.src = '/static/sounds/ringtone.mp3' // 需要添加铃声文件
        
        this.ringtoneAudio.onError((res) => {
          console.log('铃声播放失败，可能是文件不存在:', res)
          // 铃声播放失败时，使用系统默认提示音
          this.playSystemSound()
        })
        
        this.ringtoneAudio.onCanplay(() => {
          console.log('铃声文件加载成功，开始播放')
        })
      }
      
      this.ringtoneAudio.play()
    } catch (error) {
      console.error('播放来电铃声失败:', error)
      // 播放失败时，使用系统默认提示音
      this.playSystemSound()
    }
  }

  // 播放系统默认提示音
  playSystemSound() {
    try {
      // #ifdef APP-PLUS
      // APP环境使用系统提示音
      if (plus.device && plus.device.beep) {
        plus.device.beep(1) // 播放一次系统提示音
      }
      // #endif
      
      // #ifdef H5
      // H5环境尝试播放简单的提示音
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
      // #endif
    } catch (error) {
      console.error('播放系统提示音失败:', error)
    }
  }

  // 停止来电铃声
  stopIncomingCallSound() {
    try {
      if (this.ringtoneAudio) {
        this.ringtoneAudio.stop()
      }
    } catch (error) {
      console.error('停止来电铃声失败:', error)
    }
  }

  // 振动提醒（APP环境）
  vibrateForIncomingCall() {
    try {
      // #ifdef APP-PLUS
      if (plus.device && plus.device.vibrate) {
        // 振动模式：短振动-长振动-短振动
        plus.device.vibrate(200)
        setTimeout(() => {
          plus.device.vibrate(500)
        }, 300)
        setTimeout(() => {
          plus.device.vibrate(200)
        }, 900)
      }
      // #endif
    } catch (error) {
      console.error('振动提醒失败:', error)
    }
  }

  // 显示系统通知
  showSystemNotification(caller) {
    try {
      // #ifdef APP-PLUS
      if (plus.push) {
        plus.push.createMessage(
          `来自 ${caller.username || '未知用户'} 的语音通话`,
          {
            title: '来电提醒',
            sound: 'system',
            cover: true
          }
        )
      }
      // #endif
    } catch (error) {
      console.error('显示系统通知失败:', error)
    }
  }

  // 接受通话 (被叫方操作)
  async acceptCall() {
    try {
      console.log('接受通话: 当前状态', this.status.value);
      
      if (this.status.value !== CallStatus.INCOMING) {
        console.error('只能在来电状态下接受通话');
        return;
      }
      
      this.cleanupIncomingCall();
      
      // 先准备WebRTC连接，以便在发送接受消息后立即处理offer
      // #if defined(APP_PLUS) || defined(H5)
      uni.$emit('webrtc-prepare-for-call');
      // #endif
      
      // 发送接受消息，通知主叫方可以开始WebRTC握手了
      websocketService.sendCallAccepted(
        this.remoteUser.value._id,
        this.currentRoom.value
      );
      
      console.log('已发送call-accepted消息，等待offer');
      
      // 设置offer超时检查，避免长时间卡在等待offer状态
      this.offerTimeout = setTimeout(() => {
        if (this.status.value === CallStatus.INCOMING) {
          console.log('接受通话后等待offer超时，尝试重新发送接受消息');
          // 重新发送接受消息，希望触发对方重新发送offer
          websocketService.sendCallAccepted(
            this.remoteUser.value._id,
            this.currentRoom.value
          );
          
          // 再次尝试5秒后
          setTimeout(() => {
            if (this.status.value === CallStatus.INCOMING) {
              console.log('第二次尝试发送接受消息');
              websocketService.sendCallAccepted(
                this.remoteUser.value._id,
                this.currentRoom.value
              );
              
              // 如果15秒后仍未收到offer，结束通话
              setTimeout(() => {
                if (this.status.value === CallStatus.INCOMING) {
                  this.endCall('未收到通话offer，连接超时');
                }
              }, 15000);
            }
          }, 5000);
        }
      }, 10000);
      
      // 注意：状态暂时保持为INCOMING，直到收到offer并创建answer后才变为CONNECTED
      // 当接收到offer并创建answer后，onAnswerCreated会将状态设置为CONNECTED
    } catch (error) {
      console.error('接受通话失败:', error);
      this.endCall(error.message);
    }
  }

  // 拒绝通话
  rejectCall(callerId, reason = '对方已拒绝') {
    this.cleanupIncomingCall()
    websocketService.sendCallRejected(callerId, reason)
    this.resetCall()
  }

  // 清理来电相关资源
  cleanupIncomingCall() {
    try {
      if (this.incomingCallTimeout) {
        clearTimeout(this.incomingCallTimeout)
        this.incomingCallTimeout = null
      }
      uni.$emit('hideIncomingCall')
    } catch (error) {
      console.error('清理来电资源失败:', error)
    }
  }

  // 结束通话
  async endCall(reason = '通话已结束') {
    try {
      console.log('结束通话:', reason)
      
      // #if defined(APP_PLUS) || defined(H5)
      uni.$emit('webrtc-end-call')
      // #endif

      if (this.currentRoom.value && this.remoteUser.value) {
        websocketService.sendCallEnded(
          this.remoteUser.value._id,
          this.currentRoom.value,
          reason
        )
      }
      
      this.resetCall()

    } catch (error) {
      console.error('结束通话失败:', error)
    }
  }

  // 处理对方接受通话 (主叫方操作)
  async handleCallAccepted(payload) {
    try {
      console.log('收到通话接受消息:', payload);

      // 规范化处理接收到的数据
      const data = payload.data || payload;
      const receivedRoomId = data.roomId;
      const callee = data.callee; // 后端返回的接听者信息
      
      console.log(`当前房间: ${this.currentRoom.value}, 收到的房间: ${receivedRoomId}, 当前状态: ${this.status.value}`);
      console.log('接听者信息:', callee);
      
      // 无论处于什么状态，只要roomId匹配，都尝试发送offer
      // 这样可以解决重复接收call-accepted消息的问题
      if (!receivedRoomId || receivedRoomId !== this.currentRoom.value) {
        console.warn('收到通话接受消息，但房间ID不匹配，忽略');
        return;
      }

      // 如果不是呼出状态，记录警告但仍然处理
      if (this.status.value !== CallStatus.OUTGOING) {
        console.warn(`收到通话接受消息，但当前状态为 ${this.status.value}，仍尝试处理`);
      }
      
      // 清除呼叫超时计时器
      if (this.callTimeout) {
        clearTimeout(this.callTimeout);
        this.callTimeout = null;
      }
      
      // 如果已经连接，则直接返回
      if (this.status.value === CallStatus.CONNECTED) {
        console.log('已经处于连接状态，忽略重复的接受消息');
        return;
      }
      
      console.log('通话已被接受，开始WebRTC握手');
      
      // 强制确保WebRTC初始化和offer发送
      // 设置延迟发送offer的保障措施，确保发送
      const makeCallAndCheckOffer = () => {
        // 开始WebRTC通话流程，创建并发送Offer
        console.log('准备创建并发送offer...');
        
        // #if defined(APP_PLUS) || defined(H5)
        uni.$emit('webrtc-make-call');
        // #endif
        
        // 设置检查点，确保offer被创建和发送
        this.offerRetryTimeout = setTimeout(() => {
          if (this.status.value !== CallStatus.CONNECTED) {
            console.log('通话接受后3秒未建立连接，重新尝试发送offer');
            // #if defined(APP_PLUS) || defined(H5)
            uni.$emit('webrtc-make-call');
            // #endif
            
            // 再次检查
            this.offerRetryTimeout = setTimeout(() => {
              if (this.status.value !== CallStatus.CONNECTED) {
                console.log('第二次尝试后仍未连接，最后一次尝试');
                // #if defined(APP_PLUS) || defined(H5)
                uni.$emit('webrtc-make-call');
                // #endif
              }
            }, 3000);
          }
        }, 3000);
      };
      
      // 确保在不同设备/网络条件下都能正确触发offer创建
      makeCallAndCheckOffer();
      
      // 注意：状态会在onOfferCreated中被设置为CONNECTED
      
    } catch (error) {
      console.error('处理接受通话失败:', error);
      this.endCall(error.message);
    }
  }

  // 处理通话被拒绝
  handleCallRejected(data) {
    console.log('收到通话拒绝消息:', data);
    
    if (this.status.value !== CallStatus.OUTGOING) {
      console.warn('收到通话拒绝消息，但当前不是呼出状态，忽略');
      return;
    }
    
    this.endCall(data.reason || '对方已拒绝通话');
  }

  // 处理通话结束
  handleCallEnded(data) {
    console.log('收到通话结束消息:', data);
    
    if (this.status.value === CallStatus.IDLE) {
      console.warn('收到通话结束消息，但当前已是空闲状态，忽略');
      return;
    }
    
    // 验证房间ID是否匹配
    if (data.roomId && data.roomId !== this.currentRoom.value) {
      console.warn('收到通话结束消息，但房间ID不匹配，忽略');
      return;
    }
    
    this.endCall(data.reason || '对方已结束通话');
  }

  // 处理ICE候选者 (从信令服务器)
  async handleIceCandidate(candidate) {
    console.log('CallManager: 收到ICE候选者');
    
    try {
      // #if defined(APP_PLUS) || defined(H5)
      uni.$emit('webrtc-handle-ice-candidate', candidate);
      // #endif
    } catch (error) {
      console.error('CallManager: 处理ICE候选者失败:', error);
    }
  }

  // 处理Offer (从信令服务器, 被叫方操作)
  async handleOffer(offer) {
    console.log('CallManager: 收到offer，处理中...');
    
    // 如果当前不是来电状态，忽略此offer
    if (this.status.value !== CallStatus.INCOMING) {
      console.warn(`CallManager: 收到offer但当前状态不是来电状态 (${this.status.value})，忽略`);
      return;
    }
    
    // 清除offer超时定时器
    if (this.offerTimeout) {
      clearTimeout(this.offerTimeout);
      this.offerTimeout = null;
    }
    
    try {
      // #if defined(APP_PLUS) || defined(H5)
      uni.$emit('webrtc-handle-offer', offer);
      // #endif
    } catch (error) {
      console.error('CallManager: 处理offer失败:', error);
      this.endCall('处理通话offer失败');
    }
  }

  // 处理Answer (从信令服务器, 主叫方操作)
  async handleAnswer(answer) {
    console.log('CallManager: 收到answer，处理中...');
    
    // 如果当前不是通话中或呼出状态，忽略此answer
    if (this.status.value !== CallStatus.OUTGOING && this.status.value !== CallStatus.CONNECTED) {
      console.warn(`CallManager: 收到answer但当前状态不合适 (${this.status.value})，忽略`);
      return;
    }
    
    try {
      // #if defined(APP_PLUS) || defined(H5)
      uni.$emit('webrtc-handle-answer', answer);
      // #endif
    } catch (error) {
      console.error('CallManager: 处理answer失败:', error);
      this.endCall('处理通话answer失败');
    }
  }

  // 当renderjs创建Offer后 (主叫方操作)
  onOfferCreated(offer) {
    try {
      console.log('CallManager: Offer created, sending...', offer);
      
      if (!offer) {
        console.error('CallManager: 收到无效的offer');
        return;
      }
      
      if (!this.remoteUser.value || !this.remoteUser.value._id) {
        console.error('CallManager: 无法发送offer，远程用户信息不存在');
        return;
      }
      
      if (!this.currentRoom.value) {
        console.error('CallManager: 无法发送offer，房间ID不存在');
        return;
      }
      
      // 格式化offer确保它是可序列化的对象
      let formattedOffer = offer;
      if (offer instanceof RTCSessionDescription) {
        formattedOffer = {
          type: offer.type,
          sdp: offer.sdp
        };
      } else if (typeof offer === 'string') {
        try {
          formattedOffer = JSON.parse(offer);
        } catch (e) {
          console.error('CallManager: offer格式化失败:', e);
        }
      }
      
      // 发送offer给对方
      websocketService.sendCallOffer(
        this.remoteUser.value._id,
        formattedOffer,
        this.currentRoom.value
      );
      
      console.log('CallManager: Offer已发送，更新状态为已连接');
      this.status.value = CallStatus.CONNECTED;
      this.startTimer();
      
      // 确保清理任何尚未执行的重试定时器
      if (this.offerRetryTimeout) {
        clearTimeout(this.offerRetryTimeout);
        this.offerRetryTimeout = null;
      }
    } catch (error) {
      console.error('CallManager: 发送offer失败:', error);
      this.endCall('发送offer失败');
    }
  }

  // 当renderjs创建Answer后 (被叫方操作)
  onAnswerCreated(answer) {
    try {
      console.log('CallManager: Answer created, sending...', answer);
      
      if (!answer) {
        console.error('CallManager: 收到无效的answer');
        return;
      }
      
      if (!this.remoteUser.value || !this.remoteUser.value._id) {
        console.error('CallManager: 无法发送answer，远程用户信息不存在');
        return;
      }
      
      if (!this.currentRoom.value) {
        console.error('CallManager: 无法发送answer，房间ID不存在');
        return;
      }
      
      // 格式化answer确保它是可序列化的对象
      let formattedAnswer = answer;
      if (answer instanceof RTCSessionDescription) {
        formattedAnswer = {
          type: answer.type,
          sdp: answer.sdp
        };
      } else if (typeof answer === 'string') {
        try {
          formattedAnswer = JSON.parse(answer);
        } catch (e) {
          console.error('CallManager: answer格式化失败:', e);
        }
      }
      
      // 发送answer给对方
      websocketService.sendCallAnswer(
        this.remoteUser.value._id,
        formattedAnswer,
        this.currentRoom.value
      );
      
      console.log('CallManager: Answer已发送，更新状态为已连接');
      this.status.value = CallStatus.CONNECTED;
      this.startTimer();
      
      // 清除offer超时定时器
      if (this.offerTimeout) {
        clearTimeout(this.offerTimeout);
        this.offerTimeout = null;
      }
    } catch (error) {
      console.error('CallManager: 发送answer失败:', error);
      this.endCall('发送answer失败');
    }
  }

  // 当renderjs创建ICE Candidate后
  onIceCandidateCreated(candidate) {
    this.sendIceCandidate(candidate)
  }

  // 当WebRTC连接状态改变
  onConnectionStateChange(state) {
    if (state === 'failed' || state === 'disconnected' || state === 'closed') {
      this.endCall('连接已断开')
    }
  }
  
  // 发送ICE候选者
  sendIceCandidate(candidate) {
    websocketService.sendIceCandidate(
      this.remoteUser.value._id,
      candidate,
      this.currentRoom.value
    )
  }

  // 开始计时器
  startTimer() {
    this.callTimer.value = 0
    this.timerInterval = setInterval(() => {
      this.callTimer.value++
    }, 1000)
  }

  // 停止计时器
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  // 重置通话状态
  resetCall() {
    this.stopTimer();
    this.cleanupIncomingCall();
    
    // 清除所有超时计时器
    if (this.callTimeout) {
      clearTimeout(this.callTimeout);
      this.callTimeout = null;
    }
    
    if (this.offerTimeout) {
      clearTimeout(this.offerTimeout);
      this.offerTimeout = null;
    }
    
    if (this.offerRetryTimeout) {
      clearTimeout(this.offerRetryTimeout);
      this.offerRetryTimeout = null;
    }
    
    this.status.value = CallStatus.IDLE;
    this.localStream.value = null;
    this.remoteStream.value = null;
    this.remoteUser.value = null;
    this.currentRoom.value = null;
    this.callTimer.value = 0;
    this.isMicrophoneMuted.value = false;
    this.isSpeakerOn.value = true;
  }

  // 切换麦克风
  async toggleMicrophone() {
    // #if defined(APP_PLUS) || defined(H5)
    uni.$emit('webrtc-toggle-mic')
    this.isMicrophoneMuted.value = !this.isMicrophoneMuted.value
    return this.isMicrophoneMuted.value
    // #endif
    return false
  }

  // 切换扬声器
  async toggleSpeaker() {
    // #ifdef APP-PLUS
    this.isSpeakerOn.value = !this.isSpeakerOn.value
    plus.device.setSpeakerEnabled(this.isSpeakerOn.value)
    return this.isSpeakerOn.value
    // #endif

    // #ifdef H5
    console.warn('H5环境不支持以编程方式切换扬声器。')
    return this.isSpeakerOn.value
    // #endif
  }
}

export const callManager = new CallManager() 