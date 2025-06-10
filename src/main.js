import { createSSRApp } from 'vue'
import App from './App.vue'
import store from './store'
import uviewPlus from 'uview-plus'


export function createApp() {
  const app = createSSRApp(App)
  
  // 使用Vuex
  app.use(store)
  
  // 使用uView UI
  app.use(uviewPlus)
  
  return {
    app
  }
}
