// 功和机械能实验室的大场景：一座游乐园。一条东西向的大道，北侧从西到东依次是游艺区（落锤架、弹射器）、货场（叉车）、
// 升降机、过山车（站台在西头，回程在北侧）、海盗船、科学小站（实验桌）；过山车西北是蹦极塔，北面远处是摩天轮，四周是树和远山。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 1 m，+x 朝东，+z 朝南。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LabStage, Painted, mergeParts, useConcrete, type Label, type Part } from '@/lab-kit'
import { HammerRig, Launcher, Maxwell, RampSet, REST_Y, STAKE_TOP, Table, Weight, WoodBlock, BLOCK_X0, WHEEL_LOW } from './bench'
import { CoasterTrack, Train, getTrack, stationParts } from './coaster'
import { beam, box, cyl, fuse, makeBlotch, makeGrass, makePaving, makeSign, rep, rng, tint, type V3 } from './mats'
import { WHEEL } from './physics'
import { BungeeTower, FerrisWheel, PirateShip, Tent } from './rides'
import { Trees, hedge } from './trees'
import { Crate, Forklift, Hoist, VendorCart } from './yard'

/** 各处器材的位置 */
export const P = {
  yard: [-80, 0, -2] as V3, cart: [-50, 0, 8.5] as V3, hoist: [-29.5, 0, -1.5] as V3, table: [172, 0.82, -2] as V3, table2: [176.2, 0.82, -2] as V3,
  hammer: [-122, 0, -3] as V3, launcher: [-111, 0, -3] as V3, ship: [150, 0, -16] as V3, tower: [-50, 0, -52] as V3, wheel: [45, 0, -84] as V3,
}
/** 货场里那堵墙朝西的一面在哪（相对货场原点） */
export const WALL_X = 3.6
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
/** 各课的机位：看向哪、要装进画面的宽和高、方位角和仰角；wide：用大范围的阳光阴影；lamp：实验桌上方的射灯照哪 */
export const SPOT = {
  yard: { target: v(-79.85, 1.5, -2), span: [8.7, 4.2], view: [-0.46, 0.17], wide: false, lamp: null },
  cart: { target: v(-50.3, 1.1, 8.5), span: [3.9, 3.0], view: [-0.5, 0.34], wide: false, lamp: null },
  hoist: { target: v(-29.3, 1.45, -0.4), span: [7.4, 4.3], view: [-0.5, 0.16], wide: false, lamp: null },
  ramp: { target: v(172.02, 0.95, -1.8), span: [0.98, 0.42], view: [-0.3, 0.22], wide: false, lamp: [172, 0.82, -1.8] as V3 },
  hammer: { target: v(-122, 1.5, -3), span: [3.0, 3.1], view: [-0.48, 0.2], wide: false, lamp: null },
  launcher: { target: v(-111, 1.72, -3), span: [2.0, 3.3], view: [-0.48, 0.22], wide: false, lamp: null },
  lift: { target: v(17, 6.6, -14), span: [38, 14], view: [-0.3, 0.24], wide: true, lamp: null },
  top: { target: v(53, 20.5, -14), span: [30, 13], view: [-0.3, 0.22], wide: true, lamp: null },
  valley: { target: v(80, 3.2, -14), span: [30, 13], view: [-0.26, 0.22], wide: true, lamp: null },
  hill: { target: v(100, 13.6, -14), span: [30, 13], view: [-0.26, 0.22], wide: true, lamp: null },
  drop: { target: v(81, 9, -14), span: [56, 23], view: [-0.24, 0.26], wide: true, lamp: null },
  ship: { target: v(150, 7.4, -16), span: [25, 16.5], view: [-0.42, 0.22], wide: true, lamp: null },
  bungee: { target: v(-41.6, 29.6, -52), span: [13, 10], view: [-0.3, 0.14], wide: true, lamp: null },
  taut: { target: v(-41.6, 18.8, -52), span: [13, 10], view: [-0.3, 0.14], wide: true, lamp: null },
  low: { target: v(-41.6, 4.4, -52), span: [13, 10], view: [-0.3, 0.16], wide: true, lamp: null },
  maxwell: { target: v(176.2, 1.17, -2), span: [0.8, 0.82], view: [-0.38, 0.3], wide: false, lamp: [176.2, 0.82, -2] as V3 },
  over: { target: v(48, 10, -34), span: [118, 40], view: [-0.5, 0.3], wide: true, lamp: null },
} as const
export type SpotKey = keyof typeof SPOT
/** 哪些器材由这一课自己画（世界里就不再摆闲置的那一份） */
export type Rig = 'forklift' | 'cart' | 'hoist' | 'ramp' | 'hammer' | 'launcher' | 'train' | 'ship' | 'maxwell'
export interface Want { cur: Rig[]; wide: [number, number] | null; lamp: V3 | null }

/** 这一课的舞台：选一处机位；cur 是这一课自己画的器材 */
export function Place({ at, cur, labels, children = null }: { at: SpotKey; cur: Rig[]; labels: Label[]; children?: ReactNode }) {
  const s = SPOT[at], key = cur.join()
  const want = useMemo<Want>(() => ({ cur, wide: s.wide ? [s.target.x, s.target.z] : null, lamp: s.lamp as V3 | null }), [s, key])   // eslint-disable-line react-hooks/exhaustive-deps
  return <LabStage<Want> labels={labels} target={s.target} span={s.span as unknown as [number, number]} view={s.view as unknown as [number, number]} sun={s.wide ? 0 : s.lamp ? 0.9 : 3.2} env={s.lamp ? 0.7 : 1.05} fog={[220, 1100]} world={want}>{children}</LabStage>
}

/** 镜头跟着主体挪：在这一课默认机位的基础上，把镜头和它看向的点一起平移 (dx, dy)。主体走远、升高时用，挪动有缓冲 */
export function Follow({ dx = 0, dy = 0 }: { dx?: number; dy?: number }) {
  const camera = useThree(s => s.camera), controls = useThree(s => s.controls) as { target: THREE.Vector3 } | null
  const cur = useRef({ x: 0, y: 0 })
  useFrame((_, d) => {
    const k = 1 - Math.exp(-Math.min(d, 1 / 30) / 0.3), c = cur.current, mx = (dx - c.x) * k, my = (dy - c.y) * k
    if (Math.abs(mx) < 1e-5 && Math.abs(my) < 1e-5) return
    c.x += mx; c.y += my; camera.position.x += mx; camera.position.y += my
    if (controls) { controls.target.x += mx; controls.target.y += my }
  })
  return null
}

// ---------- 远景 ----------
const ZONES: [number, number, number, number][] = [[-22, 127, -42, -6], [133, 167, -30, -2], [-66, -24, -68, -18], [20, 70, -96, -70], [-97, -62, -22, 16], [-132, -104, -16, 16], [-40, -18, -12, 16], [162, 184, -9, 16], [-220, 260, 1, 17]]
function treeList() {
  const r = rng(77), out: [number, number, number][] = []
  const free = (x: number, z: number) => !ZONES.some(([a, b, c, d]) => x > a && x < b && z > c && z < d)
  for (let i = 0; i < 520 && out.length < 190; i++) { const x = -210 + r() * 470, z = -150 + r() * 146, h = 7 + r() * 5; if (free(x, z) && (z < -44 || r() < 0.4)) out.push([x, z, h]) }
  return out
}
/** 远山：几道起伏平缓的山脊，近的深、远的淡 */
function makeHills() {
  const gs: THREE.BufferGeometry[] = []
  const ridge = (from: [number, number], to: [number, number], H: number, depth: [number, number], ph: number, low: string, high: string) => {
    const N = 90, pos: number[] = [], col: number[] = [], idx: number[] = [], c0 = new THREE.Color(low), c1 = new THREE.Color(high)
    for (let i = 0; i <= N; i++) {
      const k = i / N, x = from[0] + (to[0] - from[0]) * k, z = from[1] + (to[1] - from[1]) * k
      const h = H * Math.max(0.2, 0.5 + 0.28 * Math.sin(i * 0.11 + ph) + 0.14 * Math.sin(i * 0.29 + ph * 2.3) + 0.08 * Math.sin(i * 0.67 + ph * 5.1))
      pos.push(x + depth[0], -4, z + depth[1], x, h, z, x - depth[0] * 0.5, -4, z - depth[1] * 0.5); col.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c0.r, c0.g, c0.b)
      if (i < N) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = a + 3; idx.push(a, b, a + 1, a + 1, b, b + 1) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); gs.push(g.toNonIndexed())
  }
  ridge([-520, -420], [760, -420], 70, [0, 150], 0.4, '#5d7a5a', '#7f9a78')
  ridge([-600, -600], [860, -600], 130, [0, 170], 2.1, '#7f97a0', '#a9bcc4')
  ridge([640, -560], [640, 300], 80, [-150, 0], 1.3, '#6b8672', '#8fa890')
  ridge([-560, -520], [-560, 300], 80, [150, 0], 3.3, '#6b8672', '#8fa890')
  return fuse(gs)
}

/** 大道北沿的路灯和灯杆之间的彩旗 */
const LAMPS = [-146, -104, -64, -12, 8, 28, 48, 68, 88, 108, 128, 190]
function streetParts() {
  const P: Part[] = [], lamp: Part[] = [], flags: THREE.BufferGeometry[] = [], cols = ['#c8372d', '#e8c04a', '#2f6f9f', '#3d8d6a', '#f4efe2']
  for (const x of LAMPS) {
    P.push(cyl(x, 0, 2.4, 0.07, 5.2, '#2f3a40'), cyl(x, 0, 2.4, 0.16, 0.5, '#2f3a40'), box(x, 5.1, 2.9, 0.08, 0.08, 1.1, '#2f3a40'))
    lamp.push(cyl(x, 4.78, 3.4, 0.22, 0.3, '#fff3d6'))
    P.push(cyl(x, 5.08, 3.4, 0.3, 0.06, '#2f3a40'))
  }
  for (let i = 0; i < LAMPS.length - 1; i++) {
    const a = LAMPS[i], b = LAMPS[i + 1]; if (b - a > 22) continue
    for (let k = 0; k < 24; k++) {
      const u = (k + 0.5) / 24, x = a + (b - a) * u, y = 4.9 - 1.1 * 4 * u * (1 - u)
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([x - 0.28, y, 2.4, x + 0.28, y, 2.4, x, y - 0.62, 2.4], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
      flags.push(tint(g, cols[(k + i) % cols.length]))
    }
  }
  // 大道两边的长椅和垃圾桶
  for (const x of [-136, -96, -20, 20, 60, 100, 140]) {
    P.push(box(x, 0.42, 15.9, 1.7, 0.06, 0.46, '#8a5a34'), box(x, 0.48, 16.14, 1.7, 0.5, 0.05, '#8a5a34'))
    for (const s of [-0.7, 0.7]) P.push(box(x + s, 0, 15.9, 0.06, 0.42, 0.44, '#2f3a40'))
    P.push(cyl(x + 1.6, 0, 15.9, 0.24, 0.8, '#3d6a4c'))
  }
  return { P: mergeParts(P), lamp: mergeParts(lamp), flags: fuse(flags) }
}

/** 货场后面的仓库、墙；游艺区的招牌；升降机后面的检修平台；科学小站 */
function buildings() {
  const B: Part[] = [], S: Part[] = []
  // 仓库：压型钢板的墙（一道道竖棱）、缓坡屋顶、卷帘门
  const [yx, , yz] = P.yard, wz = yz - 11
  B.push(box(yx, 0, wz, 24, 6.4, 8, '#aeb7bd'), box(yx, 6.4, wz, 24.8, 0.3, 8.8, '#5c6a74'), box(yx, 0, wz + 4.01, 24, 0.6, 0.04, '#7b858c'))
  for (let x = -11.8; x <= 11.81; x += 0.4) B.push(box(yx + x, 0.6, wz + 4.03, 0.07, 5.8, 0.05, '#9ba5ab'))
  B.push(box(yx - 5, 0, wz + 4.06, 5.4, 4.6, 0.08, '#d8dcde'), box(yx - 5, 4.6, wz + 4.1, 5.8, 0.3, 0.2, '#5c6a74'))
  for (let y = 0.25; y < 4.6; y += 0.25) B.push(box(yx - 5, y, wz + 4.11, 5.3, 0.03, 0.02, '#b3babf'))
  B.push(box(yx + 7, 0, wz + 4.06, 1.1, 2.2, 0.06, '#33526b'))
  // 墙：一段现浇的混凝土挡墙，带两道扶壁
  B.push(box(yx + WALL_X + 1.2, 0, yz - 1.5, 1.0, 1.6, 0.4, '#b0ada3'), box(yx + WALL_X + 1.2, 0, yz + 1.5, 1.0, 1.6, 0.4, '#b0ada3'), box(yx + WALL_X + 0.4, 2.6, yz, 0.9, 0.08, 4.5, '#9d9a91'))
  // 墙面上的模板缝和对拉螺栓孔
  for (const y of [0.87, 1.74]) B.push(box(yx + WALL_X - 0.004, y, yz, 0.01, 0.015, 4.4, '#8f8c83'))
  for (const z of [-1.1, 1.1]) B.push(box(yx + WALL_X - 0.004, 0, yz + z, 0.01, 2.6, 0.015, '#8f8c83'))
  for (const y of [0.45, 1.3, 2.17]) for (const z of [-1.65, -0.55, 0.55, 1.65]) B.push({ p: [yx + WALL_X - 0.002, y, yz + z], s: [0.035, 0.02, 0], c: '#77746c', cyl: true, r: [0, 0, Math.PI / 2] })
  // 地上的行车线：两条黄线，每米一道短横线
  for (const z of [-0.95, 0.95]) B.push(box(yx - 0.9, 0.012, yz + z, 9, 0.012, 0.09, '#e2b534'))
  for (let x = -5; x <= 3; x++) B.push(box(yx + x - 0.2, 0.012, yz + 0.95 + 0.2, 0.06, 0.012, 0.4, '#e2b534'))
  for (const [cx, cz] of [[-4.6, 2.6], [-1.2, 2.9], [2.4, 2.7]]) { B.push(box(yx + cx, 0, yz + cz, 0.36, 0.03, 0.36, '#23272c')); for (let i = 0; i < 6; i++) B.push(cyl(yx + cx, 0.03 + i * 0.1, yz + cz, 0.14 - i * 0.02, 0.1, i === 2 || i === 4 ? '#f4efe2' : '#e2702a')) }
  // 货场边上的一摞托盘、两只油桶、锥桶
  for (let i = 0; i < 6; i++) B.push(box(yx - 6.6, i * 0.15, yz - 4.6, 1.1, 0.12, 1.1, i % 2 ? '#b08a58' : '#a67c48'))
  B.push(cyl(yx + 2.6, 0, yz - 5.2, 0.29, 0.88, '#2f6f9f'), cyl(yx + 3.3, 0, yz - 5.0, 0.29, 0.88, '#c8372d'))
  // 升降机后面的检修平台：钢架、平台板、栏杆、爬梯
  const [hx, , hz] = P.hoist, pz = hz - 1.9
  for (const sx of [-4.6, 0, 4.6]) for (const sz of [-1.5, 1.5]) S.push(box(hx + sx, 0, pz + sz, 0.22, 6, 0.22, '#5c6268'))
  for (const sz of [-1.5, 1.5]) { S.push(box(hx, 5.78, pz + sz, 9.6, 0.22, 0.16, '#5c6268')); for (const sx of [-4.6, 0]) S.push(beam([hx + sx, 0.3, pz + sz], [hx + sx + 4.6, 5.7, pz + sz], 0.09, '#5c6268')) }
  B.push(box(hx, 6, pz, 9.84, 0.1, 3.4, '#8b8f93'))
  for (let x = -4.8; x <= 4.81; x += 1.2) S.push(box(hx + x, 6.1, pz - 1.62, 0.05, 1.1, 0.05, '#d9a521'))
  S.push(box(hx, 7.16, pz - 1.62, 9.7, 0.06, 0.06, '#d9a521'), box(hx, 6.65, pz - 1.62, 9.7, 0.04, 0.04, '#d9a521'))
  for (const sx of [-4.85, 4.85]) { S.push(box(hx + sx, 7.16, pz, 0.06, 0.06, 3.3, '#d9a521')); for (const sz of [-1.6, 0, 1.6]) S.push(box(hx + sx, 6.1, pz + sz, 0.05, 1.1, 0.05, '#d9a521')) }
  // 科学小站：后墙、两侧短墙、单坡顶棚、四根柱子
  const tx = (P.table[0] + P.table2[0]) / 2, tz = P.table[2]
  B.push(box(tx, 0, tz - 1.5, 10, 3.3, 0.16, '#2f4f5a'), box(tx - 5, 0, tz - 0.4, 0.16, 3.3, 2.4, '#2f4f5a'), box(tx + 5, 0, tz - 0.4, 0.16, 3.3, 2.4, '#2f4f5a'))
  B.push({ p: [tx, 3.55, tz + 0.4], s: [11, 0.14, 5.2], c: '#c8372d', r: [0.09, 0, 0] })
  for (const sx of [-5, 5]) S.push(box(tx + sx, 0, tz + 2.6, 0.16, 3.2, 0.16, '#e9e5d8'))
  B.push(box(tx, 0, tz, 10.4, 0.12, 5.4, '#8f8a80'))
  B.push(box(tx, 0.9, tz - 1.4, 9.4, 0.05, 0.1, '#c9a877'))
  // 后墙上一排挂图的木框和一条搁板，搁板上几本书和两只收纳盒
  for (let i = 0; i < 6; i++) { const x = tx - 4 + i * 1.6; B.push(box(x, 1.25, tz - 1.41, 1.1, 0.8, 0.03, '#c9a877'), box(x, 1.29, tz - 1.39, 1.02, 0.72, 0.01, ['#e8e2d0', '#d9e3e6', '#efe6cf'][i % 3]), box(x - 0.2, 1.62, tz - 1.383, 0.5, 0.06, 0.004, '#33526b'), box(x, 1.42, tz - 1.383, 0.86, 0.02, 0.004, '#9aa3a8'), box(x, 1.36, tz - 1.383, 0.86, 0.02, 0.004, '#9aa3a8')) }
  // 游艺区后面的一排矮栅栏
  const [gx, , gz] = P.hammer
  for (let x = -6; x <= 14; x += 0.5) S.push(box(gx + x, 0, gz - 4.2, 0.07, 1.0, 0.03, x % 1 ? '#f4efe2' : '#c8372d'))
  S.push(box(gx + 4, 0.3, gz - 4.2, 20, 0.06, 0.05, '#e9e5d8'), box(gx + 4, 0.75, gz - 4.2, 20, 0.06, 0.05, '#e9e5d8'))
  return { B: mergeParts(B), S: mergeParts(S) }
}

/** 实验桌上方的射灯：换到实验桌的课时亮起来 */
function Key({ at }: { at: V3 | null }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef<V3>(at ?? [P.table[0], P.table[1], P.table[2]])
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const dt = Math.min(d, 1 / 30), k = 1 - Math.exp(-dt / 0.4)
    if (at) for (let i = 0; i < 3; i++) cur.current[i] += (at[i] - cur.current[i]) * k
    l.position.set(cur.current[0] - 1.0, cur.current[1] + 2.1, cur.current[2] + 1.9); aim.position.set(cur.current[0], cur.current[1], cur.current[2]); aim.updateMatrixWorld()
    l.intensity += ((at ? 30 : 0) - l.intensity) * (1 - Math.exp(-dt / 0.3))
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.5} penumbra={0.85} intensity={0} distance={9} decay={1.5} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.003}>
      <perspectiveCamera attach="shadow-camera" args={[58, 1, 0.8, 7]} />
    </spotLight>
  </>
}
/** 大范围的阳光：过山车、海盗船、蹦极塔这些大设施，舞台自带的阳光影子盖不全，换成这一盏 */
function BigSun({ at }: { at: [number, number] | null }) {
  const aim = useMemo(() => new THREE.Object3D(), [])
  const pos = useMemo<V3>(() => { const c = at ?? [0, 0]; aim.position.set(c[0], 0, c[1]); aim.updateMatrixWorld(); return [c[0] + 0.812 * 160, 0.334 * 160, c[1] + 0.478 * 160] }, [at, aim])
  return <>
    <primitive object={aim} />
    <directionalLight castShadow={!!at} target={aim} position={pos} intensity={at ? 3.2 : 0} color="#ffe0b8" shadow-mapSize={[4096, 4096]} shadow-bias={-0.0008} shadow-normalBias={0.06} shadow-radius={4}>
      <orthographicCamera attach="shadow-camera" args={[-85, 85, 62, -40, 1, 380]} />
    </directionalLight>
  </>
}

/** 绿篱：一段一段在空闲时生成，进页面不卡 */
const HEDGES: [[number, number], [number, number], number, number][] = [[[-60, 1.4], [-40, 1.4], 1.0, 0.9], [[-12, 1.4], [56, 1.4], 1.0, 0.9], [[56, 1.4], [126, 1.4], 1.0, 0.9], [[-20, -40], [-20, -10], 1.2, 1], [[134, -30], [134, -4], 1.1, 0.9], [[166, -30], [166, -8], 1.1, 0.9], [[136, -31], [166, -31], 1.1, 0.9], [[-135, -14.5], [-104, -14.5], 1.3, 1], [[163, -4.2], [185, -4.2], 1.4, 1]]
function Hedges() {
  const [list, setList] = useState<THREE.BufferGeometry[]>([])
  useEffect(() => { let i = 0, t = 0; const step = () => { const [a, b, h, w] = HEDGES[i]; const g = hedge(a, b, h, w, i + 2); setList(l => [...l, g]); if (++i < HEDGES.length) t = window.setTimeout(step, 50) }; t = window.setTimeout(step, 500); return () => clearTimeout(t) }, [])
  return <>{list.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.9} side={THREE.DoubleSide} /></mesh>)}</>
}

const TENTS: [number, number, number, string, string][] = [[-112, -11, 3.4, '#c8372d', '#f4efe2'], [-127, -11, 3, '#2f6f9f', '#f4efe2'], [-58, -5, 3.2, '#e8a23a', '#f4efe2'], [-41.5, -8, 2.8, '#3d8d6a', '#f4efe2'], [-8, 21, 3.2, '#c8372d', '#f4efe2'], [128, -1, 3, '#2f6f9f', '#f4efe2'], [188, -14, 3.2, '#e8a23a', '#f4efe2'], [60, 22, 3, '#3d8d6a', '#f4efe2'], [-100, -6, 2.6, '#e8a23a', '#f4efe2']]

export function World({ cur = [], wide = null, lamp = null }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(8, 5), wall = useConcrete(1.6, 1)
  const tex = useMemo(() => ({
    grass: rep(makeGrass(), 75, 60), shade: rep(makeBlotch(), 9, 7), ave: rep(makePaving(), 300, 8), plaza: makePaving(),
    yard: makeSign(['物资仓库'], '#33526b', '#eef3f6', 512, 128), game: makeSign(['游艺区', '试试你的力气'], '#c8372d', '#fff4d6', 512, 256), sci: makeSign(['科学小站'], '#e8e2d0', '#2f4f5a', 512, 128), coaster: makeSign(['过山车'], '#f4efe2', '#c8372d', 512, 160), ship: makeSign(['海盗船'], '#5b3524', '#e8c04a', 512, 160),
  }), [])
  const geo = useMemo(() => {
    const st = streetParts(), b = buildings()
    return { ...st, ...b, hills: makeHills(), station: mergeParts(stationParts(7, -14)) }
  }, [])
  const trees = useMemo(treeList, [])
  const plaza = (x: number, z: number, w: number, d: number, k = 0.65) => <mesh rotation-x={-Math.PI / 2} position={[x, 0.012, z]} receiveShadow><planeGeometry args={[w, d]} /><meshStandardMaterial map={tex.plaza} map-repeat={[w * k, d * k * 2]} roughness={0.9} polygonOffset polygonOffsetFactor={-1} /></mesh>
  const has = (k: Rig) => cur.includes(k)
  const idle = useMemo(() => ({ s: getTrack().sStation }), [])
  return (
    <group>
      <hemisphereLight args={['#dfe9f5', '#7f8c6a', lamp ? 0.5 : 0.32]} />
      <Key at={lamp} />
      <BigSun at={wide} />
      {/* 地面：草地、大道、各处的铺地 */}
      <mesh rotation-x={-Math.PI / 2} position={[20, -0.02, -60]} receiveShadow><planeGeometry args={[1500, 1200]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[20, -0.012, -60]}><planeGeometry args={[1500, 1200]} /><meshBasicMaterial map={tex.shade} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-0.5} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[20, 0.006, 9]} receiveShadow><planeGeometry args={[460, 12]} /><meshStandardMaterial map={tex.ave} roughness={0.9} polygonOffset polygonOffsetFactor={-1} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[P.yard[0], 0.012, P.yard[2] - 1]} receiveShadow><planeGeometry args={[30, 16]} /><meshStandardMaterial normalMap={cn} roughnessMap={cr} color="#bdb9ad" polygonOffset polygonOffsetFactor={-1} /></mesh>
      <mesh position={[P.yard[0] + WALL_X + 0.4, 1.3, P.yard[2]]} castShadow receiveShadow><boxGeometry args={[0.8, 2.6, 4.4]} /><meshStandardMaterial normalMap={wall[1]} roughnessMap={wall[2]} color="#c9c6bc" /></mesh>
      {plaza(-118, -4.5, 26, 15)}{plaza(P.hoist[0], -2, 16, 10)}{plaza(52, -3, 150, 12)}{plaza(P.ship[0], P.ship[2], 30, 28)}{plaza(P.tower[0] + 4, P.tower[2], 30, 26)}{plaza(-50, -22, 8, 40)}{plaza(P.wheel[0], P.wheel[2], 28, 18)}{plaza(P.wheel[0], -55, 8, 44)}
      {/* 路灯、彩旗、长椅、绿篱 */}
      <mesh geometry={geo.P} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
      <mesh geometry={geo.lamp}><meshStandardMaterial color="#fff3d6" emissive="#ffe2a8" emissiveIntensity={0.5} /></mesh>
      <mesh geometry={geo.flags}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.8} /></mesh>
      <Hedges />
      {/* 建筑和招牌 */}
      <mesh geometry={geo.B} castShadow receiveShadow><Painted rough={0.75} metal={0.1} /></mesh>
      <mesh geometry={geo.S} castShadow receiveShadow><Painted rough={0.5} metal={0.4} /></mesh>
      <mesh position={[P.yard[0] + 3, 5.2, P.yard[2] - 6.93]}><planeGeometry args={[6, 1.5]} /><meshStandardMaterial map={tex.yard} roughness={0.7} /></mesh>
      <mesh position={[(P.table[0] + P.table2[0]) / 2, 2.72, P.table[2] - 1.41]}><planeGeometry args={[3.2, 0.8]} /><meshStandardMaterial map={tex.sci} roughness={0.7} /></mesh>
      <mesh position={[7, 7.35, -10.4]}><planeGeometry args={[6, 1.9]} /><meshStandardMaterial map={tex.coaster} roughness={0.6} /></mesh>
      <mesh position={[P.ship[0] - 11.5, 3.2, P.ship[2] + 6.5]} rotation-y={0.5}><planeGeometry args={[3.6, 1.1]} /><meshStandardMaterial map={tex.ship} roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh position={[P.ship[0] - 11.5, 1.35, P.ship[2] + 6.5]}><cylinderGeometry args={[0.07, 0.07, 2.7, 10]} /><meshStandardMaterial color="#5b3524" roughness={0.8} /></mesh>
      {TENTS.map(([x, z, r, a, b], i) => <group key={i} position={[x, 0, z]} rotation-y={i * 1.3}><Tent r={r} a={a} b={b} /></group>)}
      {/* 过山车：轨道、支架、站台 */}
      <CoasterTrack />
      <mesh geometry={geo.station} castShadow receiveShadow><Painted rough={0.7} metal={0.15} /></mesh>
      {!has('train') && <Train drive={idle} />}
      <group position={P.ship}>{!has('ship') && <PirateShip />}</group>
      <group position={P.tower}><BungeeTower /></group>
      <group position={P.wheel} rotation-y={0.25}><FerrisWheel /></group>
      {/* 各处闲置的器材：不在这一课里的，照样摆着 */}
      {!has('forklift') && <group position={[P.yard[0] - 2, 0, P.yard[2]]}><Forklift><Crate /></Forklift></group>}
      {!has('cart') && <group position={P.cart}><VendorCart /></group>}
      {!has('hoist') && <group position={P.hoist}><group position={[-2.1, 0, 0]}><Hoist y={0.12} time="0.0" /></group><group position={[2.1, 0, 0]}><Hoist y={0.12} time="0.0" color="#c8372d" /></group></group>}
      <group position={P.table}><Table w={1.7} />{!has('ramp') && <group position={[0, 0.018, 0.2]}><RampSet><group position={[BLOCK_X0, 0, 0]}><WoodBlock /></group></RampSet></group>}</group>
      <group position={P.table2}><Table w={1.2} />{!has('maxwell') && <Maxwell y={WHEEL_LOW + WHEEL.h} turn={0} />}</group>
      {!has('hammer') && <group position={P.hammer}><HammerRig drop={0}><group position={[0, STAKE_TOP + 0.02, 0]}><Weight heavy={false} /></group></HammerRig></group>}
      {!has('launcher') && <group position={P.launcher}><Launcher press={0} ball={REST_Y} /></group>}
      <mesh position={[P.hammer[0] - 11.5, 2.3, P.hammer[2] - 4.3]}><planeGeometry args={[3.6, 1.8]} /><meshStandardMaterial map={tex.game} roughness={0.7} /></mesh>
      {[-1.9, 1.9].map(s => <mesh key={s} position={[P.hammer[0] - 11.5 + s * 0.8, 0.7, P.hammer[2] - 4.34]}><cylinderGeometry args={[0.06, 0.06, 1.6, 10]} /><meshStandardMaterial color="#5b3524" roughness={0.8} /></mesh>)}
      {/* 远景：树、远山 */}
      <Trees list={trees} />
      <mesh geometry={geo.hills}><meshStandardMaterial vertexColors roughness={1} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}
