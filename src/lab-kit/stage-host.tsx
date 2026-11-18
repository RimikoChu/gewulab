// 常驻舞台：一个实验室只有一块画布，换课时不重建，镜头在同一个大场景里飞到另一处。
// 实验室最外层放一个 <StageHost world={…} />；每一课写 <LabStage …>这一课的器材</LabStage>，把器材、标签、机位交给常驻的画布去画。
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { Stage, type Label } from './scene'

export interface Feed<W = Record<string, unknown>> {
  labels: Label[]; target: THREE.Vector3; span: [number, number]; view?: [number, number]; fog?: [number, number]; sun?: number; sky?: boolean; backdrop?: string
  /** 这一课对整个世界的要求（比如水位），原样交给 StageHost 的 world */
  world?: W
  children: ReactNode
}
const store = { feed: null as Feed<never> | null, host: null as HTMLDivElement | null, subs: new Set<() => void>() }

/** 每一课用它代替 DockStage */
export function LabStage<W>(props: Feed<W>) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { store.feed = props as Feed<never>; store.subs.forEach(f => f()) })
  useLayoutEffect(() => { if (store.host && ref.current) ref.current.appendChild(store.host) }, [])
  return <div ref={ref} className="size-full" />
}

/** 放在实验室最外层，只渲染一次。world：整个大场景（不随课次重建），参数是当前这一课交上来的 world */
export function StageHost<W>({ world }: { world: (want: W | undefined) => ReactNode }) {
  const [host] = useState(() => { const d = document.createElement('div'); d.className = 'size-full'; return d })
  store.host = host
  const [, bump] = useReducer((x: number) => x + 1, 0)
  useEffect(() => { store.subs.add(bump); bump(); return () => { store.subs.delete(bump) } }, [])   // 订阅之前课次可能已经交过一次内容，补画一次
  const f = store.feed
  return createPortal(f ? <Stage labels={f.labels} target={f.target} span={f.span} view={f.view} fog={f.fog} sun={f.sun} sky={f.sky} backdrop={f.backdrop}>{world(f.world as W | undefined)}{f.children}</Stage> : null, host)
}
