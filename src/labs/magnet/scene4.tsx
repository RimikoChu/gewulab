// 电与磁 · 第 4 课 电磁铁的器材：铁架台上夹着一只竖直的电磁铁（黑色线圈骨架、漆包线、可以抽出的铁芯，顶上三只接线柱：公共端、50 匝、100 匝），
// 下面一只玻璃培养皿里一堆大头针；学生电源、开关、电流表、滑动变阻器串成一圈。按厘米写，原点在第 4 格台面中心。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal, lathe, shell } from '@/lab-kit'
import { rng } from './physics'
import { makeCoil } from './mats'
import { KnifeSwitch, Meter, Post, RED, BLACK, Rheostat, Supply, SwitchHand, Wire, add, meterPosts, rheoPosts, route, supplyPosts, switchPosts, type V3 } from './gear'

export const L4 = {
  sup: [-26, 0, -16] as V3, sw: [17, 0, 14] as V3, amp: [16, 0, -11] as V3, rheo: [-21, 0, 11] as V3,
  em: [0, 0, 0] as V3, tip: 6, bob: [6.6, 16.6] as [number, number], coilR: 2.4,
}
/** 一枚大头针：长 2.6 cm，针头朝 +y，原点在针尖 */
const PIN = (() => { const g = lathe([[0, 0], [0.03, 0.15], [0.035, 2.45], [0.12, 2.5], [0.12, 2.6], [0, 2.62]], { segs: 8, crease: 40 }); return g })()
const BOBBIN = lathe([[0.75, 0], [3.1, 0], [3.1, 0.4], [0.95, 0.4], [0.95, 9.6], [3.1, 9.6], [3.1, 10], [0.75, 10]], { segs: 48, crease: 30, closed: true })
const DISH = shell([[0, 0], [5.6, 0], [5.7, 0.1], [5.7, 1.3]], 0.15, { segs: 48 })
const CORE = lathe([[0, 0], [0.62, 0], [0.68, 0.06], [0.68, 13.6], [1.2, 13.6], [1.25, 13.7], [1.25, 14.4], [1.1, 14.5], [0, 14.5]], { segs: 32, crease: 40 })

/** 吸在铁芯下端的大头针一圈圈往下挂；没被吸住的散在培养皿里 */
function pinSlots() {
  const r = rng(7), hang: { p: V3; e: V3 }[] = [], dish: { p: V3; e: V3 }[] = []
  for (let i = 0; i < 24; i++) {
    const layer = i < 8 ? 0 : i < 16 ? 1 : 2, a = (i % 8) / 8 * Math.PI * 2 + layer * 0.4, rad = 0.35 + layer * 0.35
    hang.push({ p: [Math.cos(a) * rad, L4.tip - 0.15 - layer * 2.1, Math.sin(a) * rad], e: [Math.PI + Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] })
  }
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 4.6; dish.push({ p: [Math.cos(a) * d, 0.3 + (i % 4) * 0.08, Math.sin(a) * d], e: [Math.PI / 2 + (r() - 0.5) * 0.2, r() * Math.PI * 2, 0] }) }
  return { hang, dish }
}

export function Scene4({ on, swing, I, n, turns, core, coreK, p }: { on: boolean; swing: number; I: number; n: number; turns: 50 | 100; core: boolean; coreK: number; p: number }) {
  const slots = useMemo(() => pinSlots(), [])
  const inst = useRef<THREE.InstancedMesh>(null), st = useRef(slots.hang.map(() => 0)), m = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), [])
  const nRef = useRef(n); nRef.current = on && (coreK < 0.01 || coreK > 0.99) ? n : 0
  useFrame((_, d) => {
    const im = inst.current; if (!im) return
    const dt = Math.min(d, 1 / 30)
    for (let i = 0; i < slots.dish.length; i++) {
      const up = i < slots.hang.length ? st.current[i] : 0
      if (i < slots.hang.length) { const goal = i < nRef.current ? 1 : 0; st.current[i] = goal ? Math.min(1, st.current[i] + dt / (0.25 + i * 0.03)) : Math.max(0, st.current[i] - dt / 0.35) }
      const a = slots.dish[i], b = slots.hang[i] ?? a, k = up * up * (3 - 2 * up)
      const pos = new THREE.Vector3(a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k + Math.sin(k * Math.PI) * 0.6, a.p[2] + (b.p[2] - a.p[2]) * k)
      e.set(a.e[0] + (b.e[0] - a.e[0]) * k, a.e[1] + (b.e[1] - a.e[1]) * k, a.e[2] + (b.e[2] - a.e[2]) * k); q.setFromEuler(e)
      m.compose(pos, q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  const coil = useMemo(() => { const t = makeCoil().clone(); t.repeat.set(1, 30); t.needsUpdate = true; return t }, [])
  const P = { sup: supplyPosts(), sw: switchPosts(), amp: meterPosts(), rh: rheoPosts() }
  const w = (o: V3, p: V3) => add(o, p)
  const [b0, b1] = L4.bob
  const top: V3 = [0, b1 + 0.4, 0]
  const tCom: V3 = [-2.2, top[1] + 0.45, 1.2], t50: V3 = [0.2, top[1] + 0.45, 2.2], t100: V3 = [2.4, top[1] + 0.45, 1.0]
  const f = on ? 1 : 0
  // 铁芯：插着时在线圈里；抽出来时先往下滑出，再横放到培养皿东边
  const k1 = Math.min(1, coreK * 2), k2 = Math.max(0, coreK * 2 - 1)
  const corePos: V3 = [k2 * 11, L4.tip - 0.4 - k1 * 9 + k2 * (9 - L4.tip + 0.4 + 0.7), k2 * 2]
  return <group>
    {/* 铁架台：铸铁底座、立杆、十字夹、横杆，横杆的夹子夹着线圈骨架的顶 */}
    <group position={[0, 0, -9]}>
      <RoundedBox args={[22, 1.4, 13]} radius={0.4} smoothness={3} position={[0, 0.7, 0]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[-8, 1.4 + 20, -2]} castShadow><cylinderGeometry args={[0.55, 0.55, 40, 20]} /><Metal kind="steel" grain="brushed" /></mesh>
      <RoundedBox args={[2.4, 2.4, 2.4]} radius={0.3} position={[-8, b1 + 2.2, -2]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      <mesh position={[-4, b1 + 2.2, -2]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.45, 0.45, 8, 16]} /><Metal kind="steel" grain="brushed" /></mesh>
      <mesh position={[-8, b1 + 2.2, -0.5]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.3, 0.3, 2.2, 12]} /><Metal kind="steel" /></mesh>
    </group>
    <group position={[0, b1 + 2.2, -5.8]}>
      <RoundedBox args={[2.4, 1.6, 6.2]} radius={0.2} position={[0, 0, 1.8]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
    </group>
    {/* 电磁铁：骨架、线圈、铁芯 */}
    <mesh geometry={BOBBIN} position={[0, b0, 0]} castShadow><meshPhysicalMaterial color="#1b1c1e" roughness={0.4} clearcoat={0.4} /></mesh>
    <mesh position={[0, (b0 + b1) / 2, 0]} castShadow><cylinderGeometry args={[L4.coilR, L4.coilR, b1 - b0 - 0.8, 48, 1, true]} /><meshStandardMaterial map={coil} metalness={0.6} roughness={0.35} /></mesh>
    <mesh position={[0, b1 + 0.6, 0]}><cylinderGeometry args={[2.0, 2.0, 0.4, 32]} /><meshPhysicalMaterial color="#e3dccb" roughness={0.5} /></mesh>
    <Post at={[tCom[0], b1 + 0.8, tCom[2]]} /><Post at={[t50[0], b1 + 0.8, t50[2]]} color={turns === 50 ? RED : '#3c3f43'} /><Post at={[t100[0], b1 + 0.8, t100[2]]} color={turns === 100 ? RED : '#3c3f43'} />
    <group position={corePos} rotation-z={k2 * Math.PI / 2}>
      <mesh geometry={CORE} castShadow><Metal kind="steel" grain="turned" rough={0.32} /></mesh>
    </group>
    {/* 培养皿和大头针 */}
    <mesh geometry={DISH} renderOrder={3}><meshPhysicalMaterial color="#e8f1ef" transparent opacity={0.25} roughness={0.05} depthWrite={false} clearcoat={1} envMapIntensity={1.5} /></mesh>
    <instancedMesh ref={inst} args={[PIN, undefined, slots.dish.length]} castShadow frustumCulled={false}><Metal kind="chrome" rough={0.15} /></instancedMesh>
    {/* 电路：电源、开关、电流表、滑动变阻器 */}
    <group position={L4.sup}><Supply u={6} /></group>
    <group position={L4.sw}><KnifeSwitch on={swing} />{swing > 0.01 && swing < 0.99 && <SwitchHand on={swing} />}</group>
    <group position={L4.amp}><Meter kind="A" k={on ? I / 3 : 0} /></group>
    <group position={L4.rheo}><Rheostat p={p} /></group>
    <Wire pts={route(w(L4.sup, P.sup.plus), w(L4.rheo, P.rh.A), [[-34, -2], [-38, 8]])} color={RED} flow={f} />
    <Wire pts={route(w(L4.rheo, P.rh.D), w(L4.sw, P.sw.a), [[-12, 14], [6, 19]])} color={RED} flow={f} />
    <Wire pts={route(w(L4.sw, P.sw.b), w(L4.amp, P.amp.pos), [[26, 10], [26, -2]])} color={RED} flow={f} />
    <Wire pts={route(w(L4.amp, P.amp.neg), tCom, [[10, -2], [4, -4], [-3, -2]])} color={RED} flow={f} />
    <Wire pts={route(turns === 50 ? t50 : t100, w(L4.sup, P.sup.minus), [[-8, 3], [-20, 0]])} color={BLACK} flow={f} />
  </group>
}
