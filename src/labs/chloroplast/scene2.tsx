// 光反应和暗反应 · 第 2 课的器材：研钵和杵、试剂瓶、试管架上的试管和漏斗、垫板上的滤纸条和毛细吸管、盛层析液的烧杯和培养皿盖。
// 三段动作各有一个 0–1 的进度：grind 研磨、pour 过滤（把研钵里的匀浆倒进漏斗）、line 画滤液细线；dip 是滤纸条放进烧杯，t 是层析进行到哪。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Beaker, Bottle, Capillary, Funnel, Glove, Mortar, Pestle, PetriLid, STRIP, Strip, TUBE, TestTube, TubeRack } from './gear'
import { ease, lerp, type V3 } from './kit'
import type { PigmentKey } from './physics'
import { BZ, M, ST, TOP } from './world'

/** 这一格的原点、垫板和烧杯在哪（相对原点，画面单位） */
export const O2: V3 = [ST.l2, TOP, BZ]
export const TILE: V3 = [0.13 * M, 0, 0.085 * M], CUP: V3 = [0.15 * M, 0, -0.07 * M]
export const MORTAR: V3 = [-0.17 * M, 0, 0.04 * M], RACK: V3 = [-0.02 * M, 0, -0.03 * M]
/** 滤纸条立在烧杯里时下端的位置和往后靠的角度 */
export const STRIP_IN: V3 = [CUP[0], 0.004 * M, CUP[2] + 0.012 * M], LEAN = -0.2

export function Scene2({ grind, pour, line, dip, t, leaf, strip2, bare = false }: { grind: number; pour: number; line: number; dip: number; t: number; leaf: Record<PigmentKey, number>; strip2?: Record<PigmentKey, number>; bare?: boolean }) {
  const pestle = useRef<THREE.Group>(null)
  const grinding = grind > 0 && grind < 1, pouring = pour > 0 && pour < 1, drawing = line > 0 && line < 1
  useFrame(({ clock }) => {
    const g = pestle.current; if (!g) return
    const a = clock.elapsedTime * 7
    if (grinding) { g.position.set(Math.cos(a) * 0.014 * M, 0.016 * M, Math.sin(a) * 0.014 * M); g.rotation.set(Math.sin(a) * 0.16, 0, 0.28 - Math.cos(a) * 0.16) }
    else { g.position.set(0.012 * M, 0.014 * M, 0); g.rotation.set(0, 0, -0.62) }
  })
  // 过滤：研钵抬起来、歪到漏斗上方，再放回去
  const up = pouring ? ease(Math.min(1, pour / 0.25)) * (1 - ease(Math.max(0, (pour - 0.8) / 0.2))) : 0
  const tubeTop = TUBE.h * M + 0.012 * M
  const filled = pour <= 0 ? 0 : Math.min(1, Math.max(0, (pour - 0.25) / 0.5))
  const d = ease(dip)
  return <group position={O2}>
    {!bare && <>
    {/* 试剂：无水乙醇、二氧化硅、碳酸钙 */}
    <group position={[-0.29 * M, 0, -0.11 * M]}><Bottle band="#3a76c4" h={0.13} /></group>
    <group position={[-0.215 * M, 0, -0.13 * M]}><Bottle band="#8a8f94" liquid="#f4f4f0" h={0.085} /></group>
    <group position={[-0.145 * M, 0, -0.14 * M]}><Bottle band="#c4883a" liquid="#fbfbf6" h={0.085} /></group>
    {/* 研钵和杵 */}
    <group position={[lerp(MORTAR[0], RACK[0] - 0.085 * M, up), up * 0.285 * M, lerp(MORTAR[2], RACK[2], up)]} rotation-z={-1.05 * up}>
      <Mortar mash={grind} amount={1 - 0.85 * filled} />
      {!pouring && <group ref={pestle}><Pestle />{grinding && <group position={[0, 0.105 * M, 0]} rotation={[0, 0.4, 0]}><Glove /></group>}</group>}
      {pouring && <group position={[-0.075 * M, 0.035 * M, 0]} rotation={[0, Math.PI / 2, 1.2]}><Glove /></group>}
    </group>
    {pouring && up > 0.9 && filled < 1 && <mesh position={[RACK[0] - 0.012 * M, tubeTop + 0.105 * M, RACK[2]]}><cylinderGeometry args={[0.02, 0.012, 0.085 * M, 8]} /><meshStandardMaterial color="#1f6a22" emissive="#1f6a22" emissiveIntensity={0.3} /></mesh>}
    {/* 试管架、试管、漏斗 */}
    <group position={RACK}>
      <TubeRack n={3} />
      <group position-y={0.014 * M}><TestTube fill={0.42 * filled} /></group>
      <group position-y={tubeTop - 0.03 * M}><Funnel /></group>
    </group>
    {/* 一块深色的垫板：在上面给滤纸条画线 */}
    <group position={TILE}>
      <RoundedBox args={[0.13 * M, 0.006 * M, 0.1 * M]} radius={0.012} position-y={0.003 * M} receiveShadow castShadow><meshStandardMaterial color="#2c3338" roughness={0.75} /></RoundedBox>
      {drawing && <group position={[(STRIP.line - STRIP.h / 2) * M, 0.008 * M, (0.5 - line) * STRIP.w * M]} rotation={[0.5, 0, -0.35]}><Capillary /><group position={[0, 0.07 * M, 0]}><Glove s={0.005 * M} /></group></group>}
    </group>
    </>}
    {/* 滤纸条：先平放在垫板上，再立进烧杯 */}
    <group position={[lerp(TILE[0] - STRIP.h / 2 * M, STRIP_IN[0] + (strip2 ? 0.013 * M : 0), d), lerp(0.0075 * M, STRIP_IN[1], d) + Math.sin(d * Math.PI) * 0.12 * M, lerp(TILE[2], STRIP_IN[2], d)]} rotation={[lerp(-Math.PI / 2, LEAN, d), 0, lerp(-Math.PI / 2, 0, d)]}>
      <Strip lined={line} t={t} leaf={leaf} />
    </group>
    {strip2 && <group position={[STRIP_IN[0] - 0.013 * M, STRIP_IN[1], STRIP_IN[2]]} rotation={[LEAN, 0, 0]}><Strip lined={1} t={t} leaf={strip2} /></group>}
    {/* 烧杯里一薄层层析液，液面比滤液细线低 */}
    <group position={CUP}><Beaker vol={250} fill={0.085} color="#e9e2c4" opacity={0.5} marks={false} /><group position-y={0.0955 * M}>{dip >= 1 && <PetriLid r={0.04} />}</group></group>
  </group>
}
