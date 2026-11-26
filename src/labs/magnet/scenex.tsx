// 电与磁 · 拓展课的器材：实训室东头一只打开门的控制柜，柜里装着一块电磁继电器示教板（控制电路：电池、开关、电磁铁；
// 工作电路：220 V 接线端子、触点，柜顶一只航空障碍灯样灯）；柜旁小桌上一只剖开一半的扬声器。按厘米写，原点在台面高度、这一格的中心。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { Metal } from '@/lab-kit'
import { makeCoil, makeText } from './mats'
import { BatteryBox, KnifeSwitch, Post, RED, BLACK, Wire, add, batteryPosts, switchPosts, type V3 } from './gear'

/** 继电器示教板的中心、扬声器的位置（cm，原点在台面高度） */
export const LX = { board: [0, 52, -21] as V3, spk: [62, -8, -6] as V3 }
const FLOOR = -80

/** 半个车削件：沿 y 轴转半圈（剖开的扬声器） */
const half = (p: [number, number][], segs = 32) => new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), segs, Math.PI / 2, Math.PI)
/** 剖面：闭合截面在剖切面（z = 0）上左右各一块 */
const cap = (p: [number, number][]) => mergeGeometries([1, -1].map(s => new THREE.ShapeGeometry(new THREE.Shape(p.map(([r, y]) => new THREE.Vector2(s * r, y))))))

export function SceneX({ on, swing, arm, mode, phase }: { on: boolean; swing: number; arm: number; mode: 'relay' | 'speaker'; phase: number }) {
  const B = LX.board, bp = batteryPosts(), sp = switchPosts()
  const coilTex = useMemo(() => { const t = makeCoil().clone(); t.repeat.set(1, 10); t.needsUpdate = true; return t }, [])
  const tag = makeText(['控制电路 6 V', '', '工作电路 220 V'], { w: 512, h: 128, bg: '#f4f3ee', fg: '#33383c', size: 26, weight: 600 })
  const plate = <meshStandardMaterial color="#d9dcd7" roughness={0.6} metalness={0.2} />
  // 衔铁：一根钢片绕西头的支点转，arm = 1 时吸下
  const pivot: V3 = [-12, 7.2, 2], ang = -0.1 * arm
  const lit = arm > 0.95
  // 扬声器：纸盆和线圈前后振动
  const s = LX.spk, cone = mode === 'speaker' ? Math.sin(phase) * 0.5 : 0
  const geo = useMemo(() => ({
    basket: half([[11.5, 6.5], [12, 6.2], [12, 5.8], [5, 1.2], [4.6, 0.6], [4.6, 0]]),
    cone: half([[2.2, 1.6], [3, 2.0], [7, 4.2], [10.6, 6.0], [11.2, 6.2]]),
    magnet: half([[2.6, -3.2], [6.2, -3.2], [6.2, -0.4], [2.6, -0.4], [2.6, -3.2]]),
    plates: half([[1.7, -3.8], [6.4, -3.8], [6.4, -3.2], [0.6, -3.2]]),
    pole: half([[0.001, -3.2], [1.7, -3.2], [1.7, 0.4], [0.001, 0.4]]),
    top: half([[2.2, -0.4], [6.4, -0.4], [6.4, 0.2], [2.2, 0.2], [2.2, -0.4]]),
    former: half([[1.95, -0.6], [2.15, -0.6], [2.15, 1.7], [1.95, 1.7]]),
    coil: half([[2.15, -0.5], [2.45, -0.5], [2.45, 0.9], [2.15, 0.9]]),
    dust: half([[0.001, 2.3], [1.2, 2.1], [2.2, 1.6]]),
    magnetCap: cap([[2.6, -3.2], [6.2, -3.2], [6.2, -0.4], [2.6, -0.4]]),
    platesCap: cap([[1.7, -3.8], [6.4, -3.8], [6.4, -3.2], [1.7, -3.2]]),
    poleCap: cap([[0, -3.2], [1.7, -3.2], [1.7, 0.4], [0, 0.4]]),
    topCap: cap([[2.2, -0.4], [6.4, -0.4], [6.4, 0.2], [2.2, 0.2]]),
    coilCap: cap([[2.15, -0.5], [2.45, -0.5], [2.45, 0.9], [2.15, 0.9]]),
  }), [])
  return <group>
    {/* 控制柜：浅灰色钢板柜，门向东打开；柜里一块安装板 */}
    <group position={[0, FLOOR, -23]}>
      <RoundedBox args={[80, 200, 3]} radius={0.6} position={[0, 100, -23.5]} castShadow receiveShadow>{plate}</RoundedBox>
      {[-1, 1].map(sx => <RoundedBox key={sx} args={[3, 200, 50]} radius={0.6} position={[sx * 38.5, 100, 0]} castShadow receiveShadow><meshStandardMaterial color="#c9cdc8" roughness={0.55} metalness={0.25} /></RoundedBox>)}
      <RoundedBox args={[80, 3, 50]} radius={0.6} position={[0, 198.5, 0]} castShadow><meshStandardMaterial color="#c9cdc8" roughness={0.55} metalness={0.25} /></RoundedBox>
      <RoundedBox args={[80, 10, 50]} radius={0.6} position={[0, 5, 0]} castShadow><meshStandardMaterial color="#3a3d40" roughness={0.7} /></RoundedBox>
      <mesh position={[0, 105, -21.8]}><planeGeometry args={[72, 186]} /><meshStandardMaterial color="#e9dcc0" roughness={0.7} /></mesh>
      {/* 门：铰在东边，开到 110° */}
      <group position={[40, 100, 25]} rotation-y={-1.92}>
        <RoundedBox args={[80, 198, 2.4]} radius={0.6} position={[-40, 0, 0]} castShadow><meshStandardMaterial color="#c9cdc8" roughness={0.55} metalness={0.25} /></RoundedBox>
        <RoundedBox args={[2.4, 18, 3]} radius={0.6} position={[-74, 0, 2]}><meshStandardMaterial color="#2a2c2e" roughness={0.5} /></RoundedBox>
      </group>
      {/* 柜里下半部：两排导轨上的断路器和端子 */}
      {[60, 85].map(y => <group key={y}>
        <mesh position={[0, y, -20.5]}><boxGeometry args={[66, 3.5, 1]} /><Metal kind="zinc" grain="brushed" /></mesh>
        {Array.from({ length: 12 }, (_, i) => <RoundedBox key={i} args={[1.8, 9, 7]} radius={0.3} position={[-27 + i * 4.6, y, -16.5]} castShadow><meshStandardMaterial color={i % 4 === 0 ? '#2d6db0' : '#ecebe6'} roughness={0.45} /></RoundedBox>)}
      </group>)}
    </group>
    {/* 航空障碍灯样灯：装在柜里右侧的支架上，红色灯罩 */}
    <group position={[B[0] + 30, B[1] - 6, B[2] + 2]}>
      <mesh position={[0, -3, -2]}><boxGeometry args={[10, 1, 8]} /><Metal kind="zinc" grain="brushed" /></mesh>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[4, 4.6, 4, 32]} /><meshStandardMaterial color="#2c2e30" roughness={0.6} /></mesh>
      <mesh position={[0, 2, 0]}><sphereGeometry args={[4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color={lit ? '#ff3b2a' : '#7a1a14'} emissive="#ff2a1c" emissiveIntensity={lit ? 3 : 0} roughness={0.2} transparent opacity={0.92} toneMapped={!lit} /></mesh>
      {lit && <pointLight position={[0, 6, 6]} intensity={14} distance={50} color="#ff3a2a" />}
    </group>
    {/* 继电器示教板 */}
    <group position={B}>
      <RoundedBox args={[44, 30, 1.2]} radius={0.4} position={[0, 0, 0]} castShadow><meshPhysicalMaterial color="#f4f3ee" roughness={0.5} clearcoat={0.3} /></RoundedBox>
      <mesh position={[0, -12.5, 0.62]}><planeGeometry args={[40, 4]} /><meshStandardMaterial map={tag} roughness={0.6} /></mesh>
      {/* 电磁铁：竖直的线圈和铁芯 */}
      <group position={[-6, -4.5, 3]}>
        <mesh position={[0, 5, 0]} castShadow><cylinderGeometry args={[2.4, 2.4, 9, 32, 1, true]} /><meshStandardMaterial map={coilTex} metalness={0.6} roughness={0.35} /></mesh>
        {[0.5, 9.5].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[2.8, 2.8, 0.5, 32]} /><meshPhysicalMaterial color="#1b1c1e" roughness={0.4} /></mesh>)}
        <mesh position={[0, 6, 0]}><cylinderGeometry args={[0.9, 0.9, 10, 20]} /><Metal kind="steel" grain="turned" /></mesh>
        <mesh position={[0, -0.3, -1.5]}><boxGeometry args={[6, 1, 4]} /><Metal kind="iron" grain="cast" /></mesh>
      </group>
      {/* 衔铁和支点、弹簧 */}
      <group position={pivot} rotation-z={ang}>
        <mesh position={[7, 0, 0]} castShadow><boxGeometry args={[14, 0.6, 2.4]} /><Metal kind="steel" grain="brushed" /></mesh>
        <mesh position={[14, -0.6, 0]}><sphereGeometry args={[0.6, 12, 10]} /><Metal kind="copper" rough={0.2} /></mesh>
      </group>
      <mesh position={[pivot[0], pivot[1], 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 3, 16]} /><Metal kind="brass" /></mesh>
      <mesh position={[pivot[0], pivot[1] - 6, 1.4]}><boxGeometry args={[1, 12, 1.6]} /><Metal kind="iron" grain="cast" /></mesh>
      {/* 弹簧：从衔铁拉向上方的挂钩 */}
      <Spring a={[pivot[0] + 9, pivot[1] + Math.sin(ang) * 9 + 0.3, 2]} b={[pivot[0] + 9, 13, 2]} />
      <mesh position={[pivot[0] + 9, 13.2, 1.4]}><boxGeometry args={[3, 0.8, 1.6]} /><Metal kind="iron" grain="cast" /></mesh>
      {/* 静触点：衔铁吸下时碰到下面这一个 */}
      <mesh position={[pivot[0] + 14, pivot[1] - 2.3, 2]}><sphereGeometry args={[0.6, 12, 10]} /><Metal kind="copper" rough={0.2} /></mesh>
      <mesh position={[pivot[0] + 14, pivot[1] - 3.3, 1.6]}><boxGeometry args={[1, 1.6, 1.6]} /><Metal kind="brass" /></mesh>
      {/* 工作电路的接线端子 */}
      {[10, 15].map(x => <Post key={x} at={[x, -8, 0.6]} color={x === 10 ? RED : BLACK} />)}
      <Wire pts={[[pivot[0] + 14, pivot[1] - 4.6, 2], [6, -4, 1.4], [10, -7, 1.4], [10, -7.4, 1.2]]} color={RED} r={0.2} flow={lit ? 1 : 0} />
      <Wire pts={[[pivot[0], pivot[1] - 12, 2], [-4, -10, 1.4], [15, -10, 1.4], [15, -7.4, 1.2]]} color={BLACK} r={0.2} flow={lit ? 1 : 0} />
      {/* 控制电路：电池盒、开关，接到线圈的两头 */}
      <group position={[-15, -10.5, 1]} rotation-x={Math.PI / 2} scale={0.8}><BatteryBox /></group>
      <group position={[-15, 8, 1]} rotation-x={Math.PI / 2} scale={0.8}><KnifeSwitch on={swing} /></group>
      <Wire pts={[add([-15, -10.5, 1], [bp.plus[0] * 0.8, 0, -bp.plus[2] * 0.8 + 2.2]), [-20, 0, 2], add([-15, 8, 1], [sp.a[0] * 0.8, 0, 2.2])]} color={RED} r={0.2} flow={on ? 1 : 0} />
      <Wire pts={[add([-15, 8, 1], [sp.b[0] * 0.8, 0, 2.2]), [-9, 6, 2.6], [-8.4, 2.5, 4.2]]} color={RED} r={0.2} flow={on ? 1 : 0} />
      <Wire pts={[[-8.4, -5, 4.2], [-11, -7, 2.6], add([-15, -10.5, 1], [bp.minus[0] * 0.8, 0, -bp.minus[2] * 0.8 + 2.2])]} color={BLACK} r={0.2} flow={on ? 1 : 0} />
      {/* 工作电路的电线从端子往上走到柜顶的灯 */}
      <Wire pts={[[10, -8, 2], [18, -11, 2], [26, -11, 2], [29, -6, 2]]} color={RED} r={0.3} flow={lit ? 1 : 0} />
      <Wire pts={[[15, -8, 2], [20, -13, 2], [30, -13, 2], [31, -6, 2]]} color={BLACK} r={0.3} flow={lit ? 1 : 0} />
    </group>
    {/* 剖开的扬声器：放在小桌上，纸盆朝南 */}
    <group position={[s[0], s[1], s[2]]}>
      <RoundedBox args={[34, 2, 30]} radius={0.5} position={[0, -1, 0]} castShadow receiveShadow><meshStandardMaterial color="#8a6a48" roughness={0.6} /></RoundedBox>
      {[-1, 1].flatMap(a => [-1, 1].map(b => <mesh key={`${a}${b}`} position={[a * 15, (FLOOR + 8) / 2 - 1, b * 13]}><boxGeometry args={[2, -FLOOR - 10, 2]} /><meshStandardMaterial color="#4a3a2a" roughness={0.7} /></mesh>))}
      {/* 托住磁体的木支座 */}
      <RoundedBox args={[5, 6.6, 9]} radius={0.3} position={[-2, 3.3, 0]} castShadow><meshStandardMaterial color="#6b4f35" roughness={0.7} /></RoundedBox>
      <group position={[0, 13, 0]} rotation-z={-Math.PI / 2}>
        <group>
          <mesh geometry={geo.basket} castShadow><meshStandardMaterial color="#2b2d30" roughness={0.5} metalness={0.5} side={THREE.DoubleSide} /></mesh>
          <mesh geometry={geo.magnet} castShadow><meshStandardMaterial color="#3a3b3d" roughness={0.75} side={THREE.DoubleSide} /></mesh>
          <mesh geometry={geo.plates}><Metal kind="steel" grain="turned" /></mesh>
          <mesh geometry={geo.top}><Metal kind="steel" grain="turned" /></mesh>
          <mesh geometry={geo.pole}><Metal kind="steel" grain="turned" /></mesh>
          {/* 会动的：纸盆、防尘罩、音圈骨架和音圈 */}
          <group position={[0, cone, 0]}>
            <mesh geometry={geo.cone} castShadow><meshStandardMaterial color="#cfc6b2" roughness={0.9} side={THREE.DoubleSide} /></mesh>
            <mesh geometry={geo.dust}><meshStandardMaterial color="#b8ae98" roughness={0.8} side={THREE.DoubleSide} /></mesh>
            <mesh geometry={geo.former}><meshStandardMaterial color="#d9c9a3" roughness={0.6} side={THREE.DoubleSide} /></mesh>
            <mesh geometry={geo.coil}><meshStandardMaterial color="#b5562d" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} /></mesh>
            <mesh geometry={geo.coilCap} position={[0, 0, 0.01]}><meshStandardMaterial color="#d9783f" metalness={0.4} roughness={0.4} side={THREE.DoubleSide} /></mesh>
          </group>
          {/* 剖面：永磁体（深灰）、导磁的上下夹板和中心柱（钢） */}
          <mesh geometry={geo.magnetCap} position={[0, 0, 0.01]}><meshStandardMaterial color="#55585c" roughness={0.8} side={THREE.DoubleSide} /></mesh>
          {[geo.platesCap, geo.poleCap, geo.topCap].map((g, i) => <mesh key={i} geometry={g} position={[0, 0, 0.01]}><meshStandardMaterial color="#a9adb1" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} /></mesh>)}
        </group>
      </group>
      <Wire pts={[[-3, 6, -6], [-10, 2, -8], [-12, 0.4, 2]]} color={RED} r={0.25} flow={mode === 'speaker' ? Math.sign(Math.cos(phase)) * 2 : 0} />
    </group>
  </group>
}

/** 一根拉伸的弹簧：从 a 到 b 的螺旋线 */
function Spring({ a, b }: { a: V3; b: V3 }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [], n = 14 * 16, va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    for (let i = 0; i <= n; i++) { const t = i / n, p = va.clone().lerp(vb, t), ang = t * 14 * Math.PI * 2; pts.push(new THREE.Vector3(p.x + Math.cos(ang) * 0.6, p.y, p.z + Math.sin(ang) * 0.6)) }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.1, 5)
  }, [a[0], a[1], a[2], b[0], b[1], b[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo}><Metal kind="steel" rough={0.25} /></mesh>
}
