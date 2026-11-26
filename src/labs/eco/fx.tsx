// 发光的东西：食物链的箭头（一条拱起来的光带，箭头指向吃它的一方，光点顺着它往前走）、圈出一种生物的光环、
// 往上飘的热（呼吸作用散失的能量）、一缕缕农药雾、阳光的光柱。都是为了看清画的，不是真的东西。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng, type V3 } from './parts'

/** 从 a 到 b 拱起来的一条曲线 */
export function arc(a: V3, b: V3, lift: number) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), M = A.clone().add(B).multiplyScalar(0.5); M.y += lift
  return new THREE.QuadraticBezierCurve3(A, M, B)
}
/**
 * 发光的箭头：沿曲线一条细光带，末端一个箭头，箭头指向吃它的一方。
 * on：0–1，光带从起点长到终点（连上的过程）；flow：光点的多少（0 没有）；dim：只画淡淡的一条
 */
export function GlowArrow({ from, to, lift = 0.4, color = '#ffd36a', on = 1, flow = 0, width = 0.02, dim = false, dash = false }: { from: V3; to: V3; lift?: number; color?: string; on?: number; flow?: number; width?: number; dim?: boolean; dash?: boolean }) {
  const curve = useMemo(() => arc(from, to, lift), [from[0], from[1], from[2], to[0], to[1], to[2], lift])   // eslint-disable-line react-hooks/exhaustive-deps
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 48, width, 8, false), [curve, width])
  const L = curve.getLength(), head = Math.min(width * 7, L * 0.25)
  const k = Math.max(0, Math.min(1, on))
  const end = curve.getPointAt(Math.max(0.001, k)), tan = curve.getTangentAt(Math.max(0.001, k))
  const q = useMemo(() => new THREE.Quaternion(), [])
  q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan)
  const dots = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), [])
  const N = 14
  useFrame(({ clock }) => {
    const im = dots.current; if (!im) return
    const t = clock.elapsedTime, p = new THREE.Vector3()
    for (let i = 0; i < N; i++) {
      const u = (t * 0.35 + i / N) % 1, show = i < Math.round(flow * N) && u < k
      curve.getPointAt(u, p); const s = show ? width * 2.6 * Math.sin(u * Math.PI) + 1e-4 : 1e-5
      m.makeScale(s, s, s).setPosition(p); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  if (k <= 0.001) return null
  const op = dim ? 0.28 : 0.95
  return (
    <group>
      <mesh geometry={tubeGeo} renderOrder={12}>
        <shaderMaterial transparent depthTest={false} depthWrite={false} toneMapped={false}
          uniforms={{ uColor: { value: new THREE.Color(color).multiplyScalar(dim ? 1 : 1.8) }, uOn: { value: k }, uOp: { value: op }, uDash: { value: dash ? 1 : 0 } }}
          vertexShader={'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'}
          fragmentShader={'uniform vec3 uColor; uniform float uOn; uniform float uOp; uniform float uDash; varying vec2 vUv; void main(){ if (vUv.x > uOn) discard; if (uDash > 0.5 && fract(vUv.x * 14.0) > 0.55) discard; gl_FragColor = vec4(uColor, uOp); }'} />
      </mesh>
      <mesh position={end} quaternion={q} renderOrder={12}><coneGeometry args={[head * 0.55, head, 14]} /><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(dim ? 1 : 1.8)} transparent opacity={op} depthTest={false} toneMapped={false} /></mesh>
      {flow > 0 && <instancedMesh ref={dots} args={[undefined, undefined, N]} renderOrder={13} frustumCulled={false}><sphereGeometry args={[1, 10, 8]} /><meshBasicMaterial color={new THREE.Color('#fff6d8').multiplyScalar(2.2)} depthTest={false} toneMapped={false} transparent /></instancedMesh>}
    </group>
  )
}

/** 地上一圈淡淡的光环，圈出一种生物；会轻轻呼吸 */
export function Halo({ at, r = 0.3, color = '#7fe3d4', on = true }: { at: V3; r?: number; color?: string; on?: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (ref.current) { const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.06; ref.current.scale.set(s, s, s) } })
  if (!on) return null
  return (
    <mesh ref={ref} position={[at[0], at[1] + 0.03, at[2]]} rotation-x={-Math.PI / 2} renderOrder={11}>
      <ringGeometry args={[r * 0.86, r, 48]} />
      <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.6)} transparent opacity={0.9} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** 从一处往上飘的几缕暖色的光：呼吸作用散失的热。k 是多少（0–1） */
export function Heat({ at, k = 1, color = '#ff9a5a' }: { at: V3; k?: number; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), []), N = 18
  const seeds = useMemo(() => { const r = rng(Math.round(at[0] * 100 + at[2] * 7)); return Array.from({ length: N }, () => [r(), r() * 6.28, 0.6 + r() * 0.6]) }, [at[0], at[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => {
    const im = ref.current; if (!im) return
    seeds.forEach(([ph, a, sp], i) => {
      const u = (clock.elapsedTime * 0.3 * sp + ph) % 1, show = i < Math.round(k * N), s = show ? 0.03 * Math.sin(u * Math.PI) + 1e-4 : 1e-5
      m.makeScale(s, s, s).setPosition(at[0] + Math.cos(a + u * 3) * 0.12 * u, at[1] + u * 0.9, at[2] + Math.sin(a + u * 3) * 0.12 * u); im.setMatrixAt(i, m)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, N]} renderOrder={12} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.8)} transparent opacity={0.85} depthTest={false} toneMapped={false} /></instancedMesh>
}

/** 一团小光点：在 at 周围晃动，n 个（有毒物质、碳原子这类“看不见的东西”画成光点） */
export function Motes({ at, n, spread = [0.1, 0.1, 0.1], color = '#c77dff', size = 0.012 }: { at: V3; n: number; spread?: V3; color?: string; size?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), []), MAX = 80
  const seeds = useMemo(() => { const r = rng(Math.round(at[0] * 31 + at[2] * 17)); return Array.from({ length: MAX }, () => [r() - 0.5, r() - 0.5, r() - 0.5, r() * 6.28]) }, [at[0], at[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => {
    const im = ref.current; if (!im) return
    const t = clock.elapsedTime
    seeds.forEach(([x, y, z, ph], i) => {
      const s = i < n ? size * (0.8 + 0.3 * Math.sin(t * 3 + ph)) : 1e-5
      m.makeScale(s, s, s).setPosition(at[0] + x * spread[0] * 2 + Math.sin(t + ph) * 0.01, at[1] + y * spread[1] * 2 + Math.cos(t * 1.3 + ph) * 0.01, at[2] + z * spread[2] * 2); im.setMatrixAt(i, m)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, MAX]} renderOrder={12} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.7)} depthTest={false} toneMapped={false} /></instancedMesh>
}

/** 阳光照来的方向（和舞台里太阳的方向一致，抬高一点） */
const SUN_DIR = new THREE.Vector3(0.5, 0.8, 0.3).normalize(), SUN_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN_DIR)
/** 一束从天上照下来的阳光（光柱），on 0–1 */
export function SunBeam({ at, on = 1, r = 0.5 }: { at: V3; on?: number; r?: number }) {
  if (on <= 0.01) return null
  return (
    <mesh position={[at[0] + SUN_DIR.x * 2.5, at[1] + SUN_DIR.y * 2.5, at[2] + SUN_DIR.z * 2.5]} quaternion={SUN_Q} renderOrder={10}>
      <cylinderGeometry args={[r * 0.55, r * 0.8, 5, 32, 1, true]} />
      <meshBasicMaterial color={new THREE.Color('#fff1b8').multiplyScalar(1.4)} transparent opacity={0.12 * on} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}
