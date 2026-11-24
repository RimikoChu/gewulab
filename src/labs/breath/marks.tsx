// 画面里的几样标记：静止时胸廓一圈的轮廓线（从上面看时对比用）。
import { useMemo } from 'react'
import * as THREE from 'three'
import { RIBS, ribPoint } from './anat'

/** 第 7 对肋骨静止时的一圈（虚线），从上面看时和收缩后的胸廓比大小 */
export function RestRing() {
  const g = useMemo(() => {
    const r = RIBS[6], pts: THREE.Vector3[] = []
    for (let i = 0; i <= 60; i++) { const t = i / 60, s = t < 0.5 ? 1 : -1, ph = 0.5 + (r.pe - 0.5) * (t < 0.5 ? t * 2 : (1 - t) * 2); pts.push(ribPoint(r, s, ph).setY(13.2)) }
    pts.push(pts[0].clone())
    const geo = new THREE.BufferGeometry().setFromPoints(pts); return geo
  }, [])
  const line = useMemo(() => { const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: '#ffe9a8', dashSize: 0.09, gapSize: 0.06, depthTest: false, transparent: true })); l.computeLineDistances(); l.renderOrder = 12; return l }, [g])
  return <primitive object={line} />
}
