// 分段生成：沙盘的地形网格、城镇、小镇的山坡和树都很费时，一口气做完进页面会卡住。
// 每样东西写成一个能分段的生成器，调度器每次只做约 8 毫秒就把主线程让出来；prio 小的先做。
import { useEffect, useState } from 'react'

type Job = { key: string; prio: number; gen: Generator<void, unknown>; done: (v: unknown) => void }
const queue: Job[] = []
const made = new Map<string, unknown>()
const pending = new Map<string, Promise<unknown>>()
let busy = false
const SLICE = 8

function pump() {
  busy = true
  const t0 = performance.now()
  while (queue.length && performance.now() - t0 < SLICE) {
    queue.sort((a, b) => a.prio - b.prio)
    const j = queue[0]
    let r = j.gen.next()
    while (!r.done && performance.now() - t0 < SLICE) r = j.gen.next()
    if (r.done) { queue.shift(); made.set(j.key, r.value); j.done(r.value) }
  }
  if (queue.length) setTimeout(pump, 0); else busy = false
}

export function request<T>(key: string, make: () => Generator<void, T>, prio: number): Promise<T> {
  if (made.has(key)) return Promise.resolve(made.get(key) as T)
  const w = pending.get(key)
  if (w) { const j = queue.find(q => q.key === key); if (j) j.prio = Math.min(j.prio, prio); return w as Promise<T> }
  const p = new Promise<T>(res => queue.push({ key, prio, gen: make(), done: v => res(v as T) }))
  pending.set(key, p)
  if (!busy) setTimeout(pump, 0)
  return p
}

/** 在组件里用：做好之前是 null */
export function useJob<T>(key: string, make: () => Generator<void, T>, prio: number) {
  const [v, setV] = useState<T | null>(() => (made.get(key) as T | undefined) ?? null)
  useEffect(() => { let live = true; if (v === null) request(key, make, prio).then(x => { if (live) setV(x) }); return () => { live = false } }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return v
}
