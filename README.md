# Socket 聊天应用

一个基于 Vue.js 和 Socket.IO 构建的实时聊天应用，支持即时通讯、好友管理和群聊功能。

## 主要功能

- 🔐 用户认证
  - 用户注册和登录
  - 基于 Token 的身份验证
  - 会话持久化
  - 自动登录

- 💬 实时聊天
  - 私聊功能
  - 群聊支持
  - 消息已读状态
  - 正在输入提示
  - 未读消息计数
  - 消息通知

- 👥 好友管理
  - 添加/删除好友
  - 好友请求系统
  - 用户搜索
  - 好友列表管理
  - 好友状态显示

- 📱 现代化界面
  - 实时更新
  - 响应式设计
  - 消息通知
  - 聊天历史记录
  - 优雅的动画效果

## 技术栈

- 前端框架：Vue.js
- 状态管理：Vuex
- 实时通信：Socket.IO
- UI 框架：uni-app
- API 通信：Axios
- 存储：本地存储 + 云端存储

## 项目设置

1. 克隆仓库：
```bash
git clone [仓库地址]
cd socket-chat-app
```

2. 安装依赖：
```bash
npm install
```

3. 环境配置：
   - 在根目录创建 `.env` 文件
   - 添加必要的环境变量：
     ```
     VUE_APP_API_URL=你的API地址
     VUE_APP_SOCKET_URL=你的Socket服务器地址
     ```

4. 运行开发服务器：
```bash
npm run dev
```

## 项目结构

```
socket-chat-app/
├── src/
│   ├── components/     # Vue 组件
│   ├── store/         # Vuex 状态管理
│   ├── utils/         # 工具函数
│   ├── config/        # 配置文件
│   └── static/        # 静态资源
├── public/            # 公共资源
└── package.json       # 项目依赖
```

## 功能详解

### 认证系统
- 安全的用户注册和登录
- JWT Token 认证
- 自动会话管理
- 密码加密存储
- 登录状态持久化

### 聊天功能
- 实时消息传递
- 消息已读回执
- 正在输入提示
- 未读消息追踪
- 聊天历史记录
- 消息通知
- 消息撤回
- 图片/文件发送

### 好友系统
- 发送和接收好友请求
- 管理好友列表
- 用户搜索
- 接受/拒绝好友请求
- 好友在线状态
- 好友分组管理

### 群聊功能
- 创建群聊
- 添加/移除成员
- 群消息管理
- 群公告
- 群成员管理
- 群权限设置

## 开发指南

### 开发环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0
- Vue CLI >= 4.0.0

### 开发规范
- 遵循 Vue.js 官方风格指南
- 使用 ESLint 进行代码规范检查
- 使用 Prettier 进行代码格式化
- 遵循 Git Flow 工作流

### 代码提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式（不影响代码运行的变动）
- refactor: 重构（既不是新增功能，也不是修改bug的代码变动）
- test: 增加测试
- chore: 构建过程或辅助工具的变动

## 部署说明

1. 构建生产环境代码：
```bash
npm run build
```

2. 部署到服务器：
   - 将 dist 目录下的文件部署到 Web 服务器
   - 配置 Nginx 或其他 Web 服务器
   - 确保 WebSocket 连接配置正确

## 常见问题

1. WebSocket 连接失败
   - 检查网络连接
   - 确认 Socket 服务器地址配置正确
   - 检查防火墙设置

2. 消息发送失败
   - 检查网络连接
   - 确认用户认证状态
   - 查看服务器日志

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 版本历史

- v1.0.0
  - 基础聊天功能
  - 用户认证
  - 好友系统

- v1.1.0
  - 群聊功能
  - 消息通知
  - UI 优化

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 支持与帮助

- 提交 Issue：在 GitHub 仓库中提交问题
- 邮件支持：support@example.com
- 技术文档：[文档地址]

## 致谢

感谢所有为本项目做出贡献的开发者！
