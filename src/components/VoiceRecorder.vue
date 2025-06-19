<template>
  <view>
    <!-- 录音按钮 -->
    <view v-if="isRecorderEnabled" 
      class="voice-btn" 
      @touchstart.prevent="startRecording" 
      @touchend.prevent="stopRecording" 
      @touchcancel.prevent="cancelRecording"
      @touchmove.prevent="handleTouchMove">
      <u-icon name="mic" size="24" color="#666"></u-icon>
    </view>

    <!-- 录音提示 -->
    <u-popup :show="showRecordingTip" mode="center" :closeable="false">
      <view class="recording-tip">
        <view class="recording-icon">
          <u-icon name="mic" size="48" color="#fff"></u-icon>
        </view>
        <text class="recording-text">{{ recordingTipText }}</text>
        <text v-if="recordingTipText === '松开手指，取消发送'" class="cancel-record-tip">手指上滑，取消发送</text>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { recorder, isRecorderSupported as checkRecorderSupport } from '@/utils/recorder'

const props = defineProps({
  onAudioRecorded: {
    type: Function,
    required: true
  }
})

const showRecordingTip = ref(false)
const recordingTipText = ref('按住说话')
const isRecorderEnabled = ref(false)

// 检查是否支持录音功能
const checkRecorderAvailability = () => {
  isRecorderEnabled.value = checkRecorderSupport()
}

// 开始录音
const startRecording = () => {
  if (!isRecorderEnabled.value) {
    uni.showToast({
      title: '当前平台不支持录音功能',
      icon: 'none'
    })
    return
  }

  showRecordingTip.value = true
  recordingTipText.value = '松开结束'

  // 开始录音
  recorder.start()
}

// 停止录音
const stopRecording = () => {
  if (!showRecordingTip.value) return
  
  showRecordingTip.value = false
  recordingTipText.value = '按住说话'
  
  // 停止录音
  recorder.stop()
}

// 取消录音
const cancelRecording = () => {
  if (!showRecordingTip.value) return
  
  showRecordingTip.value = false
  recordingTipText.value = '按住说话'
  
  // 停止录音
  recorder.stop()
  
  uni.showToast({
    title: '已取消录音',
    icon: 'none'
  })
}

// 初始化录音管理器
const initRecorderManager = () => {
  if (!isRecorderEnabled.value) {
    console.log('当前平台不支持录音功能')
    return
  }

  try {
    // 初始化录音管理器
    const isInitialized = recorder.init()
    if (!isInitialized) {
      console.error('录音管理器初始化失败')
      return
    }

    // 设置录音开始回调
    recorder.setOnStart(() => {
      console.log('录音开始')
    })

    // 设置录音结束回调
    recorder.setOnStop((res) => {
      console.log('录音结束:', JSON.stringify(res))
      if (res.duration < 1000) {
        uni.showToast({
          title: '录音时间太短',
          icon: 'none'
        })
        return
      }
      
      // 调用父组件的回调函数
      props.onAudioRecorded(res.tempFilePath, res.duration)
    })

    // 设置录音错误回调
    recorder.setOnError((res) => {
      console.error('录音错误:', res)
      uni.showToast({
        title: '录音失败',
        icon: 'none'
      })
      showRecordingTip.value = false
    })

    // 设置录音帧数据回调
    recorder.setOnFrameRecorded((res) => {
      const { frameBuffer, isLastFrame } = res
      console.log('录音帧数据:', frameBuffer, isLastFrame)
    })
  } catch (error) {
    console.error('初始化录音管理器失败:', error)
  }
}

// 处理触摸移动
const handleTouchMove = (e) => {
  if (!showRecordingTip.value) return
  
  const touch = e.touches[0]
  const startY = e.target.offsetTop
  const moveY = touch.clientY
  
  // 如果上滑超过50px，显示"松开手指，取消发送"
  if (startY - moveY > 50) {
    recordingTipText.value = '松开手指，取消发送'
  } else {
    recordingTipText.value = '松开结束'
  }
}

onMounted(() => {
  checkRecorderAvailability()
  initRecorderManager()
})

onUnmounted(() => {
  // 清理录音相关资源
  if (recorder) {
    recorder.stop()
  }
})
</script>

<style scoped>
.voice-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.recording-tip {
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 20rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 240rpx;
  width: 240rpx;
  justify-content: center;
}

.recording-icon {
  width: 100rpx;
  height: 100rpx;
  background-color: #ff4d4f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 0 20rpx rgba(255, 77, 79, 0.4);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.recording-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 500;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

.cancel-record-tip {
  color: #ff4d4f;
  margin-top: 16rpx;
  font-size: 24rpx;
}
</style> 