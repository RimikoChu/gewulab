// 机械振动和机械波实验室自己画的几张贴图：抛石、波纹板、木板、黑黄警示条。都用画布现画，不用外部素材。
import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()
function canvasTex(key: string, size: number, draw: (c: CanvasRenderingContext2D, n: number) => void, repeat: [number, number] = [1, 1], color = true) {
  const hit = cache.get(key); if (hit) return hit
  const cv = document.createElement('canvas'); cv.width = cv.height = size
  draw(cv.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8
  if (color) t.colorSpace = THREE.SRGBColorSpace
  cache.set(key, t); return t
}
/** 固定种子的随机数 */
export function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

/** 抛石：一块块深浅不同的石头，缝是黑的。kind 为 bump 时给凹凸用的灰度图 */
export function rockTex(kind: 'map' | 'bump', repeat: [number, number]) {
  return canvasTex(`rock-${kind}-${repeat}`, 512, (c, n) => {
    const r = rng(11)
    c.fillStyle = kind === 'map' ? '#2b2a27' : '#000'; c.fillRect(0, 0, n, n)
    for (let i = 0; i < 520; i++) {
      const x = r() * n, y = r() * n, s = 14 + r() * 26, g = 96 + r() * 70, k = 5 + Math.floor(r() * 3), a0 = r() * 6.28
      for (const [ox, oy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {
        c.beginPath()
        for (let j = 0; j < k; j++) { const a = a0 + (j / k) * 6.28, q = s * (0.7 + ((j * 37 + i * 13) % 10) / 30); c[j ? 'lineTo' : 'moveTo'](x + ox + Math.cos(a) * q, y + oy + Math.sin(a) * q * 0.8) }
        c.closePath()
        c.fillStyle = kind === 'map' ? `rgb(${g + 8},${g + 4},${g - 6})` : `rgb(${g + 60},${g + 60},${g + 60})`; c.fill()
      }
    }
  }, repeat, kind === 'map')
}
/** 波纹板的凹凸：一道一道的竖棱 */
export function ribTex(repeat: [number, number]) {
  return canvasTex(`rib-${repeat}`, 64, (c, n) => { for (let x = 0; x < n; x++) { const v = Math.round(127 + 120 * Math.sin((x / n) * Math.PI * 2)); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(x, 0, 1, n) } }, repeat, false)
}
/** 木板：一条条拼起来，条与条之间有缝 */
export function plankTex(repeat: [number, number]) {
  return canvasTex(`plank-${repeat}`, 256, (c, n) => {
    const r = rng(5)
    for (let i = 0; i < 8; i++) {
      const g = 120 + r() * 40; c.fillStyle = `rgb(${g + 30},${g + 4},${g - 34})`; c.fillRect(0, i * 32, n, 32)
      for (let j = 0; j < 60; j++) { c.fillStyle = `rgba(60,40,20,${0.05 + r() * 0.1})`; c.fillRect(r() * n, i * 32 + r() * 30, 20 + r() * 80, 1) }
      c.fillStyle = '#2a1e12'; c.fillRect(0, i * 32, n, 2)
    }
  }, repeat)
}
/** 走纸记录器的方格纸 */
export function gridPaper() {
  return canvasTex('paper', 256, (c, n) => {
    c.fillStyle = '#f3efe2'; c.fillRect(0, 0, n, n)
    for (let i = 0; i <= 16; i++) { c.fillStyle = i % 4 === 0 ? 'rgba(200,90,60,0.55)' : 'rgba(200,90,60,0.22)'; c.fillRect(i * 16, 0, 1, n); c.fillRect(0, i * 16, n, 1) }
  }, [2, 2])
}
