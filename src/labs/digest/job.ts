// 分段生成大模型：距离场变网格很费时，一口气做完页面会卡好几秒。这里把每个模型做成可以分段的任务，
// 调度器每次只做十来毫秒就把主线程让出来；当前这一课要用的先做（prio 小的先做）。
import { useEffect, useState } from 'react'

type Job = { key: string; prio: number; gen: Generator<void, unknown>; done: (v: unknown) => void }
const queue: Job[] = []
const cache = new Map<string, unknown>()
const waiting = new Map<string, Promise<unknown>>()
let running = false
/** 每次最多连续做多少毫秒 */
const SLICE = 10

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

/** 要一个模型：做好了直接给，没做好的排进队里 */
export function request<T>(key: string, make: () => Generator<void, T>, prio: number): Promise<T> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) as T)
  const w = waiting.get(key)
  if (w) { const j = queue.find(q => q.key === key); if (j) j.prio = Math.min(j.prio, prio); return w as Promise<T> }
  const p = new Promise<T>(res => queue.push({ key, prio, gen: make(), done: v => res(v as T) }))
  waiting.set(key, p)
  if (!running) setTimeout(pump, 0)
  return p
}

/** 在组件里用：模型做好之前是 null */
export function useJob<T>(key: string, make: () => Generator<void, T>, prio: number) {
  const [v, setV] = useState<T | null>(() => (cache.get(key) as T | undefined) ?? null)
  useEffect(() => { let live = true; if (v === null) request(key, make, prio).then(x => { if (live) setV(x) }); return () => { live = false } }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return v
}

/** 进页面时的课号决定先做哪一组：这一课要用的排在前面 */
const FIRST: Record<string, string[]> = {
  '1': ['bench'], '2': ['body'], '3': ['bench'], '4': ['stomach'], '5': ['body'], '6': ['gut', 'body'], '7': ['body'], 'x': ['body'], 'q': ['body'],
}
export type Group = 'body' | 'stomach' | 'gut' | 'bench'
export function prioOf(group: Group) {
  const k = location.hash.slice(1) || '1'
  const first = FIRST[k] ?? ['body']
  const i = first.indexOf(group)
  return i >= 0 ? i : 10 + ['body', 'stomach', 'gut', 'bench'].indexOf(group)
}
