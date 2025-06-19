import { createSSRApp } from 'vue'
import App from './App.vue'
import store from './store'
import uviewPlus from 'uview-plus'
import IncomingCallNotification from '@/components/IncomingCallNotification.vue'


export function createApp() {
  const app = createSSRApp(App)
  
  // 使用Vuex
  app.use(store)
  
  // 使用uView UI
  app.use(uviewPlus)
  
  // 全局注册 IncomingCallNotification 组件
  app.component('IncomingCallNotification', IncomingCallNotification)
  
  return {
    app
  }
}
