// 各课共用的小东西：一次运动的时钟、一串浮子、尺寸线、空格键。
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { V3 } from './layout'

/**
 * 一次运动的时钟：id 是 0 时停在起点（t = 0）；id 一变就从 0 秒开始走，每帧把现在的时刻交给 tick。hold 为真时停表（定格）。
 * marks 是几个要报告的时刻，走到第 i 个就调一次 onMark(i)。每帧的间隔封顶 1/30 秒：切走再切回来不会跳。
 */
export function useRun(id: number, tick: (t: number, dt: number) => void, marks: number[] = [], onMark?: (i: number) => void, hold = false) {
  const s = useRef({ id: -1, t: 0, n: 0 }), cb = useRef({ tick, onMark, marks, hold }); cb.current = { tick, onMark, marks, hold }
  useFrame((_, d) => {
    const q = s.current, dt = cb.current.hold ? 0 : Math.min(d, 1 / 30)
    if (q.id !== id) { q.id = id; q.t = 0; q.n = 0 }
    if (id !== 0) q.t = Math.min(900, q.t + dt)
    cb.current.tick(id === 0 ? 0 : q.t, dt)
    while (id !== 0 && q.n < cb.current.marks.length && q.t >= cb.current.marks[q.n]) cb.current.onMark?.(q.n++)
  })
}

/** 空格键等于按主按钮 */
export function useSpace(fn: () => void) {
  const f = useRef(fn); f.current = fn
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.code !== 'Space' || (e.target as HTMLElement | null)?.closest?.('button, input, textarea')) return; e.preventDefault(); f.current() }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])
}

/** 一串浮子：n 只小球浮在水面上，每帧由 place(i) 给出第 i 只的位置；mark 那一只是红的，其余橙白相间 */
export function Floats({ n, r = 0.34, mark = -1, place }: { n: number; r?: number; mark?: number; place: (i: number, out: V3) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), []), p = useMemo<V3>(() => [0, 0, 0], [])
  useLayoutEffect(() => {
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) ref.current?.setColorAt(i, c.set(i === mark ? '#e0271b' : i % 2 ? '#f39a2b' : '#f2efe6'))
    if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [n, mark])
  useFrame(() => {
    const im = ref.current; if (!im) return
    for (let i = 0; i < n; i++) { place(i, p); const k = i === mark ? 1.25 : 1; m.makeScale(k, k, k); m.setPosition(p[0], p[1] + r * 0.25 * k, p[2]); im.setMatrixAt(i, m) }
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow frustumCulled={false}>
    <sphereGeometry args={[r, 20, 14]} /><meshPhysicalMaterial roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.3} />
  </instancedMesh>
}

/** 尺寸线：从 a 到 b 的一根细杆，两头各一道短竖线。不受遮挡 */
export function Dim({ a, b, color = '#ffe17a', thick = 0.03, tick = 0.5 }: { a: V3; b: V3; color?: string; thick?: number; tick?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A)
    return { pos: A.clone().add(B).multiplyScalar(0.5), len: d.length(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.clone().normalize()) }
  }, [a[0], a[1], a[2], b[0], b[1], b[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  const mat = <meshBasicMaterial color={color} depthTest={false} transparent toneMapped={false} />
  return <group position={pos} quaternion={quat} renderOrder={12}>
    <mesh renderOrder={12}><boxGeometry args={[len, thick, thick]} />{mat}</mesh>
    {[-1, 1].map(s => <mesh key={s} position-x={s * len / 2} renderOrder={12}><boxGeometry args={[thick, tick, thick]} />{mat}</mesh>)}
  </group>
}

/** 一个数：null 画成短横线 */
export const num = (v: number | null | undefined, d = 2) => v == null ? '—' : (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−')
