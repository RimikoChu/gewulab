// 分段生成大模型：大山的地形、整片森林、地球仪上的气温和降水图一口气做完会让页面卡住。
// 这里把每样东西做成一个可以分段的任务，调度器每次只做十来毫秒就把主线程让出来；当前这一课要用的先做（prio 小的先做）。
import { useEffect, useState } from 'react'

type Job = { key: string; prio: number; gen: Generator<void, unknown>; done: (v: unknown) => void }
const queue: Job[] = []
const cache = new Map<string, unknown>()
const waiting = new Map<string, Promise<unknown>>()
let running = false
const SLICE = 12

function pump() {
  running = true
  const t0 = performance.now()
  while (queue.length && performance.now() - t0 < SLICE) {
    queue.sort((a, b) => a.prio - b.prio)
    const j = queue[0]
    let r = j.gen.next()
    while (!r.done && performance.now() - t0 < SLICE) r = j.gen.next()
    if (r.done) { queue.shift(); cache.set(j.key, r.value); j.done(r.value) }
  }
  if (queue.length) setTimeout(pump, 0); else running = false
}

export function request<T>(key: string, make: () => Generator<void, T>, prio: number): Promise<T> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) as T)
  const w = waiting.get(key)
  if (w) { const j = queue.find(q => q.key === key); if (j) j.prio = Math.min(j.prio, prio); return w as Promise<T> }
  const p = new Promise<T>(res => queue.push({ key, prio, gen: make(), done: v => res(v as T) }))
  waiting.set(key, p)
  if (!running) setTimeout(pump, 0)
  return p
}

/** 在组件里用：做好之前是 null。deps 变了（比如贴图载入了）才开始做 */
export function useJob<T>(key: string | null, make: () => Generator<void, T>, prio: number) {
  const [v, setV] = useState<T | null>(() => (key && (cache.get(key) as T)) || null)
  useEffect(() => { if (!key) return; let live = true; request(key, make, prio).then(x => { if (live) setV(x) }); return () => { live = false } }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return v
}

/** 进页面时在哪一课：那一课要用的排在前面 */
const FIRST: Record<string, string[]> = {
  '1': ['terrain'], '2': ['terrain'], '3': ['globe', 'terrain'], '4': ['terrain'], '5': ['terrain', 'globe'], '6': ['terrain'], '7': ['globe'], x: ['terrain'], q: ['globe'],
}
export function prioOf(group: 'terrain' | 'forest' | 'globe') {
  const k = location.hash.slice(1) || '1'
  const i = (FIRST[k] ?? ['terrain']).indexOf(group)
  return i >= 0 ? i : 10 + ['terrain', 'globe', 'forest'].indexOf(group)
}
