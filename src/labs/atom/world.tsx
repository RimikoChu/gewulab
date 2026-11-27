// 分子和原子实验室的大场景：一间中学化学实验室。北墙一条长实验台（黑色理化板台面、柜体、白瓷砖墙裙），
// 西头一台通风橱，东头墙上挂一张元素周期表；屋子中间两排学生实验台，天花板上一排平板灯。各课在长实验台上各占一格，换课时镜头沿台子飞过去。
// 第 1、6 课的“放大”：整间屋子绕着那滴水等比放大（每一课把放大倍数和中心点交给世界），和镜头一路推近是一回事。
// 画面里 1 m 画成 M 个单位；下面的尺寸都按米写，用 u() 换算。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { LabStage, Painted, mergeParts, type Label, type Part } from '@/lab-kit'
import { benchTex, makeBoard, makeSign, periodicTex, plasterTex, rng, tileTex, wallTileTex } from './mats'

export const M = 10
export const u = (v: number) => v * M
export const TOP = u(0.85)                 // 长实验台台面的高度
export type V3 = [number, number, number]

/** 屋子：x、z 的范围（m），层高 */
export const ROOM = { x0: -8, x1: 7.8, z0: -0.8, z1: 7.5, h: 3.2 }
/** 长实验台的前后沿（m）；器材摆在 z = BZ 这条线上 */
export const BENCH = { x0: -7.6, x1: 7.5, z0: -0.78, z1: -0.02 }
export const BZ = u(-0.36)
/** 各课在台上的位置（x，画面单位） */
export const ST = { l2: u(-6.55), l1: u(-4.6), l3: u(-3.0), l4: u(-1.4), l5: u(0.35), l6: u(2.2), l7: u(4.2), x: u(6.1) }
/** 通风橱的范围（m） */
export const HOOD = { x0: -7.55, x1: -5.55, top: 2.35 }
/** 周期表挂图的位置（m）：中心 x、底边 y、宽、高 */
export const POSTER = { x: 4.2, y: 1.06, w: 1.5, h: 0.91 }

/** 一块板，贴图按它在世界里的位置铺，k 是贴图一格多大（画面单位） */
export function slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, k = 6) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) / k : p.getX(i) / k, Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) / k : p.getY(i) / k)
  return g
}

const spot = (x: number, y: number, z: number, w: number, h: number, view: [number, number]) => ({ target: new THREE.Vector3(x, y, z), span: [w, h] as [number, number], view })
/** 各课的机位：远近、角度各不一样，每课的主角在画面中间 */
export const SPOT = {
  l1: spot(ST.l1, TOP + u(0.0026), BZ + u(0.12), u(0.3), u(0.18), [-0.12, 0.24]),
  l2: spot(ST.l2, TOP + u(0.1), BZ + u(0.05), u(0.42), u(0.26), [0.16, 0.22]),
  l3: spot(ST.l3, TOP + u(0.1), BZ + u(0.05), u(0.32), u(0.24), [-0.14, 0.15]),
  l4: spot(ST.l4, TOP + u(0.135), BZ + u(0.05), u(0.18), u(0.25), [0.1, 0.06]),
  l5: spot(ST.l5, TOP + u(0.24), BZ + u(0.06), u(0.46), u(0.47), [-0.12, 0.12]),
  l6: spot(ST.l6, TOP + u(0.16 - 0.0021), BZ + u(0.02), u(0.3), u(0.18), [-0.3, 0.12]),
  l7: spot(ST.l7, TOP + u(0.55), BZ + u(0.06), u(1.45), u(1.2), [-0.06, 0.1]),
  x: spot(ST.x, TOP + u(0.1), BZ + u(0.05), u(0.38), u(0.27), [0.1, 0.15]),
  q: spot(u(1.6), u(1.25), u(0.6), u(4.4), u(2.4), [-0.6, 0.06]),
}
export type SpotKey = keyof typeof SPOT

/** 每一课交给世界的要求：工作灯跟到哪；放大倍数 s 和放大的中心 P（第 1、6 课） */
export interface Want { x: number; s?: number; P?: V3; wide?: boolean }

/** 这一课的舞台：选一处机位。室内，摄影棚式的环境光 */
/** aim：临时换一个看向的点（放大时镜头先对准放大中心），不给就用这一课机位的 */
export function Place({ at, labels, children = null, s = 1, P, aim }: { at: SpotKey; labels: Label[]; children?: ReactNode; s?: number; P?: V3; aim?: V3 }) {
  const v = SPOT[at]
  const want = useMemo<Want>(() => ({ x: v.target.x, s, P, wide: at === 'q' }), [v, s, P, at])
  const target = useMemo(() => aim ? new THREE.Vector3(...aim) : v.target, [aim?.[0], aim?.[1], aim?.[2], v])   // eslint-disable-line react-hooks/exhaustive-deps
  return <LabStage<Want> labels={labels} target={target} span={v.span} view={v.view} sun={1.1} env={0.62} studio sky={false} backdrop="#14191d" fog={[u(9), u(30)]} bloom={0.5} world={want}>{children}</LabStage>
}

/** 跟着世界一起放大的一组东西：放在台上、要随“放大”一起变大的器材都包在里面 */
export function Zoomed({ s = 1, P, children }: { s?: number; P?: V3; children: ReactNode }) {
  if (!P || s === 1) return <group>{children}</group>
  return <group position={[P[0] * (1 - s), P[1] * (1 - s), P[2] * (1 - s)]} scale={s} visible={s < 600}>{children}</group>
}

// ---------- 屋子 ----------
function roomParts() {
  const P: Part[] = [], B = BENCH, T = 0.85
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: string) => P.push({ p: [u((x0 + x1) / 2), u((y0 + y1) / 2), u((z0 + z1) / 2)], s: [u(x1 - x0), u(y1 - y0), u(z1 - z0)], c })
  // 长实验台的柜体：浅灰的柜门一扇扇，门缝深一点，每扇一只不锈钢拉手；台面下一道踢脚
  for (let x = HOOD.x1 + 0.02; x < B.x1 - 0.3; x += 0.6) {
    box(x + 0.01, x + 0.59, 0.1, T - 0.04, B.z1 - 0.03, B.z1 - 0.01, '#d9dcda')
    box(x + 0.22, x + 0.38, T - 0.12, T - 0.1, B.z1 - 0.01, B.z1 + 0.012, '#9aa0a4')
  }
  box(B.x0, B.x1, 0, 0.1, B.z0 + 0.04, B.z1 - 0.06, '#3a3e42')
  box(B.x0, B.x1, 0.1, T - 0.04, B.z0, B.z1 - 0.04, '#c9cdcb')
  // 台面后沿的挡水条、一条设备带（插座和水嘴之间）
  box(B.x0, B.x1, T, T + 0.03, B.z0, B.z0 + 0.03, '#2a2e31')
  for (const x of [-5.3, -3.8, -2.2, -0.55, 1.3, 3.2, 5.2]) { box(x - 0.06, x + 0.06, T + 0.38, T + 0.46, B.z0, B.z0 + 0.02, '#ecebe6'); box(x - 0.025, x + 0.025, T + 0.4, T + 0.44, B.z0 + 0.02, B.z0 + 0.024, '#2b2e30') }
  // 两格之间的小水槽和鹅颈水嘴
  for (const x of [-3.8, 1.3]) { box(x - 0.2, x + 0.2, T + 0.001, T + 0.006, B.z0 + 0.1, B.z0 + 0.42, '#8f979b'); P.push({ p: [u(x), u(T + 0.2), u(B.z0 + 0.07)], s: [u(0.012), u(0.4), u(0.012)], c: '#c6cbce', cyl: true }); box(x - 0.012, x + 0.012, T + 0.39, T + 0.41, B.z0 + 0.07, B.z0 + 0.2, '#c6cbce') }
  // 墙上的吊柜：两段，白色柜门
  for (const [a, b] of [[-5.2, -3.2], [-0.2, 1.6], [5.0, 7.3]]) { box(a, b, 1.95, 2.55, ROOM.z0, ROOM.z0 + 0.34, '#e4e5e1'); for (let x = a; x < b - 0.05; x += 0.5) box(x + 0.01, x + 0.49, 1.97, 2.53, ROOM.z0 + 0.34, ROOM.z0 + 0.35, '#eeefeb') }
  // 屋子中间两排学生实验台：台面、柜体、台面上一个试剂架；每张台前两只凳子
  for (const z of [2.4, 4.6]) for (const x of [-5.6, -1.5, 2.6]) {
    box(x - 1.6, x + 1.6, 0.1, 0.78, z - 0.38, z + 0.38, '#cfd3d1'); box(x - 1.62, x + 1.62, 0.78, 0.81, z - 0.4, z + 0.4, '#25292c')
    box(x - 0.9, x + 0.9, 0.81, 1.1, z - 0.06, z + 0.06, '#d8d4c8'); box(x - 0.9, x + 0.9, 1.1, 1.12, z - 0.1, z + 0.1, '#b8b2a2')
    for (const dx of [-0.9, 0, 0.9]) { P.push({ p: [u(x + dx), u(0.32), u(z + 0.7)], s: [u(0.02), u(0.64), u(0.02)], c: '#6d7377', cyl: true }); P.push({ p: [u(x + dx), u(0.66), u(z + 0.7)], s: [u(0.17), u(0.05), u(0.17)], c: '#2f4f73', cyl: true }) }
  }
  // 东墙边的药品柜（玻璃门）、西墙边的洗眼器
  box(ROOM.x1 - 0.42, ROOM.x1, 0, 2.2, 1.0, 2.6, '#d7dad7'); box(ROOM.x1 - 0.43, ROOM.x1 - 0.42, 0.9, 2.1, 1.05, 2.55, '#9fb4bc')
  return P
}
/** 吊柜下、学生台上试剂架里的瓶子：棕色、透明两种，大小不一 */
function bottleGeo() {
  const gs: THREE.BufferGeometry[] = [], r = rng(17)
  const add = (x: number, y: number, z: number) => {
    const rad = u(0.024 + r() * 0.012), h = u(0.07 + r() * 0.06)
    const body = new THREE.CylinderGeometry(rad, rad, h, 14); body.translate(x, y + h / 2, z)
    const neck = new THREE.CylinderGeometry(rad * 0.42, rad * 0.55, h * 0.2, 12); neck.translate(x, y + h * 1.1, z)
    const cap = new THREE.CylinderGeometry(rad * 0.46, rad * 0.46, h * 0.12, 12); cap.translate(x, y + h * 1.26, z)
    const col = new THREE.Color(r() < 0.55 ? '#5a3214' : '#c9d6d8'), capC = new THREE.Color(r() < 0.5 ? '#1f2124' : '#d6d4cc')
    for (const [g, c] of [[body, col], [neck, col], [cap, capC]] as [THREE.BufferGeometry, THREE.Color][]) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); gs.push(g.toNonIndexed()) }
  }
  for (const z of [2.4, 4.6]) for (const x of [-5.6, -1.5, 2.6]) for (let i = 0; i < 12; i++) if (r() > 0.2) add(u(x - 0.82 + i * 0.15), u(1.12), u(z + (r() - 0.5) * 0.06))
  return mergeGeometries(gs)
}
/** 跟着当前这一课的工作灯：从前上方斜着打下来，主体亮、屋子暗 */
function Key({ x }: { x: number }) {
  const light = useRef<THREE.SpotLight>(null), cur = useRef(x)
  const aim = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const l = light.current; if (!l) return
    cur.current += (x - cur.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.45))
    l.position.set(cur.current - u(0.6), u(2.9), u(1.6)); aim.position.set(cur.current, TOP, BZ); aim.updateMatrixWorld()
  })
  return <>
    <primitive object={aim} />
    <spotLight ref={light} target={aim} angle={0.42} penumbra={0.85} intensity={420} distance={0} decay={1.4} color="#fff3e2" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.02} />
  </>
}

export function World({ x = ST.l1, s = 1, P, wide = false }: Partial<Want>) {
  const tex = useMemo(() => {
    const tile = tileTex().clone(); tile.repeat.set(1, 1); tile.needsUpdate = true
    const splash = wallTileTex().clone(); splash.repeat.set((BENCH.x1 - HOOD.x1) / 0.6, 0.6 / 0.6); splash.needsUpdate = true
    const plaster = plasterTex().clone(); plaster.repeat.set(8, 2); plaster.needsUpdate = true
    return { tile, splash, plaster, bench: benchTex(), table: periodicTex(), name: makeSign(['化学实验室'], '#1d4f7a', '#ffffff', 768, 128),
      rules: makeBoard('实验室守则', ['进实验室穿好实验服', '不用手直接拿药品', '有刺激性气味的实验在通风橱里做', '用过的药品放到指定容器', '实验后洗手、关好水电'], '#1d4f7a') }
  }, [])
  const geo = useMemo(() => {
    const R = ROOM, B = BENCH
    return {
      room: mergeParts(roomParts()), bottles: bottleGeo(),
      floor: slab(u(R.x0), u(R.x1), u(-0.02), 0, u(R.z0), u(R.z1), u(1.2)),
      back: slab(u(R.x0), u(R.x1), 0, u(R.h), u(R.z0 - 0.1), u(R.z0), u(2)),
      ends: mergeGeometries([slab(u(R.x0 - 0.1), u(R.x0), 0, u(R.h), u(R.z0), u(R.z1), u(2)), slab(u(R.x1), u(R.x1 + 0.1), 0, u(R.h), u(R.z0), u(R.z1), u(2))]),
      ceil: slab(u(R.x0), u(R.x1), u(R.h), u(R.h + 0.1), u(R.z0), u(R.z1), u(2)),
      top: slab(u(HOOD.x1), u(B.x1), TOP - u(0.03), TOP, u(B.z0), u(B.z1), u(1.2)),
      edge: new THREE.CylinderGeometry(u(0.015), u(0.015), u(B.x1 - HOOD.x1), 16).rotateZ(Math.PI / 2).translate(u((HOOD.x1 + B.x1) / 2), TOP - u(0.015), u(B.z1)),
    }
  }, [])
  const z = P ? { position: [P[0] * (1 - s), P[1] * (1 - s), P[2] * (1 - s)] as V3, scale: s } : {}
  return (
    <group>
      <hemisphereLight args={['#e8edf2', '#6e665a', wide ? 0.75 : 0.42]} />
      <Key x={x} />
      {/* 看全景时，天花板下面几盏灯把整间屋子照亮 */}
      {wide && [-4, 0, 4].map(cx => <pointLight key={cx} position={[u(cx), u(2.9), u(3)]} intensity={900} distance={0} decay={2} color="#fff4e6" />)}
      <group {...z} visible={s < 600}>
        <mesh geometry={geo.floor} receiveShadow><meshStandardMaterial map={tex.tile} roughness={0.42} /></mesh>
        <mesh geometry={geo.back} receiveShadow><meshStandardMaterial map={tex.plaster} roughness={0.92} /></mesh>
        <mesh geometry={geo.ends} receiveShadow><meshStandardMaterial map={tex.plaster} roughness={0.92} /></mesh>
        <mesh geometry={geo.ceil}><meshStandardMaterial color="#d8d8d3" roughness={0.9} /></mesh>
        {/* 天花板上的平板灯 */}
        {[-6, -3, 0, 3, 6].flatMap(cx => [0.6, 3.4, 5.8].map(cz => <mesh key={`${cx}${cz}`} position={[u(cx), u(ROOM.h) - 0.05, u(cz)]} rotation-x={Math.PI / 2}><planeGeometry args={[u(1.2), u(0.6)]} /><meshBasicMaterial color="#fff6e6" toneMapped={false} /></mesh>))}
        <mesh geometry={geo.room} castShadow receiveShadow><Painted rough={0.62} metal={0.08} /></mesh>
        <mesh geometry={geo.top} castShadow receiveShadow><meshPhysicalMaterial map={tex.bench} roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} /></mesh>
        <mesh geometry={geo.edge} castShadow><meshPhysicalMaterial color="#1e2224" roughness={0.4} clearcoat={0.4} /></mesh>
        <mesh geometry={geo.bottles} castShadow><meshPhysicalMaterial vertexColors roughness={0.15} clearcoat={1} transparent opacity={0.9} /></mesh>
        {/* 台面后面的白瓷砖墙裙 */}
        <mesh position={[u((HOOD.x1 + BENCH.x1) / 2), TOP + u(0.3), u(ROOM.z0) + 0.02]} receiveShadow><planeGeometry args={[u(BENCH.x1 - HOOD.x1), u(0.6)]} /><meshStandardMaterial map={tex.splash} roughness={0.22} /></mesh>
        {/* 墙上的牌子和守则 */}
        <mesh position={[u(-1.4), u(2.85), u(ROOM.z0) + 0.03]}><planeGeometry args={[u(1.8), u(0.3)]} /><meshStandardMaterial map={tex.name} roughness={0.6} /></mesh>
        <mesh position={[u(-2.3), u(1.95), u(ROOM.z0) + 0.03]}><planeGeometry args={[u(0.48), u(0.64)]} /><meshStandardMaterial map={tex.rules} roughness={0.8} /></mesh>
        {/* 元素周期表挂图：铝框 */}
        <group position={[u(POSTER.x), u(POSTER.y + POSTER.h / 2), u(ROOM.z0) + 0.06]}>
          <mesh><boxGeometry args={[u(POSTER.w + 0.04), u(POSTER.h + 0.04), 0.08]} /><meshStandardMaterial color="#b9bec2" metalness={0.8} roughness={0.35} /></mesh>
          <mesh position-z={0.045}><planeGeometry args={[u(POSTER.w), u(POSTER.h)]} /><meshStandardMaterial map={tex.table} roughness={0.75} /></mesh>
        </group>
        <Hood />
        {/* 东墙上的两扇窗：亮的窗玻璃（外面是白天），白色窗框，窗台 */}
        {[3.7, 5.9].map(cz => <group key={cz} position={[u(ROOM.x1) - 0.03, u(1.75), u(cz)]} rotation-y={-Math.PI / 2}>
          <mesh><planeGeometry args={[u(1.5), u(1.3)]} /><meshBasicMaterial color="#d6e7f3" toneMapped={false} /></mesh>
          {[-0.75, 0, 0.75].map(dx => <mesh key={dx} position={[u(dx), 0, 0.03]}><boxGeometry args={[u(0.05), u(1.36), 0.06]} /><meshStandardMaterial color="#f2f2ee" roughness={0.6} /></mesh>)}
          {[-0.65, 0.65].map(dy => <mesh key={dy} position={[0, u(dy), 0.03]}><boxGeometry args={[u(1.55), u(0.05), 0.06]} /><meshStandardMaterial color="#f2f2ee" roughness={0.6} /></mesh>)}
          <mesh position={[0, -u(0.7), 0.4]}><boxGeometry args={[u(1.6), u(0.04), u(0.16)]} /><meshStandardMaterial color="#d9d9d3" roughness={0.6} /></mesh>
        </group>)}
      </group>
    </group>
  )
}

/** 通风橱：钢制柜体，前面一扇上下推拉的玻璃门（推到一半），里面白色的内衬、一盏灯，台面是耐腐蚀的黑台面 */
function Hood() {
  const { x0, x1, top } = HOOD, w = x1 - x0, d = 0.78, z0 = BENCH.z0
  const geo = useMemo(() => {
    const P: Part[] = []
    const box = (a: number, b: number, y0: number, y1: number, c0: number, c1: number, c: string) => P.push({ p: [u((a + b) / 2), u((y0 + y1) / 2), u((c0 + c1) / 2)], s: [u(b - a), u(y1 - y0), u(c1 - c0)], c })
    box(x0, x1, 0, 0.82, z0, z0 + d - 0.04, '#d4d8d6')                                     // 下面的柜子
    for (const a of [x0, x1 - 0.06]) box(a, a + 0.06, 0.82, top, z0, z0 + d, '#e6e8e5')      // 两侧立板
    box(x0, x1, top - 0.42, top, z0, z0 + d, '#e6e8e5')                                    // 上面的箱体
    box(x0 + 0.06, x1 - 0.06, 0.82, top - 0.42, z0, z0 + 0.02, '#f1f2ef')                    // 内衬后板
    box(x0, x1, top - 0.47, top - 0.42, z0 + d - 0.06, z0 + d, '#c8ccca')                    // 推拉门的上框
    box(x0 + 0.35, x1 - 0.35, top - 0.3, top - 0.12, z0 + d, z0 + d + 0.01, '#2b3a46')       // 面板：风机开关和风速显示
    return mergeParts(P)
  }, [x0, x1, top, z0])
  return <group>
    <mesh geometry={geo} castShadow receiveShadow><Painted rough={0.5} metal={0.15} /></mesh>
    <mesh position={[u((x0 + x1) / 2), u(0.835), u(z0 + d / 2)]} receiveShadow castShadow><boxGeometry args={[u(w - 0.12), u(0.03), u(d - 0.02)]} /><meshPhysicalMaterial color="#1c1f21" roughness={0.45} clearcoat={0.3} /></mesh>
    {/* 推拉玻璃门：停在上方，下沿离台面 0.5 m */}
    <mesh position={[u((x0 + x1) / 2), u(top - 0.47 - 0.3), u(z0 + d - 0.03)]}><boxGeometry args={[u(w - 0.12), u(0.6), u(0.008)]} /><meshPhysicalMaterial color="#cfe0e2" transparent opacity={0.16} roughness={0.03} clearcoat={1} envMapIntensity={2.4} depthWrite={false} /></mesh>
    <mesh position={[u((x0 + x1) / 2), u(top - 0.47 - 0.6), u(z0 + d - 0.03)]}><boxGeometry args={[u(w - 0.12), u(0.03), u(0.03)]} /><meshStandardMaterial color="#8d9497" metalness={0.8} roughness={0.3} /></mesh>
    {/* 顶上的灯 */}
    <mesh position={[u((x0 + x1) / 2), u(top - 0.43), u(z0 + d / 2)]} rotation-x={Math.PI / 2}><planeGeometry args={[u(w - 0.4), u(0.12)]} /><meshBasicMaterial color="#fffaf0" toneMapped={false} /></mesh>
    <pointLight position={[u((x0 + x1) / 2), u(top - 0.6), u(z0 + d / 2)]} intensity={60} distance={u(2)} decay={1.6} color="#fff5e8" />
    <mesh position={[u((x0 + x1) / 2), u(top - 0.21), u(z0 + d + 0.012)]}><planeGeometry args={[u(0.5), u(0.06)]} /><meshBasicMaterial color="#7dffb0" toneMapped={false} transparent opacity={0.85} /></mesh>
  </group>
}
