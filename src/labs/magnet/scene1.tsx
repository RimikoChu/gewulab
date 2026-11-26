// 电与磁 · 第 1 课 磁现象的器材：西边一只悬挂架（木底座、铝立杆、横臂、细线和纸托），中间一只盛铁钉、铜片、铝片的白盘子，
// 东边一只回形针盒；戴手套的手拿着一块条形磁体。按厘米写，原点在第 1 格台面中心。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Metal } from '@/lab-kit'
import { BAR, clipDensity, rng } from './physics'
import { BarMagnet, CLIP, NAIL, Strip, Tray, clipPile } from './magnets'
import { Board, Glove, type V3 } from './gear'
import { swing } from './anim'

/** 器材的位置（cm） */
export const L1 = {
  stand: [-15, 0, -3] as V3, hookY: 16,               // 悬挂架：底座中心；纸托（磁体中心）的高度
  tray: [8, 0, 6] as V3, clips: [12, 0, -9] as V3,
  item: { copper: [4, 0, 6] as V3, alu: [8.5, 0, 6] as V3, iron: [13, 0, 6] as V3 },
}
/** 磁体挂在两端的回形针：两端各一串，越靠端头越多 */
function clipCluster(seed: number) {
  const r = rng(seed), list: { p: V3; r: V3 }[] = []
  for (let i = 0; i < 60 && list.length < 26; i++) {
    const x = (r() * 2 - 1)
    if (r() > clipDensity(x) + 0.02) continue
    const u = x * (BAR.len / 2 - 0.4), side = r() < 0.75 ? -1 : 0
    list.push({ p: [u + (Math.sign(u) * 0.6), side < 0 ? -0.6 - r() * 1.4 : BAR.h + 0.1, (r() - 0.5) * BAR.w * 1.2], r: [Math.PI / 2 * (0.6 + r() * 0.8), r() * Math.PI, (r() - 0.5) * 0.8] })
  }
  return list
}

export interface HandPose { p: V3; yaw: number }
/**
 * a：手里那块磁体的位置和朝向（hung 时由悬挂架接管）；hung：吊在悬挂架上；push：另一块磁体靠近吊着的 N 极时，N 极被推开（−1）或吸过来（+1）；
 * nail：铁钉吸在磁体 N 端；clips：两端挂着回形针；b：另一只手拿着的磁体（null 表示没有），bFace：它朝前的一端
 */
export function Scene1({ a, hung, push, nail, clips, b, bFace, hold }: { a: HandPose; hung: boolean; push: number; nail: boolean; clips: boolean; b: V3 | null; bFace: 'N' | 'S'; hold: boolean }) {
  const pile = useMemo(() => clipPile(150, 21, 4.4), [])
  const cluster = useMemo(() => clipCluster(21), [])
  const hang = useRef<THREE.Group>(null), st = useRef({ a: 0, v: 0 })
  // 吊着的磁体：朝向从东西方向摆到南北方向（N 极指北：朝向 −z，角度 −90°）；另一块磁体靠近时偏过去
  useFrame((_, d) => {
    const g = hang.current; if (!g) return
    if (!hung) { st.current = { a: 0, v: 0 }; g.rotation.y = 0; return }
    const goal = -Math.PI / 2 + push * 0.55
    g.rotation.y = -swing(st.current, goal, Math.min(d, 1 / 30), 2.6, 0.09)
  })
  const S = L1.stand
  const magnetA = (attach: boolean) => <group>
    <BarMagnet />
    {attach && nail && <mesh geometry={NAIL} position={[BAR.len / 2 + 0.2, 0.2, 0.2]} rotation-z={-1.05} castShadow><Metal kind="steel" rough={0.38} /></mesh>}
    {attach && clips && cluster.map((c, i) => <mesh key={i} geometry={CLIP} position={c.p} rotation={c.r} castShadow><Metal kind="steel" rough={0.25} /></mesh>)}
  </group>
  return <group>
    {/* 悬挂架：木底座、铝立杆、横臂、黄铜夹头、细线、白色纸托 */}
    <group position={S}>
      <Board w={14} d={10} h={1.6} />
      <mesh position={[-5, 14, -3]} castShadow><cylinderGeometry args={[0.45, 0.45, 25, 20]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <mesh position={[-2.5, 26.2, -3]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.35, 0.35, 6, 16]} /><Metal kind="aluminum" grain="brushed" /></mesh>
      <RoundedBox args={[1.6, 1.6, 1.6]} radius={0.2} position={[-5, 26.2, -3]} castShadow><Metal kind="brass" grain="cast" /></RoundedBox>
      <mesh position={[0, 26.2, -3]} castShadow><sphereGeometry args={[0.35, 12, 10]} /><Metal kind="brass" /></mesh>
      <mesh position={[0, (26 + L1.hookY + 1.8) / 2, -3]}><cylinderGeometry args={[0.03, 0.03, 26 - L1.hookY - 1.8, 6]} /><meshStandardMaterial color="#f2efe6" roughness={0.9} /></mesh>
    </group>
    {/* 吊着的磁体：纸托兜着磁体中部 */}
    <group ref={hang} position={[S[0], L1.hookY, S[2] - 3]} visible={hung}>
      <group position={[0, -BAR.h / 2, 0]}>{magnetA(false)}</group>
      <mesh position={[0, 0.9, 0]}><boxGeometry args={[1.4, 0.05, BAR.w + 0.4]} /><meshStandardMaterial color="#f5f3ec" roughness={0.9} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[0, 0.1, s * (BAR.w / 2 + 0.2)]}><boxGeometry args={[1.4, 1.6, 0.05]} /><meshStandardMaterial color="#f5f3ec" roughness={0.9} /></mesh>)}
      <mesh position={[0, -0.75, 0]}><boxGeometry args={[1.4, 0.05, BAR.w + 0.4]} /><meshStandardMaterial color="#f5f3ec" roughness={0.9} /></mesh>
    </group>
    {/* 白盘子：铜片、铝片、铁钉 */}
    <group position={L1.tray}><Tray w={16} d={7} /></group>
    <Strip kind="copper" at={[L1.item.copper[0], 0.25, L1.item.copper[2]]} yaw={0.1} />
    <Strip kind="aluminum" at={[L1.item.alu[0], 0.25, L1.item.alu[2]]} yaw={-0.08} />
    {!nail && <mesh geometry={NAIL} position={[L1.item.iron[0] - 2.5, 0.67, L1.item.iron[2]]} rotation-x={0.0} castShadow><Metal kind="steel" rough={0.38} /></mesh>}
    {/* 回形针盒：透明塑料盒里一堆回形针 */}
    <group position={L1.clips}>
      <Tray w={24} d={6.4} h={1.8} color="#dfe8ee" />
      <mesh geometry={pile} position={[0, 0.25, 0]} castShadow receiveShadow><Metal kind="steel" rough={0.25} /></mesh>
    </group>
    {/* 手里的磁体 */}
    {!hung && <group position={a.p} rotation-y={a.yaw}>
      {magnetA(true)}
      {hold && <group position={[0, BAR.h + 0.5, 0.9]} rotation-y={Math.PI}><group rotation-x={1.05}><Glove scale={0.92} /></group></group>}
    </group>}
    {/* 另一只手拿着的磁体：朝前（−x）的一端是 bFace */}
    {b && <group position={b} rotation-y={bFace === 'N' ? Math.PI : 0}>
      <BarMagnet />
      <group position={[bFace === 'N' ? -4 : 4, BAR.h + 0.5, 0.9]} rotation-y={Math.PI}><group rotation-x={1.05}><Glove scale={0.92} /></group></group>
    </group>}
  </group>
}
