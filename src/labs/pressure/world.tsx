// 压强实验室各课共用的东西：程序画的贴图、匀速变化的数、远山和松树、任务进度。
// 舞台（镜头、标签、画质分档）沿用 float/dock.tsx 的 DockStage。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Task } from '@/components/lab/lab-shell'

/** 一个数匀速变到目标值：吊臂转向、车开过去、水位升降都用它 */
export function useSlide(to: number, speed: number) {
  const [x, setX] = useState(to), cur = useRef(to)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const d = to - cur.current
      cur.current = Math.abs(d) <= speed * dt ? to : cur.current + Math.sign(d) * speed * dt
      setX(cur.current)
      if (cur.current !== to) raf = requestAnimationFrame(frame)
    }
    if (cur.current !== to) raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [to, speed])
  return x
}

// ---------- 程序生成的贴图 ----------
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

// ---------- 远景 ----------
/** 山：近的发绿，远的发蓝灰。snow 为 true 时换成雪山 */
export function Hills({ snow = false }: { snow?: boolean }) {
  const hills: [number, number, number, number, string][] = [
    // 山都放在大坝和水库的后面、两侧，不能压在坝体和水面上
    [70, -80, 60, 34, '#56684c'], [130, -150, 110, 60, '#5f705a'], [110, -230, 90, 46, '#6b7c6c'], [-260, -580, 110, 64, '#5a6b55'], [-560, -300, 120, 52, '#62735f'],
    [-150, -640, 150, 74, '#7a8a86'], [90, -330, 170, 88, '#8597a0'], [-40, -680, 200, 96, '#94a5b0'], [-680, -480, 220, 100, '#8a9aa6'], [280, -240, 160, 80, '#7e9099'],
  ]
  return <>{hills.map(([x, z, rr, h, c], i) => <mesh key={i} position={[x, h / 2 - 3, z]} rotation-y={i * 1.3} scale={[1, 1, 0.8]}><coneGeometry args={[rr, h, 7, 2]} /><meshStandardMaterial color={snow ? (i % 2 ? '#dfe8ee' : '#c9d6df') : c} roughness={1} flatShading /></mesh>)}</>
}
/** 松树：at 里每一项是 [x, z, 大小] */
export function Pines({ at }: { at: [number, number, number][] }) {
  return <>{at.map(([x, z, s], i) => <group key={i} position={[x, 0, z]} scale={s}>
    <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, 1, 8]} /><meshStandardMaterial color="#5a4633" roughness={1} /></mesh>
    {[0, 1, 2].map(k => <mesh key={k} position={[0, 1.5 + k * 0.95, 0]} castShadow><coneGeometry args={[1.25 - k * 0.3, 1.7, 9]} /><meshStandardMaterial color={k % 2 ? '#3d6b4a' : '#356043'} roughness={0.95} flatShading /></mesh>)}
  </group>)}</>
}

// ---------- 任务进度 ----------
/** 每课的任务打勾、顶上的提示条、做完后的结论卡。进度存在浏览器里 */
export function useTasks(key: string, tasks: Task[]) {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } })
  const [banner, setBanner] = useState<string | null>(null)
  const [finale, setFinale] = useState(false)
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 3600); return () => clearTimeout(t) }, [banner])
  const doneRef = useRef(done); doneRef.current = done
  /** 把满足条件的任务打勾：ok 返回 true 的、还没完成的都算 */
  const check = (ok: (id: string) => boolean) => {
    const d = { ...doneRef.current }; let hit: Task | undefined
    for (const t of tasks) if (!d[t.id] && ok(t.id)) { d[t.id] = true; hit = t }
    if (!hit) return
    doneRef.current = d; setDone(d); try { localStorage.setItem(key, JSON.stringify(d)) } catch { /* 忽略 */ }
    if (tasks.every(t => d[t.id])) setFinale(true); else setBanner(hit.note)
  }
  const reset = () => { doneRef.current = {}; setDone({}); setFinale(false); setBanner(null); try { localStorage.removeItem(key) } catch { /* 忽略 */ } }
  return { done, banner, finale, setFinale, check, reset, current: tasks.find(t => !done[t.id]) }
}
