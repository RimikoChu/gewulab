// 设备里面会动的东西：沸腾炉里的矿粒、吸收塔里淋下的酸。每帧在 useFrame 里重排实例，不走 React 的状态。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { oreTex, rep } from './mats'
import { rng, type V3 } from './parts'
import { ABS, ROAST } from './plant'
import type { OreKey } from './physics'

const COLD = new THREE.Color('#5d574a'), HOT = new THREE.Color('#ff7a2a'), WHITE = new THREE.Color('#ffd9a0'), SLAG = new THREE.Color('#7a3220')
/**
 * 沸腾炉分布板上的矿料（只画后半边，剖面朝镜头）。ore：块矿是几十块大石头，堆着不动；矿粉是两百来颗小颗粒，鼓风时被托起来翻滚。
 * blow：是不是在鼓风；burn：烧掉的比例（0–1），烧过的矿粒变成红棕色的渣
 */
export function RoastBed({ ore, blow, burn }: { ore: OreKey; blow: boolean; burn: number }) {
  const R = ROAST, N = 420, M = 120
  const seeds = useMemo(() => {
    const f = rng(11), half = (n: number, rmax: number) => Array.from({ length: n }, () => { const a = Math.PI + f() * Math.PI, q = Math.sqrt(f()) * rmax; return { x: Math.cos(a) * q, z: -Math.abs(Math.sin(a) * q) - 0.12, h: f(), w: 0.8 + f() * 1.6, ph: f() * 6.28, s: 0.7 + f() * 0.6, k: f() } })
    return { fine: half(N, R.r - 0.6), lump: half(M, R.r - 0.75) }
  }, [R])
  const fine = useRef<THREE.InstancedMesh>(null), lump = useRef<THREE.InstancedMesh>(null), lumpMat = useRef<THREE.MeshStandardMaterial>(null), lamp = useRef<THREE.PointLight>(null)
  const st = useRef({ lift: 0, heat: 0 }), tmp = useMemo(() => ({ o: new THREE.Object3D(), c: new THREE.Color() }), [])
  const tex = useMemo(() => rep(oreTex(), 1, 1), [])
  useFrame(({ clock }, d) => {
    const dt = Math.min(d, 1 / 30), S = st.current, t = clock.elapsedTime
    S.lift += ((blow ? 1 : 0) - S.lift) * (1 - Math.exp(-dt / 0.7))
    S.heat += ((blow ? 1 : burn > 0 ? 0.25 : 0) - S.heat) * (1 - Math.exp(-dt / 0.9))
    const f = fine.current, l = lump.current
    if (f) {
      f.visible = ore === 'fine'
      if (f.visible) {
        seeds.fine.forEach((p, i) => {
          // 静止时铺成半米厚的一层；鼓风时在三米多高的一段里上下翻滚，个别溅得更高
          const rest = R.yg + 0.08 + p.h * 1.7
          const up = R.yg + 0.2 + (0.5 + 0.5 * Math.sin(t * p.w * 2.2 + p.ph)) * (3.6 + p.k * 2.0) * (0.55 + 0.45 * Math.sin(t * 0.7 + p.ph * 2))
          const sw = S.lift * 0.22
          tmp.o.position.set(R.x + p.x + Math.sin(t * p.w * 1.3 + p.ph) * sw, rest + (up - rest) * S.lift, p.z + Math.cos(t * p.w * 1.1 + p.ph) * sw * 0.5)
          tmp.o.scale.setScalar(0.085 * p.s); tmp.o.rotation.set(t * p.w, p.ph, 0); tmp.o.updateMatrix(); f.setMatrixAt(i, tmp.o.matrix)
          const done = p.k < burn
          tmp.c.copy(done ? SLAG : COLD).lerp(i % 5 === 0 ? WHITE : HOT, S.heat * (done ? 0.55 : 0.95)); f.setColorAt(i, tmp.c)
        })
        f.instanceMatrix.needsUpdate = true; if (f.instanceColor) f.instanceColor.needsUpdate = true
      }
    }
    if (l) {
      l.visible = ore === 'lump'
      if (l.visible) {
        seeds.lump.forEach((p, i) => {
          tmp.o.position.set(R.x + p.x, R.yg + 0.16 + (i % 6) * 0.3 + p.h * 0.12 + Math.sin(t * 9 + p.ph) * 0.008 * S.lift, p.z)
          tmp.o.scale.set(0.27 * p.s, 0.22 * p.s, 0.25 * p.s); tmp.o.rotation.set(p.ph, p.ph * 2, p.h * 3); tmp.o.updateMatrix(); l.setMatrixAt(i, tmp.o.matrix)
        })
        l.instanceMatrix.needsUpdate = true
      }
    }
    if (lumpMat.current) lumpMat.current.emissiveIntensity = S.heat * 0.55
    if (lamp.current) lamp.current.intensity = S.heat * (ore === 'fine' ? 60 : 14)
  })
  return <>
    <instancedMesh ref={fine} args={[undefined, undefined, N]} frustumCulled={false}><icosahedronGeometry args={[1, 0]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
    <instancedMesh ref={lump} args={[undefined, undefined, M]} frustumCulled={false} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial ref={lumpMat} map={tex} roughness={0.8} metalness={0.3} emissive="#ff5a1e" emissiveIntensity={0} flatShading /></instancedMesh>
    <pointLight ref={lamp} position={[R.x, R.yg + 1.6, -0.4]} color="#ff8a3c" intensity={0} distance={11} decay={1.6} />
  </>
}

/**
 * 吸收塔里从分酸管淋下来的液滴（只在后半边）：一颗颗拉长的小液滴往下落，落到填料顶上就没了，填料下面再滴进塔底的酸池。
 * on：在不在淋；color：水是淡蓝，浓硫酸是淡黄
 */
export function Spray({ on, color }: { on: boolean; color: string }) {
  const A = ABS, N = 150, ri = A.r - 0.5
  const seeds = useMemo(() => { const f = rng(23); return Array.from({ length: N }, (_, i) => { const a = Math.PI + f() * Math.PI, q = Math.sqrt(f()) * ri; return { x: Math.cos(a) * q, z: -Math.abs(Math.sin(a) * q) - 0.1, u: f(), v: 2.4 + f() * 1.4, low: i % 3 === 0 } }) }, [ri])
  const mesh = useRef<THREE.InstancedMesh>(null), k = useRef(0), o = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, d) => {
    const m = mesh.current; if (!m) return
    const dt = Math.min(d, 1 / 30)
    k.current += ((on ? 1 : 0) - k.current) * (1 - Math.exp(-dt / 0.5))
    m.visible = k.current > 0.02
    if (!m.visible) return
    seeds.forEach((p, i) => {
      const [top, bot] = p.low ? [A.pack[0] - 0.5, A.pool + 0.1] : [A.spray - 0.4, A.pack[1] + 0.05]
      p.u = (p.u + dt * p.v / (top - bot)) % 1
      o.position.set(A.x + p.x, top - (top - bot) * p.u, p.z); o.scale.set(0.028 * k.current, 0.11 * k.current, 0.028 * k.current); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false} renderOrder={5}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} depthWrite={false} /></instancedMesh>
}
/** 一个朝镜头的半透明液面（半圆片）：at 圆心，r 半径 */
export function Pool({ at, r, color, opacity = 0.75 }: { at: V3; r: number; color: string; opacity?: number }) {
  return <mesh position={at} rotation-x={-Math.PI / 2}><circleGeometry args={[r, 40, 0, Math.PI]} /><meshPhysicalMaterial color={color} roughness={0.08} transparent opacity={opacity} clearcoat={1} side={THREE.DoubleSide} /></mesh>
}
