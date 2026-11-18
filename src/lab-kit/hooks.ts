// 实验页常用的几个状态：匀速变化的数、吊车式的升降控制、任务进度。
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task } from '@/components/lab/lab-shell'

/** 一个数匀速变到目标值：转向、移动、水位升降这类“有过程的动作”都用它 */
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

// ---------- 升降控制 ----------
/** 朝目标位置匀速移动；点一下走一步，按住连续走；换东西之前先收回 */
const SPEED = 0.6            // 升降速度（m/s）

export function useCrane(max: number, speed = SPEED) {
  const [drop, setDrop] = useState(0)                  // 从起点往下放了多少米
  const [busy, setBusy] = useState(false)              // 正在收回，暂时不能操作
  const [touched, setTouched] = useState(false)        // 动过一次以后，不再显示“可以拖动”的提示
  const dropRef = useRef(0); dropRef.current = drop
  const maxRef = useRef(max); maxRef.current = max
  const busyRef = useRef(false)
  const goal = useRef(0), raf = useRef(0), then = useRef<(() => void) | null>(null)

  const tick = useCallback(() => {
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const d = goal.current - dropRef.current
      if (Math.abs(d) > 1e-4) {
        const n = Math.abs(d) <= speed * dt ? goal.current : dropRef.current + Math.sign(d) * speed * dt
        dropRef.current = n; setDrop(n); raf.current = requestAnimationFrame(frame); return
      }
      raf.current = 0
      if (then.current) { const f = then.current; then.current = null; busyRef.current = false; setBusy(false); f() }
    }
    if (!raf.current) raf.current = requestAnimationFrame(frame)
  }, [speed])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const moveTo = (d: number) => { if (busyRef.current) return; setTouched(true); goal.current = Math.round(Math.min(maxRef.current, Math.max(0, d)) * 1e4) / 1e4; tick() }
  return {
    drop, busy, touched,
    moving: Math.abs(goal.current - drop) > 1e-3,
    moveTo,
    stepBy: (d: number) => moveTo(Math.round((goal.current + d) * 10) / 10),
    hold: (dir: number) => moveTo(dir > 0 ? maxRef.current : 0),
    release: () => { goal.current = Math.round(dropRef.current * 20) / 20; tick() },
    /** 直接拖动：立刻到位 */
    dragTo: (d: number) => { if (busyRef.current) return; setTouched(true); goal.current = d; dropRef.current = d; setDrop(d) },
    /** 先收回到起点，到位后再做 f（比如换一个物体） */
    retract: (f: () => void) => { if (busyRef.current) return; if (dropRef.current < 1e-4) { f(); return } then.current = f; goal.current = 0; busyRef.current = true; setBusy(true); setTouched(true); tick() },
    reset: () => { cancelAnimationFrame(raf.current); raf.current = 0; then.current = null; goal.current = 0; dropRef.current = 0; setDrop(0); busyRef.current = false; setBusy(false); setTouched(false) },
  }
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
