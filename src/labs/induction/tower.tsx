// 110 kV 角钢铁塔（“上”字形单回路）：四根主材从底下的宽脚往上收，每一段用 K 形斜材和横材连成桁架；
// 下横担两边各挂一相，上横担一边挂一相，塔顶两根地线支架。每相一串悬式玻璃绝缘子（8 片），下面是线夹。
// 还有出线构架（门形钢管架）和导线的悬链线。单位 m，铁塔原点在塔基中心，横担沿 z。
import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { lathe, type RY } from '@/lab-kit'
import type { V3 } from './physics'

/** 塔高、横担高度、各相挂点（相对塔基）：[z 偏移, 横担高度] */
export const TW = { h: 30, low: 22, up: 26.5, arm: [4.2, 3.6] as const, string: 1.5 }
/** 三相导线在铁塔上的挂点（绝缘子串下端，相对塔基） */
export const PHASES: V3[] = [[0, TW.low - TW.string, -TW.arm[0]], [0, TW.low - TW.string, TW.arm[0]], [0, TW.up - TW.string, TW.arm[1]]]
/** 两根地线的挂点 */
export const EARTH: V3[] = [[0, TW.h, -1.6], [0, TW.h, 1.6]]

/** 一根角钢：两点之间一根细长方条，粗 w */
function member(a: V3, b: V3, w: number) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length()
  const g = new THREE.BoxGeometry(w, len, w)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()))
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  return g
}

/** 铁塔桁架的几何（只算一次，各基塔共用） */
let TOWER: THREE.BufferGeometry | null = null
export function towerGeo() {
  if (TOWER) return TOWER
  const gs: THREE.BufferGeometry[] = []
  const half = (y: number) => y < TW.low - 2 ? 3.4 - (3.4 - 0.9) * Math.pow(y / (TW.low - 2), 0.8) : 0.9 - 0.25 * (y - TW.low + 2) / (TW.h - TW.low + 2)
  const levels = [0, 2.6, 5.4, 8.4, 11.4, 14.2, 16.8, 19.2, TW.low - 1, TW.low, TW.low + 2.2, TW.up, TW.up + 1.6, TW.h - 0.6]
  const corner = (y: number, sx: number, sz: number): V3 => [sx * half(y), y, sz * half(y)]
  const C: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]]
  for (let i = 0; i < levels.length - 1; i++) {
    const y0 = levels[i], y1 = levels[i + 1], w = 0.12 - 0.05 * (y0 / TW.h)
    C.forEach(([sx, sz], k) => {
      gs.push(member(corner(y0, sx, sz), corner(y1, sx, sz), w))   // 主材
      const [tx, tz] = C[(k + 1) % 4]
      gs.push(member(corner(y1, sx, sz), corner(y1, tx, tz), 0.06))   // 横材
      // K 形斜材：两根从下角交到上边中点
      const mid: V3 = [(corner(y1, sx, sz)[0] + corner(y1, tx, tz)[0]) / 2, y1, (corner(y1, sx, sz)[2] + corner(y1, tx, tz)[2]) / 2]
      gs.push(member(corner(y0, sx, sz), mid, 0.05), member(corner(y0, tx, tz), mid, 0.05))
    })
  }
  // 横担：从塔身两侧伸出的三角形桁架（沿 z）
  const arm = (y: number, len: number, side: 1 | -1) => {
    const h = half(y), tip: V3 = [0, y, side * len]
    for (const sx of [1, -1]) { gs.push(member([sx * h, y, side * h], tip, 0.08), member([sx * h, y - 1.4, side * h], tip, 0.07)); gs.push(member([sx * h, y - 1.4, side * h], [sx * h * 0.5, y, side * (h + len) / 2], 0.05)) }
    gs.push(member([h, y, side * (h + len) / 2], [-h, y, side * (h + len) / 2], 0.05))
  }
  arm(TW.low, TW.arm[0] + 0.2, -1); arm(TW.low, TW.arm[0] + 0.2, 1); arm(TW.up, TW.arm[1] + 0.2, 1)
  // 塔顶的地线支架
  for (const s of [-1, 1]) { gs.push(member([0.5, TW.h - 0.6, 0], [0, TW.h, s * 1.6], 0.07), member([-0.5, TW.h - 0.6, 0], [0, TW.h, s * 1.6], 0.07)) }
  return (TOWER = mergeGeometries(gs))
}

/** 一串悬式玻璃绝缘子：8 片碟形玻璃，上面挂在横担，下面吊着线夹；原点在上端挂点 */
let STRING: THREE.BufferGeometry | null = null
export function insulatorGeo() {
  if (STRING) return STRING
  const p: RY[] = [[0, 0]]
  const n = 8, step = (TW.string - 0.2) / n
  for (let i = 0; i < n; i++) { const y = -0.1 - i * step; p.push([0.03, y], [0.13, y - step * 0.35], [0.14, y - step * 0.45], [0.05, y - step * 0.55], [0.03, y - step]) }
  p.push([0.02, -TW.string + 0.05], [0.05, -TW.string], [0, -TW.string])
  return (STRING = lathe(p, { segs: 20, crease: 60 }))
}

/** 两个挂点之间的悬链线（弧垂 sag，m）：返回途经的点 */
export function span(a: V3, b: V3, sag: number, n = 24): V3[] {
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - 4 * sag * u * (1 - u), a[2] + (b[2] - a[2]) * u] as V3 })
}
