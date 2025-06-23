// TUICallKit 工具类
import { genTestUserSig } from '@/debug/GenerateTestUserSig.js'

// 获取TUICallKit插件实例
let TUICallKit = null;
// #ifdef APP-PLUS
TUICallKit = uni.requireNativePlugin('TencentCloud-TUICallKit');
uni.$TUICallKit = TUICallKit;
// #endif

// 获取全局事件对象
const TUICallKitEvent = uni.requireNativePlugin('globalEvent');

// 初始化通话事件监听
const initCallEventListeners = () => {
  if (!TUICallKitEvent) {
    console.error('[TUICallKit] globalEvent 未初始化');
    return;
  }

  try {
    // 通话过程中错误回调
    TUICallKitEvent.addEventListener('onError', (res) => {
      console.error('[TUICallKit] 通话错误:', res);
      const { code, msg } = res;
      uni.showToast({
        title: `通话错误: ${msg}`,
        icon: 'none'
      });
    });

    // 收到通话请求
    TUICallKitEvent.addEventListener('onCallReceived', (res) => {
      console.log('[TUICallKit] 收到通话请求:', res);
      const { callerId, calleeIdList, groupId, callMediaType, userData } = res;
    });

    // 通话取消的回调
    TUICallKitEvent.addEventListener('onCallCancelled', (res) => {
      console.log('[TUICallKit] 通话被取消:', res);
      const { userId } = res;
      uni.showToast({
        title: '通话已取消',
        icon: 'none'
      });
    });

    // 通话接通的回调
    TUICallKitEvent.addEventListener('onCallBegin', (res) => {
      console.log('[TUICallKit] 通话已接通:', res);
      const { roomID, callMediaType, callRole } = res;
    });

    // 通话结束的回调
    TUICallKitEvent.addEventListener('onCallEnd', (res) => {
      console.log('[TUICallKit] 通话结束:', res);
      const { roomID, callMediaType, totalTime } = res;
      if (totalTime) {
        uni.showToast({
          title: `通话时长: ${formatCallDuration(Math.floor(totalTime))}`,
          icon: 'none'
        });
      }
    });

    // 通话媒体类型发生改变的回调
    TUICallKitEvent.addEventListener('onCallMediaTypeChanged', (res) => {
      console.log('[TUICallKit] 通话类型改变:', res);
      const { oldCallMediaType, newCallMediaType } = res;
      const mediaTypeMap = {
        1: '语音通话',
        2: '视频通话'
      };
      uni.showToast({
        title: `已切换至${mediaTypeMap[newCallMediaType] || '未知类型'}`,
        icon: 'none'
      });
    });

    // 用户拒绝通话的回调
    TUICallKitEvent.addEventListener('onUserReject', (res) => {
      console.log('[TUICallKit] 用户拒绝通话:', res);
      const { userId } = res;
      uni.showToast({
        title: '对方已拒绝',
        icon: 'none'
      });
    });

    // 用户不响应的回调
    TUICallKitEvent.addEventListener('onUserNoResponse', (res) => {
      console.log('[TUICallKit] 用户未响应:', res);
      const { userId } = res;
      uni.showToast({
        title: '对方无应答',
        icon: 'none'
      });
    });

    // 用户忙线的回调
    TUICallKitEvent.addEventListener('onUserLineBusy', (res) => {
      console.log('[TUICallKit] 用户忙线:', res);
      const { userId } = res;
      uni.showToast({
        title: '对方忙线中',
        icon: 'none'
      });
    });

    // 用户加入通话的回调
    TUICallKitEvent.addEventListener('onUserJoin', (res) => {
      console.log('[TUICallKit] 用户加入通话:', res);
      const { userId } = res;
      uni.showToast({
        title: '对方已加入通话',
        icon: 'none'
      });
    });

    // 用户离开通话的回调
    TUICallKitEvent.addEventListener('onUserLeave', (res) => {
      console.log('[TUICallKit] 用户离开通话:', res);
      const { userId } = res;
      uni.showToast({
        title: '对方已离开通话',
        icon: 'none'
      });
    });

    // 用户是否开启视频上行回调
    TUICallKitEvent.addEventListener('onUserVideoAvailable', (res) => {
      console.log('[TUICallKit] 用户视频状态变更:', res);
      const { userId, isVideoAvailable } = res;
    });

    // 用户是否开启音频上行回调
    TUICallKitEvent.addEventListener('onUserAudioAvailable', (res) => {
      console.log('[TUICallKit] 用户音频状态变更:', res);
      const { userId, isAudioAvailable } = res;
    });

    // 用户通话音量的回调
    TUICallKitEvent.addEventListener('onUserVoiceVolumeChanged', (res) => {
      console.log('[TUICallKit] 用户音量变化:', res);
      const { volumeMap } = res;
    });

    // 用户网络质量的回调
    TUICallKitEvent.addEventListener('onUserNetworkQualityChanged', (res) => {
      console.log('[TUICallKit] 用户网络质量变化:', res);
      const { networkQualityList } = res;
    });

    // 当前用户被踢下线
    TUICallKitEvent.addEventListener('onKickedOffline', (res) => {
      console.log('[TUICallKit] 当前用户被踢下线:', res);
    });

    // 在线时票据过期
    TUICallKitEvent.addEventListener('onUserSigExpired', (res) => {
      console.log('[TUICallKit] 在线时票据过期:', res);
    });

    // 自定义按钮点击事件
    TUICallKitEvent.addEventListener('CustomViewClickEvent', (res) => {
      console.log('[TUICallKit] 自定义按钮点击:', res.viewId);
    });

    console.log('[TUICallKit] 通话事件监听初始化成功');
  } catch (error) {
    console.error('[TUICallKit] 初始化通话事件监听失败:', error);
  }
};

// 登录TUICallKit
export const loginTUICallKit = (user, onSuccess, onError) => {
  if (!TUICallKit || !user || !user._id) {
    onError && onError('TUICallKit未初始化或用户信息无效');
    return;
  }

  try {
    const { userSig, sdkAppID: SDKAppID } = genTestUserSig(user._id);
    const loginParams = { 
      SDKAppID, 
      userID: user._id, 
      userSig 
    };

    TUICallKit.login(loginParams, res => {
      if (res.code === 0) {
        console.log('[TUICallKit] 登录成功');
        // 登录成功后设置用户信息
        setSelfInfo(user.username, user.avatar);
        // 默认开启悬浮窗和来电横幅
        enableFloatWindow(true);
        enableIncomingBanner(true);
        // 初始化通话事件监听
        initCallEventListeners();
        onSuccess && onSuccess();
      } else {
        console.error('[TUICallKit] 登录失败:', res.msg);
        onError && onError(res.msg);
      }
    });
  } catch (error) {
    console.error('[TUICallKit] 登录异常:', error);
    onError && onError(error.message);
  }
};

// 发起通话
export const startCall = (targetUserId, callType = 1, params = {}, callback) => {
  if (!TUICallKit) {
    callback({ code: -1, msg: 'TUICallKit未初始化' });
    return;
  }

  // 检查目标用户ID是否有效
  if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim() === '') {
    console.error('[TUICallKit] 无效的目标用户ID:', targetUserId);
    callback({ code: -1, msg: 'invalid userId' });
    return;
  }

  try {
    const defaultParams = {
      roomID: Math.floor(Math.random() * 1000000) + 1,
      strRoomID: String(Date.now()),
      timeout: 30
    };

    // 确保用户ID是字符串类型
    const userId = String(targetUserId).trim();
    
    const callParams = {
      userIDList: [userId],
      callMediaType: callType, // 1-语音通话，2-视频通话
      callParams: { ...defaultParams, ...params }
    };

    console.log('[TUICallKit] 发起通话参数:', JSON.stringify(callParams));

    TUICallKit.calls(callParams, res => {
      console.log('[TUICallKit] 通话结果:', JSON.stringify(res));
      callback(res);
    });
  } catch (error) {
    console.error('[TUICallKit] 发起通话异常:', error);
    callback({ code: -1, msg: error.message });
  }
};

// 接听来电
export const acceptCall = (callback) => {
  if (!TUICallKit) {
    callback && callback({ code: -1, msg: 'TUICallKit未初始化' });
    return;
  }

  try {
    TUICallKit.accept({}, res => {
      if (res.code === 0) {
        console.log('[TUICallKit] 接听来电成功');
      } else {
        console.error('[TUICallKit] 接听来电失败:', res.msg);
      }
      callback && callback(res);
    });
  } catch (error) {
    console.error('[TUICallKit] 接听来电异常:', error);
    callback && callback({ code: -1, msg: error.message });
  }
};

// 拒绝来电
export const rejectCall = (callback) => {
  if (!TUICallKit) {
    callback && callback({ code: -1, msg: 'TUICallKit未初始化' });
    return;
  }

  try {
    TUICallKit.reject({}, res => {
      if (res.code === 0) {
        console.log('[TUICallKit] 拒绝来电成功');
      } else {
        console.error('[TUICallKit] 拒绝来电失败:', res.msg);
      }
      callback && callback(res);
    });
  } catch (error) {
    console.error('[TUICallKit] 拒绝来电异常:', error);
    callback && callback({ code: -1, msg: error.message });
  }
};

// 添加通话事件监听
export const onCallEvent = (eventName, callback) => {
  if (!TUICallKitEvent) {
    console.error('[TUICallKit] globalEvent 未初始化');
    return;
  }
  
  try {
    TUICallKitEvent.addEventListener(eventName, callback);
  } catch (error) {
    console.error(`[TUICallKit] 添加${eventName}事件监听失败:`, error);
  }
};

// 移除通话事件监听
export const offCallEvent = (eventName, callback) => {
  if (!TUICallKitEvent) {
    console.error('[TUICallKit] globalEvent 未初始化');
    return;
  }
  
  try {
    TUICallKitEvent.removeEventListener(eventName, callback);
  } catch (error) {
    console.error(`[TUICallKit] 移除${eventName}事件监听失败:`, error);
  }
};

// 开启/关闭悬浮窗功能
export const enableFloatWindow = (enable = true) => {
  if (!TUICallKit) return;
  
  try {
    TUICallKit.enableFloatWindow({ enable }, res => {
      if (res.code === 0) {
        console.log(`[TUICallKit] ${enable ? '开启' : '关闭'}悬浮窗成功`);
      } else {
        console.error(`[TUICallKit] ${enable ? '开启' : '关闭'}悬浮窗失败:`, res.msg);
      }
    });
  } catch (error) {
    console.error('[TUICallKit] 设置悬浮窗异常:', error);
  }
};

// 开启/关闭来电横幅显示
export const enableIncomingBanner = (enable = true) => {
  if (!TUICallKit) return;
  
  try {
    TUICallKit.enableIncomingBanner({ enable }, res => {
      if (res.code === 0) {
        console.log(`[TUICallKit] ${enable ? '开启' : '关闭'}来电横幅成功`);
      } else {
        console.error(`[TUICallKit] ${enable ? '开启' : '关闭'}来电横幅失败:`, res.msg);
      }
    });
  } catch (error) {
    console.error('[TUICallKit] 设置来电横幅异常:', error);
  }
};

// 设置用户的昵称、头像
export const setSelfInfo = (nickname, avatar) => {
  if (!TUICallKit) return;
  
  try {
    const params = {
      nickname: nickname || '',
      avatar: avatar || ''
    };
    
    TUICallKit.setSelfInfo(params, res => {
      if (res.code === 0) {
        console.log('[TUICallKit] 设置用户信息成功');
      } else {
        console.error('[TUICallKit] 设置用户信息失败:', res.msg);
      }
    });
  } catch (error) {
    console.error('[TUICallKit] 设置用户信息异常:', error);
  }
};

// 格式化通话时长（仿微信简约风格）
export const formatCallDuration = (seconds) => {
  if (seconds < 60) {
    return `通话时长 ${seconds}秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    if (remainingSeconds > 0) {
      return `通话时长 ${minutes}分${remainingSeconds}秒`;
    } else {
      return `通话时长 ${minutes}分钟`;
    }
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0 || remainingSeconds > 0) {
    return `通话时长 ${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分' : ''}${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}`;
  } else {
    return `通话时长 ${hours}小时`;
  }
};
