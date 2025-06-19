/**
 * 录音管理器工具类
 */
class RecorderManager {
  constructor() {
    this.recorderManager = null;
    this.isRecording = false;
    this.startTime = null;
    
    // 回调函数
    this.onStart = null;
    this.onStop = null;
    this.onError = null;
    this.onFrameRecorded = null;
  }

  /**
   * 初始化录音管理器
   * @returns {boolean} 是否支持录音
   */
  init() {
    // #ifdef APP-PLUS || MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
    try {
      this.recorderManager = uni.getRecorderManager();
      
      // 监听录音开始事件
      this.recorderManager.onStart(() => {
        this.isRecording = true;
        this.startTime = Date.now();
        this.onStart && this.onStart();
      });
      
      // 监听录音结束事件
      this.recorderManager.onStop((res) => {
        this.isRecording = false;
        const endTime = Date.now();
        const duration = this.startTime ? endTime - this.startTime : 0;
        console.log('录音结束:', JSON.stringify(res));
        const result = {
          tempFilePath: res.tempFilePath,
          duration: duration,
          fileSize: res.fileSize
        };
        this.startTime = null;
        this.onStop && this.onStop(result);
      });

      // 监听录音错误事件
      this.recorderManager.onError((res) => {
        this.isRecording = false;
        this.onError && this.onError(res);
      });

      // 监听录音帧数据
      this.recorderManager.onFrameRecorded((res) => {
        this.onFrameRecorded && this.onFrameRecorded(res);
      });

      return true;
    } catch (error) {
      console.error('初始化录音管理器失败:', error);
      return false;
    }
    // #endif

    // #ifdef H5
    console.log('H5环境不支持录音功能');
    return false;
    // #endif
  }

  /**
   * 开始录音
   * @param {Object} options 录音选项
   */
  start(options = {}) {
    if (!this.recorderManager) return;
    
    const defaultOptions = {
      duration: 60000, // 最长录音时间，单位ms
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 192000,
      format: 'mp3',
      frameSize: 50
    };

    this.recorderManager.start({
      ...defaultOptions,
      ...options
    });
  }

  /**
   * 停止录音
   */
  stop() {
    if (!this.recorderManager || !this.isRecording) return;
    this.recorderManager.stop();
  }

  /**
   * 是否正在录音
   * @returns {boolean}
   */
  isRecordingNow() {
    return this.isRecording;
  }

  /**
   * 设置录音开始回调
   * @param {Function} callback 
   */
  setOnStart(callback) {
    this.onStart = callback;
  }

  /**
   * 设置录音结束回调
   * @param {Function} callback 
   */
  setOnStop(callback) {
    this.onStop = callback;
  }

  /**
   * 设置录音错误回调
   * @param {Function} callback 
   */
  setOnError(callback) {
    this.onError = callback;
  }

  /**
   * 设置录音帧数据回调
   * @param {Function} callback 
   */
  setOnFrameRecorded(callback) {
    this.onFrameRecorded = callback;
  }
}

// 导出单例
export const recorder = new RecorderManager();

/**
 * 检查是否支持录音功能
 * @returns {boolean}
 */
export function isRecorderSupported() {
  // #ifdef APP-PLUS || MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
  return true;
  // #endif

  // #ifdef H5
  return false;
  // #endif
} 