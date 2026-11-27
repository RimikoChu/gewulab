// 放大：第 1、6 课从一滴水一路推进到水分子、原子、原子核。
// 做法：镜头不动，整个世界绕着放大中心 P 等比放大（和镜头推近是一回事，但画面的尺度不变，阴影、环境遮蔽、近裁剪面都不用改）。
// 推进到水滴里面以后，三层模型依次接上：水分子（单位 Å）、原子（Å，电子云和画大了的原子核）、原子核（fm）。每层都以 P 为中心，
// 放大级 z 每加 1，视野缩小 10 倍；每层在自己该出现的那一段淡入，过了就淡出，中间不跳。背景和雾跟着换成水里的蓝、再换成深色。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ATOMS, nucleusRadius } from './physics'
import { M, type V3 } from './world'
import { EL, MolField, Molecule } from './mol'
import { ElectronCloud, Nucleus } from './nucleus'

/** t 落在 [a, b] 里时平滑地从 0 走到 1 */
export const sm = (a: number, b: number, t: number) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x) }
/** z 级时 1 Å 在画面里多长 */
export const perA = (z: number) => M * Math.pow(10, z) * 1e-10

/** 放大级匀速地变到目标值：离得远时快（每秒最多 3.2 级），快到了慢下来 */
export function useZoom(target: number) {
  const [z, setZ] = useState(target), cur = useRef(target)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const f = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const d = target - cur.current, v = Math.max(0.45, Math.min(3.2, Math.abs(d) * 1.7))
      cur.current = Math.abs(d) <= v * dt ? target : cur.current + Math.sign(d) * v * dt
      setZ(cur.current)
      if (cur.current !== target) raf = requestAnimationFrame(f)
    }
    if (cur.current !== target) raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return { z, moving: Math.abs(target - z) > 1e-4, snap: (v: number) => { cur.current = v; setZ(v) } }
}

/** 几个停靠的放大级：level 是要去哪一级，set 换一级（镜头匀速推过去） */
export function useLevels(stops: number[]) {
  const [level, setLevel] = useState(0)
  const z = useZoom(stops[level])
  return { level, set: setLevel, z, goal: stops[level] }
}

const WATER_BG = new THREE.Color('#0b3550'), DEEP_BG = new THREE.Color('#05080f')
/** 背景和雾：进了水滴以后换成蓝色，雾把远处的分子吞掉；到了原子那一级换成深色。离开这一课时还原 */
function Ambience({ P, z }: { P: V3; z: number }) {
  const { scene, camera } = useThree()
  const saved = useRef<{ bg: THREE.Color; fog: THREE.Color; near: number; far: number } | null>(null)
  const p = useMemo(() => new THREE.Vector3(...P), [P])
  useEffect(() => {
    const fog = scene.fog as THREE.Fog | null, bg = scene.background as THREE.Color | null
    if (fog && bg instanceof THREE.Color) saved.current = { bg: bg.clone(), fog: fog.color.clone(), near: fog.near, far: fog.far }
    return () => { const s = saved.current, f = scene.fog as THREE.Fog | null, b = scene.background as THREE.Color | null; if (s && f && b instanceof THREE.Color) { b.copy(s.bg); f.color.copy(s.fog); f.near = s.near; f.far = s.far } }
  }, [scene])
  useFrame(() => {
    const s = saved.current, fog = scene.fog as THREE.Fog | null, bg = scene.background as THREE.Color | null
    if (!s || !fog || !(bg instanceof THREE.Color)) return
    const w = sm(1.5, 2.5, z), deep = sm(7.9, 8.6, z), d = camera.position.distanceTo(p)
    const col = WATER_BG.clone().lerp(DEEP_BG, deep)
    bg.copy(s.bg).lerp(col, w); fog.color.copy(s.fog).lerp(col, w)
    fog.near = THREE.MathUtils.lerp(s.near, Math.max(0.1, d - 0.6), w); fog.far = THREE.MathUtils.lerp(s.far, d + 2.6 + deep * 1.5, w)
  })
  return null
}

const OH = new THREE.Vector3(Math.sin(104.5 / 2 * Math.PI / 180) * 0.96, -Math.cos(104.5 / 2 * Math.PI / 180) * 0.96, 0)   // 右边那个氢原子相对氧原子的位置（Å）
export type Focus = 'O' | 'H'

/**
 * 水滴里面的三层：P 放大中心；z 放大级；focus 盯着哪个原子（0 氧、1 氢，中间是在挪过去）；lit 原子核里已经数到几个。
 * 中间那个水分子朝着镜头摆正，其余的水分子在它周围一直动。
 */
export function Micro({ P, z, focus = 0, lit = 0 }: { P: V3; z: number; focus?: number; lit?: number }) {
  const inner = useRef<THREE.Group>(null), face = useRef<THREE.Group>(null), t = useRef(0)
  const ua = perA(z)
  const fieldOp = sm(6.9, 7.5, z) * (1 - sm(7.95, 8.4, z))
  const ballOp = sm(6.9, 7.5, z) * (1 - 0.95 * sm(8.2, 8.55, z)) * (1 - sm(8.9, 9.3, z))
  const cloudOp = sm(8.2, 8.55, z) * (1 - sm(10.6, 11.6, z))
  const nucShow = sm(8.25, 8.5, z)
  const off = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, d) => {
    t.current += Math.min(d, 1 / 30)
    if (face.current) face.current.quaternion.copy(camera.quaternion)
    const g = inner.current; if (!g) return
    // 中间这个水分子朝着镜头摆正；看分子那一级时它和别的分子一样轻轻抖着，往里推的时候慢慢停稳
    g.quaternion.copy(camera.quaternion)
    const still = sm(7.9, 8.3, z), j = (1 - still) * 0.35
    off.copy(OH).multiplyScalar(focus)
    g.position.set(Math.sin(t.current * 2.3) * j, Math.sin(t.current * 1.9 + 1) * j, 0).applyQuaternion(camera.quaternion).sub(off.clone().applyQuaternion(camera.quaternion))
  })
  if (z < 6.6) return <Ambience P={P} z={z} />
  // 原子核画出来的半径（Å）：真实大小和“画面里看得见的最小一点”取大的那个
  const nucR = (A: number) => Math.max(nucleusRadius(A) * 1e-5, (A > 1 ? 0.085 : 0.06) / ua)
  return <>
    <Ambience P={P} z={z} />
    <group position={P} scale={ua}>
      <group ref={face}>{fieldOp > 0.01 && <MolField species={[{ f: 'H2O', share: 1 }]} R={40} slab={[44, 28, 16, 9]} gap={3.1} hole={2.6} opacity={fieldOp} seed={7} />}</group>
      <group ref={inner}>
        {ballOp > 0.01 && <Molecule f="H2O" raw opacity={ballOp} cast={false} />}
        {cloudOp > 0.01 && <>
          <ElectronCloud e={8} r={EL.O.r} opacity={cloudOp} seed={3} />
          <group position={OH}><ElectronCloud e={1} r={EL.H.r} opacity={cloudOp} seed={4} /></group>
          <group position={[-OH.x, OH.y, 0]}><ElectronCloud e={1} r={EL.H.r} opacity={cloudOp} seed={6} /></group>
        </>}
        {nucShow > 0.01 && <>
          <group scale={nucShow}><Nucleus p={ATOMS.O.p} n={ATOMS.O.n} radius={nucR(16)} lit={focus < 0.5 ? lit : 0} glow={1 - sm(11.5, 12.6, z)} /></group>
          <group position={OH} scale={nucShow}><Nucleus p={1} n={0} radius={nucR(1)} lit={focus > 0.5 ? lit : 0} glow={1 - sm(11.5, 12.6, z)} /></group>
          <group position={[-OH.x, OH.y, 0]} scale={nucShow}><Nucleus p={1} n={0} radius={nucR(1)} glow={1} /></group>
        </>}
      </group>
    </group>
  </>
}
