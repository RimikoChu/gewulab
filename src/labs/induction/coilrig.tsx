// 第 2、3 课共用的一套器材：竖在木底板上的线圈（透明有机玻璃骨架上绕着漆包线，底座两只接线柱），
// 一只灵敏电流计（零点在中间），两根导线；一只戴手套的手捏着条形磁铁（红色 N、蓝色 S）从线圈正上方插进去、拔出来。
// 穿过线圈的磁感线画成线圈里的一束蓝色竖线，根数就是磁通量；感应电流的磁场画成橙色。原点在台子中心。
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { shell } from '@/lab-kit'
import { COL, TOP } from './layout'
import { makeText, makeWinding, rep } from './mats'
import { MAX_LINES, type Pole, type V3 } from './physics'
import { BLACK, Bench, Hand, Meter, Post, RED, Wire, meterPosts } from './gear'
import { FieldLines, LoopFlow, barLines } from './fx'

/** 捏住磁铁的手：从右后方伸过来，掌心朝着磁铁，四指从前面绕过去，拇指朝上 */
const GRIP = (() => { const F = new THREE.Vector3(-0.5, 0, 0.85).normalize(), P = new THREE.Vector3(-0.85, 0, -0.5).normalize(), Y = new THREE.Vector3().crossVectors(P, F); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F, Y, P)) })()
/** 线圈：外半径、高、底座高；磁铁：长、截面 */
export const CR = { r: 0.036, h: 0.1, base: 0.03, mag: 0.18, mw: 0.022, md: 0.016, meter: [0.27, TOP, 0.05] as V3 }
/** 线圈的上沿 */
export const COIL_TOP = TOP + CR.base + CR.h
/** 磁铁插入 d（m）时它下端的高度 */
export const tipY = (d: number) => COIL_TOP + 0.04 - d

/** 线圈：有机玻璃骨架（上下两片法兰、中间一根管），中间一段绕满漆包线 */
function Coil() {
  const tex = useMemo(() => { const t = rep(makeWinding([176, 92, 44], 48), 1, 1); t.rotation = Math.PI / 2; t.repeat.set(1, 18); return t }, [])
  const tube = useMemo(() => shell([[CR.r - 0.012, 0], [CR.r - 0.012, CR.h + 0.01]], 0.003), [])
  return <group position={[0, TOP + CR.base, 0]}>
    <mesh geometry={tube}><meshPhysicalMaterial color="#e8f2f4" transparent opacity={0.35} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    {/* 漆包线绕组朝前剖开一半，看得见线圈里的磁感线；剖口处是一圈圈铜线的截面 */}
    <mesh position={[0, CR.h / 2, 0]} castShadow><cylinderGeometry args={[CR.r, CR.r, CR.h - 0.012, 64, 1, true, Math.PI / 2, Math.PI]} /><meshPhysicalMaterial map={tex} roughness={0.3} metalness={0.6} clearcoat={0.6} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, CR.h / 2, 0]}><cylinderGeometry args={[CR.r - 0.006, CR.r - 0.006, CR.h - 0.012, 64, 1, true, Math.PI / 2, Math.PI]} /><meshPhysicalMaterial map={tex} color="#c98a5a" roughness={0.4} metalness={0.5} side={THREE.BackSide} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (CR.r - 0.003), CR.h / 2, 0]}><boxGeometry args={[0.006, CR.h - 0.012, 0.001]} /><meshStandardMaterial map={tex} color="#e0a070" metalness={0.5} roughness={0.35} /></mesh>)}
    {[0.002, CR.h - 0.002].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[CR.r + 0.008, CR.r + 0.008, 0.005, 64]} /><meshPhysicalMaterial color="#d9eef2" transparent opacity={0.55} roughness={0.05} clearcoat={1} /></mesh>)}
  </group>
}

/** 条形磁铁：一半红（N）一半蓝（S），两端印着字母。nDown：N 极朝下 */
function BarMagnet({ nDown }: { nDown: boolean }) {
  const nT = makeText(['N'], { w: 128, h: 128, bg: 'transparent', fg: '#f6f2e8', size: 92, weight: 800 }), sT = makeText(['S'], { w: 128, h: 128, bg: 'transparent', fg: '#f6f2e8', size: 92, weight: 800 })
  const half = CR.mag / 2
  const part = (n: boolean, y: number) => <group position={[0, y, 0]}>
    <RoundedBox args={[CR.mw, half, CR.md]} radius={0.002} smoothness={2} castShadow><meshPhysicalMaterial color={n ? COL.N : COL.S} roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.2} /></RoundedBox>
    <mesh position={[0, n === nDown ? -half / 2 + 0.016 : half / 2 - 0.016, CR.md / 2 + 0.0005]}><planeGeometry args={[0.016, 0.016]} /><meshBasicMaterial map={n ? nT : sT} transparent /></mesh>
  </group>
  return <group>{part(nDown, half / 2)}{part(!nDown, half * 1.5)}</group>
}

/**
 * d：磁铁插入了多深；pole：朝下的是哪一极；needle：电流计偏转（−1 到 1）；flow：线圈回路里的电流（有正负）；
 * lines：穿过线圈的磁感线根数；induced：感应电流的磁场（0 没有，+1 向上，−1 向下）
 */
export function CoilRig({ d = 0, pole = 'N', needle = 0, flow = 0, lines = 0, induced = 0, inducedN = 0 }: { d?: number; pole?: Pole; needle?: number; flow?: number; lines?: number; induced?: number; inducedN?: number }) {
  const nDown = pole === 'N', y0 = tipY(d)
  // 磁铁的磁感线（暗，跟着磁铁走）
  const around = useMemo(() => barLines([0, CR.mag / 2, 0], CR.mag / 2, nDown, [0.014, 0.03, 0.05], 3), [nDown])
  // 穿过线圈的那一束：在线圈截面里均匀排开 MAX_LINES 个位置，取前 lines 个
  const inside = useMemo(() => {
    const spots: [number, number][] = []
    const rings = [[1, 0], [7, 0.011], [16, 0.022]] as const
    for (const [n, r] of rings) for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + r * 40; spots.push([r * Math.cos(a), r * Math.sin(a)]) }
    const y0 = TOP + CR.base - 0.025, y1 = COIL_TOP + 0.025
    return spots.slice(0, MAX_LINES).map(([x, z]) => (nDown ? [[x, y1, z], [x, y0, z]] : [[x, y0, z], [x, y1, z]]) as V3[])
  }, [nDown])
  const indLines = useMemo(() => {
    const spots: [number, number][] = Array.from({ length: 10 }, (_, k) => { const a = k / 10 * Math.PI * 2 + 0.3, r = 0.017; return [r * Math.cos(a), r * Math.sin(a)] })
    const y0 = TOP + CR.base - 0.01, y1 = COIL_TOP + 0.01
    return spots.map(([x, z]) => (induced > 0 ? [[x, y0, z], [x, y1, z]] : [[x, y1, z], [x, y0, z]]) as V3[])
  }, [induced])
  const M = CR.meter, P = meterPosts()
  const neg: V3 = [M[0] + P.neg[0], M[1] + P.neg[1], M[2] + P.neg[2]], pos: V3 = [M[0] + P.pos[0], M[1] + P.pos[1], M[2] + P.pos[2]]
  const loop: V3[] = Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2; return [(CR.r + 0.004) * Math.cos(a), TOP + CR.base + CR.h * 0.5, (CR.r + 0.004) * Math.sin(a)] })
  return <group>
    <Bench w={1.4} />
    <RoundedBox args={[0.16, CR.base, 0.12]} radius={0.004} smoothness={2} position={[0, TOP + CR.base / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#8a5a34" roughness={0.5} clearcoat={0.4} /></RoundedBox>
    <Coil />
    <Post at={[0.05, TOP + CR.base, 0.045]} color={RED} /><Post at={[0.065, TOP + CR.base, 0.015]} color={BLACK} />
    <group position={M} rotation-y={-0.3}><Meter kind="G" k={needle} /></group>
    <Wire pts={[[0.05, TOP + CR.base + 0.008, 0.045], [0.1, TOP + 0.05, 0.09], [0.2, TOP + 0.01, 0.1], [pos[0] - 0.02, pos[1] + 0.03, pos[2] + 0.03], pos]} color={RED} flow={flow} dots={9} />
    <Wire pts={[[0.065, TOP + CR.base + 0.008, 0.015], [0.12, TOP + 0.04, 0.02], [0.2, TOP + 0.006, 0.04], [neg[0] - 0.01, neg[1] + 0.03, neg[2] + 0.02], neg]} color={BLACK} flow={-flow} dots={9} />
    {/* 线圈外面一圈：感应电流的方向 */}
    <LoopFlow pts={loop} flow={flow * 1.6} dots={14} size={0.0032} />
    {/* 磁铁和捏着它的手 */}
    <group position={[0, y0, 0]}>
      <BarMagnet nDown={nDown} />
      <FieldLines lines={around} opacity={0.4} heads={1} head={0.008} r={0.0007} />
      <group position={[0.034, CR.mag * 0.84, -0.012]} quaternion={GRIP}><Hand side="left" curl={1.25} thumb={0.5} scale={0.75} sleeve={0.1} /></group>
    </group>
    <FieldLines lines={inside.slice(0, lines)} color="#a8c6ff" heads={1} head={0.009} r={0.0011} speed={0.3} />
    {induced !== 0 && <FieldLines lines={indLines.slice(0, inducedN)} color={COL.Bi} heads={1} head={0.009} r={0.0011} speed={0.3} />}
  </group>
}
