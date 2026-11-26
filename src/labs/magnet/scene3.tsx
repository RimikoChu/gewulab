// 电与磁 · 第 3 课 电生磁的器材：西边是奥斯特实验——两只绝缘支架把一根铜导线沿南北方向拉直，导线正下方一枚小磁针；
// 东边一块木底板上，一只透明管外绕着十二匝铜线的螺线管，两端各放一枚小磁针。电池盒、单刀开关、电流表在西头和后面。
// 按厘米写，原点在第 3 格台面中心。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ForceArrow, Metal, lathe } from '@/lab-kit'
import { fieldLines, l3Current, needleAngle, solenoidN, wireDeflect, type P2 } from './physics'
import { FieldLines, Needle } from './magnets'
import { BatteryBox, Board, KnifeSwitch, Meter, Post, RED, BLACK, SwitchHand, Wire, add, batteryPosts, meterPosts, route, switchPosts, type V3 } from './gear'

export const L3 = {
  bat: [-36, 0, -8] as V3, sw: [-31, 0, 10] as V3, amp: [-14, 0, -20] as V3,
  needle: [-10, 0, 1] as V3, wireY: 4.9, wN: -10, wS: 13,
  coil: [14, 0, 0] as V3, coilY: 4.2, coilL: 12, coilR: 1.75,
}
const NOR = -Math.PI / 2
const STAND = lathe([[0, 0], [1.2, 0], [1.25, 0.15], [1.0, 0.5], [0.45, 0.8], [0.4, 4.4], [0.55, 4.6], [0.55, 5.0], [0, 5.0]], { segs: 28, crease: 40 })
/** 螺线管上的铜线：x 从西往东，t 增大时从东头看是逆时针（physics.solenoidN 的约定） */
function helixPts(n: number) {
  const { coilL: L, coilR: R } = L3, pts: THREE.Vector3[] = [], N = n * 24
  for (let i = 0; i <= N; i++) { const t = i / 24 * Math.PI * 2; pts.push(new THREE.Vector3(-L / 2 + 0.4 + (L - 0.8) * i / N, R * Math.sin(t), -R * Math.cos(t))) }
  return pts
}

export function Scene3({ on, dir, coil, swing, show }: { on: boolean; dir: 1 | -1; coil: boolean; swing: number; show: number }) {
  const I = on ? l3Current() : 0, B = batteryPosts(), S = switchPosts(), A = meterPosts()
  const w = (p: V3, o: V3) => add(p, o)
  const bp = w(L3.bat, B.plus), bm = w(L3.bat, B.minus), sa = w(L3.sw, S.a), sb = w(L3.sw, S.b), ap = w(L3.amp, A.pos), an = w(L3.amp, A.neg)
  const nN: V3 = [L3.needle[0], L3.wireY + 0.45, L3.wN], nS: V3 = [L3.needle[0], L3.wireY + 0.45, L3.wS]
  const cx = L3.coil[0], cy = L3.coilY
  const cW: V3 = [cx - 8, 1.2 + 0.45, 3], cE: V3 = [cx + 8, 1.2 + 0.45, 3]
  // 电池盒两极：电流方向反过来时，把两根线在电池盒上对调
  const [hot, cold] = dir > 0 ? [bp, bm] : [bm, bp]
  const helix = useMemo(() => helixPts(12), [])
  const coilGeo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 12 * 40, 0.13, 6), [helix])
  // 螺线管里电流的方向：从西头的线进去（dir = 1）
  const flowC = coil && on ? dir : 0, flowW = !coil && on ? dir : 0, f = on ? dir : 0
  const wireAngle = NOR + (flowW ? wireDeflect(dir) : 0)
  const endE: [number, number] = [cx + 11.5, 0], endW: [number, number] = [cx - 11.5, 0]
  const kind = flowC ? (solenoidN(dir) === 'east' ? 'solenoidE' : 'solenoidW') : null
  const local = (p: [number, number]): [number, number] => [p[0] - cx, p[1]]
  const nEnd = flowC ? solenoidN(dir) : null
  const linesE = useMemo(() => fieldLines('solenoidE').map(l => l.filter(p => Math.abs(p[0]) < 15 && Math.abs(p[1]) < 9)), [])
  const linesW = useMemo(() => fieldLines('solenoidW').map(l => l.filter(p => Math.abs(p[0]) < 15 && Math.abs(p[1]) < 9)), [])
  const to3 = useMemo(() => (p: P2): V3 => [p[0], L3.coilY, p[1]], [])
  return <group>
    <group position={L3.bat}><BatteryBox /></group>
    <group position={L3.sw}><KnifeSwitch on={swing} />{swing > 0.01 && swing < 0.99 && <SwitchHand on={swing} />}</group>
    <group position={L3.amp}><Meter kind="A" k={I / 3} /></group>
    {/* 奥斯特实验：两只绝缘支架，铜导线沿南北方向拉直 */}
    {[L3.wN, L3.wS].map(z => <group key={z} position={[L3.needle[0], 0, z]}>
      <mesh geometry={STAND} castShadow><meshPhysicalMaterial color="#e8e4d8" roughness={0.3} clearcoat={0.5} /></mesh>
      <Post at={[0, 5.0, 0]} color={z === L3.wS ? RED : BLACK} />
    </group>)}
    <mesh position={[L3.needle[0], L3.wireY + 0.45 + 0.05, (L3.wN + L3.wS) / 2]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.1, 0.1, L3.wS - L3.wN, 10]} /><Metal kind="copper" rough={0.22} /></mesh>
    {flowW !== 0 && <Wire bare pts={[[L3.needle[0], L3.wireY + 0.55, L3.wS], [L3.needle[0], L3.wireY + 0.55, L3.wN]]} r={0.1} flow={flowW} dots={9} />}
    <Needle at={L3.needle} angle={wireAngle} />
    {/* 螺线管：底板、两只支架、透明管、铜线、两只接线柱 */}
    <group position={L3.coil}>
      <Board w={22} d={9} h={1.2} />
      {[-1, 1].map(s => <RoundedBox key={s} args={[0.8, cy - 1.2, 2.6]} radius={0.12} position={[s * (L3.coilL / 2 + 0.6), 1.2 + (cy - 1.2) / 2 - 0.9, 0]} castShadow><meshPhysicalMaterial color="#e8e4d8" roughness={0.3} clearcoat={0.4} /></RoundedBox>)}
      <mesh position={[0, cy, 0]} rotation-z={Math.PI / 2} renderOrder={3}><cylinderGeometry args={[1.55, 1.55, L3.coilL + 1.6, 36, 1, true]} /><meshPhysicalMaterial color="#e6f2f3" transparent opacity={0.22} roughness={0.05} depthWrite={false} side={THREE.DoubleSide} clearcoat={1} /></mesh>
      <mesh geometry={coilGeo} position={[0, cy, 0]} castShadow><Metal kind="copper" rough={0.24} /></mesh>
      <group position={[0, cy, 0]}><Wire bare pts={helix.filter((_, i) => i % 3 === 0).map(v => [v.x, v.y * 1.06, v.z * 1.06] as V3)} r={0.11} flow={flowC * 3} dots={60} /></group>
      <Post at={[cW[0] - cx, 1.2, 3]} color={RED} /><Post at={[cE[0] - cx, 1.2, 3]} />
      {/* 线圈两头的引线下到接线柱 */}
      <Wire pts={[[-L3.coilL / 2 + 0.4, cy, -L3.coilR], [-L3.coilL / 2 - 0.4, cy - 1, 0.4], [cW[0] - cx, 1.9, 3]]} color="#b5562d" r={0.12} flow={flowC} dots={4} />
      <Wire pts={[[L3.coilL / 2 - 0.4, cy, -L3.coilR], [L3.coilL / 2 + 0.4, cy - 1, 0.4], [cE[0] - cx, 1.9, 3]]} color="#b5562d" r={0.12} flow={-flowC} dots={4} />
      <FieldLines lines={linesE} to3={to3} show={nEnd === 'east' ? show : 0} r={0.08} />
      <FieldLines lines={linesW} to3={to3} show={nEnd === 'west' ? show : 0} r={0.08} />
      {/* 安培定则：四指弯的方向是电流方向，大拇指指 N 极 */}
      {nEnd && <group position={[0, cy, 0]}>
        <ForceArrow tip={[nEnd === 'east' ? 10.5 : -10.5, 0, 0]} dir={[nEnd === 'east' ? 1 : -1, 0, 0]} len={6} color="#ff6a5a" thick={5} />
      </group>}
    </group>
    {[endE, endW].map((p, i) => <Needle key={i} at={[p[0], 0, p[1]]} angle={kind ? needleAngle(kind, local(p)) : NOR} />)}
    {/* 导线：电池盒正极 → 开关 → 电流表 → 直导线（或螺线管）→ 电池盒负极 */}
    <Wire pts={route(hot, sa, [[-38, 4]])} color={RED} flow={f} />
    <Wire pts={route(sb, ap, [[-24, 4], [-20, -10]])} color={RED} flow={f} />
    {!coil ? <>
      <Wire pts={route(an, nS, [[-17, -8], [-17, 15], [-10, 17]])} color={RED} flow={f} />
      <Wire pts={route(nN, cold, [[-10, -14], [-24, -14]])} color={BLACK} flow={f} />
    </> : <>
      <Wire pts={route(an, cW, [[-6, -12], [2, 6]])} color={RED} flow={f} />
      <Wire pts={route(cE, cold, [[26, 8], [26, -10], [6, -27], [-26, -24]])} color={BLACK} flow={f} />
    </>}
  </group>
}
