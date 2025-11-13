// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Palate-3D-Mapping/', // 重要：替换为你的仓库名
  build: {
    outDir: 'public',
    sourcemap: false
  }
})
