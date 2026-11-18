// 程序画出来的贴图：不用下载素材也能有的细节。
import { useMemo } from 'react'
import * as THREE from 'three'

/** 水底的光斑：几组正弦波叠出一张亮纹网，四边能无缝拼接 */
export function makeCaustics() {
  const N = 256, data = new Uint8Array(N * N * 4), T = Math.PI * 2
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N * T, v = y / N * T
    const a = Math.sin(u * 3 + Math.sin(v * 2) * 1.6) + Math.sin(v * 4 + Math.sin(u * 3) * 1.4) + Math.sin((u + v) * 2 + Math.sin(u * 2 - v) * 1.2)
    const k = Math.pow(Math.max(0, 1 - Math.abs(a) / 1.15), 3.2) * 255, i = (y * N + x) * 4
    data[i] = data[i + 1] = data[i + 2] = k; data[i + 3] = 255
  }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true
  return t
}
/** 剖开的岸：一层层的土和碎石 */
export function makeStrata(bands = ['#6f6a55', '#8a7a5c', '#7b6a4e', '#6a5a44', '#5c5142', '#54493d']) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = bands[0]; g.fillRect(0, 0, 1024, 512)        // 先整张铺满最上面一层的颜色：波浪形的分界线上方不能留空
  let y = 0
  bands.forEach((col, i) => { const h = [40, 90, 110, 100, 90, 90][i]; g.fillStyle = col; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x * 0.013 + i * 2) * 9); g.lineTo(1024, 512); g.lineTo(0, 512); g.fill(); y += h })
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 1500; i++) { const x = rnd() * 1024, yy = 30 + rnd() * 480, r = 1 + rnd() * rnd() * 7; g.fillStyle = `rgba(${rnd() > 0.5 ? '210,200,180' : '40,34,28'},${0.12 + rnd() * 0.25})`; g.beginPath(); g.ellipse(x, yy, r * 1.4, r, rnd() * 3, 0, Math.PI * 2); g.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 水尺：从液面往下，每半米一格，每米一个数 */
export function makeRuler(depth: number) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128 * depth * 2
  const g = c.getContext('2d')!, per = 256
  g.fillStyle = '#f3f1e8'; g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#c8372d'; for (let m = 0; m < depth; m++) g.fillRect(0, m * per + per / 2, 44, per / 2)
  g.fillStyle = '#1d2327'; g.font = '700 64px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
  for (let m = 0; m <= depth; m++) { g.fillRect(0, Math.min(c.height - 6, m * per - 3), 128, 6); if (m > 0 && m < depth) g.fillText(String(m), 62, m * per - 44); for (let k = 1; k < 10; k++) g.fillRect(0, m * per + k * per / 10 - 1.5, k === 5 ? 78 : 30, 3) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
export function useFaceGradient(rgb: string, top = 0.42) {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256
    const g = c.getContext('2d')!, grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, `rgba(${rgb},${top})`); grad.addColorStop(0.45, `rgba(${rgb},0.1)`); grad.addColorStop(1, 'rgba(4,20,26,0.4)')
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256); g.fillStyle = 'rgba(232,248,252,0.85)'; g.fillRect(0, 0, 4, 2)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [rgb, top])
}

