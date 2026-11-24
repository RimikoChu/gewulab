// 各课共用的小东西：这一课的舞台（选一处机位、交给世界的要求）、按时长走完的动作、缓动。
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LabStage, type Label } from '@/lab-kit'
import { SPOT, type SpotKey, type Want } from './world'
import type { ChestLook } from './chest'

/** 这一课的舞台：展厅里自己打光，深色背景，一点泛光 */
export function Place({ at, labels, want, children = null }: { at: SpotKey; labels: Label[]; want?: Want; children?: ReactNode }) {
  const v = SPOT[at]
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} studio env={0.75} sun={2.0} sky={false} backdrop="#0a0f14" fog={[70, 260]} bloom={0.3} world={want}>{children}</LabStage>
}

/** 一个按时长走完的动作：run() 开始，k 从 from 匀速走到 to（按时间算），走完调用 onEnd。snap 直接跳到某处 */
export function useRun(sec: number, onEnd?: () => void) {
  const [k, setK] = useState(0), [busy, setBusy] = useState(false)
  const s = useRef({ k: 0, raf: 0 }), cb = useRef(onEnd); cb.current = onEnd
  const run = (to = 1, from?: number) => {
    cancelAnimationFrame(s.current.raf); if (from !== undefined) s.current.k = from
    const start = s.current.k, dir = Math.sign(to - start) || 1
    setBusy(true)
    let last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      s.current.k = dir > 0 ? Math.min(to, s.current.k + dt / sec) : Math.max(to, s.current.k - dt / sec); setK(s.current.k)
      if (s.current.k !== to) s.current.raf = requestAnimationFrame(f); else { setBusy(false); cb.current?.() }
    }
    s.current.raf = requestAnimationFrame(f)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  return { k, busy, run, snap: (v: number) => { cancelAnimationFrame(s.current.raf); s.current.k = v; setK(v); setBusy(false) } }
}

/** 缓入缓出 */
export const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x) }

/** 胸腔模型的几种常用显示 */
export const LOOK: ChestLook = { skin: 1, bones: 1, inter: 1, dia: 1, lungs: 0.92, tree: 0, hl: null }
