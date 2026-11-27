// 分子的球棍模型：有光泽的小球、灰色的键、半透明的孤电子对瓣、键角弧线、键的极性箭头，以及第 3 课的原子轨道。
// 方向和个数都从 physics.ts 取；这里只管画。模型单位：键长 L（画面单位），原点在中心原子。
import { useMemo } from 'react'
import * as THREE from 'three'
import { ForceArrow } from '@/lab-kit'
import { MOLS, bondPolar, dipoleSum, dirs, hybrid, type MolKey, type V3 } from './physics'
import { ease, lerp, seg, spring } from './parts'

/** 小球的颜色和半径（画面单位）。配色按常见的习惯：H 白、C 深灰、N 蓝、O 红、F 黄绿、B 粉、Cl 绿、Na 紫、Cs 金、Cu 铜色 */
export const LOOK: Record<string, { c: string; r: number }> = {
  H: { c: '#eceeeb', r: 0.4 }, C: { c: '#3d4046', r: 0.6 }, N: { c: '#3156cf', r: 0.6 }, O: { c: '#d3352c', r: 0.56 }, F: { c: '#9ccf3f', r: 0.5 }, B: { c: '#e59c8c', r: 0.58 },
  Cl: { c: '#49b45a', r: 0.52 }, Na: { c: '#8a6fd6', r: 0.36 }, Cs: { c: '#d0a52e', r: 0.6 }, Cu: { c: '#c97a4a', r: 0.5 },
}
const sphere = new THREE.SphereGeometry(1, 40, 28)
const small = new THREE.SphereGeometry(1, 16, 12)
const cyl = new THREE.CylinderGeometry(1, 1, 1, 20)
const UP = new THREE.Vector3(0, 1, 0)
const quatTo = (d: V3) => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...d).normalize())
const mul = (d: V3, k: number): V3 => [d[0] * k, d[1] * k, d[2] * k]
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const unit = (d: V3): V3 => { const l = Math.hypot(...d) || 1; return [d[0] / l, d[1] / l, d[2] / l] }
/** 和 d 垂直的一个方向 */
const perp = (d: V3): V3 => { const v = new THREE.Vector3(...d), o = Math.abs(d[2]) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0); return o.sub(v.clone().multiplyScalar(o.dot(v))).normalize().toArray() as V3 }

/** 一个原子：带清漆的塑料球，有高光。铜是金属球 */
export function Ball({ el, at = [0, 0, 0], r, opacity = 1, glow = 0, glowColor, dim = 0, cast = true }: { el: string; at?: V3; r?: number; opacity?: number; glow?: number; glowColor?: string; dim?: number; cast?: boolean }) {
  const look = LOOK[el] ?? LOOK.C, metal = el === 'Cu'
  const color = useMemo(() => new THREE.Color(look.c).multiplyScalar(1 - dim * 0.72), [look.c, dim])
  return <mesh geometry={sphere} position={at} scale={r ?? look.r} castShadow={cast && opacity > 0.6} visible={opacity > 0.01}>
    <meshPhysicalMaterial color={color} roughness={metal ? 0.3 : 0.24} metalness={metal ? 0.9 : 0} clearcoat={metal ? 0.2 : 1} clearcoatRoughness={0.1} envMapIntensity={1.3}
      emissive={glow > 0 ? glowColor ?? look.c : '#000000'} emissiveIntensity={glow} transparent={opacity < 0.999} opacity={opacity} depthWrite={opacity > 0.6} />
  </mesh>
}

/** 一根键：两点之间的圆棍 */
export function Stick({ a, b, r = 0.11, color = '#c4c8cc', opacity = 1 }: { a: V3; b: V3; r?: number; color?: string; opacity?: number }) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length()
  if (len < 1e-4) return null
  return <mesh geometry={cyl} position={va.add(vb).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())} scale={[r, len, r]} castShadow={opacity > 0.6} visible={opacity > 0.01}>
    <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.25} transparent={opacity < 0.999} opacity={opacity} depthWrite={opacity > 0.6} />
  </mesh>
}

const lobeCache = new Map<string, THREE.LatheGeometry>(), MID = 0.6
/** 瓣的形状：从原点长出去，靠外的一头鼓，像一滴水 */
function lobeGeo(len: number, wide: number) {
  const key = `${len.toFixed(2)}:${wide.toFixed(2)}`, hit = lobeCache.get(key); if (hit) return hit
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 28; i++) { const t = i / 28; pts.push(new THREE.Vector2(wide * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.45)), 0.85), len * t)) }
  // 模型的原点挪到瓣的中部：几只瓣叠在一起时，渲染器按各自中部到镜头的远近排先后，前后才不会错
  const g = new THREE.LatheGeometry(pts, 36); g.translate(0, -len * MID, 0); lobeCache.set(key, g)
  return g
}
/** 一只半透明的瓣：孤电子对、杂化轨道、p 轨道的一半都用它。dots：里面画两个电子 */
export function Lobe({ dir, len, wide, color, opacity = 0.42, at = [0, 0, 0], grow = 1, dots = false }: { dir: V3; len: number; wide: number; color: string; opacity?: number; at?: V3; grow?: number; dots?: boolean }) {
  const geo = lobeGeo(len, wide), q = useMemo(() => quatTo(dir), [dir[0], dir[1], dir[2]])   // eslint-disable-line react-hooks/exhaustive-deps
  if (opacity < 0.01 || grow < 0.01) return null
  return <group position={at} quaternion={q} scale={grow}>
    <mesh geometry={geo} position-y={len * MID} renderOrder={3}><meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.25} transparent opacity={Math.min(1, opacity * 1.25)} depthWrite={false} envMapIntensity={1.3} emissive={color} emissiveIntensity={0.14} /></mesh>
    {dots && [-1, 1].map(s => <mesh key={s} geometry={small} position={[s * wide * 0.3, len * 0.62, 0]} scale={0.085}><meshBasicMaterial color="#fff3b8" toneMapped={false} /></mesh>)}
  </group>
}

/** 两个方向之间的一段弧线（量角用）。两个方向正好相反时，从上面绕过去 */
export function Arc({ a, b, r, color = '#ffd66b' }: { a: V3; b: V3; r: number; color?: string }) {
  const geo = useMemo(() => {
    const va = new THREE.Vector3(...a).normalize(), vb = new THREE.Vector3(...b).normalize(), pts: THREE.Vector3[] = []
    const mid = va.dot(vb) < -0.999 ? new THREE.Vector3(0, 1, 0) : null
    const sl = (p: THREE.Vector3, q: THREE.Vector3, t: number) => { const w = Math.acos(Math.max(-1, Math.min(1, p.dot(q)))); return w < 1e-4 ? p.clone() : p.clone().multiplyScalar(Math.sin((1 - t) * w) / Math.sin(w)).add(q.clone().multiplyScalar(Math.sin(t * w) / Math.sin(w))) }
    for (let i = 0; i <= 32; i++) { const t = i / 32; pts.push((mid ? (t < 0.5 ? sl(va, mid, t * 2) : sl(mid, vb, t * 2 - 1)) : sl(va, vb, t)).multiplyScalar(r)) }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.035, 8)
  }, [a[0], a[1], a[2], b[0], b[1], b[2], r])   // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} renderOrder={8}><meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent /></mesh>
}

/** 第 1 课松开之前，配位原子挤在下面一侧的方向 */
function bunched(n: number, i: number): V3 { const t = 0.5, f = i / n * Math.PI * 2 + 0.6; return [Math.sin(t) * Math.cos(f), -Math.cos(t), Math.sin(t) * Math.sin(f)] }

export interface MolProps {
  m: MolKey; L?: number
  /** 0 挤在一起，1 松开以后停下的位置（中间会弹一下） */
  spread?: number
  /** 孤电子对瓣显示多少（0–1） */
  lone?: number
  /** 每根键上亮起一对电子的标记 */
  marks?: boolean
  /** 画键角的弧线；arcPair：量哪两根键（不给就是最后两根） */
  arc?: boolean; arcPair?: [number, number]
  /** 键的极性箭头：polar 显示多少；merge 箭头的尾巴并到中心；sum 合成出来的箭头长出多少 */
  polar?: number; merge?: number; sum?: number
  opacity?: number
}
/** 松开到 k 时各根键的方向 */
export function bondDirs(m: MolKey, spread = 1): V3[] {
  const fin = dirs(m).bonds; if (spread >= 1) return fin
  const k = spring(spread)
  return fin.map((d, i) => { const s = bunched(fin.length, i); return unit([lerp(s[0], d[0], k), lerp(s[1], d[1], k), lerp(s[2], d[2], k)]) })
}
/** 量键角时挑哪两根键：两根键的角平分线最朝着镜头的那一对。view 是这一课机位的方位角和仰角。返回这一对和角平分线的方向 */
export function frontPair(ds: V3[], view: [number, number]): { pair: [number, number]; mid: V3 } {
  const cam: V3 = [Math.sin(view[0]) * Math.cos(view[1]), Math.sin(view[1]), Math.cos(view[0]) * Math.cos(view[1])]
  let best: { pair: [number, number]; mid: V3 } = { pair: [0, 1], mid: [0, 1, 0] }, top = -9
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
    const s = add(ds[i], ds[j]), flat = Math.hypot(...s) < 1e-3, mid = flat ? [0, 1, 0] as V3 : unit(s), k = mid[0] * cam[0] + mid[1] * cam[1] + mid[2] * cam[2]
    if (k > top) { top = k; best = { pair: [i, j], mid } }
  }
  return best
}
/** 一个分子的球棍模型 */
export function MoleculeModel({ m, L = 1.9, spread = 1, lone = 0, marks = false, arc = false, polar = 0, merge = 0, sum = 0, opacity = 1, arcPair }: MolProps) {
  const M = MOLS[m], bonds = bondDirs(m, spread), lp = dirs(m).lone
  const s = bondPolar(m), total = dipoleSum(m), mk = ease(merge)
  return <group>
    <Ball el={M.center} opacity={opacity} />
    {bonds.map((d, i) => {
      const end = mul(d, L), p = perp(d)
      return <group key={i}>
        {M.order === 2 ? [-1, 1].map(o => <Stick key={o} a={mul(p, o * 0.15)} b={add(end, mul(p, o * 0.15))} r={0.085} opacity={opacity} />) : <Stick a={[0, 0, 0]} b={end} opacity={opacity} />}
        <Ball el={M.ligand} at={end} opacity={opacity} />
        {marks && [-1, 1].map(o => <mesh key={o} geometry={small} position={add(mul(d, L * 0.52), mul(p, o * 0.2))} scale={0.1} renderOrder={9}><meshBasicMaterial color="#ffe27a" toneMapped={false} depthTest={false} transparent /></mesh>)}
        {polar > 0.01 && (() => {
          const off = mul(p, 0.55 * (1 - mk)), a0 = add(mul(d, lerp(L * 0.22, 0, mk)), off), len = 1.3
          const tail = s > 0 ? a0 : add(mul(d, lerp(L * 0.22 + len, 0, mk)), off)
          const tip = add(tail, mul(d, s * len))
          return <ForceArrow tip={tip} dir={mul(d, s)} len={len} color="#ffe27a" opacity={polar * (1 - 0.45 * ease(sum))} thick={1.2} />
        })()}
      </group>
    })}
    {lp.map((d, i) => <Lobe key={i} dir={d} len={1.75} wide={0.6} color="#7fd6ff" opacity={0.46 * lone * opacity} grow={0.4 + 0.6 * ease(lone)} dots />)}
    {arc && bonds.length >= 2 && <Arc a={bonds[arcPair?.[0] ?? bonds.length - 2]} b={bonds[arcPair?.[1] ?? bonds.length - 1]} r={L * 0.5} />}
    {sum > 0.01 && total.polar && <ForceArrow tip={mul(unit(total.vec), total.size * 1.5 * ease(sum))} dir={unit(total.vec)} len={total.size * 1.5 * ease(sum)} color="#ff7a59" thick={1.5} />}
  </group>
}

// ---------- 第 3 课：原子轨道 ----------
const AX: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
const S_COL = '#f2c14e', P_COL = '#5aa9ff', H_COL = '#35c7b3'
/** 一个 p 轨道：一对瓣，哑铃形 */
function POrb({ axis, at = [0, 0, 0], opacity, len = 1.85, wide = 0.54, color = P_COL }: { axis: V3; at?: V3; opacity: number; len?: number; wide?: number; color?: string }) {
  return <>
    <Lobe dir={axis} len={len} wide={wide} color={color} opacity={opacity} at={at} />
    <Lobe dir={mul(axis, -1)} len={len} wide={wide} color={color} opacity={opacity} at={at} />
  </>
}
/**
 * 中心原子的轨道。k：杂化的进度（0 是一个 s 轨道加三个 p 轨道，1 是杂化好了）；bond：配位原子靠过来成键的进度。
 * 参加杂化的 p 轨道淡出，杂化轨道沿着电子对的方向长出来；没参加杂化的 p 轨道留在原地。
 */
export function Orbitals({ m, k, bond, L = 2.25 }: { m: MolKey; k: number; bond: number; L?: number }) {
  const M = MOLS[m], h = hybrid(m), ds = dirs(m).bonds, used = h.n - 1
  const kk = ease(k), bk = ease(bond)
  return <group>
    <Ball el={M.center} r={0.3} />
    <mesh geometry={sphere} scale={1.05 * (1 - 0.4 * kk)} visible={kk < 0.99} renderOrder={2}><meshPhysicalMaterial color={S_COL} roughness={0.15} clearcoat={1} transparent opacity={0.4 * (1 - kk)} depthWrite={false} emissive={S_COL} emissiveIntensity={0.15} /></mesh>
    {AX.map((ax, i) => <POrb key={i} axis={ax} opacity={i < used ? 0.4 * (1 - kk) : 0.4} />)}
    {ds.map((d, i) => <group key={i}>
      <Lobe dir={d} len={2.0} wide={0.62} color={H_COL} opacity={0.5 * kk} grow={0.3 + 0.7 * kk} />
      <Lobe dir={mul(d, -1)} len={0.62} wide={0.26} color={H_COL} opacity={0.5 * kk} grow={0.3 + 0.7 * kk} />
      {bond > 0.01 && (() => {
        const at = mul(d, lerp(5.2, L, bk)), op = seg(bond, 0, 0.3)
        return <group>
          <Ball el={M.ligand} at={at} r={0.28} opacity={op} />
          {M.ligand === 'H'
            ? <mesh geometry={sphere} position={at} scale={0.62} renderOrder={2}><meshPhysicalMaterial color={S_COL} roughness={0.15} clearcoat={1} transparent opacity={0.42 * op} depthWrite={false} emissive={S_COL} emissiveIntensity={0.15} /></mesh>
            : <POrb axis={d} at={at} opacity={0.36 * op} len={1.15} wide={0.4} />}
          {/* 没参加杂化的 p 轨道和氧原子的 p 轨道肩并肩重叠：π 键 */}
          {h.rest === 2 && <POrb axis={AX[1 + i]} at={at} opacity={0.36 * op} len={1.3} wide={0.4} />}
          {/* 头碰头重叠的地方：σ 键 */}
          <mesh geometry={small} position={mul(d, L * 0.62)} scale={[0.2, 0.2, 0.2]} renderOrder={9} visible={bk > 0.9}><meshBasicMaterial color="#fff3b8" toneMapped={false} depthTest={false} transparent opacity={seg(bond, 0.9, 1)} /></mesh>
        </group>
      })()}
    </group>)}
  </group>
}
