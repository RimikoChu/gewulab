import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 每间实验室一个入口页：labs/<名字>/index.html。新建实验室不用改这个文件
const labs = Object.fromEntries(fs.readdirSync(path.resolve(__dirname, 'labs')).filter(d => fs.existsSync(path.resolve(__dirname, 'labs', d, 'index.html'))).map(d => [d, path.resolve(__dirname, 'labs', d, 'index.html')]))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { rollupOptions: { input: { main: path.resolve(__dirname, 'index.html'), ...labs } } },
})
