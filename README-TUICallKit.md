# TUICallKit 语音通话集成指南

本项目集成了腾讯云的TUICallKit插件，实现了语音通话功能。

## 前提条件

1. 已开通腾讯云实时音视频服务
2. 获取SDKAppID和SecretKey
3. HbuilderX版本 ≥ 3.94
4. 真机调试环境（插件不支持模拟器调试）

## 集成步骤

### 1. 创建uni-app项目

使用HbuilderX创建一个新的uni-app项目，并生成AppID。

### 2. 购买并导入TUICallKit插件

1. 访问[TencentCloud-TUICallKit插件](https://ext.dcloud.net.cn/plugin?id=9035)
2. 购买插件（免费）并绑定AppID
3. 在项目中导入插件

### 3. 配置GenerateTestUserSig.js

在项目中创建debug目录，并添加GenerateTestUserSig.js文件，填入SDKAppID和SecretKey。

```javascript
// debug/GenerateTestUserSig.js
const SDKAPPID = 1600093297; // 替换为您的SDKAppID
const SECRETKEY = '4fdf0d938643ebe529acf7602694742ff3b2b687ae6eb222881bedc3d03adac6'; // 替换为您的SecretKey
```

### 4. 使用TUICallKit

在需要使用通话功能的页面中，导入TUICallKit插件并使用：

```javascript
const TUICallKit = uni.requireNativePlugin('TencentCloud-TUICallKit');
uni.$TUICallKit = TUICallKit;

// 登录
const { userSig, sdkAppID } = genTestUserSig(userID);
const loginParams = { SDKAppID: sdkAppID, userID, userSig };
uni.$TUICallKit.login(loginParams, res => {
  console.log('登录结果:', res);
});

// 发起通话
const callParams = {
  userIDList: [targetUserID], // 对方用户ID
  callMediaType: 1, // 1表示语音通话，2表示视频通话
  callParams: { roomID: Math.floor(Math.random() * 100000), timeout: 30 }
};
uni.$TUICallKit.call(callParams, res => {
  console.log('通话参数:', res);
});
```

## 注意事项

1. 必须使用真机调试，不支持模拟器
2. iOS设备要求：iOS系统 ≥ 9.0
3. Android设备要求：Android系统 ≥ 5.0（SDK API Level 21）
4. 打包时请选择"传统打包"方式

## 更多功能

TUICallKit还支持以下功能：

- 设置昵称、头像
- 群组通话
- 悬浮窗
- 自定义铃声
- 监听通话状态
- 离线唤醒

详细API文档请参考[腾讯云TUICallKit文档](https://cloud.tencent.com/document/product/647/78732) 