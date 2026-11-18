// 吊车的升降控制，各课共用：朝目标位置匀速移动；点一下走一步，按住连续走；换东西之前先收回。
import { useCallback, useEffect, useRef, useState } from 'react'

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
