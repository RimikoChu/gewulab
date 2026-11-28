// 第 1 课的主角：原油加热炉（立式圆筒炉）和常压分馏塔。两台都能朝镜头剖开：
// 炉子里看得见贴墙的一圈炉管、炉底的火嘴和耐火衬里；塔里是一层层塔盘（塔板、降液管、溢流堰、泡罩），盘上的液体从上到下由浅到深。
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Metal, Painted, bolts, disc, mergeParts, shell, type Part } from '@/lab-kit'
import { Flow } from './flow'
import { Brick, Concrete, CutSteel, CutWool, Flame, Jacket, Paint } from './look'
import { gratingTex, rep } from './mats'
import { box, cyl, deckGeo, headPts, ladderParts, latheArc, pipeGeo, platformParts, vesselPts, type RY, type V3 } from './parts'
import type { FractionKey } from './physics'

/** 分馏塔：中心、保温层外半径、筒体上下沿 */
export const TW = { x: 5, z: -6, r: 2.3, ri: 2.04, y0: 4.6, y1: 35 }
/** 加热炉：中心、辐射室半径和上下沿 */
export const FN = { x: -9, z: -6, r: 2.7, y0: 3.2, y1: 12 }
/** 塔盘：最下面一层的高度、层距、层数 */
export const TRAY = { y0: 9.6, dy: 1.6, n: 15 }
export const trayY = (i: number) => TRAY.y0 + TRAY.dy * i
/** 进料口的高度；各馏分出塔的高度 */
export const FEED_Y = 7.7
export const DRAW_Y: Record<FractionKey, number> = { gas: 36.6, gasoline: trayY(11) + 0.3, kerosene: trayY(7) + 0.3, diesel: trayY(3) + 0.3, residue: 3.4 }
/** 各馏分的颜色：越重越深 */
export const FRACTION_COLOR: Record<FractionKey, string> = { gas: '#e8f0f2', gasoline: '#ecd98a', kerosene: '#d7a646', diesel: '#a8691f', residue: '#2a1b10' }
const liquidColor = (y: number) => { const c = new THREE.Color(), stops: [number, string][] = [[9, '#3b2412'], [14, '#96601e'], [21, '#cc9c3c'], [27, '#e6d27c'], [33, '#f0e8b8']]; let i = 1; while (i < stops.length - 1 && stops[i][0] < y) i++; const [y0, c0] = stops[i - 1], [y1, c1] = stops[i]; return c.set(c0).lerp(new THREE.Color(c1), Math.max(0, Math.min(1, (y - y0) / (y1 - y0)))) }

/** 从炉子到塔的转油线；各馏分出塔以后走的管子（世界坐标） */
export const FEED_PIPE: V3[] = [[FN.x + 1.3, 15.6, FN.z - 1.0], [FN.x + 3.6, 15.6, FN.z - 1.0], [FN.x + 3.6, FEED_Y, FN.z - 1.0], [TW.x - 4, FEED_Y, TW.z], [TW.x - TW.r + 0.1, FEED_Y, TW.z]]
const side = (y: number, k: number): V3[] => [[TW.x + TW.r - 0.1, y, TW.z], [TW.x + 3.6 + k * 0.55, y, TW.z], [TW.x + 3.6 + k * 0.55, y, TW.z - 3.2 - k * 0.5], [TW.x + 3.6 + k * 0.55, 8.6 - k * 0.3, TW.z - 3.2 - k * 0.5], [TW.x + 3.6 + k * 0.55, 8.6 - k * 0.3, TW.z - 11]]
export const DRAW_PIPE: Record<FractionKey, V3[]> = {
  gas: [[TW.x, 36.0, TW.z], [TW.x, 37.4, TW.z], [TW.x, 37.4, TW.z - 3.6], [TW.x, 14.6, TW.z - 3.6], [TW.x + 1.5, 14.6, TW.z - 8]],
  gasoline: side(DRAW_Y.gasoline, 2), kerosene: side(DRAW_Y.kerosene, 1), diesel: side(DRAW_Y.diesel, 0),
  residue: [[TW.x, 3.7, TW.z], [TW.x, 1.3, TW.z], [TW.x + 5.2, 1.3, TW.z], [TW.x + 5.2, 1.3, TW.z - 11]],
}

/** 一层塔盘的形状：后半个圆去掉降液管那一条弓形。c 是弦到圆心的距离，side 是降液管在哪一边 */
function trayShape(ri: number, c: number, side: number) {
  const s = new THREE.Shape(), a = Math.acos(c / ri)
  if (side > 0) { s.moveTo(-ri, 0); s.absarc(0, 0, ri, Math.PI, a, true); s.lineTo(c, 0) } else { s.moveTo(ri, 0); s.absarc(0, 0, ri, 0, Math.PI - a, false); s.lineTo(-c, 0) }
  s.closePath(); return s
}
/** 降液管那一条弓形 */
function segShape(ri: number, c: number, side: number) {
  const s = new THREE.Shape(), a = Math.acos(c / ri)
  if (side > 0) { s.moveTo(c, 0); s.lineTo(c, Math.sqrt(ri * ri - c * c)); s.absarc(0, 0, ri, a, 0, true) } else { s.moveTo(-c, 0); s.lineTo(-ri, 0); s.absarc(0, 0, ri, Math.PI, Math.PI - a, true) }
  s.closePath(); return s
}
const slabOf = (s: THREE.Shape, y: number, h: number) => { const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 28 }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g }

/** 分馏塔。cut：朝镜头剖开；on：0–1，塔里有没有油气在走 */
export function Tower({ cut = false, on = 0 }: { cut?: boolean; on?: number }) {
  const { r, ri, y0, y1 } = TW, rs = ri + 0.06
  const grate = useMemo(() => rep(gratingTex(), 10, 1.5), [])
  const geo = useMemo(() => {
    const steelP: RY[] = [...vesselPts(rs, y0, y1, 1.0), ...vesselPts(ri, y0, y1, 0.95).reverse()]
    const insP: RY[] = [...vesselPts(r, y0, y1, 1.12), ...vesselPts(rs, y0, y1, 1.0).reverse()]
    const half = (p: RY[], a0: number) => latheArc(p, a0, Math.PI, { segs: 44 })
    const C = 1.45, L = Math.sqrt(ri * ri - C * C)
    const plates: THREE.BufferGeometry[] = [], weirs: Part[] = [], liquids: { g: THREE.BufferGeometry; c: THREE.Color }[] = [], caps: V3[] = []
    for (let i = 0; i < TRAY.n; i++) {
      const y = trayY(i), sd = i % 2 ? 1 : -1, col = liquidColor(y)
      plates.push(slabOf(trayShape(ri - 0.01, C, sd), y, 0.05))
      weirs.push(box(sd * (C - 0.02), y + 0.05, -L / 2, 0.04, 0.22, L, '#8f9498'))                                 // 溢流堰
      weirs.push(box(sd * C, y - TRAY.dy + 0.42, -L / 2, 0.04, TRAY.dy - 0.42, L, '#8f9498'))                       // 降液管的挡板
      liquids.push({ g: slabOf(trayShape(ri - 0.02, C - 0.04, sd), y + 0.05, 0.2), c: col })
      liquids.push({ g: slabOf(segShape(ri - 0.02, C + 0.03, sd), y - TRAY.dy + 0.05, 0.75), c: liquidColor(y - 1) })   // 降液管里积着的液体
      for (let x = -C + 0.42; x <= C - 0.42; x += 0.4) for (let z = -0.28; z > -ri; z -= 0.4) if (Math.hypot(x, z) < ri - 0.28) caps.push([x, y + 0.05, z])
    }
    const plat: Part[] = [], decks: THREE.BufferGeometry[] = []
    ;[12.4, 18.8, 25.2, 31.6].forEach((y, i) => { plat.push(...platformParts(r, y, 0.5, Math.PI - 0.12), ...ladderParts(r, Math.PI * (i % 2 ? 0.36 : 0.44), y - 6.4, y)); decks.push(deckGeo(r, y, 0.5, Math.PI - 0.12)) })
    plat.push(...platformParts(r - 0.5, y1 + 0.75, 0.25, Math.PI * 2 - 0.25, 1.0), ...ladderParts(r, Math.PI * 0.4, 31.6, y1 + 0.75)); decks.push(deckGeo(r - 0.5, y1 + 0.75, 0.25, Math.PI * 2 - 0.25))
    // 各接管的短节和法兰（塔的本地坐标）
    const noz: Part[] = []
    for (const k of ['gasoline', 'kerosene', 'diesel'] as const) noz.push({ p: [r + 0.25, DRAW_Y[k], 0], s: [0.24, 0.7, 0.24], c: '#c9cdd0', cyl: true, r: [0, 0, Math.PI / 2] }, { p: [r + 0.62, DRAW_Y[k], 0], s: [0.36, 0.12, 0.36], c: '#8d9296', cyl: true, r: [0, 0, Math.PI / 2] })
    noz.push({ p: [-r - 0.3, FEED_Y, 0], s: [0.42, 0.8, 0.42], c: '#c9cdd0', cyl: true, r: [0, 0, Math.PI / 2] }, { p: [-r - 0.72, FEED_Y, 0], s: [0.58, 0.14, 0.58], c: '#8d9296', cyl: true, r: [0, 0, Math.PI / 2] })
    return {
      steel: [half(steelP, 0), half(steelP, Math.PI)], ins: [half(insP, 0), half(insP, Math.PI)],
      plates: plates, weirs: mergeParts(weirs), liquids, caps,
      pool: latheArc([...headPts(ri - 0.01, y0, 0.94, -1).reverse(), [ri - 0.01, 6.2], [0, 6.2]], 0, Math.PI, { segs: 40 }),
      skirt: shell([[rs - 0.02, 0.7], [rs - 0.02, y0 + 0.1]], 0.05), base: new THREE.CylinderGeometry(3.0, 3.1, 0.7, 8),
      plat: mergeParts(plat), decks, noz: mergeParts(noz),
      rings: mergeParts(Array.from({ length: 6 }, (_, i) => cyl(0, 8 + i * 5, 0, r + 0.02, 0.07, '#9da2a6'))),
      manhole: disc(0.42, 0.1), manBolts: bolts(14, 0.35, 0.05),
    }
  }, [r, ri, rs, y0, y1])
  const pipes = useMemo(() => {
    const local = (pts: V3[]) => pts.map(p => [p[0] - TW.x, p[1], p[2] - TW.z] as V3)
    return { gas: pipeGeo(local(DRAW_PIPE.gas), 0.3), g: pipeGeo(local(DRAW_PIPE.gasoline), 0.16), k: pipeGeo(local(DRAW_PIPE.kerosene), 0.16), d: pipeGeo(local(DRAW_PIPE.diesel), 0.16), res: pipeGeo(local(DRAW_PIPE.residue), 0.22) }
  }, [])
  const capRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => { const m = capRef.current; if (!m) return; const o = new THREE.Object3D(); geo.caps.forEach((p, i) => { o.position.set(p[0], p[1] + 0.07, p[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix) }); m.instanceMatrix.needsUpdate = true }, [geo.caps, cut])
  // 塔里上升的油气：贴着剖面往上走，在每层塔盘之间左右折一下
  const vapor = useMemo(() => [-1.1, -0.4, 0.3, 1.0].map((x, j) => { const pts: V3[] = [[TW.x + x, 6.6, TW.z - 0.5 - j * 0.3]]; for (let i = 0; i < TRAY.n; i++) pts.push([TW.x + x + (i % 2 ? 0.25 : -0.25), trayY(i) + 0.8, TW.z - 0.5 - j * 0.3]); pts.push([TW.x + x * 0.3, 35.2, TW.z - 0.6]); return pts }), [])
  const shellPart = (i: number) => <group key={i}>
    <mesh geometry={geo.steel[i]} castShadow><Metal kind="steel" grain="brushed" rough={0.55} /><CutSteel /></mesh>
    <mesh geometry={geo.ins[i]} castShadow receiveShadow><Jacket attach="material-0" rx={3} ry={12} /><CutWool /></mesh>
  </group>
  return <group position={[TW.x, 0, TW.z]}>
    <mesh geometry={geo.base} position-y={0.35} receiveShadow castShadow><Concrete /></mesh>
    <mesh geometry={geo.skirt} castShadow receiveShadow><Paint color="#6c7479" plate rx={6} ry={2} /></mesh>
    {shellPart(0)}
    {!cut && shellPart(1)}
    <mesh geometry={geo.rings} castShadow visible={!cut}><Painted rough={0.5} metal={0.6} /></mesh>
    {cut && <>
      {geo.plates.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.45} /></mesh>)}
      <mesh geometry={geo.weirs} castShadow><Painted rough={0.45} metal={0.7} /></mesh>
      <instancedMesh ref={capRef} args={[undefined, undefined, geo.caps.length]} castShadow><cylinderGeometry args={[0.11, 0.12, 0.14, 12]} /><Metal kind="stainless" rough={0.4} /></instancedMesh>
      {geo.liquids.map((l, i) => <mesh key={i} geometry={l.g} renderOrder={2}><meshPhysicalMaterial color={l.c} transparent opacity={0.82} roughness={0.12} clearcoat={1} /></mesh>)}
      <mesh geometry={geo.pool}><meshPhysicalMaterial attach="material-0" color="#20140b" roughness={0.15} clearcoat={1} /><meshPhysicalMaterial attach="material-1" color="#2a1a0d" roughness={0.2} clearcoat={1} /></mesh>
      {/* 剖面前面打一盏灯，把塔里照亮 */}
      <pointLight position={[-1, 20, 9]} intensity={1.5} distance={40} decay={0} color="#fff3e2" />
    </>}
    <mesh geometry={geo.plat} castShadow><Painted rough={0.55} metal={0.3} /></mesh>
    {geo.decks.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><meshStandardMaterial attach="material-0" map={grate} roughness={0.7} metalness={0.4} /><meshStandardMaterial attach="material-1" color="#4c5257" /></mesh>)}
    <mesh geometry={geo.noz} castShadow><Painted rough={0.45} metal={0.7} /></mesh>
    {[12, 23, 30].map(y => <group key={y} position={[Math.cos(2.5) * (r + 0.02), y, -Math.sin(2.5) * (r + 0.02)]} rotation={[0, 2.5, -Math.PI / 2]}>
      <mesh geometry={geo.manhole} castShadow><Paint color="#8b9296" /></mesh><mesh geometry={geo.manBolts} position-y={0.1}><Metal kind="steel" /></mesh>
    </group>)}
    {/* 塔顶油气线、三条侧线、塔底出料 */}
    <mesh geometry={pipes.gas} castShadow><Jacket rx={1} ry={14} /></mesh>
    {[pipes.g, pipes.k, pipes.d].map((g, i) => <mesh key={i} geometry={g} castShadow><Jacket rx={1} ry={10} /></mesh>)}
    <mesh geometry={pipes.res} castShadow><Jacket rx={1} ry={8} /></mesh>
    {/* 塔底泵 */}
    <Pump at={[4.2, 0, 0]} />
    <group position={[-TW.x, 0, -TW.z]}>
      {cut && <Flow paths={vapor} density={0.9} speed={2.6} size={0.085} jitter={0.12} on={on} color={u => u < 0.3 ? '#ffd9a0' : u < 0.7 ? '#fff0c8' : '#f4fbff'} />}
    </group>
  </group>
}

/** 一台离心泵：底座、电机（带散热筋）、联轴器护罩、蜗壳、进出口法兰 */
export function Pump({ at, rot = 0, s = 1 }: { at: V3; rot?: number; s?: number }) {
  const fins = useMemo(() => mergeParts(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return { p: [0, Math.cos(a) * 0.3, Math.sin(a) * 0.3] as V3, s: [0.72, 0.035, 0.07] as V3, c: '#2f5f8a', r: [a, 0, 0] as V3 } })), [])
  return <group position={at} rotation-y={rot} scale={s}>
    <mesh position={[0.2, 0.1, 0]} castShadow receiveShadow><boxGeometry args={[2.3, 0.2, 0.9]} /><Concrete /></mesh>
    <mesh position={[0.2, 0.24, 0]} castShadow><boxGeometry args={[2.1, 0.08, 0.7]} /><Paint color="#3b4146" /></mesh>
    <mesh position={[-0.35, 0.62, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.28, 0.28, 0.8, 24]} /><Paint color="#2f5f8a" /></mesh>
    <mesh geometry={fins} position={[-0.35, 0.62, 0]} castShadow><Painted rough={0.5} /></mesh>
    <mesh position={[-0.82, 0.62, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.3, 0.24, 0.16, 24]} /><Paint color="#274f73" /></mesh>
    <mesh position={[0.3, 0.6, 0]} castShadow><boxGeometry args={[0.36, 0.3, 0.34]} /><Paint color="#d9a51c" /></mesh>
    <mesh position={[0.82, 0.62, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.4, 0.4, 0.3, 28]} /><Paint color="#4f6b5a" /></mesh>
    <mesh position={[1.05, 0.62, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.2, 0.2, 0.3, 20]} /><Paint color="#4f6b5a" /></mesh>
    <mesh position={[1.22, 0.62, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.3, 0.3, 0.06, 20]} /><Metal kind="steel" /></mesh>
    <mesh position={[0.82, 1.1, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.4, 20]} /><Paint color="#4f6b5a" /></mesh>
    <mesh position={[0.82, 1.3, 0]} castShadow><cylinderGeometry args={[0.26, 0.26, 0.06, 20]} /><Metal kind="steel" /></mesh>
  </group>
}

/** 加热炉。cut：朝镜头剖开；fire：0–1，火嘴烧得多旺 */
export function Furnace({ cut = false, fire = 0 }: { cut?: boolean; fire?: number }) {
  const { r, y0, y1 } = FN, rb = r - 0.05, rl = r - 0.36
  const grate = useMemo(() => rep(gratingTex(), 10, 1.5), [])
  const geo = useMemo(() => {
    const casing: RY[] = [[rb, y0], [r, y0], [r, y1], [1.55, y1 + 1.7], [1.5, y1 + 1.7], [rb, y1]]
    const lining: RY[] = [[rl, y0], [rb, y0], [rb, y1], [1.5, y1 + 1.7], [1.2, y1 + 1.7], [rl, y1 - 0.1]]
    const floor: RY[] = [[0, y0 - 0.25], [r, y0 - 0.25], [r, y0], [0, y0]]
    const half = (p: RY[], a0: number) => latheArc(p, a0, Math.PI, { segs: 40 })
    // 贴墙的一圈炉管（只画后半圈）和上下的回弯头
    const tubes: Part[] = [], N = 20
    for (let i = 0; i < N; i++) { const a = 0.12 + (Math.PI - 0.24) * i / (N - 1), x = Math.cos(a) * (rl - 0.22), z = -Math.sin(a) * (rl - 0.22); tubes.push(cyl(x, y0 + 0.5, z, 0.085, y1 - y0 - 1.1, '#6a5a50')) ; tubes.push({ p: [x, i % 2 ? y0 + 0.5 : y1 - 0.6, z], s: [0.12, 0.12, 0.12], c: '#6a5a50', cyl: true }) }
    const st: Part[] = []
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2, x = Math.cos(a) * (r - 0.3), z = Math.sin(a) * (r - 0.3); st.push(box(x, 0, z, 0.3, y0 - 0.25, 0.3, '#5d6468'), box(x, 0, z, 0.7, 0.3, 0.7, '#a5a39b')) }
    // 外壳上的竖筋和箍
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; if (Math.sin(a) < -0.05) continue; st.push({ p: [Math.cos(a) * (r + 0.04), (y0 + y1) / 2, -Math.sin(a) * (r + 0.04)], s: [0.1, y1 - y0, 0.1], c: '#7d858a', r: [0, a, 0] }) }
    // 对流室、烟道挡板、烟囱
    st.push(box(0, y1 + 1.7, 0, 3.0, 3.6, 3.0, '#868e93'), box(0, y1 + 1.9, 1.52, 2.6, 3.2, 0.06, '#757d82'), box(-1.6, y1 + 2.0, 0, 0.3, 3.0, 2.4, '#6d7479'), box(1.6, y1 + 2.0, 0, 0.3, 3.0, 2.4, '#6d7479'))
    for (let k = 0; k < 5; k++) for (let j = 0; j < 4; j++) st.push({ p: [1.78, y1 + 2.5 + k * 0.55, -0.9 + j * 0.6], s: [0.1, 0.1, 0.1], c: '#4d5357', cyl: true, r: [0, 0, Math.PI / 2] })
    st.push({ p: [0, y1 + 5.9, 0], s: [1.1, 1.2, 1.1], c: '#868e93', cyl: true })
    const stack = shell([[1.0, y1 + 6.4], [0.8, y1 + 8], [0.74, 31.5]], 0.05)
    for (const y of [22, 26, 30]) st.push(cyl(0, y, 0, 0.82, 0.08, '#6d7479'))
    st.push(cyl(0, 31.4, 0, 0.84, 0.16, '#5d6468'))
    // 炉底的火嘴（露在炉底下面的一截）和燃料气环管
    const burners: V3[] = [[-1.15, 0, -0.85], [1.15, 0, -0.85], [0, 0, -1.7], [0, 0, -0.35]]
    for (const b of [...burners, [-1.15, 0, 0.85] as V3, [1.15, 0, 0.85] as V3]) st.push(cyl(b[0], y0 - 0.85, b[2], 0.26, 0.6, '#3d4246'), cyl(b[0], y0 - 1.05, b[2], 0.1, 0.25, '#b08a2e'))
    // 看火门
    for (const a of [0.5, 1.3, 2.1, 2.7]) st.push({ p: [Math.cos(a) * (r + 0.03), y0 + 1.4, -Math.sin(a) * (r + 0.03)], s: [0.12, 0.4, 0.5], c: '#3d4246', r: [0, a, 0] })
    const plat = [...platformParts(r, y1 + 0.3, 0.2, Math.PI - 0.2), ...ladderParts(r, Math.PI * 0.62, 0.3, y1 + 0.3), ...platformParts(0.8, 24, 0, Math.PI * 2 - 0.01, 0.9), ...ladderParts(0.8, Math.PI * 0.5, y1 + 5.5, 24)]
    return { casing: [half(casing, 0), half(casing, Math.PI)], lining: [half(lining, 0), half(lining, Math.PI)], floor: latheArc(floor, 0, Math.PI * 2, { segs: 40 }), tiles: mergeParts(burners.map(b => cyl(b[0], y0, b[2], 0.3, 0.12, '#8a7a66'))),
      tubes: mergeParts(tubes), st: mergeParts(st), stack, plat: mergeParts(plat), decks: [deckGeo(r, y1 + 0.3, 0.2, Math.PI - 0.2), deckGeo(0.8, 24, 0, Math.PI * 2 - 0.01, 0.9)], burners,
      ring: new THREE.TorusGeometry(1.75, 0.07, 10, 48) }
  }, [r, rb, rl, y0, y1])
  const feed = useMemo(() => pipeGeo(FEED_PIPE.map(p => [p[0] - FN.x, p[1], p[2] - FN.z] as V3), 0.3), [])
  const inlet = useMemo(() => pipeGeo([[-1.75, y1 + 4.2, 0.6], [-2.6, y1 + 4.2, 0.6], [-2.6, 1.2, 0.6], [-2.6, 1.2, -11]], 0.2), [y1])
  const part = (i: number) => <group key={i}>
    <mesh geometry={geo.casing[i]} castShadow receiveShadow><Paint attach="material-0" color="#aeb4b7" plate rx={4} ry={3} rough={0.55} /><CutSteel /></mesh>
    <mesh geometry={geo.lining[i]} receiveShadow><Brick attach="material-0" hot={fire} rx={6} ry={5} /><Brick attach="material-1" rx={2} ry={2} /></mesh>
  </group>
  return <group position={[FN.x, 0, FN.z]}>
    <mesh position-y={0.1} receiveShadow><cylinderGeometry args={[3.5, 3.6, 0.2, 32]} /><Concrete /></mesh>
    {part(0)}
    {!cut && part(1)}
    <mesh geometry={geo.floor} castShadow receiveShadow><Paint attach="material-0" color="#767d82" /><Paint attach="material-1" color="#767d82" /></mesh>
    <mesh geometry={geo.tiles}><Painted rough={0.9} metal={0} /></mesh>
    <mesh geometry={geo.tubes} castShadow><meshStandardMaterial vertexColors roughness={0.55} metalness={0.5} emissive="#ff4a12" emissiveIntensity={fire * 0.5} /></mesh>
    <mesh geometry={geo.st} castShadow receiveShadow><Painted rough={0.55} metal={0.35} /></mesh>
    <mesh geometry={geo.stack} castShadow><Paint color="#9aa1a5" plate rx={2} ry={6} rough={0.6} /></mesh>
    <mesh geometry={geo.ring} position-y={y0 - 1.2} rotation-x={Math.PI / 2} castShadow><Paint color="#d9a51c" /></mesh>
    <mesh geometry={geo.plat} castShadow><Painted rough={0.55} metal={0.3} /></mesh>
    {geo.decks.map((g, i) => <mesh key={i} geometry={g} castShadow receiveShadow><meshStandardMaterial attach="material-0" map={grate} roughness={0.7} metalness={0.4} /><meshStandardMaterial attach="material-1" color="#4c5257" /></mesh>)}
    <mesh geometry={feed} castShadow><Jacket rx={1} ry={12} /></mesh>
    <mesh geometry={inlet} castShadow><Paint color="#5a5550" /></mesh>
    {geo.burners.map((b, i) => <Flame key={i} at={[b[0], y0 + 0.1, b[2]]} h={i === 3 ? 4.2 : 5.2} r={0.42} on={fire} seed={i} light={i === 3} />)}
  </group>
}
