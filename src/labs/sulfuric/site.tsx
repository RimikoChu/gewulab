// 厂区里工艺设备以外的东西：原料棚、矿堆和上料皮带、炉前风机、成品酸罐、装车台和槽车，远处的厂房和冷却塔，路边的树。单位 m。
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal, Painted, bolts, disc, lathe, mergeParts, type Part } from '@/lab-kit'
import { cladTex, makeSign, oreTex, paintTex, rep, warnSign } from './mats'
import { box, cyl, headPts, platformParts, rng, type RY, type V3 } from './parts'
import { Blower, ROAST } from './plant'

export const SHED = { x: -36, z: -2, w: 18, d: 16, h: 9 } as const
export const TANKS = { x: 96, z: -5, r: 5, h: 9, gap: 13 } as const
export const LOAD = { x: 100, z: 9.5 } as const
const Paint = ({ color, rough = 0.5 }: { color: string; rough?: number }) => <meshPhysicalMaterial color={color} roughness={rough} metalness={0.2} clearcoat={0.35} clearcoatRoughness={0.4} />

/** 一堆矿石：一个表面坑坑洼洼的圆锥形料堆。r 底半径，h 高 */
function pileGeo(r: number, h: number, seed: number) {
  const f = rng(seed), prof: RY[] = [[0, h]]
  for (let i = 1; i <= 10; i++) { const k = i / 10; prof.push([r * k, h * (1 - k) ** 1.25]) }
  const g = lathe(prof.reverse(), { segs: 40, crease: 80 }), p = g.attributes.position
  // 同一处的顶点挪一样多（接缝才不裂开）：按位置算一个确定的起伏
  const bump = (x: number, z: number) => Math.sin(x * 2.1 + seed) * Math.cos(z * 1.7 - seed) * 0.5 + Math.sin(x * 5.3 + z * 4.1) * 0.25
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > 0.02) p.setY(i, y + bump(x, z) * 0.22 * Math.min(1, Math.hypot(x, z) / r * 3)) }
  void f
  g.computeVertexNormals()
  return g
}
/** 原料棚（敞开的钢结构料棚）、矿堆、上料的斜皮带廊和炉前的加料斗、鼓空气的风机 */
export function OreYard() {
  const S = SHED
  const tex = useMemo(() => ({ clad: rep(cladTex(), 6, 1), roof: rep(cladTex(), 8, 3), ore: rep(oreTex(), 6, 3), sign: makeSign(['原料库'], '#2b5f86', '#ffffff', 384, 128) }), [])
  const g = useMemo(() => {
    const P: Part[] = [], hw = S.w / 2, hd = S.d / 2
    for (let i = 0; i <= 3; i++) for (const sz of [-1, 1]) P.push(box(-hw + i * S.w / 3, 0, sz * hd, 0.4, S.h, 0.4, '#2e6b94'), box(-hw + i * S.w / 3, 0, sz * hd, 0.9, 0.4, 0.9, '#a9a59c'))
    for (const sz of [-1, 1]) P.push(box(0, S.h - 0.5, sz * hd, S.w, 0.5, 0.3, '#2e6b94'))
    // 屋架：每榀一根下弦、两根斜的上弦、几根腹杆
    for (let i = 0; i <= 3; i++) { const x = -hw + i * S.w / 3; P.push(box(x, S.h - 0.3, 0, 0.2, 0.22, S.d, '#2e6b94')); for (const s of [-1, 1]) { P.push({ p: [x, S.h + 1.0, s * hd / 2], s: [0.2, 0.22, Math.hypot(hd, 2.2)], c: '#2e6b94', r: [s * Math.atan2(2.2, hd), 0, 0] }); P.push(box(x, S.h - 0.2, s * hd / 2, 0.12, 1.1, 0.12, '#2e6b94')) } P.push(box(x, S.h - 0.2, 0, 0.12, 2.2, 0.12, '#2e6b94')) }
    // 矮的挡料墙
    P.push(box(0, 0, -hd + 0.3, S.w - 1, 2.4, 0.4, '#b3afa6'), box(-hw + 0.3, 0, 0, 0.4, 2.4, S.d - 1, '#b3afa6'))
    // 斜皮带廊：从棚口爬到炉前，下面几榀支架
    const x0 = S.x + hw - 2, x1 = ROAST.x - ROAST.r - 2.9, y0 = 1.4, y1 = 8.6, L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0)
    const gx = (x0 + x1) / 2 - S.x, gy = (y0 + y1) / 2
    P.push({ p: [gx, gy, 2 - S.z], s: [L, 0.24, 1.3], c: '#6f777c', r: [0, 0, a] }, { p: [gx, gy + 0.2, 2 - S.z], s: [L - 0.2, 0.1, 0.9], c: '#26282a', r: [0, 0, a] })
    for (const s of [-1, 1]) P.push({ p: [gx, gy + 0.75, 2 - S.z + s * 0.62], s: [L, 0.06, 0.06], c: '#d9a51c', r: [0, 0, a] })
    for (let k = 0.2; k < 1; k += 0.26) { const x = x0 + (x1 - x0) * k - S.x, y = y0 + (y1 - y0) * k; for (const s of [-1, 1]) P.push(box(x, 0, 2 - S.z + s * 0.7, 0.18, y - 0.1, 0.18, '#7c8388')); P.push(box(x, y * 0.55, 2 - S.z, 0.12, 0.12, 1.4, '#7c8388')) }
    // 炉前的加料斗和支架
    const hx = x1 + 0.9 - S.x
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(box(hx + sx * 0.9, 0, 2 - S.z + sz * 0.9, 0.2, 6.4, 0.2, '#7c8388'))
    P.push(box(hx, 6.4, 2 - S.z, 2.2, 0.2, 2.2, '#7c8388'), box(hx, 7.6, 2 - S.z, 2.0, 1.2, 2.0, '#8a4a3a'))
    return { frame: mergeParts(P), pile1: pileGeo(5.2, 3.6, 3), pile2: pileGeo(3.6, 2.4, 8), hop: new THREE.ConeGeometry(1.4, 1.3, 4, 1) }
  }, [S])
  const hd = S.d / 2, hx = ROAST.x - ROAST.r - 2.0
  return <group>
    <group position={[S.x, 0, S.z]}>
      <mesh geometry={g.frame} castShadow receiveShadow><Painted rough={0.6} metal={0.2} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[0, S.h + 1.15, s * hd / 2]} rotation-x={s * Math.atan2(2.2, hd)} castShadow receiveShadow><boxGeometry args={[S.w + 1.2, 0.12, Math.hypot(hd, 2.2) + 0.6]} /><meshStandardMaterial map={tex.roof} color="#8ea2b4" roughness={0.6} metalness={0.3} /></mesh>)}
      <mesh position={[0, S.h - 1.6, -hd - 0.1]} castShadow receiveShadow><boxGeometry args={[S.w, 5, 0.12]} /><meshStandardMaterial map={tex.clad} roughness={0.7} metalness={0.25} /></mesh>
      <mesh position={[-S.w / 2 - 0.1, S.h - 1.6, 0]} castShadow receiveShadow><boxGeometry args={[0.12, 5, S.d]} /><meshStandardMaterial map={tex.clad} roughness={0.7} metalness={0.25} /></mesh>
      <mesh position={[0, S.h - 0.9, hd + 0.2]}><planeGeometry args={[3.6, 1.2]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
      <mesh geometry={g.pile1} position={[-2.5, 0, -1.5]} castShadow receiveShadow><meshStandardMaterial map={tex.ore} roughness={0.85} metalness={0.25} /></mesh>
      <mesh geometry={g.pile2} position={[4.4, 0, 2.6]} castShadow receiveShadow><meshStandardMaterial map={tex.ore} roughness={0.85} metalness={0.25} /></mesh>
    </group>
    {/* 加料斗的锥底，接到炉子的加料口 */}
    <mesh geometry={g.hop} position={[hx, 5.75, 2]} rotation={[Math.PI, Math.PI / 4, 0]} castShadow><Paint color="#8a4a3a" /></mesh>
    <mesh position={[hx + 0.55, 5.1, 1.0]} rotation={[0.9, 0, -0.5]} castShadow><cylinderGeometry args={[0.3, 0.3, 2.6, 16]} /><Paint color="#7d4333" /></mesh>
    {/* 炉前鼓空气的风机 */}
    <Blower at={[-23.6, 0, 2.6]} k={0.62} color="#6f98bd" />
    {/* 排渣：炉渣沿溜管落进渣车 */}
    <group position={[ROAST.x + ROAST.r + 1.9, 0, 0]}>
      <mesh position-y={0.75} castShadow receiveShadow><boxGeometry args={[2.4, 1.1, 1.7]} /><Paint color="#4a5560" /></mesh>
      <mesh position-y={1.32}><boxGeometry args={[2.2, 0.06, 1.5]} /><meshStandardMaterial color="#6b3a2c" roughness={1} /></mesh>
      {[-0.7, 0.7].flatMap(x => [-0.9, 0.9].map(z => <mesh key={`${x}${z}`} position={[x, 0.3, z]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.3, 0.3, 0.2, 18]} /><meshStandardMaterial color="#1d1e20" roughness={0.8} /></mesh>))}
    </group>
  </group>
}

/** 成品酸储罐：两只立式平底罐，锥顶，盘梯，围堰，警示牌 */
export function AcidTanks() {
  const T = TANKS
  const tex = useMemo(() => ({ skin: rep(paintTex('#b3b5b0', 41), 6, 2), sign: warnSign('浓硫酸 · 当心腐蚀') }), [])
  const g = useMemo(() => {
    const body = lathe([[0, 0], [T.r, 0], [T.r, T.h], [T.r + 0.08, T.h], [T.r + 0.08, T.h + 0.1], [0.5, T.h + 1.3], [0.5, T.h + 1.6], [0, T.h + 1.6]], { segs: 56 })
    const P: Part[] = []
    for (let k = 0; k < 30; k++) { const a = Math.PI * (1.9 - k * 0.04), y = 0.4 + k * (T.h - 0.4) / 30; P.push({ p: [Math.cos(a) * (T.r + 0.5), y, -Math.sin(a) * (T.r + 0.5)], s: [0.9, 0.06, 0.36], c: '#7b7f82', r: [0, a, 0] }, { p: [Math.cos(a) * (T.r + 0.95), y + 0.55, -Math.sin(a) * (T.r + 0.95)], s: [0.04, 1.1, 0.04], c: '#d9a51c' }) }
    P.push(...platformParts(T.r - 1.2, T.h + 0.2, 0, Math.PI * 2, 1.1))
    for (let i = 1; i < 4; i++) P.push(cyl(0, i * T.h / 4 - 0.04, 0, T.r + 0.03, 0.06, '#c3c4c0'))
    return { body, parts: mergeParts(P), pad: disc(T.r + 0.5, 0.4, { chamfer: 0.06 }) }
  }, [T])
  const bund = useMemo(() => { const P: Part[] = [], cx = T.gap / 2, w = T.gap + 2 * T.r + 6, d = 2 * T.r + 6; P.push(box(cx, 0, -d / 2, w, 1.1, 0.35, '#aaa69d'), box(cx, 0, d / 2, w, 1.1, 0.35, '#aaa69d'), box(cx - w / 2, 0, 0, 0.35, 1.1, d, '#aaa69d'), box(cx + w / 2, 0, 0, 0.35, 1.1, d, '#aaa69d')); return mergeParts(P) }, [T])
  return <group position={[T.x, 0, T.z]}>
    <mesh geometry={bund} castShadow receiveShadow><Painted rough={0.92} metal={0} /></mesh>
    {[0, 1].map(i => <group key={i} position-x={i * T.gap}>
      <mesh geometry={g.pad} receiveShadow><meshStandardMaterial color="#b4b0a7" roughness={0.9} /></mesh>
      <mesh geometry={g.body} position-y={0.4} castShadow receiveShadow><meshPhysicalMaterial map={tex.skin} roughness={0.45} metalness={0.2} clearcoat={0.3} clearcoatRoughness={0.5} /></mesh>
      <mesh geometry={g.parts} position-y={0.4} castShadow><Painted rough={0.6} metal={0.25} /></mesh>
      <mesh position={[0, 4.2, T.r + 0.03]}><planeGeometry args={[4.4, 1.7]} /><meshStandardMaterial map={tex.sign} roughness={0.6} /></mesh>
      <mesh position={[-T.r - 0.3, 1.0, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.16, 0.16, 0.7, 16]} /><Paint color="#b58a3c" /></mesh>
    </group>)}
  </group>
}

/** 一辆运酸的槽车：驾驶室、车架、不锈钢罐体（椭圆封头、加强圈、顶上人孔和走道）、三根轴。车头朝 +x，原点在后轴下面的地面 */
export function Tanker({ at, fill = 0 }: { at: V3; fill?: number }) {
  const g = useMemo(() => {
    const tank = lathe([[0, -4.1], ...headPts(1.05, -3.7, 0.4, -1).reverse().slice(1), ...headPts(1.05, 3.7, 0.4, 1)], { segs: 44 })
    const ring = disc(1.09, 0.08, { hole: 1.0 })
    const tire = lathe([[0.26, -0.15], [0.46, -0.15], [0.52, -0.09], [0.52, 0.09], [0.46, 0.15], [0.26, 0.15]], { segs: 28, closed: true })
    const hub = lathe([[0, -0.1], [0.26, -0.1], [0.26, 0.1], [0.12, 0.14], [0, 0.14]], { segs: 20 })
    const P: Part[] = []
    P.push(box(1.6, 0.72, 0, 11.4, 0.22, 0.9, '#2a2c2f'))                                    // 大梁
    for (const x of [-1.6, 0.6, 3.2]) P.push(box(x, 0.94, 0, 0.3, 0.35, 1.9, '#3a3d41'))    // 罐的鞍座
    P.push(box(-3.4, 0.5, 0, 0.14, 0.5, 2.3, '#c2c5c8'), box(1.0, 0.45, 1.2, 4.2, 0.4, 0.06, '#c2c5c8'), box(1.0, 0.45, -1.2, 4.2, 0.4, 0.06, '#c2c5c8'))   // 后防护、侧防护
    P.push(box(0.8, 3.36, 0, 5.6, 0.05, 0.5, '#8d9296'))                                     // 罐顶走道
    for (const s of [-1, 1]) P.push(box(0.8, 3.4, s * 0.27, 5.6, 0.34, 0.03, '#d9a51c'))
    P.push(box(-3.25, 1.3, 0.5, 0.05, 2.0, 0.05, '#c2c5c8'), box(-3.25, 1.3, 0.9, 0.05, 2.0, 0.05, '#c2c5c8'))   // 后爬梯
    for (let y = 1.5; y < 3.3; y += 0.3) P.push(box(-3.25, y, 0.7, 0.04, 0.04, 0.4, '#c2c5c8'))
    P.push(box(5.1, 0.95, 0, 0.5, 1.3, 2.2, '#2a2c2f'))                                      // 驾驶室后的备胎架和油箱
    return { tank, ring, tire, hub, frame: mergeParts(P), nb: bolts(12, 0.3, 0.05, 0.04) }
  }, [])
  const tex = useMemo(() => ({ plate: warnSign('腐蚀品') }), [])
  const wheel = (x: number, z: number, k: number) => <group key={`${x}${z}`} position={[x, 0.52, z]} rotation-x={k * Math.PI / 2}>
    <mesh geometry={g.tire} castShadow><meshStandardMaterial color="#17181a" roughness={0.9} /></mesh>
    <mesh geometry={g.hub}><Metal kind="aluminum" grain="turned" /></mesh>
  </group>
  void fill
  return <group position={at}>
    <mesh geometry={g.frame} castShadow receiveShadow><Painted rough={0.5} metal={0.4} /></mesh>
    {/* 罐体 */}
    <group position={[0.8, 2.3, 0]} rotation-z={Math.PI / 2}>
      <mesh geometry={g.tank} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.3} /></mesh>
      {[-2.6, -0.9, 0.9, 2.6].map(y => <mesh key={y} geometry={g.ring} position-y={y} castShadow><Metal kind="stainless" grain="brushed" rough={0.35} /></mesh>)}
    </group>
    <mesh position={[0.2, 3.45, 0]} castShadow><cylinderGeometry args={[0.34, 0.34, 0.22, 24]} /><Metal kind="stainless" grain="turned" /></mesh>
    <mesh geometry={g.nb} position={[0.2, 3.56, 0]}><Metal kind="steel" grain="cast" /></mesh>
    <mesh position={[0.8, 2.3, 1.06]}><planeGeometry args={[1.5, 0.6]} /><meshStandardMaterial map={tex.plate} roughness={0.6} /></mesh>
    {/* 驾驶室：圆角的车头、前挡风、保险杠 */}
    <group position={[6.7, 0, 0]}>
      <mesh position={[0, 2.0, 0]} castShadow receiveShadow><boxGeometry args={[2.2, 2.6, 2.4]} /><Paint color="#2f6f9c" rough={0.35} /></mesh>
      <mesh position={[0.2, 3.4, 0]} castShadow><boxGeometry args={[1.7, 0.3, 2.2]} /><Paint color="#2a648d" rough={0.35} /></mesh>
      <mesh position={[1.105, 2.55, 0]}><boxGeometry args={[0.02, 1.0, 2.1]} /><meshPhysicalMaterial color="#1b2a35" roughness={0.08} metalness={0.5} clearcoat={1} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[0.35, 2.55, s * 1.205]}><boxGeometry args={[0.9, 0.8, 0.02]} /><meshPhysicalMaterial color="#1b2a35" roughness={0.08} metalness={0.5} clearcoat={1} /></mesh>)}
      <mesh position={[1.12, 1.55, 0]}><boxGeometry args={[0.04, 0.7, 1.5]} /><meshStandardMaterial color="#15171a" roughness={0.5} metalness={0.5} /></mesh>
      <mesh position={[1.15, 0.72, 0]} castShadow><boxGeometry args={[0.3, 0.45, 2.45]} /><meshStandardMaterial color="#2a2c2f" roughness={0.5} metalness={0.4} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[1.27, 0.76, s * 0.9]}><boxGeometry args={[0.04, 0.2, 0.42]} /><meshBasicMaterial color="#fff3d0" toneMapped={false} /></mesh>)}
    </group>
    {[-2.4, -1.2].flatMap(x => [wheel(x, 1.0, 1), wheel(x, -1.0, -1)])}
    {[3.6, 6.9].flatMap(x => [wheel(x, 1.0, 1), wheel(x, -1.0, -1)])}
  </group>
}
/** 装车台：一座钢平台，上面一根能放下来的装车鹤管，旁边一间计量小屋 */
export function LoadingBay({ arm = 0 }: { arm?: number }) {
  const L = LOAD
  const g = useMemo(() => {
    const P: Part[] = []
    for (const x of [-3, 0, 3]) for (const z of [-0.8, 0.8]) P.push(box(x, 0, z - 3.2, 0.24, 4.2, 0.24, '#7c8388'))
    P.push(box(0, 4.2, -3.2, 7, 0.16, 2.2, '#7b7f82'))
    for (const z of [-4.25, -2.15]) { for (const yy of [0.6, 1.15]) P.push(box(0, 4.3 + yy, z, 7, 0.05, 0.05, '#d9a51c')); for (let x = -3.5; x <= 3.5; x += 1.4) P.push(box(x, 4.3, z, 0.05, 1.15, 0.05, '#d9a51c')) }
    for (let i = 0; i < 12; i++) P.push(box(-4.2 - i * 0.26, 4.1 - i * 0.34, -3.2, 0.3, 0.05, 1.0, '#7b7f82'))
    P.push(box(0.2, 0, -3.2, 0.3, 6.6, 0.3, '#b58a3c'))                                       // 鹤管的立柱
    P.push(box(7.4, 0, -4.2, 3.2, 2.8, 2.6, '#d8d4ca'), box(7.4, 2.8, -4.2, 3.6, 0.2, 3.0, '#8f948f'), box(7.4, 1.2, -2.88, 1.4, 1.1, 0.06, '#33454f'))
    return mergeParts(P)
  }, [])
  return <group position={[L.x, 0, L.z]}>
    <mesh geometry={g} castShadow receiveShadow><Painted rough={0.6} metal={0.25} /></mesh>
    {/* 鹤管：一根横臂加一根垂下的下料管，arm 0–1 是放下多少 */}
    <group position={[0.2, 6.4, -3.2]}>
      <mesh position={[0, 0, 1.6]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.1, 0.1, 3.2, 14]} /><Paint color="#b58a3c" /></mesh>
      <mesh position={[0, -0.7 - arm * 0.6, 3.2]} castShadow><cylinderGeometry args={[0.09, 0.09, 1.6, 14]} /><Paint color="#b58a3c" /></mesh>
    </group>
  </group>
}

/** 远处：别的厂房、机械通风冷却塔、锅炉房和它的烟囱、一座双曲线冷却塔；厂区路灯、消火栓；让厂区有纵深 */
export function Distant() {
  const geo = useMemo(() => {
    const P: Part[] = [], r = rng(77)
    for (let i = 0; i < 14; i++) { const w = 30 + r() * 50, hh = 6 + r() * 10, xx = -170 + i * 34 + r() * 10, zz = -150 - r() * 70; P.push(box(xx, 0, zz, w, hh, 20 + r() * 20, r() < 0.5 ? '#5f666b' : '#6b6a63')) }
    for (let i = 0; i < 5; i++) P.push(box(10 + i * 9, 0, -48, 7, 10, 16, '#7d868b'), box(10 + i * 9, 1, -39.95, 6.2, 4, 0.1, '#4a5257'), cyl(10 + i * 9, 10, -48, 3, 2.4, '#8d9498'))
    P.push(box(-40, 0, -46, 26, 14, 16, '#8b9096'), box(-40, 14, -46, 27, 0.4, 17, '#6f757a'), cyl(-36, 0, -52, 1.4, 38, '#7f7b73'))
    for (let x = -60; x <= 120; x += 18) P.push(cyl(x, 0, -21, 0.09, 9, '#9aa0a4'), box(x, 9, -20.5, 0.3, 0.14, 1.0, '#5b6064'))
    for (const x of [-26, -2, 26, 54, 84]) P.push(cyl(x, 0, -19.5, 0.16, 0.9, '#b8322a'), cyl(x, 0.9, -19.5, 0.2, 0.16, '#b8322a'))
    // 变电所和几只变压器
    P.push(box(60, 0, -34, 14, 6, 9, '#cfcac0'), box(60, 6, -34, 14.6, 0.3, 9.6, '#8f948f'))
    for (let i = 0; i < 3; i++) P.push(box(54 + i * 4.5, 0, -27, 2.8, 3, 2.2, '#6f7a74'))
    return mergeParts(P)
  }, [])
  const tower = useMemo(() => lathe([[0, 0], [34, 0], [26, 50], [22, 78], [24, 96], [23.4, 96], [21.4, 78], [25.4, 50], [33.4, 0.6], [0, 0.6]]), [])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.85} metal={0.1} /></mesh>
    <mesh geometry={tower} position={[110, 0, -230]} receiveShadow><meshStandardMaterial color="#bdb9b0" roughness={0.95} side={THREE.DoubleSide} /></mesh>
  </group>
}

/** 路对面的草地；树只在厂区两头的远处各留一小排，不进各课的画面 */
export function Greenery() {
  const trees = useMemo(() => {
    const r = rng(29), out: { p: V3; s: number; a: number }[] = []
    const row = (x0: number, x1: number, z: number, step: number) => { for (let x = x0; x <= x1; x += step) out.push({ p: [x + (r() - 0.5) * 1.5, 0, z + (r() - 0.5) * 1.2], s: 0.8 + r() * 0.5, a: r() * 6 }) }
    row(-160, -110, 60, 14); row(170, 230, 60, 14)
    return out
  }, [])
  const crownGeo = useMemo(() => {
    const r = rng(5), blobs = [[0, 0, 0, 1], [0.7, 0.35, 0.2, 0.72], [-0.6, 0.3, -0.3, 0.7], [0.1, 0.75, -0.1, 0.66], [-0.2, 0.2, 0.7, 0.62], [0.3, -0.1, -0.7, 0.6]].map(([x, y, z, s]) => {
      const g = new THREE.SphereGeometry(s, 20, 14), p = g.attributes.position, ph = r() * 6
      for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), k = 1 + 0.1 * Math.sin(px * 7 + ph) * Math.cos(py * 6 + pz * 5) + 0.06 * Math.sin(pz * 13 + px * 9); p.setXYZ(i, px * k + x, py * k * 0.9 + y, pz * k + z) }
      g.computeVertexNormals(); return g
    })
    return mergeGeometries(blobs)
  }, [])
  const trunk = useRef<THREE.InstancedMesh>(null), crown = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const o = new THREE.Object3D()
    trees.forEach((t, i) => {
      o.position.set(t.p[0], 1.3 * t.s, t.p[2]); o.scale.set(t.s, t.s, t.s); o.rotation.set(0, 0, 0); o.updateMatrix(); trunk.current?.setMatrixAt(i, o.matrix)
      o.position.set(t.p[0], 4.0 * t.s, t.p[2]); o.scale.setScalar(t.s * 1.75); o.rotation.set(0, t.a, 0); o.updateMatrix(); crown.current?.setMatrixAt(i, o.matrix)
    })
    for (const m of [trunk.current, crown.current]) if (m) m.instanceMatrix.needsUpdate = true
  }, [trees])
  const grass = <meshStandardMaterial color="#5e7448" roughness={1} />
  return <group>
    {([[10, 29.7, 290, 9.4], [10, 55, 300, 42], [5, -70, 10, 4]] as const).map(([x, z, w, d], i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.02, z]} receiveShadow><planeGeometry args={[w, d]} />{grass}</mesh>)}
    {[14.25, 24.75].map(z => <mesh key={z} position={[10, 0.08, z]} receiveShadow><boxGeometry args={[300, 0.16, 0.3]} /><meshStandardMaterial color="#bdb9ae" roughness={0.9} /></mesh>)}
    <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow><cylinderGeometry args={[0.13, 0.2, 2.6, 10]} /><meshStandardMaterial color="#5a4632" roughness={0.9} /></instancedMesh>
    <instancedMesh ref={crown} args={[crownGeo, undefined, trees.length]} castShadow receiveShadow><meshStandardMaterial color="#3d5a34" roughness={0.95} /></instancedMesh>
  </group>
}
