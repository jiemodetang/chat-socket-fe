// 环境配置
let env = 'production'

// 基础配置
const baseConfig = {
  development: {
    apiUrl: 'http://localhost:3000',
    socketServerUrl: 'ws://localhost:3000'
  },
  production: {
    apiUrl: 'http://82.156.51.236:3000',
    socketServerUrl: 'ws://82.156.51.236:3000'
  }
}

// 导出当前环境的配置
export const currentConfig = baseConfig[env]
