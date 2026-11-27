// 概率实验室的大场景：一座日用瓷厂的成型车间。钢结构厂房，环氧地坪上画着黄色通道线；
// 西边用玻璃隔断围出一间质检培训室（培训桌、电子屏、白板），东边一条瓷碗流水线（施釉机、皮带输送机、抽检台），北墙下一条隧道窑，东南角是成品托盘。
// 整个实验室只有这一个世界，换课时画布不重建，镜头飞过去。1 个单位 = 1 m。
// 墙和屋面只画朝里的一面：在车间里看是封闭的，随堂检测的全景从外面看得见里面。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, Painted, lathe, mergeParts, shell, useConcrete, type Part } from '@/lab-kit'
import { makeBlueWhite, makeBoard, makeCladding, makeDesk, makeEpoxy, makeSign, prng } from './mats'

/** 厂房：x、z 的范围和檐高 */
export const HALL = { x0: -16, x1: 26, z0: -13, z1: 9, h: 8.5 }
/** 质检培训室：玻璃隔断围出来的一间，吊顶高 3 m */
export const ROOM = { x0: -16, x1: 1, z0: -13, z1: -2, h: 3 }
export const TABLE_H = 0.76
const ROW_B = -11.9, ROW_F = -6.2
/** 各课的位置：培训桌的中心，或抽检台的中心 */
export const ST = {
  l1: { x: -13, z: ROW_B }, l2: { x: -9.5, z: ROW_B }, l3: { x: -6, z: ROW_B }, l4: { x: -1.2, z: ROW_B },
  l5: { x: -12, z: ROW_F }, l6: { x: -7.5, z: ROW_F }, x: { x: -3, z: ROW_F }, l7: { x: 15, z: -3.5 },
}
/** 电子屏（第 4 课）：挂在培训室后墙上；白板（第 5 课）：立在第 5 课桌子后面 */
export const SCREEN = { x: ST.l4.x, y: 1.33, z: HALL.z0 + 0.14, w: 1.22, h: 0.69 }
export const BOARD = { x: ST.l5.x, y: 1.36, z: ROW_F - 0.72, w: 1.2, h: 0.8 }
/** 流水线：皮带面的高度、中线、起止 */
export const LINE = { y: 0.86, z: -4.3, x0: 4.2, x1: 24, w: 0.5 }
/** 抽检台：台面高度 */
export const INSPECT_H = 0.82

/** 每一课交给世界的要求：工作灯跟到哪；流水线上的碗要不要自己走（第 7 课由那一课接管） */
export interface Want { x: number; z: number; y?: number; ownLine?: boolean }

// ---------- 厂房 ----------
const COLS = [-16, -10, -4, 2, 8, 14, 20, 26]
/** 钢结构：H 型钢柱、屋架（上弦、下弦、腹杆）、檩条、柱间支撑、吊车梁牛腿。全部合成一个模型 */
function frameParts() {
  const P: Part[] = [], H = HALL, steel = '#5f6a72', gray = '#8a949a'
  for (const x of COLS) for (const z of [H.z0 + 0.2, H.z1 - 0.2]) {
    P.push({ p: [x, H.h / 2, z], s: [0.3, H.h, 0.02], c: steel }, { p: [x, H.h / 2, z - 0.14], s: [0.3, H.h, 0.02], c: steel }, { p: [x, H.h / 2, z + 0.14], s: [0.3, H.h, 0.02], c: steel })
    P.push({ p: [x, H.h / 2, z], s: [0.02, H.h, 0.3], c: steel })
    P.push({ p: [x, 0.15, z], s: [0.5, 0.3, 0.5], c: '#9b9a94' })
    P.push({ p: [x, 6.2, z + Math.sign(-z) * 0.35], s: [0.3, 0.4, 0.5], c: steel })
  }
  // 屋架：每根柱子一榀，跨度方向是 z
  const span = H.z1 - H.z0, mid = (H.z0 + H.z1) / 2, rise = 1.6
  for (const x of COLS) {
    P.push({ p: [x, H.h, mid], s: [0.16, 0.16, span], c: gray })
    for (const s of [-1, 1]) { const len = Math.hypot(span / 2, rise); P.push({ p: [x, H.h + rise / 2, mid + s * span / 4], s: [0.16, 0.16, len], c: gray, r: [s * Math.atan2(rise, span / 2), 0, 0] }) }
    for (let k = 1; k < 8; k++) { const t = k / 8, z = H.z0 + t * span, h = rise * (1 - Math.abs(2 * t - 1)); P.push({ p: [x, H.h + h / 2, z], s: [0.08, h, 0.08], c: gray }) }
  }
  // 檩条：沿 x 方向
  for (let k = 0; k <= 10; k++) { const t = k / 10, z = H.z0 + t * span, y = H.h + rise * (1 - Math.abs(2 * t - 1)) + 0.14; P.push({ p: [(H.x0 + H.x1) / 2, y, z], s: [H.x1 - H.x0, 0.12, 0.08], c: gray }) }
  // 吊车梁：沿两面长墙一道
  for (const z of [H.z0 + 0.55, H.z1 - 0.55]) P.push({ p: [(H.x0 + H.x1) / 2, 6.55, z], s: [H.x1 - H.x0, 0.5, 0.3], c: '#c8a23a' })
  return P
}

/** 培训室：玻璃隔断的铝框、吊顶的龙骨、培训桌、椅子 */
function roomParts() {
  const P: Part[] = [], R = ROOM, alu = '#b9bec2'
  // 东面隔断（x = x1）和南面隔断（z = z1）：竖框每 1.2 m 一根，上下横框，南面留一个门
  for (let z = R.z0; z <= R.z1 + 1e-6; z += 1.1) P.push({ p: [R.x1, R.h / 2, z], s: [0.06, R.h, 0.06], c: alu })
  for (let x = R.x0; x <= R.x1 + 1e-6; x += 1.2) if (Math.abs(x - -4.0) > 0.1) P.push({ p: [x, R.h / 2, R.z1], s: [0.06, R.h, 0.06], c: alu })
  for (const y of [0.05, 1.0, R.h - 0.03]) { P.push({ p: [R.x1, y, (R.z0 + R.z1) / 2], s: [0.07, y < 0.1 ? 0.1 : 0.05, R.z1 - R.z0], c: alu }); P.push({ p: [(R.x0 + R.x1) / 2, y, R.z1], s: [R.x1 - R.x0, y < 0.1 ? 0.1 : 0.05, 0.07], c: alu }) }
  // 吊顶上面一圈墙板（从车间这一侧看是白色的围板）
  P.push({ p: [R.x1, R.h + 0.3, (R.z0 + R.z1) / 2], s: [0.1, 0.6, R.z1 - R.z0], c: '#e7e7e2' }, { p: [(R.x0 + R.x1) / 2, R.h + 0.3, R.z1], s: [R.x1 - R.x0, 0.6, 0.1], c: '#e7e7e2' })
  // 培训桌：桌腿是灰色的方钢框
  for (const t of Object.entries(ST)) {
    if (t[0] === 'l7') continue
    const { x, z } = t[1], w = 1.6, d = 0.8, leg = '#6e767c'
    for (const sx of [-1, 1]) {
      P.push({ p: [x + sx * (w / 2 - 0.06), (TABLE_H - 0.03) / 2, z], s: [0.05, TABLE_H - 0.03, 0.05], c: leg })
      P.push({ p: [x + sx * (w / 2 - 0.06), 0.03, z], s: [0.06, 0.06, d - 0.06], c: leg })
      P.push({ p: [x + sx * (w / 2 - 0.06), TABLE_H - 0.06, z], s: [0.05, 0.05, d - 0.1], c: leg })
    }
    P.push({ p: [x, TABLE_H - 0.08, z - d / 2 + 0.06], s: [w - 0.14, 0.12, 0.02], c: '#cfd2d2' })
  }
  // 几把培训椅：靠墙一排、桌边几把
  const chair = (x: number, z: number, rot: number) => {
    const c = Math.cos(rot), s = Math.sin(rot), at = (dx: number, dz: number): [number, number] => [x + dx * c + dz * s, z - dx * s + dz * c]
    const seat = at(0, 0), back = at(0, 0.21)
    P.push({ p: [seat[0], 0.45, seat[1]], s: [0.44, 0.05, 0.42], c: '#2f5d8a', r: [0, rot, 0] }, { p: [back[0], 0.72, back[1]], s: [0.44, 0.34, 0.04], c: '#2f5d8a', r: [0, rot, 0] })
    for (const [dx, dz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) { const q = at(dx, dz); P.push({ p: [q[0], 0.22, q[1]], s: [0.025, 0.44, 0.025], c: '#55595d' }) }
  }
  chair(-14.6, -3.2, 0); chair(-13.9, -3.2, 0); chair(-13.2, -3.2, 0); chair(-1.0, -3.3, 0.4); chair(-15.2, -8.6, Math.PI / 2)
  return P
}

/** 流水线：皮带输送机的机架、托辊、驱动电机，施釉机的外壳，隧道窑，抽检台，托盘和纸箱 */
function lineParts() {
  const P: Part[] = [], L = LINE, frame = '#2f6f8f', steel = '#7a8288', w = L.w
  // 两侧的槽钢机架、支腿和调平脚
  for (const s of [-1, 1]) P.push({ p: [(L.x0 + L.x1) / 2, L.y - 0.06, L.z + s * (w / 2 + 0.04)], s: [L.x1 - L.x0, 0.12, 0.04], c: frame })
  for (let x = L.x0 + 0.3; x < L.x1; x += 1.6) for (const s of [-1, 1]) {
    P.push({ p: [x, (L.y - 0.12) / 2, L.z + s * (w / 2 + 0.04)], s: [0.06, L.y - 0.12, 0.06], c: frame })
    P.push({ p: [x, 0.02, L.z + s * (w / 2 + 0.04)], s: [0.1, 0.04, 0.1], c: '#2b2e31' })
  }
  for (let x = L.x0 + 0.3; x < L.x1; x += 1.6) P.push({ p: [x, 0.3, L.z], s: [0.04, 0.04, w + 0.1], c: frame })
  // 下面的回程托辊
  for (let x = L.x0 + 1; x < L.x1; x += 1.6) P.push({ p: [x, L.y - 0.24, L.z], s: [0.035, w + 0.02, 0], c: steel, cyl: true, r: [Math.PI / 2, 0, 0] })
  // 驱动端：电机和减速机
  P.push({ p: [L.x1 - 0.25, L.y - 0.3, L.z + w / 2 + 0.25], s: [0.26, 0.26, 0.3], c: '#2b6b4a' }, { p: [L.x1 - 0.25, L.y - 0.3, L.z + w / 2 + 0.47], s: [0.11, 0.22, 0], c: '#2b6b4a', cyl: true, r: [Math.PI / 2, 0, 0] })
  // 施釉机：不锈钢外壳，前面一扇观察窗，顶上一根排风管
  const gx = 6.4
  P.push({ p: [gx, 1.1, L.z], s: [2.6, 1.6, 1.5], c: '#b9bec2' }, { p: [gx, 0.15, L.z], s: [2.7, 0.3, 1.6], c: '#3a3f44' })
  P.push({ p: [gx + 0.4, 2.35, L.z], s: [0.14, 0.9, 0], c: '#9ea5aa', cyl: true }, { p: [gx - 0.9, 1.55, L.z + 0.76], s: [0.5, 0.3, 0.02], c: '#d33c2c' })
  // 隧道窑：沿北墙，红砖窑体加钢框，窑顶一排看火孔
  const kz = HALL.z0 + 2.4, kx0 = 4, kx1 = 24
  P.push({ p: [(kx0 + kx1) / 2, 1.2, kz], s: [kx1 - kx0, 2.4, 2.2], c: '#a3573e' })
  for (let x = kx0; x <= kx1 + 1e-6; x += 2) { P.push({ p: [x, 1.3, kz + 1.12], s: [0.14, 2.6, 0.06], c: '#3c4146' }); P.push({ p: [x, 2.45, kz], s: [0.14, 0.1, 2.3], c: '#3c4146' }) }
  P.push({ p: [(kx0 + kx1) / 2, 2.5, kz], s: [kx1 - kx0, 0.1, 2.3], c: '#6d7378' })
  for (let x = kx0 + 1; x < kx1; x += 2) P.push({ p: [x, 2.62, kz], s: [0.12, 0.16, 0], c: '#2b2e31', cyl: true })
  // 抽检台：钢台架，白色台面在课里画
  const { x: ix, z: iz } = ST.l7
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ p: [ix + sx * 0.66, (INSPECT_H - 0.04) / 2, iz + sz * 0.36], s: [0.05, INSPECT_H - 0.04, 0.05], c: '#55606a' })
  P.push({ p: [ix, 0.18, iz], s: [1.36, 0.03, 0.76], c: '#55606a' })
  // 成品区：两个托盘，上面码着纸箱
  const r = prng(7)
  for (const [px, pz] of [[21.5, 1.6], [23.2, 1.6], [21.5, 3.4]]) {
    P.push({ p: [px, 0.07, pz], s: [1.2, 0.14, 1.0], c: '#a58256' })
    const n = 2 + Math.floor(r() * 2)
    for (let k = 0; k < n; k++) for (const [dx, dz] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) P.push({ p: [px + dx, 0.14 + 0.2 + k * 0.4, pz + dz], s: [0.58, 0.39, 0.48], c: r() < 0.5 ? '#b58f62' : '#ad8858' })
  }
  return P
}

/** 车间里的灯：高处一排排工矿灯（发光的圆盘）、北墙的高窗 */
function Lamps() {
  const pos = useMemo(() => { const out: [number, number, number][] = []; for (const x of [-7, -1, 5, 11, 17, 23]) for (const z of [-8, -2, 4]) if (!(x < 1 && z < -2)) out.push([x, 7.1, z]); return out }, [])
  const body = useMemo(() => shell([[0.3, 0], [0.26, 0.12], [0.1, 0.3], [0.06, 0.42]], 0.01), [])
  return <group>
    {pos.map((p, i) => <group key={i} position={p}>
      <mesh geometry={body} rotation-x={Math.PI} position={[0, 0.42, 0]}><meshStandardMaterial color="#3d4246" roughness={0.5} metalness={0.4} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.01, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[0.26, 24]} /><meshBasicMaterial color="#fff6e6" toneMapped={false} /></mesh>
      <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.006, 0.006, 0.8, 4]} /><meshStandardMaterial color="#222" /></mesh>
    </group>)}
  </group>
}

/** 流水线上的瓷碗：平时沿皮带匀速往东走；第 7 课由那一课自己画 */
export function useBowlGeo() {
  return useMemo(() => shell([[0, 0], [0.032, 0], [0.034, 0.008], [0.05, 0.012], [0.068, 0.03], [0.078, 0.058], [0.08, 0.07]], 0.0035, { segs: 40 }), [])
}
function Bowls() {
  const geo = useBowlGeo(), ref = useRef<THREE.InstancedMesh>(null), N = 34
  const m = useMemo(() => new THREE.Matrix4(), [])
  const bw = useMemo(() => { const t = makeBlueWhite().clone(); t.repeat.set(1, 1); t.needsUpdate = true; return t }, [])
  useFrame(({ clock }) => {
    const im = ref.current; if (!im) return
    const len = LINE.x1 - 0.4 - (LINE.x0 + 3.6)
    for (let i = 0; i < N; i++) { const x = LINE.x0 + 3.6 + ((i / N) * len + clock.elapsedTime * 0.25) % len; m.makeTranslation(x, LINE.y + 0.002, LINE.z + ((i * 7) % 3 - 1) * 0.12); im.setMatrixAt(i, m) }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, undefined, N]} castShadow frustumCulled={false}><meshPhysicalMaterial map={bw} color="#ffffff" roughness={0.18} clearcoat={1} clearcoatRoughness={0.08} /></instancedMesh>
}

/** 皮带：深绿色 PVC，表面一道道细纹跟着走 */
function Belt() {
  const t = useMemo(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d')!; g.fillStyle = '#2d5b47'; g.fillRect(0, 0, 64, 8); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 2, 8); const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set((LINE.x1 - LINE.x0) * 6, 1); tx.colorSpace = THREE.SRGBColorSpace; return tx }, [])
  useFrame((_, dt) => { t.offset.x -= Math.min(dt, 0.05) * 0.25 * 6 })   // 皮带 0.25 m/s，贴图每米 6 格
  const roller = useMemo(() => lathe([[0, 0], [0.06, 0], [0.06, LINE.w + 0.04], [0, LINE.w + 0.04]], { segs: 24 }), [])
  return <group>
    <mesh position={[(LINE.x0 + LINE.x1) / 2, LINE.y - 0.008, LINE.z]} receiveShadow><boxGeometry args={[LINE.x1 - LINE.x0, 0.016, LINE.w]} /><meshStandardMaterial map={t} roughness={0.7} /></mesh>
    {[LINE.x0, LINE.x1].map(x => <mesh key={x} geometry={roller} position={[x, LINE.y - 0.06, LINE.z - LINE.w / 2 - 0.02]} rotation-x={Math.PI / 2} castShadow><Metal kind="steel" grain="turned" /></mesh>)}
  </group>
}

/** 工作灯：跟着当前这一课，从前上方打下来 */
function Key({ x, z, y = TABLE_H }: { x: number; z: number; y?: number }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(new THREE.Vector3(x, y, z))
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    const k = 1 - Math.exp(-Math.min(d, 1 / 30) / 0.45)
    cur.current.lerp(new THREE.Vector3(x, y, z), k)
    const c = cur.current, inside = c.x < ROOM.x1 && c.z < ROOM.z1
    l.position.set(c.x - 1.2, inside ? ROOM.h - 0.1 : 5.5, c.z + 2.2); aim.position.copy(c); aim.updateMatrixWorld()
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.62} penumbra={0.85} intensity={26} distance={14} decay={1.4} color="#fff4e4" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.01} />
  </>
}

export function World({ x = ST.l1.x, z = ST.l1.z, y, ownLine }: Partial<Want>) {
  const [cd, cn, cr] = useConcrete(60, 60)
  const tex = useMemo(() => {
    const clad = makeCladding(), wall = clad.map.clone(), wallB = clad.bump.clone(); wall.repeat.set(12, 1); wallB.repeat.set(12, 1); wall.needsUpdate = wallB.needsUpdate = true
    const ep = makeEpoxy().clone(); ep.repeat.set(10, 6); ep.needsUpdate = true
    const desk = makeDesk()
    return { wall, wallB, ep, desk,
      room: makeSign(['质检培训室'], '#2a6f9e', '#ffffff', 768, 160), hall: makeSign(['成型二车间'], '#2f3336', '#ffd45c', 1024, 180),
      rule: makeBoard('抽样检验', ['随机抽取，不挑不拣', '每只在灯下看一圈', '裂纹、缺口算次品', '记下抽检数和次品数'], '#2f8f6b'),
      safe: makeBoard('安全生产', ['走黄线内通道', '设备运转不伸手', '戴好手套', '下班关电源'], '#c0392b') }
  }, [])
  const geo = useMemo(() => ({ frame: mergeParts(frameParts()), room: mergeParts(roomParts()), line: mergeParts(lineParts()) }), [])
  const H = HALL, R = ROOM
  /** 只画朝里一面的墙：pos 是墙中心，rot 是绕 y 的转角（让正面朝外），BackSide 在里面看得见 */
  const wallMat = <meshStandardMaterial map={tex.wall} bumpMap={tex.wallB} bumpScale={2} roughness={0.55} metalness={0.15} color="#d9dcdc" />
  return (
    <group>
      <hemisphereLight args={['#e8eef2', '#6b6a63', 0.55]} />
      <Key x={x} z={z} y={y} />
      {/* 厂区地面和车间的环氧地坪 */}
      <mesh rotation-x={-Math.PI / 2} position={[5, -0.02, 0]} receiveShadow><planeGeometry args={[400, 400]} /><meshStandardMaterial map={cd} normalMap={cn} roughnessMap={cr} color="#a7a59c" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[(H.x0 + H.x1) / 2, 0.002, (H.z0 + H.z1) / 2]} receiveShadow><planeGeometry args={[H.x1 - H.x0, H.z1 - H.z0]} /><meshStandardMaterial map={tex.ep} roughness={0.32} metalness={0.05} /></mesh>
      {/* 黄色通道线：沿着流水线和培训室门口 */}
      {[[(2 + H.x1) / 2, -1.6, H.x1 - 2, 0.1], [(2 + H.x1) / 2, 0.6, H.x1 - 2, 0.1], [-6.5, -1.2, 19, 0.1]].map(([cx, cz, w, d], i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[cx, 0.004, cz]}><planeGeometry args={[w, d]} /><meshStandardMaterial color="#e2b62a" roughness={0.5} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[ST.l7.x, 0.004, ST.l7.z + 0.05]}><planeGeometry args={[2.2, 1.6]} /><meshStandardMaterial color="#e2b62a" roughness={0.5} transparent opacity={0.22} /></mesh>
      {/* 培训室的地面：浅灰的 PVC 地板 */}
      <mesh rotation-x={-Math.PI / 2} position={[(R.x0 + R.x1) / 2, 0.005, (R.z0 + R.z1) / 2]} receiveShadow><planeGeometry args={[R.x1 - R.x0, R.z1 - R.z0]} /><meshStandardMaterial color="#b9b8b1" roughness={0.45} /></mesh>
      {/* 四面墙：压型钢板，下面一道 1.2 m 高的混凝土墙裙 */}
      <mesh position={[(H.x0 + H.x1) / 2, H.h / 2, H.z0]}><planeGeometry args={[H.x1 - H.x0, H.h]} />{wallMat}</mesh>
      <mesh position={[(H.x0 + H.x1) / 2, H.h / 2, H.z1]} rotation-y={Math.PI}><planeGeometry args={[H.x1 - H.x0, H.h]} />{wallMat}</mesh>
      <mesh position={[H.x0, H.h / 2, (H.z0 + H.z1) / 2]} rotation-y={Math.PI / 2}><planeGeometry args={[H.z1 - H.z0, H.h]} />{wallMat}</mesh>
      <mesh position={[H.x1, H.h / 2, (H.z0 + H.z1) / 2]} rotation-y={-Math.PI / 2}><planeGeometry args={[H.z1 - H.z0, H.h]} />{wallMat}</mesh>
      <mesh position={[(H.x0 + H.x1) / 2, 0.6, H.z0 + 0.06]} receiveShadow><boxGeometry args={[H.x1 - H.x0, 1.2, 0.12]} /><meshStandardMaterial color="#a9a8a1" roughness={0.9} /></mesh>
      <mesh position={[H.x1 - 0.06, 0.6, (H.z0 + H.z1) / 2]} receiveShadow><boxGeometry args={[0.12, 1.2, H.z1 - H.z0]} /><meshStandardMaterial color="#a9a8a1" roughness={0.9} /></mesh>
      {/* 北墙高处一条采光窗 */}
      <mesh position={[(2 + H.x1) / 2, 4.6, H.z0 + 0.02]}><planeGeometry args={[H.x1 - 2.4, 1.3]} /><meshBasicMaterial color="#dfe9f0" toneMapped={false} /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[2.2 + i * 2, 4.6, H.z0 + 0.05]}><boxGeometry args={[0.08, 1.36, 0.06]} /><meshStandardMaterial color="#5f6a72" /></mesh>)}
      {/* 屋面：只从里面看得见；中间一条采光带 */}
      {[-1, 1].map(s => { const span = H.z1 - H.z0, len = Math.hypot(span / 2, 1.6), a = Math.atan2(1.6, span / 2); return <mesh key={s} position={[(H.x0 + H.x1) / 2, H.h + 0.8 + 0.25, (H.z0 + H.z1) / 2 + s * span / 4]} rotation-x={-Math.PI / 2 + s * a}><planeGeometry args={[H.x1 - H.x0, len]} /><meshStandardMaterial map={tex.wall} color="#c9cccc" roughness={0.6} side={THREE.BackSide} /></mesh> })}
      <mesh geometry={geo.frame} castShadow receiveShadow><Painted rough={0.5} metal={0.35} /></mesh>
      <Lamps />
      <mesh position={[(2 + H.x1) / 2, 7.6, H.z0 + 0.1]}><planeGeometry args={[5.6, 1]} /><meshStandardMaterial map={tex.hall} roughness={0.6} /></mesh>
      {/* 培训室：后墙贴白色墙板，吊顶只从下面看得见，嵌几块平板灯 */}
      <mesh position={[(R.x0 + R.x1) / 2, R.h / 2, R.z0 + 0.125]}><planeGeometry args={[R.x1 - R.x0, R.h]} /><meshStandardMaterial color="#ecebe6" roughness={0.85} /></mesh>
      <mesh position={[R.x0 + 0.03, R.h / 2, (R.z0 + R.z1) / 2]} rotation-y={Math.PI / 2}><planeGeometry args={[R.z1 - R.z0, R.h]} /><meshStandardMaterial color="#e6e5df" roughness={0.85} /></mesh>
      <mesh position={[(R.x0 + R.x1) / 2, 0.06, R.z0 + 0.135]}><boxGeometry args={[R.x1 - R.x0, 0.12, 0.02]} /><meshStandardMaterial color="#6b6f72" /></mesh>
      <mesh position={[(R.x0 + R.x1) / 2, R.h, (R.z0 + R.z1) / 2]} rotation-x={-Math.PI / 2}><planeGeometry args={[R.x1 - R.x0, R.z1 - R.z0]} /><meshStandardMaterial color="#efefea" roughness={0.9} side={THREE.BackSide} /></mesh>
      {[-13.5, -9.5, -5.5, -1.5].flatMap(cx => [-10.5, -6.5, -3.5].map(cz => <mesh key={`${cx}${cz}`} position={[cx, R.h - 0.01, cz]} rotation-x={Math.PI / 2}><planeGeometry args={[1.2, 0.6]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>))}
      <mesh geometry={geo.room} castShadow receiveShadow><Painted rough={0.45} metal={0.3} /></mesh>
      {/* 玻璃隔断 */}
      <mesh position={[R.x1, R.h / 2, (R.z0 + R.z1) / 2]} rotation-y={Math.PI / 2} renderOrder={5}><planeGeometry args={[R.z1 - R.z0, R.h]} /><meshPhysicalMaterial color="#dfeef0" transparent opacity={0.12} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[(R.x0 + R.x1) / 2, R.h / 2, R.z1]} renderOrder={5}><planeGeometry args={[R.x1 - R.x0, R.h]} /><meshPhysicalMaterial color="#dfeef0" transparent opacity={0.12} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[-9, R.h + 0.3, R.z1 + 0.06]}><planeGeometry args={[3.2, 0.66]} /><meshStandardMaterial map={tex.room} roughness={0.6} /></mesh>
      {/* 培训桌的桌面 */}
      {Object.entries(ST).filter(([k]) => k !== 'l7').map(([k, p]) => <RoundedBox key={k} args={[1.6, 0.03, 0.8]} radius={0.008} smoothness={2} position={[p.x, TABLE_H - 0.015, p.z]} castShadow receiveShadow><meshStandardMaterial map={tex.desk} roughness={0.55} /></RoundedBox>)}
      {/* 后墙：第 4 课的电子屏（外框，画面在课里画）、两张海报 */}
      <RoundedBox args={[SCREEN.w + 0.06, SCREEN.h + 0.06, 0.05]} radius={0.01} position={[SCREEN.x, SCREEN.y, SCREEN.z + 0.025]} castShadow><meshStandardMaterial color="#141518" roughness={0.3} metalness={0.2} /></RoundedBox>
      <mesh position={[SCREEN.x, SCREEN.y, SCREEN.z + 0.051]}><planeGeometry args={[SCREEN.w, SCREEN.h]} /><meshStandardMaterial color="#0b0f12" roughness={0.15} /></mesh>
      <mesh position={[-11.2, 1.75, R.z0 + 0.13]}><planeGeometry args={[0.7, 0.98]} /><meshStandardMaterial map={tex.rule} roughness={0.8} /></mesh>
      <mesh position={[-7.7, 1.75, R.z0 + 0.13]}><planeGeometry args={[0.7, 0.98]} /><meshStandardMaterial map={tex.safe} roughness={0.8} /></mesh>
      {/* 第 5 课的白板：移动白板架，画在课里 */}
      <WhiteboardStand />
      {/* 流水线、窑、抽检台、成品区 */}
      <mesh geometry={geo.line} castShadow receiveShadow><Painted rough={0.5} metal={0.3} /></mesh>
      <Belt />
      {!ownLine && <Bowls />}
      <mesh position={[6.4 - 0.2, 1.2, LINE.z + 0.751]}><planeGeometry args={[0.9, 0.5]} /><meshPhysicalMaterial color="#2a3a40" roughness={0.05} metalness={0.3} /></mesh>
    </group>
  )
}

/** 移动白板：两条腿带脚轮，白板在课里画 */
function WhiteboardStand() {
  const B = BOARD
  return <group position={[B.x, 0, B.z]}>
    <RoundedBox args={[B.w + 0.06, B.h + 0.06, 0.03]} radius={0.01} position={[0, B.y, 0]} castShadow><meshStandardMaterial color="#c9ced2" roughness={0.35} metalness={0.5} /></RoundedBox>
    <mesh position={[0, B.y, 0.016]}><planeGeometry args={[B.w, B.h]} /><meshPhysicalMaterial color="#f7f7f4" roughness={0.2} clearcoat={0.6} /></mesh>
    <mesh position={[0, B.y - B.h / 2 - 0.04, 0.05]} castShadow><boxGeometry args={[B.w * 0.8, 0.02, 0.07]} /><meshStandardMaterial color="#b9bec2" metalness={0.5} roughness={0.4} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * (B.w / 2 + 0.05), 0, 0]}>
      <mesh position={[0, (B.y + B.h / 2) / 2, 0]} castShadow><boxGeometry args={[0.035, B.y + B.h / 2, 0.035]} /><meshStandardMaterial color="#b9bec2" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0, 0.08, 0]} castShadow><boxGeometry args={[0.05, 0.04, 0.6]} /><meshStandardMaterial color="#b9bec2" metalness={0.5} roughness={0.4} /></mesh>
      {[-0.27, 0.27].map(dz => <mesh key={dz} position={[0, 0.035, dz]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.025, 16]} /><meshStandardMaterial color="#222" roughness={0.6} /></mesh>)}
    </group>)}
  </group>
}
