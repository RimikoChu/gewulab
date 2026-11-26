// 电与磁 · 第 5 课 电动机的器材：西边一块侧立的蹄形磁体，两条黄铜导轨沿东西方向从两极之间穿过，一根铜棒沿南北方向搭在导轨上；
// 东边一台直流电动机模型：两块磁体夹着一只能绕轴转的矩形线圈，轴的前端是换向器（两片半圆铜环）和一对电刷。按厘米写，原点在第 5 格台面中心。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ForceArrow, Metal } from '@/lab-kit'
import { BatteryBox, Board, KnifeSwitch, Post, RED, BLACK, SwitchHand, Wire, add, batteryPosts, route, switchPosts, type V3 } from './gear'
import { HorseMagnet, N_RED, S_BLUE } from './magnets'

export const L5 = { mag: [-12, 0, 0] as V3, sc: 1.4, railY: 4.7, railZ: [1.4, 4.8] as [number, number], railX: [-30, 6] as [number, number], bat: [-34, 0, -14] as V3, sw: [-26, 0, 14] as V3, motor: [34, 0, 0] as V3 }
/** 侧立的蹄形磁体两脚沿 z，中段（两极正对的地方）的 z */
const POLE_Z = 0.7 * L5.sc

/** 一圈矩形线圈：长边沿 z（长 7 cm），离轴 2.6 cm；n 匝漆包线并成一束 */
const COIL = (() => {
  const a = 2.6, L = 3.5, pts = [[a, 0, -L], [a, 0, L], [-a, 0, L], [-a, 0, -L]].map(p => new THREE.Vector3(...(p as V3)))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.05), 80, 0.42, 10, true)
})()

export function Scene5({ on, swing, dir, b, rodX, motor, theta }: { on: boolean; swing: number; dir: 1 | -1; b: 1 | -1; rodX: number; motor: boolean; theta: number }) {
  const B = batteryPosts(), S = switchPosts()
  const w = (o: V3, p: V3) => add(o, p)
  const [hot, cold] = dir > 0 ? [w(L5.bat, B.plus), w(L5.bat, B.minus)] : [w(L5.bat, B.minus), w(L5.bat, B.plus)]
  const [zN, zS] = L5.railZ, [x0, x1] = L5.railX, ry = L5.railY
  const railN: V3 = [x0 + 1, ry + 0.9, zN], railS: V3 = [x0 + 1, ry + 0.9, zS]
  const roll = useRef<THREE.Group>(null), last = useRef(rodX)
  useFrame(() => { if (roll.current) { roll.current.rotation.z -= (rodX - last.current) / 0.35; last.current = rodX } })
  const f = on && !motor ? 1 : 0, fm = on && motor ? 1 : 0
  const mx = L5.motor[0]
  // 电动机模型：两只接线柱 → 两片电刷 → 换向器 → 线圈
  const mPlus: V3 = [mx - 6, 1.2 + 0.45, 5], mMinus: V3 = [mx + 6, 1.2 + 0.45, 5]
  return <group>
    <group position={L5.bat}><BatteryBox /></group>
    <group position={L5.sw}><KnifeSwitch on={swing} />{swing > 0.01 && swing < 0.99 && <SwitchHand on={swing} />}</group>
    {/* 导轨：两头各一块木支座，导轨用黄铜圆杆，西头两只接线柱 */}
    {[x0, x1].map(x => <group key={x} position={[x, 0, (zN + zS) / 2]}>
      <RoundedBox args={[3, ry, 9]} radius={0.25} position={[0, ry / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#b88a55" roughness={0.6} clearcoat={0.3} /></RoundedBox>
    </group>)}
    {[zN, zS].map(z => <mesh key={z} position={[(x0 + x1) / 2, ry + 0.25, z]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.25, 0.25, x1 - x0 + 2, 16]} /><Metal kind="brass" grain="turned" rough={0.42} env={0.6} /></mesh>)}
    <Post at={[x0 + 1, ry, zN - 2.4]} color={RED} /><Post at={[x0 + 1, ry, zS + 2.4]} />
    {[zN, zS].map((z, i) => <mesh key={`s${z}`} position={[x0 + 1, ry + 0.3, z + (i ? 1.2 : -1.2)]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 2.4, 8]} /><Metal kind="brass" /></mesh>)}
    {/* 蹄形磁体侧立：N 极在上（b = 1）或 S 极在上 */}
    <group position={[L5.mag[0], 0, 0]}><HorseMagnet stand flip={b < 0} scale={L5.sc} /></group>
    {/* 导体棒：铜棒搭在两条导轨上，通电时滚动 */}
    <group position={[rodX, ry + 0.6, (zN + zS) / 2]}>
      <group ref={roll}>
        <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.45, 0.45, zS - zN + 3.4, 20]} /><Metal kind="copper" rough={0.16} env={1.4} /></mesh>
        <mesh position={[0, 0.36, 0]}><boxGeometry args={[0.05, 0.04, zS - zN + 3]} /><meshStandardMaterial color="#5a2d18" /></mesh>
      </group>
      {on && !motor && <Wire bare pts={[[0, 0.5, dir > 0 ? -2.6 : 2.6], [0, 0.5, dir > 0 ? 2.6 : -2.6]]} r={0.1} flow={1} dots={4} />}
    </group>
    {on && !motor && <ForceArrow tip={[rodX + dir * b * 6.5, ry + 0.6, zS + 3.2]} dir={[dir * b, 0, 0]} len={4.5} color="#ff5a4a" thick={5} />}
    <Wire pts={route(hot, w(L5.sw, S.a), [[-40, 2]])} color={RED} flow={f + fm} />
    <Wire pts={route(w(L5.sw, S.b), motor ? mPlus : [x0 + 1, ry + 0.45, zN - 2.4], motor ? [[-8, 18], [12, 14]] : [[-34, 6], [-35, -6]])} color={RED} flow={f + fm} />
    <Wire pts={route(motor ? mMinus : [x0 + 1, ry + 0.45, zS + 2.4], cold, motor ? [[28, 12], [28, -16], [-20, -22]] : [[-36, 8], [-40, -8]])} color={BLACK} flow={f + fm} />
    {/* 直流电动机模型 */}
    <group position={L5.motor}>
      <Board w={18} d={14} h={1.2} />
      {/* 两块磁体：西边 N 极、东边 S 极，红漆蓝漆，用铁轭撑着 */}
      {[-1, 1].map(s => <group key={s} position={[s * 5.4, 1.2, -0.5]}>
        <RoundedBox args={[1.8, 6.8, 7]} radius={0.2} position={[0, 4.6, 0]} castShadow><meshPhysicalMaterial color={s < 0 ? N_RED : S_BLUE} roughness={0.3} clearcoat={0.7} /></RoundedBox>
        <RoundedBox args={[2.6, 1.2, 8]} radius={0.15} position={[s * 0.4, 0.6, 0]} castShadow><Metal kind="iron" grain="cast" /></RoundedBox>
      </group>)}
      {/* 轴承架（前后两只） */}
      {[-4.6, 4.6].map(z => <group key={z} position={[0, 1.2, z]}>
        <RoundedBox args={[1.6, 5.6, 0.6]} radius={0.12} position={[0, 2.8, 0]} castShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
        <mesh position={[0, 5.0, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.5, 0.5, 0.8, 20]} /><Metal kind="brass" /></mesh>
      </group>)}
      <group position={[0, 6.2, -0.5]} rotation-z={theta}>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.18, 0.18, 12, 12]} /><Metal kind="steel" grain="turned" /></mesh>
        <mesh geometry={COIL} castShadow><meshStandardMaterial color="#b8582c" metalness={0.65} roughness={0.32} /></mesh>
        {/* 换向器：两片半圆铜环，中间两道绝缘缝 */}
        {[0, 1].map(i => <mesh key={i} position={[0, 0, 5.4]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.62, 0.62, 1.1, 24, 1, false, i * Math.PI + 0.15, Math.PI - 0.3]} /><Metal kind="copper" grain="turned" rough={0.2} /></mesh>)}
      </group>
      {/* 电刷：两片铜片从上下压在换向器上 */}
      {[-1, 1].map(s => <group key={s}>
        <mesh position={[s * 1.2, 6.2 + s * 0.4, 4.9]} rotation-z={s * 0.6}><boxGeometry args={[2.2, 0.08, 0.7]} /><Metal kind="brass" /></mesh>
        <mesh position={[s * 3.2, 3.8, 4.9]}><boxGeometry args={[0.6, 5.2, 0.6]} /><meshPhysicalMaterial color="#e8e4d8" roughness={0.4} /></mesh>
      </group>)}
      <Post at={[mPlus[0] - mx, 1.2, 5]} color={RED} /><Post at={[mMinus[0] - mx, 1.2, 5]} />
    </group>
  </group>
}
