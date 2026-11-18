// 压强实验室的常驻舞台：整座水电站只有一块画布，换课时不重建，镜头在同一个场景里飞到另一处。
// 每一课照常写 <LabStage …>器材</LabStage>；它把这一课的器材、标签、机位交给常驻的画布去画。
import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { DockStage, type Label } from '../float/dock'

export interface Feed {
  labels: Label[]; target: THREE.Vector3; span: [number, number]; view?: [number, number]; fog?: [number, number]
  /** 这一课对整座水电站的要求：水库水位（m）、是不是只留坝前一小段水 */
  level?: number; narrow?: boolean
  children: ReactNode
}
const store = { feed: null as Feed | null, host: null as HTMLDivElement | null, subs: new Set<() => void>() }

/** 每一课用它代替 DockStage */
export function LabStage(props: Feed) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { store.feed = props; store.subs.forEach(f => f()) })
  useLayoutEffect(() => { if (store.host && ref.current) ref.current.appendChild(store.host) }, [])
  return <div ref={ref} className="size-full" />
}

/** 放在实验室最外层，只渲染一次。world：整座水电站（不随课次重建） */
export function StageHost({ world }: { world: (feed: Feed) => ReactNode }) {
  const [host] = useState(() => { const d = document.createElement('div'); d.className = 'size-full'; return d })
  store.host = host
  const [, bump] = useReducer((x: number) => x + 1, 0)
  useEffect(() => { store.subs.add(bump); bump(); return () => { store.subs.delete(bump) } }, [])   // 订阅之前课次可能已经交过一次内容，补画一次
  const f = store.feed
  return createPortal(f ? <DockStage labels={f.labels} target={f.target} span={f.span} view={f.view} fog={f.fog} indoor sky>{world(f)}{f.children}</DockStage> : null, host)
}
