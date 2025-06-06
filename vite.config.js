import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    uni(),
  ],
	server: {
	  proxy: {
		// '/api': 'http://localhost:3000'
    '/api': 'http://82.156.51.236:3000'
	  }
	},
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "uview-plus/theme.scss";`
        // 或者
        // additionalData: `@import "uview-plus/libs/css/variable.scss";`
      }
    }
  },
  transpileDependencies: ['uview-plus'],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})