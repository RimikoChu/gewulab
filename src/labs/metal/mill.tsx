// 轧钢车间：一座长厂房（门式钢架、吊车梁；靠镜头这一面只留柱子和屋架，不挂墙板、不铺屋面板，看得见里面）。
// 里面从西到东：加热炉（出料口发着红光）、入口辊道、一架四辊可逆轧机（牌坊、支撑辊、工作辊、压下装置、传动轴、电机）、出口辊道、冷床，旁边堆着轧好的钢板。
// 尺寸按米写，整组放大 M 倍。钢坯本身随课的进度走，画在拓展课里。
import { useMemo } from 'react'
import * as THREE from 'three'
import { Metal, Painted, mergeParts, type Part } from '@/lab-kit'
import { asphaltTex, cladTex, roofTex, rep } from './mats'
import { Glow } from './fx'

/** 车间在世界里的原点（画面单位）；辊道面的高度、轧机的位置、加热炉出料口（米） */
export const MILL = { x: 1050, z: -60, table: 1.1, stand: 42.5, furnaceDoor: 6, x0: -22, x1: 140 }

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string): Part => ({ p: [x, y0 + h / 2, z], s: [w, h, d], c })
function shedParts() {
  const P: Part[] = [], col = '#5f6a72', beam = '#6c767d'
  const W = 15, H = 18
  // 门式钢架：两边的柱子、屋架，每 8 m 一榀
  for (let x = MILL.x0; x <= MILL.x1; x += 8) {
    // 两排柱子（带牛腿托吊车梁）；靠镜头这一面不挂墙板
    P.push(box(x, 0, -W, 0.9, H, 1.1, col), box(x, 13, -(W - 1.2), 0.8, 0.9, 1.6, col), box(x, 0, W, 0.7, H, 0.8, col))
    // 屋架：上弦两段斜梁、下弦一道平梁、几根腹杆
    for (const s of [-1, 1]) P.push({ p: [x, H + 1.4, s * W / 2], s: [0.4, 0.6, W + 0.6], c: beam, r: [s * Math.atan2(2.8, W), 0, 0] })
    P.push(box(x, H - 0.2, 0, 0.3, 0.4, W * 2, beam))
    for (let k = -3; k <= 3; k++) P.push({ p: [x, H + 1.4 - Math.abs(k) * 0.4, k * 4], s: [0.2, 2.8 - Math.abs(k) * 0.8, 0.2], c: beam, r: [k % 2 ? 0.4 : 0, 0, 0] })
  }
  // 吊车梁（轨道）
  P.push(box((MILL.x0 + MILL.x1) / 2, 13.9, -(W - 1.2), MILL.x1 - MILL.x0, 1.0, 0.7, '#7a6f5e'))
  // 屋面的檩条（屋面板只铺后半坡，前半坡只有屋架和檩条，看得见里面）
  for (let k = 1; k <= 4; k++) P.push(box((MILL.x0 + MILL.x1) / 2, H + 2.8 - k * 0.7 + 0.25, k * 3.5, MILL.x1 - MILL.x0, 0.22, 0.16, '#7d868c'))
  // 后墙下面一道砖墙
  P.push(box((MILL.x0 + MILL.x1) / 2, 0, -W - 0.4, MILL.x1 - MILL.x0, 2.4, 0.4, '#8f877b'))
  // 地面上的铁皮盖板、地沟
  P.push(box((MILL.x0 + MILL.x1) / 2, 0, 0, MILL.x1 - MILL.x0, 0.06, 5, '#3c3e40'))

  // ---- 加热炉：一座长的箱子，外面钢板，出料口朝东 ----
  P.push(box(-8, 0, 0, 26, 7.5, 10, '#5d5f61'), box(-8, 7.5, 0, 27, 0.6, 11, '#45474a'))
  for (let x = -20; x <= 4; x += 3) for (const s of [-1, 1]) P.push(box(x, 0, s * 5.15, 0.4, 7.5, 0.4, '#3f4245'))
  for (const x of [-16, -8, 0]) P.push({ p: [x, 9.85, 0], s: [0.9, 4.7, 0.9], c: '#6a6c6e', cyl: true })   // 炉顶的排烟管
  P.push(box(4.8, 3.2, 0, 0.6, 1.6, 3.6, '#2a2b2c'))   // 出料口上方的炉门（升起）

  // ---- 辊道：一根根辊子，下面是机架 ----
  // 辊子：横着的钢辊，顶面和辊道面齐平；两边各一道机架梁托着辊子的轴承
  for (let x = MILL.furnaceDoor + 0.4; x <= MILL.x1 - 2; x += 0.7) { if (Math.abs(x - MILL.stand) < 3.1) continue; P.push({ p: [x, MILL.table + 0.1 - 0.14, 0], s: [0.14, 3.2, 0.14], c: '#8b8f90', r: [Math.PI / 2, 0, 0], cyl: true }); for (const s of [-1, 1]) P.push(box(x, MILL.table - 0.26, s * 1.72, 0.26, 0.24, 0.2, '#34373a')) }
  // 辊道两侧的机架梁和一道道挡板（侧导板）
  for (const s of [-1, 1]) P.push(box((MILL.furnaceDoor + MILL.x1) / 2, 0, s * 1.72, MILL.x1 - MILL.furnaceDoor, MILL.table - 0.26, 0.42, '#45494d'), box((MILL.furnaceDoor + MILL.x1) / 2, MILL.table + 0.12, s * 1.95, MILL.x1 - MILL.furnaceDoor, 0.35, 0.08, '#5a5e61'))
  // 辊道的电机：每根辊子在后侧（−z）一个小电机
  for (let x = MILL.furnaceDoor + 0.4; x <= MILL.x1 - 2; x += 1.4) { if (Math.abs(x - MILL.stand) < 4) continue; P.push({ p: [x, MILL.table - 0.15, -2.35], s: [0.22, 0.5, 0.22], c: '#5a6a5a', r: [Math.PI / 2, 0, 0], cyl: true }) }

  // ---- 冷床：出口辊道后面一大片格栅 ----
  for (let x = 90; x <= 130; x += 0.8) P.push(box(x, 0, 8, 0.15, 0.9, 9, '#4c5155'))
  // 轧好的钢板，一摞摞
  for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) P.push(box(96 + i * 9, 0.1 + k * 0.08, -9, 7, 0.07, 2.4, k % 2 ? '#5f6366' : '#6a6e70'))
  // 一座操作室：玻璃窗的小房子
  P.push(box(MILL.stand + 15, 0, -9, 5, 3.6, 3.6, '#c9c6bd'), box(MILL.stand + 15, 1.4, -7.18, 4.4, 1.6, 0.05, '#2b3c45'))
  return P
}

/** 四辊可逆轧机：前后（±z）两片铸钢牌坊（带窗口的闭口机架），窗口里上下两根大支撑辊、两根工作辊，辊颈套在轴承座里；
 * 牌坊顶上是压下装置（电机、减速箱、压下螺丝）；传动侧（−z）两根接轴通到齿轮座和主电机。原点在轧制中心线的地面 */
function Stand() {
  const T = MILL.table + 0.1, cast = '#6d7276', dark = '#3d4246'
  const parts = useMemo(() => {
    const P: Part[] = []
    for (const s of [-1, 1]) {
      const z = s * 2.7
      // 牌坊：两根立柱、上横梁、下横梁，外侧一道加强筋
      for (const dx of [-1.6, 1.6]) { P.push(box(dx, -0.6, z, 1.0, 10.4, 1.3, cast)); P.push(box(dx + (dx > 0 ? 0.52 : -0.52), 0.2, z, 0.12, 8.6, 0.7, '#5e6367')) }
      P.push(box(0, 8.4, z, 4.2, 1.4, 1.3, cast), box(0, -0.6, z, 4.2, 0.9, 1.5, cast))
      // 地脚：牌坊脚下的轨座和螺栓
      P.push(box(0, -0.05, z, 5.6, 0.35, 2.0, dark))
      // 轴承座：上下支撑辊的大轴承座、工作辊的小轴承座
      P.push(box(0, T + 0.9, z, 1.9, 1.9, 1.15, '#82878a'), box(0, T + 0.12, z, 1.3, 0.75, 1.0, '#9aa0a3'))
      P.push(box(0, T - 0.87, z, 1.3, 0.75, 1.0, '#9aa0a3'), box(0, T - 2.8, z, 1.9, 1.9, 1.15, '#82878a'))
      // 压下螺丝：从上横梁穿下来顶住上支撑辊的轴承座
      P.push({ p: [0, T + 4.6, z], s: [0.32, 3.4, 0.32], c: '#a3a8aa', cyl: true })
    }
    // 压下装置：顶上的减速箱和两台电机
    P.push(box(0, 9.8, 0, 2.6, 1.3, 6.6, dark))
    // 压下电机：卧式的圆柱机身，外面一圈圈散热筋，一头接线盒
    for (const z of [-1.6, 1.6]) {
      P.push({ p: [0, 11.65, z], s: [0.55, 1.7, 0.55], c: '#4a5055', r: [0, 0, Math.PI / 2], cyl: true })
      for (let k = -3; k <= 3; k++) P.push({ p: [k * 0.22, 11.65, z], s: [0.63, 0.06, 0.63], c: '#3c4146', r: [0, 0, Math.PI / 2], cyl: true })
      P.push(box(0.2, 12.2, z, 0.5, 0.35, 0.45, '#3c4146'), box(0, 11.1, z, 1.4, 0.15, 1.0, dark))
    }
    // 齿轮座和主电机：在传动侧（−z）
    P.push(box(0, 0, -8.4, 2.8, 3.0, 2.6, dark))
    // 主电机：卧式圆柱机身（轴沿 z），散热筋、底座、接线盒
    P.push(box(0, 0, -12.6, 3.6, 0.6, 4.4, dark), { p: [0, 2.3, -12.6], s: [1.7, 4.4, 1.7], c: '#4a5055', r: [Math.PI / 2, 0, 0], cyl: true })
    for (let k = -6; k <= 6; k++) P.push({ p: [0, 2.3, -12.6 + k * 0.32], s: [1.82, 0.08, 1.82], c: '#3c4146', r: [Math.PI / 2, 0, 0], cyl: true })
    P.push(box(1.7, 2.6, -12.0, 0.6, 0.8, 0.9, '#3c4146'))
    // 入口、出口两边的导卫
    for (const sx of [-1, 1]) P.push(box(sx * 2.5, T - 0.22, 0, 1.0, 0.18, 3.0, '#55595c'))
    // 机旁的操作平台和栏杆（传动侧后面）
    P.push(box(0, 3.4, -5.2, 6, 0.15, 2.2, '#55595c'))
    for (let i = -3; i <= 3; i++) P.push({ p: [i, 4.0, -4.15], s: [0.04, 1.1, 0.04], c: '#d8b23a', cyl: true })
    P.push(box(0, 4.5, -4.15, 6, 0.06, 0.06, '#d8b23a'))
    return mergeParts(P)
  }, [])
  const rolls = useMemo(() => {
    const g: THREE.BufferGeometry[] = []
    const roll = (y: number, r: number, neck: number) => { const c = new THREE.CylinderGeometry(r, r, 4.2, 48); c.rotateX(Math.PI / 2); c.translate(0, y, 0); g.push(c); const n = new THREE.CylinderGeometry(r * neck, r * neck, 6.4, 24); n.rotateX(Math.PI / 2); n.translate(0, y, 0); g.push(n) }
    roll(T + 0.42, 0.42, 0.6); roll(T - 0.42, 0.42, 0.6)          // 工作辊：直径约 0.84 m
    roll(T + 0.84 + 0.8, 0.8, 0.55); roll(T - 0.84 - 0.8, 0.8, 0.55)  // 支撑辊：直径约 1.6 m
    return g.map(x => x.toNonIndexed())
  }, [])
  const spindles = useMemo(() => [T + 0.42, T - 0.42].map(y => { const c = new THREE.CylinderGeometry(0.26, 0.26, 4.0, 16); c.rotateX(Math.PI / 2); c.translate(0, y, -5.1); return c }), [])
  return <group position={[MILL.stand, 0, 0]}>
    <mesh geometry={parts} castShadow receiveShadow><Painted rough={0.5} metal={0.45} /></mesh>
    {rolls.map((g, i) => <mesh key={i} geometry={g} castShadow><Metal kind="steel" grain="turned" rough={0.18} /></mesh>)}
    {spindles.map((g, i) => <mesh key={i} geometry={g} castShadow><Metal kind="steel" grain="turned" /></mesh>)}
  </group>
}

export function Mill({ lit = false }: { lit?: boolean }) {
  const tex = useMemo(() => ({ clad: rep(cladTex(), 18, 1), roof: rep(roofTex(), 40, 2), floor: rep(asphaltTex(), 40, 8) }), [])
  const geo = useMemo(() => {
    const L = MILL.x1 - MILL.x0, cx = (MILL.x0 + MILL.x1) / 2
    const back = new THREE.BoxGeometry(L, 15.6, 0.3); back.translate(cx, 2.4 + 7.8, -15.4)
    const roof = new THREE.BoxGeometry(L + 2, 0.25, 15.8); roof.rotateX(Math.atan2(2.8, 15)); roof.translate(cx, 18 + 1.6, -7.5)
    const floor = new THREE.BoxGeometry(L, 0.1, 30); floor.translate(cx, 0.05, 0)
    const ends = [MILL.x0 - 0.5, MILL.x1 + 0.5].map(x => { const e = new THREE.BoxGeometry(0.3, 18, 15.3); e.translate(x, 9, -7.65); return e })
    return { shed: mergeParts(shedParts()), back, roof, ends, floor }
  }, [])
  return (
    <group position={[MILL.x, 0, MILL.z]} scale={6}>
      <mesh geometry={geo.shed} castShadow receiveShadow><Painted rough={0.6} metal={0.3} /></mesh>
      <mesh geometry={geo.back} castShadow receiveShadow><meshStandardMaterial map={tex.clad} color="#c7cdd0" roughness={0.6} metalness={0.25} /></mesh>
      <mesh geometry={geo.roof} castShadow receiveShadow><meshStandardMaterial map={tex.roof} roughness={0.55} metalness={0.35} side={THREE.DoubleSide} /></mesh>
      {geo.ends.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><meshStandardMaterial map={tex.clad} color="#c7cdd0" roughness={0.6} metalness={0.25} /></mesh>)}
      <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.floor} color="#a9a69e" roughness={0.9} /></mesh>
      <Stand />
      {/* 加热炉出料口：里面红热的炉膛 */}
      <mesh position={[4.52, 2.4, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[3.4, 1.6]} /><meshBasicMaterial color={new THREE.Color('#ff7a2a').multiplyScalar(2.2)} toneMapped={false} /></mesh>
      <Glow at={[5.2, 2.4, 0]} size={5} color="#ff9a4a" level={0.7} flicker={0.06} light={600} distance={70} />
      {/* 车间顶上的一排灯 */}
      {[20, 45, 75].map(x => <pointLight key={x} position={[x, 16.5, 2]} intensity={lit ? 260 : 0} distance={220} decay={1.4} color="#fff1dc" />)}
    </group>
  )
}
