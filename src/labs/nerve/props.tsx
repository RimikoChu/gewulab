// 展馆里的器材和小物件：展台、带圆孔的展板、一杯冒热气的水、叩诊锤、梅子、尺子和释放夹、一棵小树、玩具车沙盘、一个球、放大模型的连线。
// 坐标是世界的，1 个单位 = 10 cm（放大模型除外）。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, disc, lathe, makeGround, shell } from '@/lab-kit'
import { RULER } from './physics'
import { ghostMat } from './mats'
import { curveOf, ellipsoid, fbm, lin, mix3, noise, surfaceNetsGen, type V3 } from './sdf'
import { useJob } from './job'

// ---------- 展台和展板 ----------
/** 一张展台：白色人造石台面、深灰柜体、拉丝不锈钢踢脚、台面下一道缝。top 台面高度 */
export function Plinth({ at, w, d, top }: { at: V3; w: number; d: number; top: number }) {
  return <group position={at}>
    <RoundedBox args={[w, 0.36, d]} radius={0.05} smoothness={3} position={[0, top - 0.18, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e9e7e1" roughness={0.3} clearcoat={0.45} clearcoatRoughness={0.3} /></RoundedBox>
    <RoundedBox args={[w - 0.45, top - 0.5, d - 0.45]} radius={0.05} smoothness={3} position={[0, (top - 0.36) / 2 + 0.14, 0]} castShadow receiveShadow><meshStandardMaterial color="#262b31" roughness={0.55} /></RoundedBox>
    <mesh position={[0, 0.07, 0]}><boxGeometry args={[w - 0.38, 0.14, d - 0.38]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[0, top - 0.38, d / 2 - 0.222]}><boxGeometry args={[w - 0.45, 0.03, 0.02]} /><meshStandardMaterial color="#121417" /></mesh>
  </group>
}
/** 一块立着的展板：深色哑光面，四周一圈铝边，中间一个让手臂伸出来的圆孔。法线朝 +x */
export function Board({ at, w, h, hole }: { at: V3; w: number; h: number; hole: V3 }) {
  const g = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0)
    const p = new THREE.Path(); p.absarc(hole[2] - at[2], hole[1] - at[1], 0.72, 0, Math.PI * 2, true); s.holes.push(p)
    const e = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 48 })
    e.translate(0, 0, -0.12); e.rotateY(Math.PI / 2); return e
  }, [w, h, hole, at])
  return <group>
    <mesh geometry={g} position={at} castShadow receiveShadow><meshPhysicalMaterial color="#1d2228" roughness={0.7} clearcoat={0.15} /></mesh>
    {/* 孔边一圈黑橡胶密封圈 */}
    <mesh position={[at[0] + 0.14, hole[1], hole[2]]} rotation-y={Math.PI / 2}><torusGeometry args={[0.7, 0.07, 16, 64]} /><meshPhysicalMaterial color="#0d0f11" roughness={0.6} clearcoat={0.3} /></mesh>
    <mesh position={[at[0] + 0.15, hole[1], hole[2]]} rotation-y={Math.PI / 2}><torusGeometry args={[0.86, 0.025, 10, 64]} /><Metal kind="aluminum" grain="turned" /></mesh>
    {/* 铝边 */}
    {[0, h].map(y => <mesh key={y} position={[at[0], at[1] + y, at[2]]}><boxGeometry args={[0.3, 0.05, w + 0.05]} /><Metal kind="aluminum" grain="brushed" /></mesh>)}
  </group>
}

// ---------- 第 3 课：一杯热水 ----------
/** 双层不锈钢杯，带把手，里面是热水，水面上冒着热气。烫的那一面杯壁亮一点暖光 */
export function HotCup({ at }: { at: V3 }) {
  const g = useMemo(() => ({
    body: shell([[0, 0], [0.38, 0], [0.42, 0.04], [0.44, 0.2], [0.45, 0.92], [0.46, 0.96]], 0.03, { segs: 64 }),
    handle: new THREE.TubeGeometry(curveOf([[0.43, 0.78, 0], [0.7, 0.8, 0], [0.78, 0.55, 0], [0.7, 0.28, 0], [0.43, 0.24, 0]], 0.5), 32, 0.045, 12),
  }), [])
  return <group position={at}>
    <mesh geometry={g.body} castShadow receiveShadow><Metal kind="stainless" grain="brushed" env={2.2} /></mesh>
    <mesh geometry={g.handle} rotation-y={-Math.PI / 2} castShadow><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[0, 0.82, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.415, 48]} /><meshPhysicalMaterial color="#9fb9c0" roughness={0.04} clearcoat={1} transparent opacity={0.85} /></mesh>
    <Steam at={[0, 0.85, 0]} />
  </group>
}
/** 热气：几缕慢慢上升、扭动、变淡的白雾 */
function Steam({ at }: { at: V3 }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c) }, [])
  const N = 22, ref = useRef<THREE.Group>(null)
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ ph: i / N, a: i * 2.4, r: 0.1 + (i % 5) * 0.05 })), [])
  useFrame(st => {
    const t = st.clock.elapsedTime
    ref.current?.children.forEach((c, i) => {
      const s = seeds[i], k = (t * 0.22 + s.ph) % 1
      c.position.set(at[0] + Math.cos(s.a + t * 0.6) * s.r + Math.sin(k * 6 + s.a) * 0.08, at[1] + k * 1.6, at[2] + Math.sin(s.a + t * 0.5) * s.r)
      c.scale.setScalar(0.18 + k * 0.5); ((c as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 0.32 * Math.sin(Math.PI * k)
    })
  })
  return <group ref={ref}>{seeds.map((_, i) => <sprite key={i}><spriteMaterial map={tex} transparent depthWrite={false} opacity={0} /></sprite>)}</group>
}

// ---------- 第 4 课：叩诊锤、梅子 ----------
/** 叩诊锤：镀铬的细柄，头上一块三角形的红色橡胶。swing 是挥下去多少（0–1） */
export function Hammer({ at, swing }: { at: V3; swing: number }) {
  // 锤头：一块三角形的红色橡胶，边是圆的
  const head = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-0.22, -0.07); s.lineTo(0.22, -0.07); s.lineTo(0, 0.24); s.lineTo(-0.22, -0.07); const e = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 5 }); e.translate(0, 0, -0.04); return e }, [])
  return <group position={at} rotation-x={-0.9 + swing * 0.9}>
    <mesh position={[0, 0, 1.25]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.03, 0.036, 2.3, 16]} /><meshPhysicalMaterial color="#c9cdd2" metalness={0.7} roughness={0.28} clearcoat={0.6} /></mesh>
    <mesh position={[0, 0, 2.45]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.12, 16]} /><Metal kind="chrome" /></mesh>
    <mesh geometry={head} position={[0, 0, 0.05]} rotation-y={Math.PI / 2} castShadow><meshPhysicalMaterial color="#b3261e" roughness={0.55} clearcoat={0.3} /></mesh>
  </group>
}
/** 一颗青梅：略扁的圆，一侧一道浅沟，表面一层薄薄的白霜，带一截小梗 */
export function Plum({ at, s = 0.2 }: { at: V3; s?: number }) {
  const geo = useJob('plum', function* () {
    return yield* surfaceNetsGen((x, y, z) => ellipsoid(x, y, z, [0, 0, 0], [1, 0.92, 0.96]) + 0.06 * Math.max(0, 1 - Math.abs(x) / 0.12) * (z > 0 ? 1 : 0.2) + 0.01 * fbm(x * 6, y * 6, z * 6, 2),
      [[-1.2, -1.1, -1.2], [1.2, 1.1, 1.2]], 0.05, p => mix3(lin('#8fae3a'), lin('#d9c24a'), 0.5 + 0.5 * noise(p[0] * 2, p[1] * 2, p[2] * 2)))
  })
  return <group position={at} scale={s}>
    {geo && <mesh geometry={geo} castShadow><meshPhysicalMaterial vertexColors roughness={0.42} sheen={0.8} sheenColor="#e9f2d8" clearcoat={0.3} /></mesh>}
    <mesh position={[0.05, 1.0, 0]} rotation-z={0.3}><cylinderGeometry args={[0.04, 0.06, 0.35, 8]} /><meshStandardMaterial color="#5a4128" roughness={0.8} /></mesh>
  </group>
}

// ---------- 第 5 课：一棵小树 ----------
/** 一棵小树：树干、几根枝和几团树冠（摆在眼球前面当物体） */
export function Tree({ at, s = 1 }: { at: V3; s?: number }) {
  const geo = useJob('tree', function* () {
    return yield* surfaceNetsGen((x, y, z) => Math.min(...[[0, 3.0, 0, 1.25], [-0.85, 2.4, 0.2, 0.9], [0.85, 2.5, -0.1, 0.95], [0.1, 3.85, 0.1, 0.85], [0.2, 2.3, 0.75, 0.75]].map(([cx, cy, cz, r]) => Math.hypot(x - cx, y - cy, z - cz) - r)) + 0.16 * fbm(x * 2.2, y * 2.2, z * 2.2, 3),
      [[-2.2, 1.0, -1.6], [2.2, 5.0, 1.8]], 0.08, p => mix3(lin('#2f6a2a'), lin('#7aa83a'), Math.min(1, Math.max(0, (p[1] - 1.6) / 3 + 0.25 * noise(p[0] * 3, p[1] * 3, p[2] * 3)))))
  })
  const trunk = useMemo(() => lathe([[0, 0], [0.24, 0], [0.18, 0.4], [0.13, 1.6], [0.1, 2.6], [0, 2.7]], { segs: 20 }), [])
  return <group position={at} scale={s}>
    <mesh geometry={trunk} castShadow><meshStandardMaterial color="#5b4030" roughness={0.9} /></mesh>
    {geo && <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.75} /></mesh>}
  </group>
}
/** 细长的圆柱展座 */
export function Post({ at, top, r = 0.6 }: { at: V3; top: number; r?: number }) {
  const g = useMemo(() => ({ base: disc(r * 1.5, 0.08, { chamfer: 0.02 }), cap: disc(r * 1.1, 0.08, { chamfer: 0.02 }) }), [r])
  return <group position={at}>
    <mesh geometry={g.base} castShadow receiveShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh position={[0, top / 2, 0]} castShadow><cylinderGeometry args={[r * 0.22, r * 0.26, top, 24]} /><meshPhysicalMaterial color="#2a3038" roughness={0.45} clearcoat={0.5} metalness={0.3} /></mesh>
    <mesh geometry={g.cap} position={[0, top - 0.08, 0]} castShadow><meshPhysicalMaterial color="#e9e7e1" roughness={0.3} clearcoat={0.5} /></mesh>
  </group>
}

// ---------- 第 7 课：尺子和释放夹 ----------
/** 一把 50 cm 的钢直尺，刻度从下往上读（0 在下端） */
function rulerTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 2048
  const g = c.getContext('2d')!, H = c.height, per = H / 50
  g.fillStyle = '#d9dcdf'; g.fillRect(0, 0, 128, H)
  g.fillStyle = '#16191c'; g.font = '700 34px ui-monospace, Menlo, monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'
  for (let cm = 0; cm <= 50; cm++) {
    const y = H - cm * per
    g.fillRect(0, y - 1.5, cm % 10 === 0 ? 64 : cm % 5 === 0 ? 48 : 30, 3)
    if (cm % 5 === 0 && cm > 0 && cm < 50) g.fillText(String(cm), 122, y)
    for (let mm = 1; mm < 10 && cm < 50; mm++) g.fillRect(0, y - mm * per / 10 - 0.75, mm === 5 ? 20 : 12, 1.5)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}
/** 尺子：下端在 bottom，y 往上；宽 3 cm、厚 1.5 mm */
export function Ruler({ at }: { at: V3 }) {
  const tex = useMemo(rulerTex, [])
  const L = RULER * 10
  return <group position={at}>
    <RoundedBox args={[0.3, L, 0.015]} radius={0.006} smoothness={2} position={[0, L / 2, 0]} castShadow><Metal kind="stainless" grain="brushed" /></RoundedBox>
    {[1, -1].map(s => <mesh key={s} position={[0, L / 2, s * 0.0085]} rotation-y={s > 0 ? 0 : Math.PI}><planeGeometry args={[0.288, L - 0.012]} /><meshStandardMaterial map={tex} metalness={0.55} roughness={0.36} /></mesh>)}
  </group>
}
/** 释放夹：立柱、横臂，臂端一个电磁铁夹头，通电时夹着尺子，断电尺子落下 */
export function Release({ at, h, on }: { at: V3; h: number; on: boolean }) {
  const g = useMemo(() => ({ base: disc(0.9, 0.12, { chamfer: 0.03 }), head: lathe([[0, 0], [0.2, 0], [0.22, 0.03], [0.22, 0.42], [0.18, 0.46], [0, 0.46]], { segs: 32 }) }), [])
  return <group position={at}>
    <mesh geometry={g.base} castShadow receiveShadow><Metal kind="iron" grain="cast" /></mesh>
    <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, h, 20]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[0.6, h, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.05, 0.05, 1.3, 16]} /><Metal kind="stainless" grain="brushed" /></mesh>
    <mesh position={[0, h, 0]} castShadow><boxGeometry args={[0.2, 0.22, 0.2]} /><Metal kind="aluminum" grain="brushed" /></mesh>
    <mesh geometry={g.head} position={[1.2, h - 0.5, 0]} castShadow><meshPhysicalMaterial color="#2a2e33" roughness={0.4} clearcoat={0.6} /></mesh>
    <mesh position={[1.2, h - 0.04, 0.24]}><sphereGeometry args={[0.035, 12, 8]} /><meshBasicMaterial color={on ? '#ff5148' : '#3a1513'} toneMapped={!on} /></mesh>
  </group>
}

// ---------- 拓展：玩具车沙盘 ----------
/** 一段沥青路：白色的边线、虚线、每米一道刻度。len 长（m，按沙盘比例），k 是 1 m 等于几个场景单位 */
export function Road({ at, len, k }: { at: V3; len: number; k: number }) {
  const tex = useMemo(() => { const t = makeGround('#2b2e33', '64,68,74', '18,19,22', 21); t.repeat.set(len * k / 2, 1); return t }, [len, k])
  return <group position={at}>
    <mesh position={[len * k / 2, 0.02, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[len * k + 0.6, 1.6]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>
    {[-0.72, 0.72].map(z => <mesh key={z} position={[len * k / 2, 0.025, z]} rotation-x={-Math.PI / 2}><planeGeometry args={[len * k + 0.6, 0.04]} /><meshStandardMaterial color="#e9e6dc" roughness={0.6} /></mesh>)}
    {Array.from({ length: Math.floor(len / 2) }, (_, i) => <mesh key={i} position={[(i * 2 + 0.6) * k, 0.025, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[1.0 * k, 0.04]} /><meshStandardMaterial color="#e9c95a" roughness={0.6} /></mesh>)}
    {Array.from({ length: len + 1 }, (_, i) => <mesh key={`t${i}`} position={[i * k, 0.026, 0.86]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.02, i % 5 === 0 ? 0.26 : 0.14]} /><meshBasicMaterial color="#cfd3d8" /></mesh>)}
  </group>
}
/** 一辆玩具小汽车（1:25 左右）：圆润的车身、深色车窗、四个轮子、前灯尾灯 */
export function Car({ at, brake }: { at: V3; brake: boolean }) {
  const body = useJob('car', function* () {
    return yield* surfaceNetsGen((x, y, z) => {
      const low = Math.max(Math.abs(x) - 0.82, Math.abs(y - 0.26) - 0.13, Math.abs(z) - 0.36) - 0.07
      const cab = Math.max(Math.abs(x + 0.08 + (y - 0.45) * 0.4) - 0.42, Math.abs(y - 0.48) - 0.12, Math.abs(z) - 0.3) - 0.06
      let d = Math.min(low, cab) - 0.0
      for (const wx of [-0.52, 0.52]) d = Math.max(d, -(Math.hypot(x - wx, y - 0.14) - 0.2))
      return d
    }, [[-1.0, 0.0, -0.5], [1.0, 0.7, 0.5]], 0.018)
  })
  const wheel = useMemo(() => lathe([[0, -0.07], [0.12, -0.07], [0.15, -0.05], [0.16, 0], [0.15, 0.05], [0.12, 0.07], [0, 0.07]], { segs: 32 }).rotateX(Math.PI / 2), [])
  return <group position={at}>
    {body && <mesh geometry={body} castShadow><meshPhysicalMaterial color="#d8402f" roughness={0.25} clearcoat={1} clearcoatRoughness={0.08} metalness={0.2} /></mesh>}
    {/* 车窗：贴在驾驶室外面的深色玻璃 */}
    {[-1, 1].map(s => <mesh key={s} position={[-0.08, 0.5, s * 0.362]}><planeGeometry args={[0.72, 0.17]} /><meshPhysicalMaterial color="#141a20" roughness={0.05} clearcoat={1} side={THREE.DoubleSide} /></mesh>)}
    <mesh position={[0.35, 0.5, 0]} rotation-y={Math.PI / 2} rotation-x={-0.45}><planeGeometry args={[0.58, 0.2]} /><meshPhysicalMaterial color="#141a20" roughness={0.05} clearcoat={1} side={THREE.DoubleSide} /></mesh>
    {[-0.52, 0.52].flatMap(x => [-0.33, 0.33].map(z => <group key={`${x}${z}`} position={[x, 0.14, z]}>
      <mesh geometry={wheel} castShadow><meshStandardMaterial color="#141516" roughness={0.85} /></mesh>
      <mesh position={[0, 0, z > 0 ? 0.072 : -0.072]}><cylinderGeometry args={[0.08, 0.08, 0.01, 20]} /><Metal kind="aluminum" /></mesh>
    </group>))}
    {[-0.2, 0.2].map(z => <mesh key={`h${z}`} position={[0.9, 0.3, z]}><sphereGeometry args={[0.045, 12, 8]} /><meshBasicMaterial color="#fff4d6" toneMapped={false} /></mesh>)}
    {[-0.24, 0.24].map(z => <mesh key={`b${z}`} position={[-0.9, 0.3, z]}><boxGeometry args={[0.02, 0.06, 0.12]} /><meshBasicMaterial color={brake ? '#ff3b30' : '#5a1512'} toneMapped={!brake} /></mesh>)}
  </group>
}

/** 一个网球：黄绿色的绒面，两道白色的弧线 */
export function Ball({ at, r = 0.33 }: { at: V3; r?: number }) {
  const g = useMemo(() => {
    const pts: THREE.Vector3[] = []; for (let i = 0; i <= 200; i++) { const t = i / 200 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(t) * (1 + 0.0), 0.55 * Math.sin(2 * t), Math.sin(t)).normalize().multiplyScalar(1.004)) }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, 0.035, 6, true)
  }, [])
  return <group position={at} scale={r}>
    <mesh castShadow><sphereGeometry args={[1, 40, 28]} /><meshPhysicalMaterial color="#cfe04a" roughness={0.9} sheen={1} sheenColor="#f4ffb0" sheenRoughness={0.4} /></mesh>
    <mesh geometry={g}><meshStandardMaterial color="#f4f4ec" roughness={0.7} /></mesh>
  </group>
}

// ---------- 放大模型和人体之间的连线 ----------
/** 一圈淡淡的球壳罩住放大模型，一根细线连回身体上的那一处 */
export function Magnifier({ at, site, r }: { at: V3; site: V3; r: number }) {
  const shellM = useMemo(() => ghostMat('#9ad8ff', 0.0, 0.3, 3.2), [])
  const line = useMemo(() => {
    const d = new THREE.Vector3(...site).sub(new THREE.Vector3(...at)), e = new THREE.Vector3(...at).addScaledVector(d.clone().normalize(), r)
    return new THREE.BufferGeometry().setFromPoints([e, new THREE.Vector3(...site)])
  }, [at, site, r])
  return <group>
    <mesh position={at} material={shellM}><sphereGeometry args={[r, 48, 32]} /></mesh>
    <lineSegments geometry={line}><lineBasicMaterial color="#9ad8ff" transparent opacity={0.4} /></lineSegments>
    <mesh position={site}><sphereGeometry args={[0.06, 16, 12]} /><meshBasicMaterial color="#9ad8ff" toneMapped={false} /></mesh>
  </group>
}
