// 各课共用的一套流程：选一种条件 → 按按钮做一次 → 走到几个节点（相碰、过光电门、可以记录）→ 自动记一行、给任务打勾 → 放回原处。
import { useEffect, useRef, useState } from 'react'
import type { Task } from '@/components/lab/lab-shell'
import { useTasks } from '@/lab-kit'

/** key：存进度的键；first：一开始选哪一种；modeOf：任务对应哪一种条件（默认任务的 id 就是条件的名字）；again：做完不用放回，可以直接再做 */
export function useTrial<K extends string>(key: string, tasks: Task[], first: K, modeOf: (id: string) => K = id => id as K, again = false) {
  const [mode, setMode] = useState<K>(first)
  const [run, setRun] = useState(0), n = useRef(0)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)                 // 这一次已经走过几个节点
  const [rows, setRows] = useState<K[]>([])
  const T = useTasks(key, tasks)
  const go = () => { if (busy || (run !== 0 && !again)) return; setStage(0); setBusy(true); setRun(++n.current) }
  /** 走到第 i 个节点；last 是最后一个节点的序号，到了就算做完一次 */
  const mark = (i: number, last: number) => {
    setStage(i + 1)
    if (i < last) return
    setBusy(false); const next = rows.includes(mode) ? rows : [...rows, mode]; setRows(next); T.check(id => next.includes(modeOf(id)))
  }
  const home = () => { if (busy) return; setRun(0); setStage(0) }
  const pick = (k: K) => { if (busy) return; setMode(k); setRun(0); setStage(0) }
  const resetAll = () => { setMode(first); setRun(0); setBusy(false); setStage(0); setRows([]); T.reset() }
  const task = T.current, want = task ? modeOf(task.id) : null
  const next: 'mode' | 'go' | 'home' | null = !task || busy ? null : mode !== want ? 'mode' : run !== 0 && !again ? 'home' : 'go'
  return { T, mode, run, busy, stage, rows, go, mark, home, pick, resetAll, task, want, next, done: run !== 0 && !busy }
}

/** 空格键等于按主按钮 */
export function useSpace(fn: () => void) {
  const f = useRef(fn); f.current = fn
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.code !== 'Space' || (e.target as HTMLElement | null)?.closest?.('button, input, textarea')) return; e.preventDefault(); f.current() }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])
}
