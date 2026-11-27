// 减数分裂和遗传规律实验室的大场景：一间果蝇遗传学实验室。左边靠后墙一条果蝇实验台（培养瓶架、体视显微镜、麻醉板），
// 屋子中间两座放大的细胞模型台（左边看减数分裂，右边看精卵形成和受精），右边后墙上一块大白板（贴着磁性染色体模型），再往右一块挂墙的大屏。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。画面里 1 个单位 = 1 cm。
import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { LabStage, type Label } from '@/lab-kit'
import type { V3 } from './parts'
import { Room3D } from './room'
import { PAD } from './bench'

// ---------- 布局（cm） ----------
/** 后墙在 z = BACK_Z；地面 y = 0 */
export const BACK_Z = -220
/** 果蝇实验台：台面高 TOP；体视显微镜在 scope，麻醉板的中心在 pad（世界坐标） */
export const BENCH = { x0: -500, x1: -150, z0: BACK_Z, z1: BACK_Z + 80, top: 90, scope: [-320, -168] as [number, number] }
/** 两座细胞模型台：模型的中心高度 y、半径 R */
export const MODEL = { a: [70, 0, -70] as V3, b: [290, 0, -70] as V3, y: 138, R: 26 }
/** 白板（贴在后墙上）：中心 x、底边和顶边的高度、宽 */
export const BOARD = { x: 560, y0: 92, y1: 222, w: 260 }
/** 墙上的大屏 */
export const SCREEN = { x: 850, y0: 118, y1: 226, w: 190 }

const spot = (p: V3, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(...p), span: [w, h] as [number, number], view })
/** 各课的机位：每一处的远近和角度都不一样 */
export const SPOT = {
  pad: spot([PAD.p[0] + 1, PAD.p[1] - 0.5, PAD.p[2] + 1.5], 48, 24, [0.04, 0.86]),
  bench: spot([BENCH.scope[0] + 6, BENCH.top + 22, BENCH.scope[1] + 10], 86, 52, [0.32, 0.3]),
  modelA: spot([MODEL.a[0], MODEL.y + 5, MODEL.a[2]], 84, 56, [-0.2, 0.14]),
  modelA2: spot([MODEL.a[0], MODEL.y + 5, MODEL.a[2]], 104, 64, [0.24, 0.12]),
  modelB2: spot([MODEL.b[0] + 12, MODEL.y + 2, MODEL.b[2]], 100, 64, [0.3, 0.16]),
  modelB: spot([MODEL.b[0], MODEL.y, MODEL.b[2]], 120, 72, [-0.24, 0.18]),
  board: spot([BOARD.x, (BOARD.y0 + BOARD.y1) / 2, BACK_Z + 20], 262, 136, [-0.12, 0.06]),
  screen2: spot([SCREEN.x + 10, (SCREEN.y0 + SCREEN.y1) / 2 - 6, BACK_Z + 20], 190, 112, [0.22, 0.12]),
  screen: spot([SCREEN.x, (SCREEN.y0 + SCREEN.y1) / 2 - 4, BACK_Z + 20], 200, 118, [-0.16, 0.06]),
  room: spot([-150, 112, -150], 230, 118, [-1.2, 0.22]),
}
export type SpotKey = keyof typeof SPOT
export interface WorldWant { at?: SpotKey }

/** 每一课用它代替 LabStage：只要说在哪一处。target、span 可以临时换 */
export function Room({ at, labels, children = null, span, aim, view }: { at: SpotKey; labels: Label[]; children?: ReactNode; span?: [number, number]; aim?: V3; view?: [number, number] }) {
  const v = SPOT[at], w = span?.[0] ?? v.span[0], h = span?.[1] ?? v.span[1]
  const sp = useMemo<[number, number]>(() => [w, h], [w, h])
  const ax = aim?.[0], ay = aim?.[1], az = aim?.[2]
  const target = useMemo(() => (ax === undefined ? v.target : new THREE.Vector3(ax, ay, az)), [v, ax, ay, az])
  const va = (view ?? v.view)[0], vb = (view ?? v.view)[1]
  const vw = useMemo<[number, number]>(() => [va, vb], [va, vb])
  return <LabStage<WorldWant> world={{ at }} labels={labels} target={target} span={sp} view={vw} sky={false} studio backdrop="#0d1114" env={0.6} sun={2.2} fog={[900, 3200]} bloom={0.25}>{children}</LabStage>
}

export function World({ want }: { want?: WorldWant }) {
  return <Room3D at={want?.at} />
}
