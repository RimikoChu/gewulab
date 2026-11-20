// 水循环 · 各课共用的舞台：整个流域，和几处机位。同一处机位始终是同一个对象，换课时镜头才会飞过去而不是重复起飞。
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import type { Want } from './world'

export const VIEWS = {
  all: { target: new THREE.Vector3(0, 4.5, 0), span: [86, 27] as [number, number], view: [-0.14, 0.3] as [number, number] },
  city: { target: new THREE.Vector3(-12, 2.2, 0), span: [26, 11] as [number, number], view: [-0.3, 0.5] as [number, number] },
  dam: { target: new THREE.Vector3(8, 4.5, 0), span: [34, 13] as [number, number], view: [-0.28, 0.42] as [number, number] },
  plots: { target: new THREE.Vector3(-1.5, 2.6, 10.4), span: [15, 6.6] as [number, number], view: [-0.2, 0.3] as [number, number] },
  hill: { target: new THREE.Vector3(18, 7, 0), span: [36, 16] as [number, number], view: [-0.22, 0.32] as [number, number] },
}
const FOG: [number, number] = [260, 1200]

export default function Basin({ at = 'all', want = {}, labels, children = null }: { at?: keyof typeof VIEWS; want?: Want; labels: Label[]; children?: ReactNode }) {
  const v = VIEWS[at]
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} fog={FOG} world={want}>{children}</LabStage>
}
