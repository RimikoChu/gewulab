// 第 3、4 课的细胞模型：精子和卵细胞的形成（同一个时期里画几个细胞，染色体缩小摆在各自的细胞里）、精子的模型、受精。
// 尺寸都是示意（1 单位 = 1 cm），不按比例：卵细胞画得比精原细胞大，极体很小。
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Chromatid } from './chromo'
import { Membrane, Nucleus } from './cell'
import { ease, lerp, tint, tube, type V3 } from './parts'

/** 一组染色体：list 里每一项是一条染色体（pair、who、有没有姐妹单体），在 at 附近排开，scale 缩小 */
export interface Chr { pair: number; who: number; sisters: boolean }
export function ChromSet({ at, list, scale = 0.55, tetrad = false, opacity = 1 }: { at: V3; list: Chr[]; scale?: number; tetrad?: boolean; opacity?: number }) {
  const n = list.length, step = (tetrad ? 2.1 : 3.4) * scale * 2
  return <group position={at}>
    {list.map((c, i) => {
      const pairShift = tetrad ? (c.pair - 0.5) * 9 * scale * 2 + (c.who - 0.5) * 4.4 * scale : (i - (n - 1) / 2) * step
      const y = (c.pair ? -1.5 : 1.5) * scale
      return [0, 1].filter(s => s === 0 || c.sisters).map(s => {
        const x = pairShift + (c.sisters ? (s ? 1 : -1) * 1.0 * scale : 0)
        return <Chromatid key={`${i}${s}`} pair={c.pair} who={c.who} inner={false} dir={1} gap={0} at={[x, y, 0]} th={0} scale={scale} opacity={opacity} />
      })
    })}
  </group>
}

// ---------- 精子 ----------
/** 精子：扁圆的头部（顶体在前，细胞核在后）、中段（线粒体鞘）、长长的尾巴。头朝 +x，原点在头部中心 */
function spermGeo() {
  const head = new THREE.SphereGeometry(1, 28, 18); head.scale(3.2, 2.0, 1.3)
  const p = head.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x > 0) p.setX(i, x * (1 + 0.12 * (x / 3.2))) }
  head.computeVertexNormals(); tint(head, '#d8d2e8', '#d8d2e8')
  const cap = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42); cap.rotateZ(-Math.PI / 2); cap.scale(3.45, 2.1, 1.42); tint(cap, '#a7d6f0')
  return { head, cap }
}
/** 一个精子：wiggle 让尾巴摆动；color 是头部细胞核的颜色 */
export function Sperm({ at, yaw = 0, tail = 1, len = 1, color = '#4a6fb8', swim = true, scale = 1 }: { at: V3; yaw?: number; tail?: number; len?: number; color?: string; swim?: boolean; scale?: number }) {
  const g = useMemo(spermGeo, [])
  const tailRef = useRef<THREE.Mesh>(null), t0 = useRef(Math.random() * 10)
  useFrame((_, dt) => {
    if (!tailRef.current) return
    t0.current += swim ? dt : 0
    const pts: V3[] = Array.from({ length: 22 }, (_, i) => { const u = i / 21, x = -6 - u * 30 * tail * len; return [x, Math.sin(u * 7 - t0.current * 9) * (0.3 + u * 2.2) * tail * Math.sqrt(len), 0] })
    const old = tailRef.current.geometry
    tailRef.current.geometry = tube(pts, 0.36, 0.1, '#b9c2cf', '#dfe4ea', 8, 70)
    old.dispose()
  })
  return <group position={at} rotation-z={yaw} scale={scale}>
    <mesh geometry={g.head} castShadow><meshPhysicalMaterial vertexColors roughness={0.3} clearcoat={0.6} transparent opacity={0.85} /></mesh>
    <mesh geometry={g.cap}><meshPhysicalMaterial vertexColors roughness={0.3} clearcoat={0.6} transparent opacity={0.7} depthWrite={false} /></mesh>
    <mesh position={[-0.6, 0, 0]} scale={[1.9, 1.3, 0.85]}><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
    {/* 中段：螺旋缠绕的线粒体鞘 */}
    <mesh position={[-4.6, 0, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.7, 0.62, 3.2, 16]} /><meshStandardMaterial color="#c9a36a" roughness={0.6} /></mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[-3.3 - i * 0.6, 0, 0]} rotation-y={Math.PI / 2}><torusGeometry args={[0.7, 0.16, 6, 16]} /><meshStandardMaterial color="#a87e45" roughness={0.6} /></mesh>)}
    <mesh ref={tailRef}><bufferGeometry /><meshStandardMaterial vertexColors roughness={0.5} /></mesh>
  </group>
}

// ---------- 第 3 课：精子 / 卵细胞的形成 ----------
export type Kind = 'sperm' | 'egg'
const MAT: Chr[] = [{ pair: 0, who: 0, sisters: true }, { pair: 1, who: 0, sisters: true }]
const PAT: Chr[] = [{ pair: 0, who: 1, sisters: true }, { pair: 1, who: 1, sisters: true }]
/**
 * stage：0 初级、1 减数第一次分裂、2 减数第二次分裂、3 精细胞变形（只有精子）；e 是这一步走了多少
 */
export function Gametogenesis({ at, kind, stage, e }: { at: V3; kind: Kind; stage: number; e: number }) {
  const k = ease(e)
  const out: ReactNode[] = []
  if (kind === 'sperm') {
    const R0 = 22, R1 = R0 / 1.26, R2 = R1 / 1.26, X = 21, Y = 16
    if (stage === 0 || (stage === 1 && e < 1)) {
      out.push(<Membrane key="m0" at={[0, 0, 0]} R={R0} lobes={[{ c: -X, r: R1 }, { c: X, r: R1 }]} k={stage === 1 ? e : 0} axis="x" />)
      out.push(<group key="c0">
        {/* 四分体：同一对的两条同源染色体并排；减数第一次分裂时分开，各去一边 */}
        {[0, 1].flatMap(p => [0, 1].map(w => {
          const kk = stage === 1 ? k : 0, x = lerp((p ? 6 : -6) + (w ? 2.3 : -2.3), (w ? X : -X) + (p ? 3.6 : -3.6), kk)
          return <ChromSet key={`${p}${w}`} at={[x, p ? -1.5 : 1, 0]} list={[{ pair: p, who: w, sisters: true }]} scale={0.95} />
        }))}
      </group>)
    } else if (stage === 1 || (stage === 2 && e < 1)) {
      for (const sx of [-1, 1]) {
        out.push(<Membrane key={`m${sx}`} at={[sx * X, 0, 0]} R={R1} lobes={[{ c: -Y, r: R2 }, { c: Y, r: R2 }]} k={stage === 2 ? e : 0} axis="y" />)
        for (const sy of [-1, 1]) for (const p of [0, 1]) out.push(<ChromSet key={`c${sx}${sy}${p}`} at={[sx * X + (p ? 3.6 : -3.6) * lerp(1, 0.85, stage === 2 ? k : 0), lerp(sy * 1.0, sy * Y, stage === 2 ? k : 0), 0]} list={[{ pair: p, who: sx < 0 ? 0 : 1, sisters: false }]} scale={lerp(0.95, 0.85, stage === 2 ? k : 0)} />)
      }
    } else {
      // 四个精细胞，变形成精子：细胞质大部分丢掉，细胞核浓缩成头部，长出尾巴
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const c: V3 = [sx * X, sy * Y, 0], d = stage === 3 ? k : 0
        out.push(<Membrane key={`m${sx}${sy}`} at={c} R={R2} opacity={1 - d} />)
        for (const p of [0, 1]) out.push(<ChromSet key={`c${sx}${sy}${p}`} at={[c[0] + (p ? 3.1 : -3.1), c[1], c[2]]} list={[{ pair: p, who: sx < 0 ? 0 : 1, sisters: false }]} scale={0.85} opacity={1 - d} />)
        if (d > 0) out.push(<Sperm key={`s${sx}${sy}`} at={[c[0] + sx * 3, c[1] + sy * 6, 2]} yaw={(sy > 0 ? Math.PI / 2 : -Math.PI / 2) - sx * sy * 0.55} tail={d} len={0.42} scale={lerp(0.6, 1.15, d)} color={sx < 0 ? '#c0583c' : '#3c69b8'} />)
      }
    }
  } else {
    // 卵细胞：细胞质不均等分裂。减数第一次分裂：大的次级卵母细胞 + 小的（第一）极体；减数第二次分裂：卵细胞 + 极体，第一极体也分成两个
    const R0 = 30, PB = 7.5, AX = Math.PI / 4, ux = Math.cos(AX), uy = Math.sin(AX)
    const pb1: V3 = [ux * 36, uy * 36, 0]
    if (stage === 0 || (stage === 1 && e < 1)) {
      out.push(<group key="m0" rotation-z={AX}><Membrane at={[0, 0, 0]} R={R0} lobes={[{ c: -1, r: 29.6 }, { c: 36, r: PB }]} k={stage === 1 ? e : 0} axis="x" tint="#ecdcc0" /></group>)
      const kk = stage === 1 ? k : 0
      out.push(<ChromSet key="cA" at={[lerp(ux * 8, -6, kk), lerp(uy * 8, -4, kk), 0]} list={MAT} scale={0.85} />)
      out.push(<ChromSet key="cB" at={[lerp(ux * 17, pb1[0], kk), lerp(uy * 17, pb1[1], kk), 0]} list={PAT} scale={lerp(0.85, 0.45, kk)} />)
      if (stage === 0) out.push(<Nucleus key="n0" at={[ux * 13, uy * 13, 0]} R={14} opacity={1} />)
    } else {
      const two = stage >= 2, k2 = stage === 2 ? k : 1
      const B: number = Math.PI * 0.62, bx = Math.cos(B), by = Math.sin(B)
      out.push(<group key="mA" rotation-z={B}><Membrane at={[0, 0, 0]} R={29.6} lobes={[{ c: -0.5, r: 29.4 }, { c: 35.5, r: 6.5 }]} k={two ? k2 : 0} axis="x" tint="#ecdcc0" /></group>)
      // 第一极体：再分成两个
      out.push(<group key="mB" position={pb1} rotation-z={-AX}><Membrane at={[0, 0, 0]} R={PB} lobes={[{ c: -6.2, r: 6 }, { c: 6.2, r: 6 }]} k={two ? k2 : 0} axis="x" tint="#ecdcc0" /></group>)
      for (const s of [-1, 1]) out.push(<ChromSet key={`cA${s}`} at={[lerp(-6 + s * 0.8, s < 0 ? -6 : bx * 35.5, two ? ease(k2) : 0), lerp(-4, s < 0 ? -4 : by * 35.5, two ? ease(k2) : 0), 0]} list={[MAT[0], MAT[1]].map(c => ({ ...c, sisters: !two }))} scale={s < 0 ? 0.85 : lerp(0.85, 0.42, two ? k2 : 0)} opacity={two || s < 0 ? 1 : 0} />)
      for (const s of [-1, 1]) out.push(<ChromSet key={`cB${s}`} at={[pb1[0] + (two ? s * 6.2 * ux * ease(k2) : 0), pb1[1] - (two ? s * 6.2 * uy * ease(k2) : 0), 0]} list={PAT.map(c => ({ ...c, sisters: !two }))} scale={0.42} opacity={two || s < 0 ? 1 : 0} />)
      if (stage >= 2 && e >= 1) out.push(<Nucleus key="nE" at={[-6, -4, 0]} R={11} opacity={1} />)
    }
  }
  return <group position={at}>{out}</group>
}
/** 第 3 课：标签要用的位置（相对模型中心） */
export const G3 = {
  sperm: { cells1: [[-21, 0], [21, 0]], cells2: [[-21, 16], [-21, -16], [21, 16], [21, -16]] },
  egg: { big: [-6, -4], pb1: [Math.cos(Math.PI / 4) * 36, Math.sin(Math.PI / 4) * 36], pb2: [Math.cos(Math.PI * 0.62) * 35.5, Math.sin(Math.PI * 0.62) * 35.5] },
} as const

// ---------- 第 4 课：受精作用 ----------
/** 四种精子游来的位置（相对卵细胞中心）和朝向 */
export const SWIM: { at: V3; yaw: number; g: string }[] = [
  { at: [48, 10, 0], yaw: Math.PI + 0.22, g: 'AB' },
  { at: [54, -10, 4], yaw: Math.PI - 0.1, g: 'Ab' },
  { at: [42, -27, -2], yaw: Math.PI - 0.5, g: 'aB' },
  { at: [40, 25, -4], yaw: Math.PI + 0.6, g: 'ab' },
]
export const ENTER = 0          // 进入卵细胞的是第几个
const EGG_R = 28
/**
 * step：0 精子游来；1 一个精子进入；2 两个细胞核融合。e 是这一步走了多少。
 * 卵细胞里的染色体来自母方（橙红），精子带来的来自父方（蓝）
 */
export function Fertilization({ at, step, e }: { at: V3; step: number; e: number }) {
  const k = ease(e), s1 = step >= 1 ? (step === 1 ? k : 1) : 0, s2 = step >= 2 ? (step === 2 ? k : 1) : 0
  const egg: Chr[] = [{ pair: 0, who: 0, sisters: false }, { pair: 1, who: 0, sisters: false }]
  const dad: Chr[] = [{ pair: 0, who: 1, sisters: false }, { pair: 1, who: 1, sisters: false }]
  const F: V3 = [-9, 4, 4], M0: V3 = [EGG_R - 10, 5, 4]
  const fem: V3 = [lerp(F[0], -3.6, s2), lerp(F[1], 0, s2), 4], mal: V3 = [lerp(M0[0], 3.6, s2), lerp(M0[1], 0, s2), 4]
  return <group position={at}>
    {/* 卵细胞：外面一层受精以后才出现的膜 */}
    <Membrane at={[0, 0, 0]} R={EGG_R} tint="#f1e4cc" opacity={0.8} />
    {s1 > 0.3 && <mesh scale={EGG_R + 2.6}><sphereGeometry args={[1, 48, 32]} /><meshPhysicalMaterial color="#f2e7c8" roughness={0.25} clearcoat={1} transparent opacity={0.13 * Math.min(1, (s1 - 0.3) / 0.5)} depthWrite={false} side={THREE.DoubleSide} /></mesh>}
    {/* 三个退化的极体，贴在卵细胞旁边 */}
    {([[-20, 24, -6], [-26, 19, 4], [-14, 28, 3]] as V3[]).map((p, i) => <mesh key={i} position={p} scale={[4.6, 4.2, 4.4]}><sphereGeometry args={[1, 20, 14]} /><meshPhysicalMaterial color="#e8d8bc" roughness={0.4} clearcoat={0.4} transparent opacity={0.55} depthWrite={false} /></mesh>)}
    {/* 雌、雄原核：靠近以后合成一个核 */}
    {s2 < 1 && <Nucleus at={fem} R={lerp(9.5, 8, s2)} opacity={1 - s2 * 0.6} />}
    {s2 < 1 && s1 >= 1 && <Nucleus at={mal} R={8} opacity={(1 - s2 * 0.6) * Math.min(1, (s1 - 0.6) / 0.4 + 1)} />}
    {s2 > 0.6 && <Nucleus at={[0, 0, 4]} R={12.5} opacity={(s2 - 0.6) / 0.4} />}
    <ChromSet at={fem} list={egg} scale={0.62} />
    {s1 >= 1 && <ChromSet at={mal} list={dad} scale={0.62} />}
    {SWIM.map((s, i) => {
      if (i === ENTER) {
        // 游到卵细胞表面，头部钻进去，尾巴留在外面慢慢消失
        const surf: V3 = [EGG_R + 3, 6, 2], p: V3 = s1 < 0.55 ? [lerp(s.at[0], surf[0], s1 / 0.55), lerp(s.at[1], surf[1], s1 / 0.55), lerp(s.at[2], surf[2], s1 / 0.55)] : [lerp(surf[0], M0[0], (s1 - 0.55) / 0.45), surf[1], surf[2]]
        if (s1 >= 1) return null
        return <Sperm key={i} at={p} yaw={lerp(s.yaw, Math.PI, Math.min(1, s1 * 2))} tail={1 - Math.max(0, (s1 - 0.6) / 0.4)} scale={1.05} color="#3c69b8" />
      }
      // 其余精子：受精以后被挡在外面，停住
      const back = s1 * 8
      return <Sperm key={i} at={[s.at[0] + Math.cos(s.yaw + Math.PI) * back, s.at[1] + Math.sin(s.yaw + Math.PI) * back, s.at[2]]} yaw={s.yaw} swim={s1 < 1} scale={1.05} color="#3c69b8" />
    })}
  </group>
}
