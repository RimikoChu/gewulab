// 看得见的现象：滴进水里的红墨水一缕缕散开、热水上的一点白气、引火仪里棉花烧起来的火光、弯折处的热气。
// 都按时间算；强弱由外面给的数控制，这里只管画。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { softDot } from './cutaway'

type V3 = [number, number, number]
const TAU = Math.PI * 2
const frac = (x: number) => x - Math.floor(x)
/** 每个颗粒自己的几个固定的随机数 */
const rnd = (i: number, k: number) => frac(Math.sin(i * 127.1 + k * 311.7) * 43758.5453)

/**
 * 水里的红墨水：一滴落到水面以后，先拖着几缕往下沉，再慢慢散开。spread 0–1 是散开的程度（1 是均匀）；
 * r、h 是水柱的半径和深度，原点在杯底内侧正中。drop：墨滴还在往下落的那一段（0–1），落到水面前只画一颗水滴
 */
export function InkCloud({ r, h, spread, drop, n = 40 }: { r: number; h: number; spread: number; drop: number; n?: number }) {
  const g = useRef<THREE.Group>(null), live = useRef({ spread, drop }); live.current = { spread, drop }
  const map = useMemo(softDot, [])
  useFrame(({ clock }) => {
    const { spread: d, drop: f } = live.current, t = clock.elapsedTime, grp = g.current; if (!grp) return
    grp.children.forEach((s, i) => {
      const sp = s as THREE.Sprite, m = sp.material as THREE.SpriteMaterial
      if (i === 0) { sp.visible = f > 0 && f < 1; sp.position.set(0, h + 0.5 * (1 - f), 0); sp.scale.setScalar(0.05); m.opacity = 1; return }
      if (f < 1 || d <= 0) { sp.visible = false; return }
      sp.visible = true
      // 每一缕先沿着自己的路往下沉，扩散越充分，散得越开、越淡
      const k = Math.min(1, d * 1.25), a = rnd(i, 1) * TAU + t * 0.15 * (rnd(i, 2) - 0.5), down = Math.min(1, k * (0.5 + rnd(i, 3)))
      const rad = r * 0.85 * Math.sqrt(rnd(i, 4)) * Math.min(1, k * 1.4) + 0.02, y = h - 0.02 - down * (h - 0.08) * (0.3 + 0.7 * rnd(i, 5))
      sp.position.set(Math.cos(a) * rad + Math.sin(t * 0.7 + i) * 0.01, y, Math.sin(a) * rad)
      sp.scale.set(0.05 + 0.32 * k * (0.5 + rnd(i, 6)), (0.12 + 0.4 * k) * (0.6 + rnd(i, 7)), 1)
      m.opacity = (1 - d) ** 1.4 * 0.85 + 0.04
    })
  })
  return <group ref={g}>{Array.from({ length: n }, (_, i) => <sprite key={i} renderOrder={3}><spriteMaterial map={map} color={i === 0 ? '#c8141c' : '#a8101a'} transparent depthWrite={false} opacity={0} /></sprite>)}</group>
}

/** 往上飘的一缕缕白气或热气：on 0–1 是强弱；color 颜色；len 飘多高 */
export function Puffs({ at, on, n = 14, len = 0.8, size = 0.25, spread = 0.12, color = '#e8eef2', dense = 0.35, speed = 0.35 }: { at: V3; on: number; n?: number; len?: number; size?: number; spread?: number; color?: string; dense?: number; speed?: number }) {
  const g = useRef<THREE.Group>(null), k = useRef(on); k.current = on
  const map = useMemo(softDot, []), cur = useRef(0)
  useFrame(({ clock }, d) => {
    cur.current += (k.current - cur.current) * (1 - Math.exp(-Math.min(d, 1 / 30) / 0.5))
    const t = clock.elapsedTime
    g.current?.children.forEach((s, i) => {
      const p = frac(t * speed * (0.7 + rnd(i, 1) * 0.6) + rnd(i, 2)), a = rnd(i, 3) * TAU + t * 0.2, rr = spread * (0.3 + p * 1.5)
      s.position.set(Math.cos(a) * rr, len * p, Math.sin(a) * rr)
      s.scale.setScalar(size * (0.35 + p * 1.1))
      ;((s as THREE.Sprite).material as THREE.SpriteMaterial).opacity = Math.min(1, dense * cur.current * Math.min(1, p * 6) * (1 - p) ** 1.3)
    })
  })
  return <group ref={g} position={at}>{Array.from({ length: n }, (_, i) => <sprite key={i} renderOrder={6}><spriteMaterial map={map} color={color} transparent opacity={0} depthWrite={false} /></sprite>)}</group>
}

/** 一团亮的火光：level 0–1；用叠加的发光贴片，靠舞台的泛光溢出一圈光，配一盏闪动的点光 */
export function Flash({ at, level, size = 0.2, light = 1.5 }: { at: V3; level: number; size?: number; light?: number }) {
  const g = useRef<THREE.Group>(null), pl = useRef<THREE.PointLight>(null), k = useRef(level); k.current = level
  const map = useMemo(softDot, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, L = k.current
    g.current?.children.forEach((s, i) => {
      const a = rnd(i, 1) * TAU + t * 3, f = 0.6 + 0.4 * Math.sin(t * 17 + i * 2.1)
      s.position.set(Math.cos(a) * size * 0.18, size * (0.15 + 0.45 * rnd(i, 2)) * f, Math.sin(a) * size * 0.18)
      s.scale.setScalar(size * (0.5 + 0.6 * rnd(i, 3)) * (0.6 + 0.4 * L) * f)
      ;((s as THREE.Sprite).material as THREE.SpriteMaterial).opacity = L * (0.55 + 0.35 * f)
    })
    if (pl.current) pl.current.intensity = light * L * (0.85 + 0.15 * Math.sin(t * 23))
  })
  return <group position={at}>
    <group ref={g}>{Array.from({ length: 9 }, (_, i) => <sprite key={i} renderOrder={8}><spriteMaterial map={map} color={i % 3 ? '#ff8a24' : '#ffe08a'} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>)}</group>
    <pointLight ref={pl} position={[0, size * 0.4, 0.15]} color="#ff9a44" distance={3} decay={1.6} intensity={0} />
  </group>
}
