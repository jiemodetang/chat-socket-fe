import { ref } from 'vue'
import store from '@/store'
import { currentConfig } from '@/config'
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
    this.localStream = ref(null)
    this.remoteStream = ref(null)
    this.peerConnection = null
    this.callTimer = ref(0)
    this.timerInterval = null
    
    // 音频相关
    this.recorderManager = null
    this.innerAudioContext = null
    
    // WebRTC配置
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    }

    // 初始化音频管理器
    this.initAudioManagers()

    // 注册所有通话相关事件处理
    this.setupCallEventListeners()
  }

  // 初始化音频管理器
  initAudioManagers() {
    // #ifdef APP-PLUS
    // APP环境初始化录音管理器
    this.recorderManager = uni.getRecorderManager()
    
    this.recorderManager.onStart(() => {
      console.log('录音开始')
    })
    
    this.recorderManager.onStop((res) => {
      console.log('录音结束', res)
    })
    
    this.recorderManager.onError((res) => {
      console.error('录音失败:', res)
    })
    // #endif
    
    // 初始化音频播放器
    this.innerAudioContext = uni.createInnerAudioContext()
    this.innerAudioContext.autoplay = true
    
    this.innerAudioContext.onError((res) => {
      console.error('音频播放失败:', res)
    })
  }

  // 设置所有通话事件监听
  setupCallEventListeners() {
    // 监听来电
    websocketService.on('incoming-call', (data) => {
      console.log('收到来电:', data)
      this.receiveCall(data)
    })

    // 监听通话被接受
    websocketService.on('call-accepted', (data) => {
      console.log('通话被接受:', data)
      this.handleCallAccepted(data)
    })

    // 监听通话被拒绝
    websocketService.on('call-rejected', (data) => {
      console.log('通话被拒绝:', data)
      this.handleCallRejected(data)
    })

    // 监听通话结束
    websocketService.on('call-ended', (data) => {
      console.log('通话结束:', data)
      this.handleCallEnded(data)
    })

    // 监听ICE候选者
    websocketService.on('ice-candidate', (data) => {
      console.log('收到ICE候选者:', data)
      this.handleIceCandidate(data)
    })

    // 监听Offer
    websocketService.on('offer', (data) => {
      console.log('收到Offer:', data)
      this.handleOffer(data)
    })

    // 监听Answer
    websocketService.on('answer', (data) => {
      console.log('收到Answer:', data)
      this.handleAnswer(data)
    })
  }

  // 获取本地音频流
  async getLocalStream() {
    try {
      console.log('开始获取本地音频流')
      
      // 检查录音权限
      const auth = await this.checkRecordAuth()
      if (!auth) {
        throw new Error('未获得录音权限')
      }

      // #ifdef H5
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持音频通话功能')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })
      
      this.localStream.value = stream
      return stream
      // #endif

      // #ifdef APP-PLUS
      return new Promise((resolve) => {
        // 配置录音参数
        const recorderConfig = {
          duration: 600000,
          sampleRate: 44100,
          numberOfChannels: 1,
          encodeBitRate: 96000,
          format: 'aac',
          frameSize: 50
        }
        
        // 开始录音
        this.recorderManager.start(recorderConfig)
        
        // 创建模拟音频流
        const fakeStream = {
          getTracks: () => [{
            kind: 'audio',
            enabled: true,
            stop: () => {
              this.recorderManager.stop()
            }
          }],
          getAudioTracks: () => [{
            kind: 'audio',
            enabled: true,
            stop: () => {
              this.recorderManager.stop()
            }
          }]
        }
        
        this.localStream.value = fakeStream
        resolve(fakeStream)
      })
      // #endif
      
    } catch (error) {
      console.error('获取本地音频流失败:', error)
      throw error
    }
  }

  // 检查录音权限
  async checkRecordAuth() {
    return new Promise(async (resolve) => {
      // #ifdef H5
      try {
        // 检查浏览器是否支持 getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          uni.showToast({
            title: '您的浏览器不支持音频通话',
            icon: 'none'
          })
          resolve(false)
          return
        }

        // 直接尝试获取媒体流，这会触发权限请求
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })

        // 如果成功获取流，立即停止所有轨道
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          resolve(true)
        } else {
          resolve(false)
        }
      } catch (error) {
        console.error('获取录音权限失败:', error)
        
        // 如果是权限被拒绝
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          uni.showModal({
            title: '提示',
            content: '需要麦克风权限才能进行语音通话，请在浏览器设置中允许使用麦克风',
            confirmText: '我知道了',
            showCancel: false
          })
        } else {
          uni.showToast({
            title: '获取麦克风失败',
            icon: 'none'
          })
        }
        resolve(false)
      }
      // #endif

      // #ifdef APP-PLUS
      if (uni.getSystemInfoSync().platform === 'android') {
        const permission = 'android.permission.RECORD_AUDIO'
        plus.android.requestPermissions(
          [permission],
          function(resultObj) {
            if (resultObj.granted.indexOf(permission) !== -1) {
              resolve(true)
            } else {
              uni.showModal({
                title: '提示',
                content: '请允许使用麦克风',
                success: (res) => {
                  if (res.confirm) {
                    // 打开应用设置界面让用户手动开启权限
                    const Intent = plus.android.importClass('android.content.Intent')
                    const Settings = plus.android.importClass('android.provider.Settings')
                    const Uri = plus.android.importClass('android.net.Uri')
                    const mainActivity = plus.android.runtimeMainActivity()
                    const intent = new Intent()
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    const uri = Uri.fromParts('package', mainActivity.getPackageName(), null)
                    intent.setData(uri)
                    mainActivity.startActivity(intent)
                  }
                  resolve(false)
                }
              })
            }
          },
          function(error) {
            console.error('请求权限失败', error)
            resolve(false)
          }
        )
      } else if (uni.getSystemInfoSync().platform === 'ios') {
        // iOS权限请求
        plus.ios.requestPermission('microphone', 
          function(result) {
            resolve(result === 'authorized')
          },
          function(error) {
            console.error('请求权限失败', error)
            resolve(false)
          }
        )
      } else {
        resolve(false)
      }
      // #endif

      // #ifdef MP
      uni.authorize({
        scope: 'scope.record',
        success: () => resolve(true),
        fail: () => {
          uni.showModal({
            title: '提示',
            content: '请允许使用麦克风',
            success: (res) => {
              if (res.confirm) {
                uni.openSetting({
                  success: (res) => {
                    resolve(res.authSetting['scope.record'])
                  }
                })
              } else {
                resolve(false)
              }
            }
          })
        }
      })
      // #endif
    })
  }

  // 处理远程流
  handleRemoteStream(stream) {
    console.log('处理远程音频流')
    this.remoteStream.value = stream

    // #ifdef H5
    // H5环境直接使用MediaStream
    // #endif

    // #ifdef APP-PLUS
    try {
      // 创建音频播放器
      const audioPlayer = plus.audio.createPlayer()
      
      // 获取远程流的音频轨道
      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) {
        throw new Error('没有可用的音频轨道')
      }

      // 设置音频源并播放
      audioPlayer.setSource(audioTrack)
      audioPlayer.play({
        success: () => {
          console.log('远程音频开始播放')
        },
        fail: (error) => {
          console.error('远程音频播放失败:', error)
        }
      })

      // 保存音频播放器引用以便后续控制
      this.remoteAudioPlayer = audioPlayer
    } catch (error) {
      console.error('处理远程音频流失败:', error)
      uni.showToast({
        title: '音频播放失败',
        icon: 'none'
      })
    }
    // #endif
  }

  // 初始化WebRTC连接
  async initPeerConnection() {
    try {
      console.log('初始化WebRTC连接')
      
      // #ifdef H5
      if (!window.RTCPeerConnection) {
        throw new Error('当前设备不支持音视频通话')
      }
      this.peerConnection = new RTCPeerConnection(this.configuration)
      // #endif
      
      // #ifdef APP-PLUS
      if (!plus.webrtc) {
        throw new Error('当前设备不支持音视频通话')
      }

      // 初始化 RTCPeerConnection
      this.peerConnection = new plus.webrtc.RTCPeerConnection({
        iceServers: this.configuration.iceServers
      })

      // 获取本地音频流
      const audioStream = await new Promise((resolve, reject) => {
        plus.audio.getRecorder().start({
          format: "aac",
          samplerate: 44100,
          success: (stream) => {
            resolve(stream)
          },
          fail: (error) => {
            reject(new Error('获取音频流失败: ' + error.message))
          }
        })
      })

      // 创建音频轨道
      const audioTrack = new plus.webrtc.MediaStreamTrack(audioStream, {
        type: 'audio'
      })

      // 创建本地流并添加音频轨道
      this.localStream.value = new plus.webrtc.MediaStream()
      this.localStream.value.addTrack(audioTrack)

      // 添加本地音频轨道到连接
      this.peerConnection.addTrack(audioTrack, this.localStream.value)
      // #endif

      if (!this.peerConnection) {
        throw new Error('初始化WebRTC连接失败')
      }

      // 监听ICE候选者
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendIceCandidate(event.candidate)
        }
      }

      // 监听连接状态变化
      this.peerConnection.onconnectionstatechange = () => {
        console.log('WebRTC连接状态:', this.peerConnection.connectionState)
        if (this.peerConnection.connectionState === 'disconnected') {
          this.endCall('连接已断开')
        }
      }

      // 监听ICE连接状态变化
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE连接状态:', this.peerConnection.iceConnectionState)
        if (this.peerConnection.iceConnectionState === 'disconnected') {
          this.endCall('ICE连接已断开')
        }
      }

      // 监听远程流
      this.peerConnection.ontrack = (event) => {
        console.log('收到远程音频轨道')
        if (event.streams && event.streams[0]) {
          this.handleRemoteStream(event.streams[0])
        }
      }

      return this.peerConnection
    } catch (error) {
      console.error('初始化WebRTC连接失败:', error)
      throw error
    }
  }

  // 发起呼叫
  async makeCall(targetUser) {
    try {
      if (this.status.value !== CallStatus.IDLE) {
        throw new Error('当前已有通话')
      }
      
      await this.getLocalStream()
      await this.initPeerConnection()
      
      this.status.value = CallStatus.OUTGOING
      this.remoteUser.value = targetUser
      this.currentRoom.value = `call_${Date.now()}`
      
      // 发送呼叫请求
      websocketService.sendCallRequest(
        targetUser._id,
        'audio',
        this.currentRoom.value
      )
      
      // 设置呼叫超时
      setTimeout(() => {
        if (this.status.value === CallStatus.OUTGOING) {
          this.endCall('呼叫超时')
        }
      }, 30000)
      
    } catch (error) {
      console.error('发起呼叫失败:', error)
      this.endCall(error.message)
      throw error
    }
  }

  // 接收呼叫
  async receiveCall(callData) {
    try {
      console.log('收到呼叫:', callData)
      
      if (this.status.value !== CallStatus.IDLE) {
        console.log('当前状态不是空闲，拒绝呼叫')
        this.rejectCall(callData.caller._id, '正在通话中')
        return
      }
      
      this.status.value = CallStatus.INCOMING
      this.remoteUser.value = callData.caller
      this.currentRoom.value = callData.roomId
      
      // 触发全局来电通知弹框
      this.showIncomingCallNotification(callData)
      
      // 设置来电超时自动拒绝
      this.incomingCallTimeout = setTimeout(() => {
        if (this.status.value === CallStatus.INCOMING) {
          console.log('来电超时，自动拒绝')
          this.rejectCall(callData.caller._id, '来电超时')
        }
      }, 30000) // 30秒超时
      
    } catch (error) {
      console.error('接收呼叫失败:', error)
      this.endCall(error.message)
    }
  }

  // 显示来电通知弹框
  showIncomingCallNotification(callData) {
    try {
      console.log('显示来电通知弹框:', callData)
      
      // 触发全局事件，显示 IncomingCallNotification 组件
      uni.$emit('incomingCall', {
        caller: callData.caller,
        roomId: callData.roomId,
        timestamp: Date.now()
      })
      
      // // 播放来电铃声（可选）
      // this.playIncomingCallSound()
      
      // // 振动提醒（APP环境）
      // // #ifdef APP-PLUS
      // this.vibrateForIncomingCall()
      // // #endif
      
      // // 显示系统通知（可选）
      // this.showSystemNotification(callData.caller)
      
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

  // 接受通话
  async acceptCall() {
    try {
      await this.getLocalStream()
      await this.initPeerConnection()
      
      // 发送接受通话消息
      websocketService.sendCallAccepted(
        this.remoteUser.value._id,
        this.currentRoom.value
      )
      
      this.status.value = CallStatus.CONNECTED
      this.startTimer()
      
    } catch (error) {
      console.error('接受通话失败:', error)
      this.endCall(error.message)
    }
  }

  // 拒绝通话
  rejectCall(callerId, reason = '对方已拒绝') {
    // 清理来电相关资源
    this.cleanupIncomingCall()
    
    websocketService.sendCallRejected(callerId, reason)
    this.resetCall()
  }

  // 清理来电相关资源
  cleanupIncomingCall() {
    try {
      // 停止来电铃声
      this.stopIncomingCallSound()
      
      // 清除来电超时定时器
      if (this.incomingCallTimeout) {
        clearTimeout(this.incomingCallTimeout)
        this.incomingCallTimeout = null
      }
      
      // 隐藏来电通知弹框
      uni.$emit('hideIncomingCall')
      
    } catch (error) {
      console.error('清理来电资源失败:', error)
    }
  }

  // 结束通话
  async endCall(reason = '通话已结束') {
    try {
      console.log('结束通话:', reason)
      
      // 停止本地流
      if (this.localStream.value) {
        this.localStream.value.getTracks().forEach(track => {
          track.stop()
        })
        this.localStream.value = null
      }

      // 停止远程流播放
      // #ifdef APP-PLUS
      if (this.remoteAudioPlayer) {
        this.remoteAudioPlayer.stop()
        this.remoteAudioPlayer = null
      }
      // #endif

      // 关闭 WebRTC 连接
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }

      // 重置状态
      this.status.value = CallStatus.IDLE
      this.remoteStream.value = null
      this.currentRoom.value = null
      this.remoteUser.value = null
      this.stopTimer()

      // 发送通话结束消息
      if (this.currentRoom.value) {
        websocketService.send('call-ended', {
          roomId: this.currentRoom.value,
          reason
        })
      }
    } catch (error) {
      console.error('结束通话失败:', error)
    }
  }

  // 处理对方接受通话
  async handleCallAccepted(data) {
    try {
      if (this.status.value !== CallStatus.OUTGOING) return
      
      // 创建并发送offer
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      
      websocketService.sendCallOffer(
        this.remoteUser.value._id,
        offer,
        this.currentRoom.value
      )
      
      this.status.value = CallStatus.CONNECTED
      this.startTimer()
      
    } catch (error) {
      console.error('处理接受通话失败:', error)
      this.endCall(error.message)
    }
  }

  // 处理通话被拒绝
  handleCallRejected(data) {
    if (this.status.value !== CallStatus.OUTGOING) return
    this.endCall(data.reason || '对方已拒绝通话')
  }

  // 处理通话结束
  handleCallEnded(data) {
    if (this.status.value === CallStatus.IDLE) return
    this.endCall(data.reason || '对方已结束通话')
  }

  // 处理ICE候选者
  async handleIceCandidate(data) {
    try {
      if (!this.peerConnection) return
      
      // #ifdef H5
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
      // #endif

      // #ifdef APP-PLUS
      await this.peerConnection.addIceCandidate({
        candidate: data.candidate.candidate,
        sdpMid: data.candidate.sdpMid,
        sdpMLineIndex: data.candidate.sdpMLineIndex
      })
      // #endif
    } catch (error) {
      console.error('处理ICE候选者失败:', error)
    }
  }

  // 处理Offer
  async handleOffer(data) {
    try {
      console.log('处理收到的Offer')
      if (!this.peerConnection) {
        console.error('未初始化WebRTC连接')
        return
      }
      
      // #ifdef H5
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
      // #endif

      // #ifdef APP-PLUS
      await this.peerConnection.setRemoteDescription({
        type: 'offer',
        sdp: data.offer.sdp
      })
      // #endif
      
      console.log('设置远程描述成功')
      
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      console.log('创建并设置本地Answer成功')
      
      websocketService.sendCallAnswer(
        this.remoteUser.value._id,
        answer,
        this.currentRoom.value
      )
    } catch (error) {
      console.error('处理Offer失败:', error)
      this.endCall(error.message)
    }
  }

  // 处理Answer
  async handleAnswer(data) {
    try {
      console.log('处理收到的Answer')
      if (!this.peerConnection) {
        console.error('未初始化WebRTC连接')
        return
      }
      
      // #ifdef H5
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
      // #endif

      // #ifdef APP-PLUS
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: data.answer.sdp
      })
      // #endif
      
      console.log('设置远程Answer成功')
    } catch (error) {
      console.error('处理Answer失败:', error)
      this.endCall(error.message)
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

  // 清理通话资源
  cleanupCall() {
    try {
      // 停止来电铃声
      this.stopIncomingCallSound()
      
      // 停止本地流
      if (this.localStream.value) {
        // #ifdef H5
        this.localStream.value.getTracks().forEach(track => track.stop())
        // #endif

        // #ifdef APP-PLUS
        if (this.recorderManager) {
          this.recorderManager.stop()
        }
        // #endif
      }
      
      // 停止远程流播放
      if (this.innerAudioContext) {
        this.innerAudioContext.stop()
      }
      
      // #ifdef H5
      // 移除音频元素
      const audioElements = document.getElementsByTagName('audio')
      Array.from(audioElements).forEach(audio => audio.remove())
      // #endif
      
      // 关闭对等连接
      if (this.peerConnection) {
        this.peerConnection.close()
        this.peerConnection = null
      }
      
      // 重置状态
      this.localStream.value = null
      this.remoteStream.value = null
      this.remoteUser.value = null
      this.currentRoom.value = null
      this.status.value = CallStatus.IDLE
      this.callTimer.value = 0
      
      // 停止计时器
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
      
    } catch (error) {
      console.error('清理通话资源失败:', error)
    }
  }

  // 重置通话状态
  resetCall() {
    this.stopTimer()
    this.cleanupCall()
  }

  // 切换麦克风
  async toggleMicrophone() {
    try {
      // #ifdef H5
      if (this.localStream.value) {
        const audioTrack = this.localStream.value.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled
          return audioTrack.enabled
        }
      }
      // #endif

      // #ifdef APP-PLUS
      if (this.localStream.value) {
        const audioTrack = this.localStream.value.getAudioTracks()[0]
        if (audioTrack) {
          if (audioTrack.enabled) {
            audioTrack.stop()
            audioTrack.enabled = false
          } else {
            // 重新获取音频流
            const newStream = await new Promise((resolve, reject) => {
              plus.audio.getRecorder().start({
                format: "aac",
                samplerate: 44100,
                success: (stream) => resolve(stream),
                fail: (error) => reject(error)
              })
            })
            
            // 替换音频轨道
            const newTrack = new plus.webrtc.MediaStreamTrack(newStream, {
              type: 'audio'
            })
            audioTrack.replaceTrack(newTrack)
            audioTrack.enabled = true
          }
          return audioTrack.enabled
        }
      }
      // #endif

      return false
    } catch (error) {
      console.error('切换麦克风失败:', error)
      throw error
    }
  }

  // 切换扬声器
  async toggleSpeaker() {
    try {
      // #ifdef H5
      const audioElements = document.getElementsByTagName('audio')
      Array.from(audioElements).forEach(audio => {
        audio.setSinkId(audio.sinkId === 'default' ? 'speaker' : 'default')
      })
      return true
      // #endif

      // #ifdef APP-PLUS
      if (this.innerAudioContext) {
        const isSpeakerOn = await new Promise((resolve) => {
          plus.device.getSpearkerEnabled((enabled) => {
            resolve(enabled)
          })
        })
        
        plus.device.setSpearkerEnabled(!isSpeakerOn)
        return !isSpeakerOn
      }
      // #endif

      return false
    } catch (error) {
      console.error('切换扬声器失败:', error)
      return false
    }
  }
}

export const callManager = new CallManager() 