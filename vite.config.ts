import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 每间实验室一个入口页：labs/<名字>/index.html。新建实验室不用改这个文件
const labs = Object.fromEntries(fs.readdirSync(path.resolve(__dirname, 'labs')).filter(d => fs.existsSync(path.resolve(__dirname, 'labs', d, 'index.html'))).map(d => [d, path.resolve(__dirname, 'labs', d, 'index.html')]))

// 站点放在哪个路径下：自己的域名是 '/'；GitHub Pages 的免费网址是 '/gewulab/'。部署时用环境变量 GEWU_BASE 指定
const base = process.env.GEWU_BASE || '/'
/** 代码里素材都写成 '/assets/…'。站点不在根目录时，把它们换成带前缀的地址 */
const assetBase = {
  name: 'gewu-asset-base',
  transform(code: string, id: string) {
    if (base === '/' || !/\/src\/.*\.(ts|tsx)$/.test(id.split('?')[0]) || !code.includes('/assets/')) return null
    return code.replace(/(['"`])\/assets\//g, `$1${base}assets/`)
  },
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), assetBase],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { rollupOptions: { input: { main: path.resolve(__dirname, 'index.html'), ...labs } } },
})
