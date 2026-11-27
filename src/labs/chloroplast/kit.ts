// 光反应和暗反应 · 各课共用的小工具：向量类型、插值、噪声、一个“朝目标值匀速走”的引用值（三维画面每帧读它，不让整课重新渲染）。
import { useEffect, useRef, useState } from 'react'

export type V3 = [number, number, number]
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** 平滑的 0→1 */
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }
/** 先慢后快再慢 */
export const ease = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
export const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
export const mix = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

/** 可重复的伪随机数 */
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

// 三维值噪声：给分子表面一点起伏
const hash = (x: number, y: number, z: number) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const fade = (t: number) => t * t * (3 - 2 * t)
export function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = fade(x - xi), v = fade(y - yi), w = fade(z - zi)
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz)
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v), lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1
}
export const fbm = (x: number, y: number, z: number, oct = 3) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); a *= 0.5; f *= 2.03 } return s }

/**
 * 一个朝目标值匀速走的数：ref.current 每帧更新（三维画面在 useFrame 里读），at 是它停下时的值（界面用它判断“到了没有”）。
 * speed：每秒走多少。jump 为 true 时直接跳到目标（重做本课时用）
 */
export function useTween(to: number, speed: number, jump = false) {
  const ref = useRef(to)
  const [at, setAt] = useState(to)
  useEffect(() => {
    if (jump) { ref.current = to; setAt(to); return }
    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const d = to - ref.current
      ref.current = Math.abs(d) <= speed * dt ? to : ref.current + Math.sign(d) * speed * dt
      if (ref.current !== to) raf = requestAnimationFrame(frame); else setAt(to)
    }
    if (ref.current !== to) raf = requestAnimationFrame(frame); else setAt(to)
    return () => cancelAnimationFrame(raf)
  }, [to, speed, jump])
  return { ref, at, done: at === to }
}

// ---------- 分段生成：一次只做一样，免得进页面卡住 ----------
const made = new Map<string, unknown>(), queue: { key: string; make: () => unknown; done: Set<() => void> }[] = []
let pumping = false
function pump() {
  const t0 = performance.now()
  while (queue.length && performance.now() - t0 < 12) { const j = queue.shift()!; made.set(j.key, j.make()); j.done.forEach(f => f()) }
  if (queue.length) setTimeout(pump, 16); else pumping = false
}
/** 大的网格排队生成：还没做好时返回 null，做好了通知用到它的组件重画 */
export function useLazy<T>(key: string, make: () => T): T | null {
  const [, bump] = useState(0)
  useEffect(() => {
    if (made.has(key)) return
    const f = () => bump(n => n + 1)
    let j = queue.find(q => q.key === key); if (!j) { j = { key, make, done: new Set() }; queue.push(j) }
    j.done.add(f)
    if (!pumping) { pumping = true; setTimeout(pump, 30) }
    return () => { j!.done.delete(f) }
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return (made.get(key) as T) ?? null
}

/** cond 连续成立满 ms 毫秒以后变成 true；cond 一不成立、或者 key 变了，就回到 false 重新计时（等一个动作做完再打勾时用） */
export function useAfter(cond: boolean, ms: number, key: string | number = 0) {
  const [ok, setOk] = useState<string | number | null>(null)
  useEffect(() => { setOk(null); if (!cond) return; const t = setTimeout(() => setOk(key), ms); return () => clearTimeout(t) }, [cond, ms, key])
  return cond && ok === key
}
/** 每隔 ms 毫秒加一，从 0 数到 max；run 为 false 时归零 */
export function useCount(run: boolean, ms: number, max: number) {
  const [n, setN] = useState(0)
  useEffect(() => { if (!run) { setN(0); return } const t = setInterval(() => setN(k => Math.min(max, k + 1)), ms); return () => clearInterval(t) }, [run, ms, max])
  return run ? n : 0
}
