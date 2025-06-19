<template>
  <view class="audio-message" :class="{ 'self-message': isSelf }" @click="playAudio">
    <view class="audio-icon">
      <u-icon :name="isPlaying ? 'pause' : 'play-right'" size="24" :color="isSelf ? '#fff' : '#666'"></u-icon>
    </view>
    <view class="audio-wave" v-if="isPlaying">
      <view class="wave-bar"></view>
      <view class="wave-bar"></view>
      <view class="wave-bar"></view>
    </view>
    <text class="audio-duration">{{ formatDuration }}″</text>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  fileUrl: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  isSelf: {
    type: Boolean,
    default: false
  },
  messageId: {
    type: String,
    required: true
  }
})

const isPlaying = ref(false)
const audioContext = ref(null)

// 格式化音频时长
const formatDuration = computed(() => {
  return Math.ceil(props.duration / 1000)
})

// 播放音频
const playAudio = () => {
  if (!audioContext.value) {
    initAudioContext()
  }

  if (isPlaying.value) {
    audioContext.value.stop()
    isPlaying.value = false
  } else {
    audioContext.value.src = props.fileUrl
    audioContext.value.play()
    isPlaying.value = true
  }
}

// 初始化音频上下文
const initAudioContext = () => {
  audioContext.value = uni.createInnerAudioContext()
  
  audioContext.value.onEnded(() => {
    isPlaying.value = false
  })
  
  audioContext.value.onError((res) => {
    console.error('音频播放错误:', res)
    uni.showToast({
      title: '音频播放失败',
      icon: 'none'
    })
    isPlaying.value = false
  })
}

onMounted(() => {
  initAudioContext()
})

onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.destroy()
  }
})
</script>

<style scoped>
.audio-message {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  min-width: 160rpx;
  max-width: 400rpx;
  background-color: #ffffff;
  border-radius: 32rpx;
  cursor: pointer;
  transition: all 0.3s ease;
}

.audio-message:active {
  opacity: 0.8;
}

.audio-message.self-message {
  background-color: var(--primary-color);
  color: #ffffff;
  flex-direction: row-reverse;
}

.audio-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-right: 16rpx;
}

.self-message .audio-icon {
  margin-right: 0;
  margin-left: 16rpx;
}

.audio-wave {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-right: 16rpx;
  height: 32rpx;
}

.wave-bar {
  width: 4rpx;
  height: 20rpx;
  background-color: currentColor;
  border-radius: 2rpx;
  animation: wave 1.2s infinite ease-in-out;
}

.wave-bar:nth-child(2) {
  animation-delay: 0.3s;
}

.wave-bar:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes wave {
  0%, 100% {
    height: 20rpx;
  }
  50% {
    height: 32rpx;
  }
}

.audio-duration {
  font-size: 24rpx;
  color: currentColor;
  min-width: 40rpx;
  text-align: right;
}
</style> 