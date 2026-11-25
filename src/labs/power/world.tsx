// 电功率和生活用电实验室的大场景：一个住宅小区的一角。左边是一栋住宅楼的一层，朝镜头剖开：楼道（楼梯、楼道电表箱）、
// 客厅（配电箱在客厅和厨房之间的墙上）、开放式厨房、阳台洗衣区；隔着小区道路，右边是配电房：电工值班室的工作台、一排低压配电柜，
// 东侧围栏里一台油浸式变压器。整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。
// 1 m 画成 10 个单位；小器材按厘米写，外面套 <Cm>（乘 CM）。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { makeBrick, makeCement, makeGrass, makePaint, makePaver, makeText, makeTile, makeWood, rep } from './mats'
import { Furniture } from './rooms'
import { DistBox, MeterBox, type BoxState } from './panel'
import { Balcony, Upper } from './facade'
import { Cabinets, DutyBench, Transformer, type Grid } from './substation'
import { BACK, BAL_SOCKET, COUNTER, DB, H, MB, PR, ROOM, TF, WIN, type V3 } from './layout'

export type { V3 }

/** 每一课交给世界的要求：主灯从哪照向哪、照多远；客厅的灯和电视；配电箱里各个开关的状态 */
export interface Want { light: V3; aim: V3; reach?: number; lamp?: boolean; tv?: boolean; box?: BoxState; grid?: Grid; reading?: number; rate?: number; washer?: boolean; tall?: boolean }
interface Spot { target: THREE.Vector3; span: [number, number]; view: [number, number]; key: V3; reach: number; fog: [number, number] }
const spot = (t: V3, span: [number, number], view: [number, number], key: V3, reach = 45): Spot => ({ target: new THREE.Vector3(...t), span, view, key, reach, fog: [300, 1400] })
export const SPOT = {
  // 第 1 课：楼道电表箱，镜头正对玻璃窗，稍微偏左一点
  l1: spot([MB[0] - 0.6, MB[1] + 1.0, MB[2] + 1], [8.6, 5.6], [0.06, 0.1], [MB[0] - 6, MB[1] + 10, -30]),
  // 第 2 课：厨房台面上的电水壶和电饭煲，略俯视
  l2: spot([-18.5, 10.6, -41.6], [10.6, 4.6], [-0.12, 0.3], [-27, 22, -30]),
  // 第 3 课：电工值班室工作台西头，小灯泡和两只电表
  l3: spot([92.4, 9.4, -41.4], [5.4, 2.5], [0.08, 0.38], [86, 20, -34]),
  // 第 4 课：工作台东头，两只烧瓶
  l4: spot([112.0, 10.0, -41.6], [5.0, 2.7], [-0.14, 0.3], [104, 21, -34]),
  // 第 5 课：客厅整面墙，墙里的线透视出来
  l5: spot([-60, 14.5, -40], [72, 28], [0.06, 0.1], [-62, 34, -10], 90),
  l5b: spot([DB[0] - 2, DB[1] + 1.5, BACK + 1], [14, 7], [0.08, 0.06], [DB[0] - 6, 26, -30], 40),
  // 第 6 课：阳台墙上的插座（特写），后半段退到能看见洗衣机
  l6: spot([BAL_SOCKET[0] + 2.6, BAL_SOCKET[1] - 1.2, BACK + 1], [7.4, 4.0], [-0.42, 0.12], [10, 22, -30]),
  l6b: spot([22, 11, -41], [24, 15], [-0.12, 0.16], [12, 26, -26], 60),
  // 第 7 课：厨房台面和墙上的配电箱
  l7: spot([-23.2, 11.8, -42], [19.5, 8.2], [0.05, 0.1], [-26, 24, -26], 50),
  l7b: spot([-28.6, 13.4, -42.5], [10.5, 5.0], [0.1, 0.1], [-31, 23, -30], 35),
  // 拓展：配电房的配电柜、东侧的变压器；一天的电回到客厅
  x: spot([140, 12, -40], [38, 22], [-0.1, 0.18], [132, 34, -20], 70),
  xTf: spot([TF[0], 10, TF[2]], [27, 17], [0.42, 0.42], [200, 44, 0], 80),
  xDay: spot([-50, 12, -40], [96, 30], [0.1, 0.18], [-50, 36, -8], 110),
  // 随堂检测：小区的全景，从前面高处看
  q: spot([-20, 40, -24], [190, 95], [0.0, 0.16], [-20, 80, 30], 300),
}
export type SpotKey = keyof typeof SPOT

/** 这一课的舞台：选一处机位，交出器材和标签；world 里写对客厅、配电箱的要求 */
export function Place({ at, labels, world, children = null }: { at: SpotKey; labels: Label[]; world?: Omit<Want, 'light' | 'aim' | 'reach'>; children?: ReactNode }) {
  const v = SPOT[at]
  const w: Want = { light: v.key, aim: v.target.toArray() as V3, reach: v.reach, ...world }
  return <LabStage<Want> labels={labels} target={v.target} span={v.span} view={v.view} sun={0.9} env={0.55} studio fog={v.fog} bloom={0.45} world={w}>{children}</LabStage>
}

// ---------- 墙 ----------
/** 一面有厚度的墙：在 x–y 平面里从 (x0, y0) 到 (x1, y1)，从 z 往后挤出 t；holes 是窗洞、门洞 [x0, x1, y0, y1] */
function slab(x0: number, x1: number, y0: number, y1: number, z: number, t: number, holes: [number, number, number, number][] = [], tile = 10) {
  const s = new THREE.Shape([new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)])
  for (const [a, b, c, d] of holes) s.holes.push(new THREE.Path([new THREE.Vector2(a, c), new THREE.Vector2(a, d), new THREE.Vector2(b, d), new THREE.Vector2(b, c)]))
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false })
  g.translate(0, 0, z - t)
  const uv = g.attributes.uv, p = g.attributes.position, n = g.attributes.normal
  for (let i = 0; i < uv.count; i++) { const side = Math.abs(n.getZ(i)) < 0.5; uv.setXY(i, (side ? p.getZ(i) + p.getX(i) : p.getX(i)) / tile, p.getY(i) / tile) }
  return g
}
/** 竖着的一面隔墙：沿 z 从 z0 到 z1，在 x 处，厚 t；holes 是 [z0, z1, y0, y1] */
function side(x: number, z0: number, z1: number, y1: number, t: number, holes: [number, number, number, number][] = []) {
  const g = slab(z0, z1, 0, y1, t / 2, t, holes)
  g.rotateY(-Math.PI / 2); g.translate(x, 0, 0)
  return g
}
type Hole = [number, number, number, number]
const WIN_LIV = WIN.liv as unknown as Hole, WIN_KIT = WIN.kit as unknown as Hole, WIN_BAL = WIN.bal as unknown as Hole, WIN_COR = WIN.cor as unknown as Hole
const PR_WIN: [number, number, number, number][] = [[86, 104, 20, 30], [126, 154, 26, 32]]

/** 窗：铝合金窗框、中梃、窗台石；外面是一块亮的天光 */
function windowParts(w: [number, number, number, number], z: number, P: Part[], frame = '#d9dcde') {
  const [x0, x1, y0, y1] = w, mx = (x0 + x1) / 2
  for (const x of [x0 + 0.3, mx, x1 - 0.3]) P.push({ p: [x, (y0 + y1) / 2, z - 1.2], s: [0.6, y1 - y0, 0.7], c: frame })
  for (const y of [y0 + 0.3, y1 - 0.3]) P.push({ p: [mx, y, z - 1.2], s: [x1 - x0, 0.6, 0.7], c: frame })
  P.push({ p: [mx, y0 - 0.15, z + 0.4], s: [x1 - x0 + 1.2, 0.3, 2.2], c: '#cfcac0' })
}

/** 楼梯：一跑踏步往上，靠墙一道扶手 */
function stairParts() {
  const P: Part[] = [], x0 = -129.5, w = 10
  for (let i = 0; i < 12; i++) { const h = 1.6 * (i + 1); P.push({ p: [x0 + w / 2, h / 2, -14 - i * 2.6], s: [w, h, 2.6], c: i % 2 ? '#a9a69e' : '#b3b0a8' }, { p: [x0 + w / 2, h + 0.06, -14 - i * 2.6 + 1.1], s: [w, 0.12, 0.4], c: '#55524c' }) }
  // 栏杆和扶手
  for (let i = 0; i < 12; i += 2) P.push({ p: [x0 + w, 1.6 * (i + 1) + 4.5, -14 - i * 2.6], s: [0.25, 9, 0.25], c: '#3b3d40' })
  const a: V3 = [x0 + w, 1.6 + 9, -14], b: V3 = [x0 + w, 1.6 * 12 + 9, -14 - 11 * 2.6], len = Math.hypot(b[1] - a[1], b[2] - a[2])
  P.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [0.6, 0.5, len], c: '#6e4a2e', r: [Math.atan2(b[1] - a[1], -(b[2] - a[2])), 0, 0] })
  return P
}

/** 主灯：跟着当前这一课，从左前上方照下来 */
function Key({ at, aim, reach }: { at: V3; aim: V3; reach: number }) {
  const light = useRef<THREE.SpotLight>(null), target = useMemo(() => new THREE.Object3D(), [])
  const cur = useRef(new THREE.Vector3(...at)), look = useRef(new THREE.Vector3(...aim)), dist = useRef(reach)
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const k = 1 - Math.exp(-Math.min(d, 1 / 30) / 0.5)
    cur.current.lerp(new THREE.Vector3(...at), k); look.current.lerp(new THREE.Vector3(...aim), k); dist.current += (reach - dist.current) * k
    l.position.copy(cur.current); target.position.copy(look.current); target.updateMatrixWorld(); l.distance = dist.current * 1.6
  })
  return <>
    <primitive object={target} />
    <spotLight ref={light} target={target} angle={0.8} penumbra={0.9} intensity={170} decay={1.4} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
  </>
}

export function World({ light = SPOT.l1.key, aim = SPOT.l1.target.toArray() as V3, reach = 45, lamp = false, tv = false, box, grid, reading, rate, washer = false, tall = false }: Partial<Want>) {
  const tex = useMemo(() => ({
    wood: rep(makeWood(), 4, 3), corTile: rep(makeTile('#b9b4a8', '#8d887e', 4, 3), 4, 6), kitTile: rep(makeTile('#d8d6d0', '#a9a69f', 4, 7), 6, 6),
    balTile: rep(makeTile('#c7c2b6', '#9a958a', 4, 9), 4, 6), paint: rep(makePaint('#efebe2'), 1, 1), green: rep(makePaint('#9fbfa6'), 1, 1),
    splash: rep(makeTile('#f1f0ec', '#c9c7c1', 6, 13, 2), 1, 1), brick: rep(makeBrick(), 1, 1), cement: rep(makeCement(), 6, 4), paver: rep(makePaver(), 60, 30), grass: rep(makeGrass(), 20, 6),
    sign: makeText(['配电房'], { w: 512, h: 160, bg: '#1f5c8a', fg: '#ffffff', size: 92 }), danger: makeText(['高压危险'], { w: 512, h: 160, bg: '#f2d21b', fg: '#1a1a1a', size: 90 }),
    duty: makeText(['电工值班室'], { w: 512, h: 128, bg: '#2a6b4a', fg: '#ffffff', size: 64 }), bld: makeText(['3 号楼  1 单元'], { w: 512, h: 128, bg: '#3b4a57', fg: '#ffffff', size: 60 }),
  }), [])
  const geo = useMemo(() => {
    const T = 2.4
    // 住宅楼：后墙（带窗洞，挤出厚度，窗洞里有窗台和侧壁）、两头的外墙、楼道和客厅之间的墙（门洞）、厨房和阳台之间的墙（门洞）
    const back = mergeGeometries([slab(-132.4, 42.4, 0, H, BACK, T, [WIN_LIV, WIN_KIT, WIN_BAL, WIN_COR, [MB[0] - 3.2, MB[0] + 3.2, MB[1] - 3.5, MB[1] + 3.5], [DB[0] - 1.7, DB[0] + 1.7, DB[1] - 1.2, DB[1] + 1.2]])])
    const sides = mergeGeometries([side(-131.2, BACK, 0, H, T), side(41.2, BACK, 0, H, T), side(-100, BACK, 0, H, 2, [[-22, -11, 0, 21]]), side(10, BACK, 0, H, 2, [[-30, -20, 0, 21]])])
    // 楼道的绿色墙裙（离地 1.2 m）只画在后墙上
    const dado = new THREE.PlaneGeometry(30, 12); dado.translate(-115, 6, BACK + 0.02)
    const splash = new THREE.PlaneGeometry(COUNTER.x1 - COUNTER.x0, 6.2); splash.translate((COUNTER.x0 + COUNTER.x1) / 2, COUNTER.y + 3.1, BACK + 0.03)
    // 天花板：只朝下的一面，从上面往下看是透明的
    const ceil = new THREE.PlaneGeometry(172, 45); ceil.rotateX(Math.PI / 2); ceil.translate(-45, H, BACK / 2)
    // 楼板的剖面：前沿一道混凝土
    const cut: Part[] = [{ p: [-45, -1.5, -22], s: [176, 3, 48], c: '#8e8b84' }, { p: [-45, H + 1.5, 0], s: [176, 3, 1.2], c: '#9b978f' }]
    const win: Part[] = []; for (const w of [WIN_LIV, WIN_KIT, WIN_BAL, WIN_COR]) windowParts(w, BACK, win)
    // 踢脚线
    for (const [a, b] of [[-130, -100], [-100, -30]] as [number, number][]) win.push({ p: [(a + b) / 2, 0.45, BACK + 0.15], s: [b - a, 0.9, 0.3], c: a < -100 ? '#5f6a60' : '#c8c1b4' })
    const sky = mergeGeometries([WIN_LIV, WIN_KIT, WIN_BAL, WIN_COR].map(([x0, x1, y0, y1]) => { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, BACK - 2.6); return g }))
    // 配电房：砖墙（只画朝里的面，外面贴砖），后墙两扇高窗
    const pr = mergeGeometries([slab(PR.x0 - 2.4, PR.x1 + 2.4, 0, PR.h, PR.z0, T, PR_WIN, 24), side(PR.x0 - 1.2, PR.z0, PR.z1, PR.h, T, [[-24, -14, 0, 24]]), side(PR.x1 + 1.2, PR.z0, PR.z1, PR.h, T, [[-30, -16, 0, 26]])])
    const prCeil = new THREE.PlaneGeometry(PR.x1 - PR.x0 + 4.8, PR.z1 - PR.z0); prCeil.rotateX(Math.PI / 2); prCeil.translate((PR.x0 + PR.x1) / 2, PR.h, (PR.z0 + PR.z1) / 2)
    const prWin: Part[] = []; for (const w of PR_WIN) windowParts(w, PR.z0, prWin, '#8a9096')
    prWin.push({ p: [(PR.x0 + PR.x1) / 2, -1, (PR.z0 + PR.z1) / 2], s: [PR.x1 - PR.x0 + 6, 2.2, PR.z1 - PR.z0 + 3], c: '#8d8a83' }, { p: [(PR.x0 + PR.x1) / 2, PR.h + 1.6, PR.z1 + 0.6], s: [PR.x1 - PR.x0 + 6, 3.2, 1.6], c: '#9b978f' })
    // 电缆沟盖板：配电柜前一条
    for (let x = 124; x < 156; x += 4) prWin.push({ p: [x + 2, 0.06, -36.5], s: [3.9, 0.12, 3.4], c: '#6f7173' })
    const prSky = mergeGeometries(PR_WIN.map(([x0, x1, y0, y1]) => { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, PR.z0 - 2.6); return g }))
    // 室外：住宅楼和配电房之间的道路边石、路灯、几棵树
    const out: Part[] = []
    for (const z of [6, 30]) out.push({ p: [55, 0.5, z], s: [400, 1, 1.4], c: '#b8b5ad' })
    for (const x of [60, 210]) { out.push({ p: [x, 22, 34], s: [0.5, 44, 0.5], c: '#3e4246', cyl: true }, { p: [x + 3, 44, 34], s: [6, 0.6, 1.2], c: '#3e4246' }) }
    // 变压器的围栏：钢网片和立柱
    const F = { x0: TF[0] - 18, x1: TF[0] + 18, z0: TF[2] - 14, z1: TF[2] + 16 }
    for (let x = F.x0; x <= F.x1 + 0.1; x += 6) for (const z of [F.z0, F.z1]) out.push({ p: [x, 9, z], s: [0.22, 18, 0.22], c: '#7f8784' })
    for (let z = F.z0; z <= F.z1 + 0.1; z += 6) for (const x of [F.x0, F.x1]) out.push({ p: [x, 9, z], s: [0.22, 18, 0.22], c: '#7f8784' })
    for (const y of [1, 17.5]) { for (const z of [F.z0, F.z1]) out.push({ p: [TF[0], y, z], s: [36, 0.16, 0.16], c: '#7f8784' }); for (const x of [F.x0, F.x1]) out.push({ p: [x, y, (F.z0 + F.z1) / 2], s: [0.16, 0.16, 30], c: '#7f8784' }) }
    out.push({ p: [TF[0], 0.6, TF[2]], s: [30, 1.2, 24], c: '#a8a49b' })
    const mesh = mergeGeometries([F.z0, F.z1].map(z => { const g = new THREE.PlaneGeometry(36, 16); g.translate(TF[0], 9.2, z); return g }).concat([(() => { const g = new THREE.PlaneGeometry(30, 16); g.rotateY(Math.PI / 2); g.translate(F.x1, 9.2, (F.z0 + F.z1) / 2); return g })()]))
    return {
      back, sides, dado, splash, ceil, cut: mergeParts(cut), win: mergeParts(win), stair: mergeParts(stairParts()), sky,
      pr, prCeil, prWin: mergeParts(prWin), prSky, out: mergeParts(out), mesh,
    }
  }, [])
  const floor = (x0: number, x1: number, z0: number, z1: number, map: THREE.Texture, rough = 0.6, y = 0.02) => (
    <mesh rotation-x={-Math.PI / 2} position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} receiveShadow><planeGeometry args={[x1 - x0, z1 - z0]} /><meshStandardMaterial map={map} roughness={rough} /></mesh>
  )
  return (
    <group>
      <hemisphereLight args={['#eef2f6', '#5b5348', 0.32]} />
      <Key at={light} aim={aim} reach={reach} />
      {/* 小区的地面：透水砖道路和两边的草地 */}
      <mesh rotation-x={-Math.PI / 2} position={[40, -0.1, 0]} receiveShadow><planeGeometry args={[700, 300]} /><meshStandardMaterial map={tex.paver} roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[40, 0.01, 52]} receiveShadow><planeGeometry args={[700, 40]} /><meshStandardMaterial map={tex.grass} roughness={1} /></mesh>
      <mesh geometry={geo.out} castShadow receiveShadow><Painted rough={0.7} metal={0.2} /></mesh>
      <mesh geometry={geo.mesh}><meshStandardMaterial color="#9aa19e" transparent opacity={0.12} metalness={0.5} roughness={0.5} side={THREE.DoubleSide} depthWrite={false} /></mesh>

      {/* ---------- 住宅楼一层 ---------- */}
      <mesh geometry={geo.cut} receiveShadow><Painted rough={0.9} metal={0} /></mesh>
      {floor(ROOM.cor[0] - 1, ROOM.cor[1], BACK, 0, tex.corTile, 0.55)}
      {floor(ROOM.liv[0], ROOM.liv[1], BACK, 0, tex.wood, 0.48)}
      {floor(ROOM.kit[0], ROOM.kit[1], BACK, 0, tex.kitTile, 0.35)}
      {floor(ROOM.bal[0], ROOM.bal[1] + 1, BACK, 0, tex.balTile, 0.5)}
      <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.paint} roughness={0.92} /></mesh>
      <mesh geometry={geo.sides} receiveShadow castShadow><meshStandardMaterial map={tex.paint} roughness={0.92} /></mesh>
      <mesh geometry={geo.dado}><meshStandardMaterial map={tex.green} roughness={0.85} /></mesh>
      <mesh geometry={geo.splash}><meshStandardMaterial map={tex.splash} roughness={0.25} /></mesh>
      <mesh geometry={geo.ceil}><meshStandardMaterial color="#f4f2ec" roughness={0.95} /></mesh>
      <mesh geometry={geo.win} castShadow receiveShadow><Painted rough={0.45} metal={0.3} /></mesh>
      <mesh geometry={geo.sky}><meshBasicMaterial color="#dfeaf3" toneMapped={false} /></mesh>
      <mesh geometry={geo.stair} castShadow receiveShadow><Painted rough={0.8} metal={0.05} /></mesh>
      <mesh position={[-107, 24, BACK + 0.12]}><planeGeometry args={[9, 2.25]} /><meshStandardMaterial map={tex.bld} roughness={0.7} /></mesh>
      <MeterBox reading={reading} rate={rate} />
      <DistBox at={DB} state={box} />
      <Furniture lamp={lamp} tv={tv} washer={washer} />
      {tall && <Upper />}
      <Balcony />

      {/* ---------- 配电房 ---------- */}
      {floor(PR.x0, PR.x1, PR.z0, PR.z1, tex.cement, 0.8, 0.05)}
      <mesh geometry={geo.pr} receiveShadow castShadow><meshStandardMaterial map={tex.paint} color="#e7e3da" roughness={0.92} /></mesh>
      <mesh geometry={geo.prCeil}><meshStandardMaterial color="#efede8" roughness={0.95} /></mesh>
      <mesh geometry={geo.prWin} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
      <mesh geometry={geo.prSky}><meshBasicMaterial color="#dfeaf3" toneMapped={false} /></mesh>
      {/* 外墙贴砖的一圈：只在两头的山墙外面看得见 */}
      {[PR.x0 - 2.45, PR.x1 + 2.45].map((x, i) => <mesh key={x} position={[x, PR.h / 2, (PR.z0 + PR.z1) / 2]} rotation-y={i ? Math.PI / 2 : -Math.PI / 2}><planeGeometry args={[PR.z1 - PR.z0, PR.h]} /><meshStandardMaterial map={tex.brick} color="#9c8f88" roughness={0.9} /></mesh>)}
      <mesh position={[PR.x1 + 2.5, 30, -10]} rotation-y={Math.PI / 2}><planeGeometry args={[9, 2.8]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
      <mesh position={[PR.x1 + 2.5, 20, -42]} rotation-y={Math.PI / 2}><planeGeometry args={[5, 1.6]} /><meshStandardMaterial map={tex.danger} roughness={0.6} /></mesh>
      <mesh position={[96, 33.5, PR.z0 + 0.12]}><planeGeometry args={[10, 2.5]} /><meshStandardMaterial map={tex.duty} roughness={0.6} /></mesh>
      <DutyBench />
      <Cabinets grid={grid} />
      <Transformer grid={grid} />
    </group>
  )
}
