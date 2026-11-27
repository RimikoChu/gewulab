// 分段生成模型：动物的距离场变网格很费时，一口气做完页面会卡住。这里把每个模型做成一个可以分段的任务，
// 调度器每次只做十来毫秒就把主线程让出来，几帧之后模型就出来了。当前这一课要用的先做（prio 小的先做）。
import { useEffect, useState } from 'react'

type Job = { key: string; prio: number; gen: Generator<void, unknown>; done: (v: unknown) => void }
const queue: Job[] = []
const cache = new Map<string, unknown>()
const waiting = new Map<string, Promise<unknown>>()
let running = false
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
export function useJob<T>(key: string, make: () => Generator<void, T>, prio = 5) {
  const [v, setV] = useState<T | null>(() => (cache.get(key) as T | undefined) ?? null)
  useEffect(() => { let live = true; if (v === null) request(key, make, prio).then(x => { if (live) setV(x) }); return () => { live = false } }, [key])   // eslint-disable-line react-hooks/exhaustive-deps
  return v
}

/** 一次做完、但要排队的活：大场景里的地形、树林、灌丛这些，各自单独成一个任务，不挤在同一帧里 */
export function useLazy<T>(key: string, make: () => T, prio = 8) {
  return useJob(key, function* () { yield; const t0 = performance.now(); const v = make(); if (import.meta.env.DEV && performance.now() - t0 > 60) console.debug(`[population] ${key} ${Math.round(performance.now() - t0)}ms`); return v }, prio)
}
