<template>
  <view />
</template>

<script>
// 逻辑层脚本：这个脚本是空的，因为所有逻辑都在renderjs中。
// 这个组件的唯一目的是承载renderjs脚本，并应被包含在App.vue中以确保其被加载。
export default {
  name: 'WebRTC'
}
</script>

<script module="webrtc" lang="renderjs">
// Render-side脚本：此脚本在WebView上下文中运行，可以访问浏览器API。
export default {
  data() {
    return {
      peerConnection: null,
      localStream: null,
      remoteStream: null,
      configuration: {}
    }
  },
  mounted() {
    // 监听来自CallManager的事件
    uni.$on('webrtc-init', this.init);
    uni.$on('webrtc-make-call', this.makeCall);
    uni.$on('webrtc-accept-call', this.acceptCall);
    uni.$on('webrtc-prepare-for-call', this.prepareForCall);
    uni.$on('webrtc-handle-offer', this.handleOffer);
    uni.$on('webrtc-handle-answer', this.handleAnswer);
    uni.$on('webrtc-handle-ice-candidate', this.handleIceCandidate);
    uni.$on('webrtc-end-call', this.endCall);
    uni.$on('webrtc-toggle-mic', this.toggleMicrophone);
    
    // 初始化日志
    console.log('RenderJS: WebRTC组件已挂载，事件监听器已注册');
  },
  beforeDestroy() {
    // 清理事件监听器
    uni.$off('webrtc-init', this.init)
    uni.$off('webrtc-make-call', this.makeCall)
    uni.$off('webrtc-accept-call', this.acceptCall)
    uni.$off('webrtc-prepare-for-call', this.prepareForCall)
    uni.$off('webrtc-handle-offer', this.handleOffer)
    uni.$off('webrtc-handle-answer', this.handleAnswer)
    uni.$off('webrtc-handle-ice-candidate', this.handleIceCandidate)
    uni.$off('webrtc-end-call', this.endCall)
    uni.$off('webrtc-toggle-mic', this.toggleMicrophone)
  },
  methods: {
    // 初始化并存储配置
    init(config) {
      console.log('RenderJS: init 触发', config)
      this.configuration = config
    },

    // 获取本地音频流
    async getLocalStream() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('您的浏览器不支持音频通话功能');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        this.localStream = stream;
        return stream;
      } catch (error) {
        console.error('RenderJS: 获取本地音频流失败:', error);
        uni.$emit('webrtc-error', '获取麦克风失败: ' + error.message);
        throw error;
      }
    },

    // 初始化WebRTC连接
    async initPeerConnection() {
      try {
        if (!window.RTCPeerConnection) {
          throw new Error('当前设备不支持音视频通话');
        }
        this.peerConnection = new RTCPeerConnection(this.configuration);

        // 添加本地流轨道
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
          });
        }

        // 监听ICE候选者
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            uni.$emit('webrtc-ice-candidate-created', event.candidate);
          }
        };

        // 监听连接状态变化
        this.peerConnection.onconnectionstatechange = () => {
          const state = this.peerConnection.connectionState;
          console.log('RenderJS: 音频通话连接状态:', state);
          uni.$emit('webrtc-connection-state-change', state);
        };
        
        // 监听ICE连接状态变化
        this.peerConnection.oniceconnectionstatechange = () => {
          const state = this.peerConnection.iceConnectionState;
          console.log('RenderJS: ICE连接状态:', state);
          if (state === 'failed' || state === 'disconnected' || state === 'closed') {
             uni.$emit('webrtc-ice-connection-state-change', state);
          }
        }

        // 监听远程流
        this.peerConnection.ontrack = (event) => {
          console.log('RenderJS: 收到远程音频轨道');
          if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0]
            // 创建一个<audio>元素来播放远程音频
            const audioElement = document.createElement('audio');
            audioElement.srcObject = this.remoteStream;
            audioElement.autoplay = true;
            audioElement.playsInline = true; // 关键：对于iOS webview
            audioElement.id = 'remote-audio-player';
            
            // 先移除旧的播放器
            const oldPlayer = document.getElementById('remote-audio-player');
            if (oldPlayer) {
              oldPlayer.remove();
            }

            document.body.appendChild(audioElement);
            
            console.log('RenderJS: 尝试播放远程音频...');
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
              playPromise.then(_ => {
                console.log('RenderJS: 远程音频播放成功。');
              }).catch(error => {
                console.error('RenderJS: 远程音频播放失败:', error);
                // 可以尝试在用户下一次交互时再次调用 play()
              });
            }
            uni.$emit('webrtc-remote-stream', this.remoteStream);
          }
        };
        
        return this.peerConnection;
      } catch (error) {
        console.error('RenderJS: 初始化PeerConnection失败:', error);
        uni.$emit('webrtc-error', '初始化连接失败: ' + error.message);
        throw error;
      }
    },

    // 发起呼叫
    async makeCall() {
      console.log('RenderJS: makeCall 触发');
      try {
        // 如果已经有peerConnection，先关闭它
        if (this.peerConnection) {
          console.log('RenderJS: 重置现有连接');
          
          try {
            // 安全地关闭连接
            const currentState = this.peerConnection.signalingState;
            console.log('RenderJS: 当前信令状态:', currentState);
            
            // 只有在非关闭状态下才需要关闭连接
            if (currentState !== 'closed') {
              this.peerConnection.close();
            }
          } catch (e) {
            console.warn('RenderJS: 关闭现有连接时出错:', e);
          }
          
          this.peerConnection = null;
        }
        
        // 获取本地流和初始化连接
        const stream = await this.getLocalStream();
        if (!stream) {
          throw new Error('获取本地音频流失败');
        }
        
        const pc = await this.initPeerConnection();
        if (!pc) {
          throw new Error('初始化PeerConnection失败');
        }
        
        // 确保连接状态正常
        if (!this.peerConnection || this.peerConnection.signalingState === 'closed') {
          console.error('RenderJS: PeerConnection不可用或已关闭');
          uni.$emit('webrtc-error', 'PeerConnection不可用');
          return;
        }
        
        console.log('RenderJS: 创建Offer中...');
        // 确保使用正确的配置选项
        const offerOptions = {
          offerToReceiveAudio: true,
          voiceActivityDetection: true,
          iceRestart: true
        };
        
        try {
          // 创建offer
          console.log('RenderJS: 调用createOffer...');
          const offer = await this.peerConnection.createOffer(offerOptions);
          console.log('RenderJS: createOffer返回结果:', offer);
          
          if (!offer) {
            throw new Error('Offer创建失败');
          }
          
          // 确保offer是可序列化的对象
          const formattedOffer = {
            type: offer.type,
            sdp: offer.sdp
          };
          
          console.log('RenderJS: 设置本地描述中...', formattedOffer);
          await this.peerConnection.setLocalDescription(offer);
          
          console.log('RenderJS: 发送Offer给CallManager...');
          uni.$emit('webrtc-offer-created', formattedOffer);
          
          // 添加额外检查，确保offer被创建和发送
          setTimeout(() => {
            try {
              if (!this.peerConnection) {
                console.warn('RenderJS: 检查时PeerConnection已不存在');
                return;
              }
              
              if (this.peerConnection.signalingState !== 'have-local-offer' && 
                  this.peerConnection.signalingState !== 'stable') {
                console.log('RenderJS: Offer创建可能有问题，重试...');
                this.makeCall();
              } else {
                console.log('RenderJS: Offer创建成功，当前信令状态:', this.peerConnection.signalingState);
              }
            } catch (e) {
              console.warn('RenderJS: 检查offer状态时出错:', e);
            }
          }, 2000);
        } catch (offerError) {
          console.error('RenderJS: 创建或设置Offer失败:', offerError);
          
          // 尝试重新初始化并重试一次
          console.log('RenderJS: 尝试重新初始化连接并重试...');
          this.peerConnection = null;
          await this.initPeerConnection();
          
          // 再次尝试创建offer，使用更简单的配置
          console.log('RenderJS: 第二次尝试创建offer...');
          const retryOffer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true
          });
          
          // 确保offer是可序列化的对象
          const formattedRetryOffer = {
            type: retryOffer.type,
            sdp: retryOffer.sdp
          };
          
          await this.peerConnection.setLocalDescription(retryOffer);
          uni.$emit('webrtc-offer-created', formattedRetryOffer);
        }
      } catch (error) {
        console.error('RenderJS: 发起呼叫失败:', error);
        uni.$emit('webrtc-error', '发起呼叫失败: ' + error.message);
      }
    },
    
    // 为接听呼叫准备WebRTC
    async prepareForCall() {
      console.log('RenderJS: prepareForCall 触发');
      try {
        // 获取本地音频流并初始化PeerConnection
        await this.getLocalStream();
        await this.initPeerConnection();
        console.log('RenderJS: 已准备好接听呼叫');
      } catch (error) {
        console.error('RenderJS: 准备接听呼叫失败:', error);
        uni.$emit('webrtc-error', '准备接听呼叫失败: ' + error.message);
      }
    },
    
    // 接受呼叫
    async acceptCall() {
      console.log('RenderJS: acceptCall 触发');
      try {
        await this.getLocalStream();
        await this.initPeerConnection();
        uni.$emit('webrtc-accepted-and-ready');
      } catch (error) {
        console.error('RenderJS: 接受呼叫失败:', error);
        uni.$emit('webrtc-error', '接受呼叫失败: ' + error.message);
      }
    },

    // 处理Offer
    async handleOffer(offerSdp) {
      console.log('RenderJS: handleOffer 触发', offerSdp);
      try {
        if (!offerSdp) {
          console.error('RenderJS: 收到无效的offer');
          uni.$emit('webrtc-error', '收到无效的offer');
          return;
        }
        
        // 确保PeerConnection已初始化
        if (!this.peerConnection) {
          console.log('RenderJS: 处理Offer前需要初始化，正在初始化...');
          const stream = await this.getLocalStream();
          if (!stream) {
            throw new Error('获取本地音频流失败');
          }
          
          const pc = await this.initPeerConnection();
          if (!pc) {
            throw new Error('初始化PeerConnection失败');
          }
        } else {
          console.log('RenderJS: PeerConnection已初始化，直接处理Offer');
          
          // 检查信令状态，如果已经设置过remote description则需要先重置
          if (this.peerConnection.signalingState !== 'stable' && 
              this.peerConnection.signalingState !== 'have-local-offer') {
            console.warn('RenderJS: 当前信令状态不是stable，尝试重置连接...');
            this.peerConnection.close();
            this.peerConnection = null;
            await this.initPeerConnection();
          }
        }
        
        console.log('RenderJS: 设置远程Offer描述...');
        
        // 格式化offer确保它是RTCSessionDescription
        let formattedOffer = offerSdp;
        if (typeof offerSdp === 'string') {
          try {
            formattedOffer = JSON.parse(offerSdp);
          } catch (e) {
            console.error('RenderJS: offer格式化失败:', e);
          }
        }
        
        // 创建RTCSessionDescription对象
        const offerDesc = new RTCSessionDescription(formattedOffer);
        
        try {
          console.log('RenderJS: 使用offerDesc设置远程描述:', offerDesc);
          await this.peerConnection.setRemoteDescription(offerDesc);
          console.log('RenderJS: 成功设置远程Offer描述');
          
          console.log('RenderJS: 创建Answer...');
          const answer = await this.peerConnection.createAnswer();
          console.log('RenderJS: 创建Answer成功:', answer);
          
          // 格式化answer为可序列化对象
          const formattedAnswer = {
            type: answer.type,
            sdp: answer.sdp
          };
          
          console.log('RenderJS: 设置本地Answer描述...');
          await this.peerConnection.setLocalDescription(answer);
          console.log('RenderJS: 成功设置本地Answer');
          
          // 确保answer被发送
          console.log('RenderJS: 发送formattedAnswer:', formattedAnswer);
          uni.$emit('webrtc-answer-created', formattedAnswer);
          
          // 额外检查确保状态正确
          setTimeout(() => {
            try {
              if (this.peerConnection && 
                  this.peerConnection.signalingState !== 'stable') {
                console.warn('RenderJS: Answer创建后连接状态不稳定，重试...');
                // 重新尝试创建并发送answer
                this.handleOffer(offerSdp);
              } else {
                console.log('RenderJS: 连接状态正常:', this.peerConnection?.signalingState);
              }
            } catch (e) {
              console.warn('RenderJS: 检查answer状态时出错:', e);
            }
          }, 2000);
          
        } catch (sdpError) {
          console.error('RenderJS: 设置SDP失败，尝试重置连接:', sdpError);
          
          // 尝试重新初始化连接
          if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
          }
          
          await this.initPeerConnection();
          
          // 使用更简单的方式再次尝试处理offer
          console.log('RenderJS: 第二次尝试处理offer...');
          const rtcOffer = new RTCSessionDescription(formattedOffer);
          await this.peerConnection.setRemoteDescription(rtcOffer);
          
          const retryAnswer = await this.peerConnection.createAnswer();
          
          // 格式化重试answer
          const formattedRetryAnswer = {
            type: retryAnswer.type,
            sdp: retryAnswer.sdp
          };
          
          await this.peerConnection.setLocalDescription(retryAnswer);
          uni.$emit('webrtc-answer-created', formattedRetryAnswer);
        }
        
      } catch (error) {
        console.error('RenderJS: 处理Offer失败:', error);
        uni.$emit('webrtc-error', '处理Offer失败: ' + error.message);
      }
    },

    // 处理Answer
    async handleAnswer(answerSdp) {
      console.log('RenderJS: handleAnswer 触发', answerSdp);
      try {
        if (!this.peerConnection) {
          console.error('RenderJS: PeerConnection not initialized.');
          return;
        }
        
        if (!answerSdp) {
          console.error('RenderJS: 收到无效的answer');
          return;
        }
        
        // 格式化answer确保它是RTCSessionDescription
        let formattedAnswer = answerSdp;
        if (typeof answerSdp === 'string') {
          try {
            formattedAnswer = JSON.parse(answerSdp);
          } catch (e) {
            console.error('RenderJS: answer格式化失败:', e);
          }
        }
        
        // 创建RTCSessionDescription对象
        const answerDesc = new RTCSessionDescription(formattedAnswer);
        
        console.log('RenderJS: 设置远程Answer描述:', answerDesc);
        await this.peerConnection.setRemoteDescription(answerDesc);
        console.log('RenderJS: 设置远程Answer成功');
        
        // 检查连接状态
        setTimeout(() => {
          if (this.peerConnection) {
            console.log('RenderJS: 设置Answer后连接状态:', this.peerConnection.signalingState, 
                       '，ICE连接状态:', this.peerConnection.iceConnectionState);
          }
        }, 1000);
      } catch (error) {
        console.error('RenderJS: 处理Answer失败:', error);
        uni.$emit('webrtc-error', '处理Answer失败: ' + error.message);
        
        // 尝试使用更简单的方式重试
        try {
          console.log('RenderJS: 尝试用另一种方式处理answer...');
          const rtcAnswer = {
            type: 'answer',
            sdp: answerSdp.sdp || answerSdp
          };
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(rtcAnswer));
          console.log('RenderJS: 重试设置answer成功');
        } catch (retryError) {
          console.error('RenderJS: 重试处理Answer也失败:', retryError);
        }
      }
    },

    // 处理ICE候选者
    async handleIceCandidate(candidate) {
      console.log('RenderJS: handleIceCandidate 触发');
      try {
         if (!this.peerConnection) {
            console.error('RenderJS: PeerConnection not initialized.');
            return
        }
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('RenderJS: 添加ICE候选者失败:', error);
        uni.$emit('webrtc-error', '添加ICE候选者失败: ' + error.message);
      }
    },
    
    // 切换麦克风
    toggleMicrophone() {
      console.log('RenderJS: toggleMicrophone 触发');
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = !track.enabled
          console.log(`RenderJS: Microphone enabled: ${track.enabled}`)
        })
      }
    },
    
    // 结束通话
    endCall() {
        console.log('RenderJS: 正在结束通话');
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        // 移除所有创建的<audio>元素
        const audioElements = document.getElementsByTagName('audio');
        while (audioElements.length > 0) {
            audioElements[0].parentNode.removeChild(audioElements[0]);
        }
        console.log('RenderJS: 通话资源已清理');
    }
  }
}
</script> 