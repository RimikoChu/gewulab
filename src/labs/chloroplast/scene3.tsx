// 光反应和暗反应 · 第 3 课的器材（暗室里）：光源箱射出一束白光，经三棱镜分成一条彩色的光带照在光屏上；
// 把装着色素溶液的比色皿推进光路，光屏上被吸收的那几段就暗下去。
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Cuvette, LampBox, PRISM_Y, Prism, SCREEN, SPEC, Screen, hue } from './gear'
import type { V3 } from './kit'
import { absorb, type Sample } from './physics'
import { BZ, M, ST, TOP } from './world'

export const O3: V3 = [ST.l3, TOP, BZ]
/** 各件器材在这一格里的位置（m）：光源、比色皿、三棱镜；出了棱镜的光往后偏 DEV 这么多，照到 DIST 外的光屏上 */
export const X_LAMP = -0.3, X_CUV = -0.165, X_PRISM = -0.04, DEV = 0.88, DIST = 0.25
const DIR = new THREE.Vector3(Math.cos(DEV), 0, -Math.sin(DEV)), WIDE = new THREE.Vector3(Math.sin(DEV), 0, Math.cos(DEV))
/** 光屏的中心（相对这一格的原点，画面单位） */
export const SCREEN_AT = new THREE.Vector3(X_PRISM * M, 0, 0).addScaledVector(DIR, DIST * M)
/** 光屏上某个波长落在哪（画面单位，相对这一格的原点） */
export const onScreen = (nm: number): V3 => SCREEN_AT.clone().addScaledVector(WIDE, ((nm - SPEC[0]) / (SPEC[1] - SPEC[0]) - 0.5) * SCREEN.w * M).setY(PRISM_Y * M).toArray() as V3
export const SAMPLE_COLOR: Record<Sample, string> = { chl: '#2f9a34', car: '#eda21c' }

const N = 40
export function Scene3({ lit, sample, k }: { lit: boolean; sample: Sample; k: number }) {
  // 棱镜到光屏的那一扇彩色的光：每个波长一条，被吸收的波段变暗
  const fan = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 9), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 9), 3)); return g }, [])
  useEffect(() => {
    const p = fan.attributes.position as THREE.BufferAttribute, c = fan.attributes.color as THREE.BufferAttribute, y = PRISM_Y * M, ax = (X_PRISM + 0.012) * M
    for (let i = 0; i < N; i++) {
      const n0 = SPEC[0] + (SPEC[1] - SPEC[0]) * i / N, n1 = SPEC[0] + (SPEC[1] - SPEC[0]) * (i + 1) / N, a = onScreen(n0), b = onScreen(n1), nm = (n0 + n1) / 2
      const h = hue(nm), v = (lit ? 1 : 0) * (1 - k * Math.min(1, absorb(sample, nm) * 1.15))
      p.setXYZ(i * 3, ax, y, -0.004 * M); p.setXYZ(i * 3 + 1, a[0], y, a[2]); p.setXYZ(i * 3 + 2, b[0], y, b[2])
      for (let j = 0; j < 3; j++) c.setXYZ(i * 3 + j, h[0] * v, h[1] * v, h[2] * v)
    }
    p.needsUpdate = true; c.needsUpdate = true
  }, [fan, lit, sample, k])
  const tint = useMemo(() => new THREE.Color('#fff2b8').lerp(new THREE.Color(SAMPLE_COLOR[sample]), k * 0.75), [sample, k])
  const y = PRISM_Y * M, x0 = (X_LAMP + 0.07) * M, x1 = X_CUV * M, x2 = (X_PRISM - 0.012) * M
  const beam = (a: number, b: number, color: THREE.ColorRepresentation, o = 0.5) => <mesh position={[(a + b) / 2, y, 0]} renderOrder={9}><boxGeometry args={[b - a, 0.045 * M, 0.012]} /><meshBasicMaterial color={color} transparent opacity={o} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} /></mesh>
  return <group position={O3}>
    <group position={[X_LAMP * M, 0, 0]}><LampBox on={lit} /></group>
    {/* 比色皿：没用的时候靠后放着，用的时候推进光路 */}
    <group position={[X_CUV * M, 0, (-0.11 + 0.11 * k) * M]}><Cuvette color={SAMPLE_COLOR[sample]} /></group>
    <group position={[X_PRISM * M, 0, 0]} rotation-y={Math.PI / 6 - DEV / 2}><Prism /></group>
    <group position={[SCREEN_AT.x, 0, SCREEN_AT.z]} rotation-y={DEV}><Screen sample={sample} k={k} lit={lit ? 1 : 0} /></group>
    {/* 遮光板：挡住后面培养室的灯光 */}
    <mesh position={[0.02 * M, 0.2 * M, -0.36 * M]} castShadow><boxGeometry args={[1.25 * M, 0.4 * M, 0.012 * M]} /><meshStandardMaterial color="#17191c" roughness={0.95} /></mesh>
    {lit && <>
      {beam(x0, x1, '#fff2b8')}{beam(x1, x2, tint, 0.5 - 0.2 * k)}
      <mesh geometry={fan} renderOrder={9}><meshBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={fan} renderOrder={9} position-y={0.012 * M}><meshBasicMaterial vertexColors transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={fan} renderOrder={9} position-y={-0.012 * M}><meshBasicMaterial vertexColors transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </>}
  </group>
}
