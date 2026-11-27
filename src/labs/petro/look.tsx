// 工厂里几种常用的表面：保温层外的铝皮、漆面钢板、混凝土、剖面；还有火焰。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { brickTex, hatchTex, jacketTex, plateTex, rep, woolTex } from './mats'
import type { RY, V3 } from './parts'

/** 保温层外面包的铝皮：浅灰、半哑光，一圈圈搭接缝。rx、ry 是贴图重复次数 */
export function Jacket({ rx = 6, ry = 6, attach }: { rx?: number; ry?: number; attach?: string }) {
  const map = useMemo(() => rep(jacketTex(), rx, ry), [rx, ry])
  return <meshStandardMaterial attach={attach} map={map} color="#d2d6d8" metalness={0.75} roughness={0.5} envMapIntensity={0.55} />
}
/** 漆面：钢结构、设备外壳 */
export function Paint({ color, rough = 0.5, attach, plate = false, rx = 2, ry = 2 }: { color: string; rough?: number; attach?: string; plate?: boolean; rx?: number; ry?: number }) {
  const map = useMemo(() => plate ? rep(plateTex('#c4c8cc'), rx, ry) : null, [plate, rx, ry])
  return <meshPhysicalMaterial attach={attach} color={color} map={map} roughness={rough} metalness={0.2} clearcoat={0.3} clearcoatRoughness={0.45} />
}
export const Concrete = ({ attach }: { attach?: string }) => <meshStandardMaterial attach={attach} color="#a9a59a" roughness={0.95} />
/** 钢的剖面（斜线） */
export function CutSteel({ attach = 'material-1' }: { attach?: string }) { const map = useMemo(() => rep(hatchTex(), 4, 4), []); return <meshStandardMaterial attach={attach} map={map} roughness={0.6} metalness={0.2} /> }
/** 保温棉的剖面 */
export function CutWool({ attach = 'material-1' }: { attach?: string }) { const map = useMemo(() => rep(woolTex(), 3, 3), []); return <meshStandardMaterial attach={attach} map={map} roughness={0.95} /> }
/** 耐火砖。hot：0–1，烧到多热（发暗红到橙黄的光） */
export function Brick({ attach, hot = 0, rx = 3, ry = 3 }: { attach?: string; hot?: number; rx?: number; ry?: number }) {
  const map = useMemo(() => rep(brickTex(), rx, ry), [rx, ry])
  return <meshStandardMaterial attach={attach} map={map} roughness={0.95} emissive="#ff5a1c" emissiveIntensity={hot * 0.3} emissiveMap={map} />
}

/** 水滴形的火苗截面 */
const flamePts = (R: number, H: number): RY[] => Array.from({ length: 15 }, (_, i) => { const t = i / 14; return [R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9) * (1 - t * 0.25) + 1e-4, H * t] as RY })
/** 一簇火焰：三层套在一起（外橙、中黄、芯白），大小不停地抖。on：0–1；blue：燃气的蓝焰根 */
export function Flame({ at, h = 3, r = 0.5, on = 1, seed = 0, light: lit = false }: { at: V3; h?: number; r?: number; on?: number; seed?: number; light?: boolean }) {
  const geo = useMemo(() => [1, 0.68, 0.4].map(k => new THREE.LatheGeometry(flamePts(r * k, h * (0.55 + 0.45 * k)).map(([x, y]) => new THREE.Vector2(x, y)), 14)), [h, r])
  const g = useRef<THREE.Group>(null), k = useRef(0), light = useRef<THREE.PointLight>(null)
  useFrame(({ clock }, d) => {
    const o = g.current; if (!o) return
    k.current += (on - k.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.5))
    o.visible = k.current > 0.02
    const t = clock.elapsedTime * 7 + seed * 1.7
    o.children.forEach((c, i) => { if (!(c instanceof THREE.Mesh)) return; const f = 1 + 0.09 * Math.sin(t * (1 + i * 0.37) + i) + 0.05 * Math.sin(t * 2.3 + i * 2); c.scale.set(k.current * (1 + 0.06 * Math.sin(t * 1.3 + i)), k.current * f, k.current * (1 + 0.06 * Math.cos(t * 1.1 + i))); c.rotation.y = t * 0.2 * (i + 1) })
    if (light.current) light.current.intensity = k.current * (2.2 + 0.4 * Math.sin(t * 1.9))
  })
  const cols = ['#ff6a14', '#ffab2e', '#fff0c2'], op = [0.34, 0.5, 0.85]
  return <group ref={g} position={at}>
    {geo.map((ge, i) => <mesh key={i} geometry={ge} renderOrder={5 + i}><meshBasicMaterial color={cols[i]} transparent opacity={op[i]} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>)}
    {lit && <pointLight ref={light} position={[0, h * 0.4, 0.3]} color="#ff9a3c" distance={h * 3.5} decay={1.6} intensity={0} />}
  </group>
}
