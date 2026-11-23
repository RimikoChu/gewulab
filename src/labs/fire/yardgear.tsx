// 训练场上的器材：灭火器和灭火器架、燃烧箱和点火枪、燃气灶模拟台和液化气钢瓶、油锅和锅盖、木柴垛、油盘、档案柜、水桶、训练假人。
// 尺寸都按米写，乘 M 变成画面单位；原点都在底面正中，除非另有说明。
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Metal, bolts, disc, lathe, shell, type RY } from '@/lab-kit'
import { M } from './world'
import { gaugeTex, makeExtLabel, rng } from './mats'
import type { Ext } from './physics'

const m = (p: RY[]): RY[] => p.map(([r, y]) => [r * M, y * M])
const memo = <K, T>(f: (k: K) => T) => { const c = new Map<K, T>(); return (k: K) => { if (!c.has(k)) c.set(k, f(k)); return c.get(k)! } }
const redPaint = <meshPhysicalMaterial color="#c0201a" roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.15} />
const blackRubber = <meshStandardMaterial color="#17181a" roughness={0.75} />

// ---------- 灭火器 ----------
/** 三种灭火器的尺寸（m）：筒体半径、筒身高；二氧化碳灭火器是厚壁钢瓶，没有压力表，喷管头上是喇叭筒 */
export const EXT = {
  water: { r: 0.08, h: 0.46 },
  powder: { r: 0.068, h: 0.42 },
  co2: { r: 0.075, h: 0.56 },
} as const
const bodyGeo = memo((e: Ext) => {
  const { r, h } = EXT[e]
  // 筒底一圈凸缘（底圈），筒身，肩部收成圆弧，顶上一截颈
  return lathe(m([[0, 0], [r * 0.92, 0], [r * 0.96, 0.004], [r * 0.96, 0.02], [r, 0.026], [r, h], [r * 0.96, h + r * 0.3], [r * 0.82, h + r * 0.56], [r * 0.56, h + r * 0.8], [0.02, h + r * 0.9], [0.02, h + r * 0.9 + 0.02], [0, h + r * 0.9 + 0.02]]), { segs: 48, crease: 40 })
})
/** 灭火器的瓶头阀顶在多高（m） */
export const extTop = (e: Ext) => EXT[e].h + EXT[e].r * 0.9 + 0.02
/**
 * 一只灭火器：红色筒体、白色标签带、黄铜的瓶头阀、上面的压把和下面的提把、穿过两者的保险销和拉环、压力表、喷管和喷嘴。
 * pin 为假时保险销已经拔掉；press 0–1 压把压下的程度；aim 为真时喷管从筒身上取下来，朝 +x 伸出去（喷嘴在 nozzleAt 返回的位置）
 */
export function Extinguisher({ e, pin = true, press = 0, aim = false }: { e: Ext; pin?: boolean; press?: number; aim?: boolean }) {
  const { r, h } = EXT[e], T = extTop(e) * M, R = r * M
  const label = useMemo(() => makeExtLabel(e), [e])
  const valve = useMemo(() => lathe(m([[0, 0], [0.024, 0], [0.024, 0.012], [0.02, 0.016], [0.02, 0.034], [0.014, 0.04], [0.014, 0.05], [0, 0.05]]), { segs: 28 }), [])
  const hose = useMemo(() => {
    const pts = aim
      ? [[0.03, 0.03, 0], [0.09, 0.0, 0.02], [0.18, -0.06, 0.03], [0.32, -0.1, 0.02], [0.44, -0.1, 0]]
      : [[0.03, 0.03, 0], [0.07, -0.02, 0.02], [r + 0.012, -0.12, 0.01], [r + 0.012, -0.3, 0], [r + 0.012, -0.36, 0]]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x * M, y * M, z * M))), 50, (e === 'co2' ? 0.009 : 0.007) * M, 10)
  }, [aim, e, r])
  const tip = aim ? [0.44, -0.1, 0] : [r + 0.012, -0.36, 0]
  const horn = useMemo(() => shell(m([[0.008, 0], [0.012, 0.02], [0.03, 0.13]]), 0.0025 * M, { segs: 28 }), [])
  return <group>
    <mesh geometry={bodyGeo(e)} castShadow receiveShadow>{redPaint}</mesh>
    {/* 标签：贴在筒身正面的一块白色 */}
    <mesh position={[0, h * 0.45 * M, 0]} rotation-y={0}><cylinderGeometry args={[R + 0.002, R + 0.002, h * 0.5 * M, 32, 1, true, -0.65, 1.3]} /><meshStandardMaterial map={label} roughness={0.5} side={THREE.FrontSide} /></mesh>
    {/* 瓶头阀 */}
    <group position={[0, T, 0]}>
      <mesh geometry={valve} castShadow><Metal kind="brass" grain="turned" /></mesh>
      {/* 提把：下面一块固定的长铁片，往后伸 */}
      <mesh position={[-0.06 * M, 0.034 * M, 0]} rotation-z={0.06} castShadow><boxGeometry args={[0.12 * M, 0.006 * M, 0.026 * M]} /><Metal kind="steel" grain="brushed" /></mesh>
      {/* 压把：上面一块，绕着前端的销轴转下去 */}
      <group position={[0.01 * M, 0.05 * M, 0]} rotation-z={0.28 - press * 0.22}>
        <mesh position={[-0.065 * M, 0, 0]} castShadow><boxGeometry args={[0.13 * M, 0.007 * M, 0.026 * M]} /><Metal kind="chrome" rough={0.14} /></mesh>
      </group>
      <mesh position={[0.016 * M, 0.046 * M, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.004 * M, 0.004 * M, 0.034 * M, 10]} /><Metal kind="steel" /></mesh>
      {/* 保险销和黄色的拉环；铅封一根细线 */}
      {pin && <group position={[-0.02 * M, 0.042 * M, 0]}>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.0018 * M, 0.0018 * M, 0.05 * M, 8]} /><Metal kind="stainless" /></mesh>
        <mesh position={[0, 0, 0.034 * M]} rotation-y={Math.PI / 2}><torusGeometry args={[0.011 * M, 0.0022 * M, 8, 24]} /><meshStandardMaterial color="#e2b417" metalness={0.6} roughness={0.35} /></mesh>
      </group>}
      {/* 压力表：一只小圆表，表盘红黄绿，指针在绿区 */}
      {e !== 'co2' && <group position={[0, 0.022 * M, -0.03 * M]} rotation-y={Math.PI}>
        <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.019 * M, 0.019 * M, 0.012 * M, 28]} /><Metal kind="chrome" rough={0.12} /></mesh>
        <mesh position={[0, 0, 0.0062 * M]}><circleGeometry args={[0.016 * M, 28]} /><meshBasicMaterial map={gaugeTex()} /></mesh>
        <mesh position={[0, 0, 0.0068 * M]} rotation-z={-0.1}><planeGeometry args={[0.0016 * M, 0.026 * M]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, 0, 0.0072 * M]}><circleGeometry args={[0.016 * M, 28]} /><meshPhysicalMaterial color="#fff" transparent opacity={0.15} roughness={0.02} clearcoat={1} /></mesh>
      </group>}
      {/* 喷管：黑色的胶管从阀门出来；不用时用卡子扣在筒身侧面 */}
      <mesh geometry={hose} castShadow>{blackRubber}</mesh>
      {e === 'co2'
        ? <group position={[tip[0] * M, tip[1] * M, tip[2] * M]} rotation-z={aim ? -Math.PI / 2 : Math.PI}><mesh geometry={horn} castShadow>{blackRubber}</mesh></group>
        : <mesh position={[tip[0] * M, tip[1] * M, tip[2] * M]} rotation-z={aim ? -Math.PI / 2 : Math.PI}><cylinderGeometry args={[0.006 * M, 0.009 * M, 0.05 * M, 14]} /><meshStandardMaterial color="#25272a" roughness={0.5} /></mesh>}
    </group>
    {!aim && <mesh position={[R + 0.004, T - 0.3 * M, 0]}><boxGeometry args={[0.012 * M, 0.02 * M, 0.03 * M]} /><Metal kind="steel" /></mesh>}
  </group>
}
/** 喷嘴在灭火器自己的坐标里的位置（喷管拿在手里朝 +x 时） */
export const nozzleAt = (e: Ext): [number, number, number] => [(e === 'co2' ? 0.57 : 0.47) * M, (extTop(e) - 0.1) * M, 0]

/** 灭火器架：一只红色的铁皮箱，敞着前门，里面两层隔板 */
export function ExtRack({ w = 1.4 }: { w?: number }) {
  const W = w * M, H = 0.9 * M, D = 0.32 * M
  return <group>
    <mesh position={[0, 0.02 * M, 0]} receiveShadow castShadow><boxGeometry args={[W, 0.04 * M, D]} />{redPaint}</mesh>
    <mesh position={[0, H / 2, -D / 2]} castShadow><boxGeometry args={[W, H, 0.012 * M]} />{redPaint}</mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * W / 2, H / 2, 0]} castShadow><boxGeometry args={[0.012 * M, H, D]} />{redPaint}</mesh>)}
    <mesh position={[0, H, 0]} castShadow><boxGeometry args={[W + 0.04, 0.02 * M, D + 0.04]} />{redPaint}</mesh>
    <mesh position={[0, H * 0.8, -D / 2 + 0.02]}><planeGeometry args={[W * 0.5, 0.1 * M]} /><meshStandardMaterial color="#f3f0e8" roughness={0.6} /></mesh>
  </group>
}

// ---------- 燃烧箱 ----------
/** 燃烧箱的尺寸（m）：宽、高、深；底下离地多高 */
export const BOX = { w: 1.2, h: 0.9, d: 0.9, leg: 0.45 }
/** 燃烧箱：钢板焊的箱子，四条腿，顶上一根烟囱；正面一扇带耐热玻璃的门（door 0 开、1 关），门下一道风门（damper 0 开、1 关）；箱里一块炉箅子 */
export function BurnBox({ door, damper }: { door: number; damper: number }) {
  const W = BOX.w * M, H = BOX.h * M, D = BOX.d * M, L = BOX.leg * M, t = 0.012 * M
  const steel = <meshStandardMaterial color="#3d4144" metalness={0.75} roughness={0.55} envMapIntensity={0.8} />
  const sooty = <meshStandardMaterial color="#1e1f20" metalness={0.4} roughness={0.85} side={THREE.DoubleSide} />
  const bolt = useMemo(() => bolts(6, 0.11 * M, 0.018 * M), [])
  return <group>
    {/* 四条角钢腿和一圈横撑 */}
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.1), L / 2, sz * (D / 2 - 0.1)]} castShadow><boxGeometry args={[0.24, L, 0.24]} />{steel}</mesh>))}
    {[-1, 1].map(sz => <mesh key={sz} position={[0, L * 0.35, sz * (D / 2 - 0.1)]}><boxGeometry args={[W - 0.2, 0.14, 0.14]} />{steel}</mesh>)}
    <group position={[0, L, 0]}>
      {/* 箱体：底、顶、两侧、后板，里面熏黑 */}
      <mesh position={[0, t / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, t, D]} />{steel}</mesh>
      <mesh position={[0, H - t / 2, 0]} castShadow><boxGeometry args={[W, t, D]} />{steel}</mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 - t / 2), H / 2, 0]} castShadow receiveShadow><boxGeometry args={[t, H, D]} />{steel}</mesh>)}
      <mesh position={[0, H / 2, -D / 2 + t / 2]} castShadow><boxGeometry args={[W, H, t]} />{steel}</mesh>
      <mesh position={[0, H / 2, -D / 2 + t + 0.01]}><planeGeometry args={[W - 2 * t, H - 2 * t]} />{sooty}</mesh>
      {/* 一圈加强的角钢边框 */}
      {[[0, t, W + 0.1, 0.22], [0, H - t, W + 0.1, 0.22]].map(([x, y, w, hh], i) => <mesh key={i} position={[x, y, D / 2]} castShadow><boxGeometry args={[w, hh, 0.22]} />{steel}</mesh>)}
      {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2), H / 2, D / 2]} castShadow><boxGeometry args={[0.22, H, 0.22]} />{steel}</mesh>)}
      {/* 炉箅子：几根铸铁条 */}
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[(i - 3) * 0.12 * M, 0.08 * M, 0]} castShadow><boxGeometry args={[0.025 * M, 0.025 * M, D - 0.5]} /><Metal kind="iron" grain="cast" /></mesh>)}
      {/* 烟囱 */}
      <mesh position={[W * 0.28, H + 0.4 * M, -D * 0.2]} castShadow><cylinderGeometry args={[0.08 * M, 0.08 * M, 0.8 * M, 24]} /><Metal kind="iron" grain="cast" rough={0.7} /></mesh>
      <mesh geometry={bolt} position={[W * 0.28, H, -D * 0.2]}><Metal kind="steel" /></mesh>
      {/* 风门：门下一块可以左右推的有孔钢板 */}
      <group position={[0, 0.07 * M, D / 2 + 0.14]}>
        <mesh><boxGeometry args={[W * 0.6, 0.09 * M, 0.04]} />{steel}</mesh>
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[(i - 2.5) * 0.1 * M, 0, 0.022]}><planeGeometry args={[0.05 * M, 0.05 * M]} /><meshBasicMaterial color="#060606" /></mesh>)}
        <group position={[damper * 0.05 * M, 0, 0.05]}>
          <mesh><boxGeometry args={[W * 0.62, 0.08 * M, 0.03]} /><Metal kind="steel" grain="brushed" rough={0.5} /></mesh>
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[(i - 2.5) * 0.1 * M, 0, 0.016]}><planeGeometry args={[0.05 * M * (1 - damper), 0.05 * M]} /><meshBasicMaterial color="#080808" /></mesh>)}
          <mesh position={[W * 0.33, 0, 0.06]}><boxGeometry args={[0.1, 0.25, 0.14]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        </group>
      </group>
      {/* 正面的门：绕左边的合页转开；门框是钢的，中间一块耐热玻璃 */}
      <group position={[-W / 2 + 0.05, 0.12 * M, D / 2 + 0.12]} rotation-y={-(1 - door) * 1.9}>
        <group position={[W / 2 - 0.05, (H - 0.12 * M) / 2, 0]}>
          {[[0, (H - 0.12 * M) / 2 - 0.15, W - 0.1, 0.3], [0, -(H - 0.12 * M) / 2 + 0.15, W - 0.1, 0.3]].map(([x, y, w, hh], i) => <mesh key={i} position={[x, y, 0]} castShadow><boxGeometry args={[w, hh, 0.08]} />{steel}</mesh>)}
          {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 - 0.2), 0, 0]} castShadow><boxGeometry args={[0.3, H - 0.12 * M, 0.08]} />{steel}</mesh>)}
          <mesh renderOrder={8}><boxGeometry args={[W - 0.6, H - 0.12 * M - 0.6, 0.03]} /><meshPhysicalMaterial color="#d8c8a8" transparent opacity={0.16} roughness={0.08} clearcoat={1} envMapIntensity={1.6} depthWrite={false} /></mesh>
          <mesh position={[W / 2 - 0.36, 0, 0.14]}><boxGeometry args={[0.1, 0.9, 0.12]} /><Metal kind="stainless" grain="brushed" /></mesh>
        </group>
      </group>
    </group>
  </group>
}

/** 一垛井字形码起来的木柴：n 层，每层 3 根。原点在最底一层的底面正中 */
export function WoodCrib({ n = 4, len = 0.5, sec = 0.05, char = 0, glow = 0 }: { n?: number; len?: number; sec?: number; char?: number; glow?: number }) {
  const r = useMemo(() => rng(31), [])
  const logs = useMemo(() => Array.from({ length: n * 3 }, (_, i) => ({ layer: Math.floor(i / 3), k: i % 3, jit: (r() - 0.5) * 0.06, tone: 0.85 + r() * 0.25 })), [n, r])
  const L = len * M, S = sec * M
  const col = (tone: number) => new THREE.Color().setRGB(0.5 * tone * (1 - char * 0.82), 0.34 * tone * (1 - char * 0.86), 0.2 * tone * (1 - char * 0.9))
  return <group>
    {logs.map((l, i) => <RoundedBox key={i} args={[L, S, S]} radius={S * 0.18} smoothness={2} position={[l.layer % 2 ? (l.k - 1) * L * 0.36 : 0, S / 2 + l.layer * S * 0.98, l.layer % 2 ? 0 : (l.k - 1) * L * 0.36]} rotation-y={l.layer % 2 ? Math.PI / 2 + l.jit : l.jit} castShadow receiveShadow>
      <meshStandardMaterial color={col(l.tone)} roughness={0.9} emissive="#ff4a0a" emissiveIntensity={glow * (0.25 + 0.5 * ((i * 7) % 5) / 4)} />
    </RoundedBox>)}
  </group>
}

/** 钢制的接火盘：浅浅的方盘，四周一道翻边。原点在盘底 */
export function SteelTray({ w = 0.9, d = 0.9 }: { w?: number; d?: number }) {
  const W = w * M, D = d * M
  return <group>
    <mesh position={[0, 0.01 * M, 0]} receiveShadow castShadow><boxGeometry args={[W, 0.02 * M, D]} /><meshStandardMaterial color="#3a3c3e" metalness={0.8} roughness={0.6} /></mesh>
    {[[0, D / 2, W, 0.02 * M], [0, -D / 2, W, 0.02 * M]].map(([x, z, w2, t], i) => <mesh key={i} position={[x, 0.05 * M, z]} castShadow><boxGeometry args={[w2, 0.08 * M, t]} /><meshStandardMaterial color="#3a3c3e" metalness={0.8} roughness={0.6} /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * W / 2, 0.05 * M, 0]} castShadow><boxGeometry args={[0.02 * M, 0.08 * M, D]} /><meshStandardMaterial color="#3a3c3e" metalness={0.8} roughness={0.6} /></mesh>)}
  </group>
}

/** 圆形的油盘：直径 dia 的浅钢盘，盘里一层油（汽油浮在水上），外圈一道焊缝 */
export function OilPan({ dia = 1.0, char = 0 }: { dia?: number; char?: number }) {
  const R = dia / 2
  const pan = useMemo(() => shell(m([[0, 0], [R - 0.01, 0], [R, 0.01], [R, 0.16], [R + 0.02, 0.165], [R + 0.025, 0.17]]), 0.006 * M, { segs: 64 }), [R])
  return <group>
    <mesh geometry={pan} castShadow receiveShadow><meshStandardMaterial color="#45484b" metalness={0.8} roughness={0.55} /></mesh>
    <mesh position={[0, 0.11 * M, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[(R - 0.008) * M, 48]} /><meshPhysicalMaterial color={new THREE.Color('#3a2c14').lerp(new THREE.Color('#111'), char)} roughness={0.05} clearcoat={1} metalness={0.1} envMapIntensity={1.6} /></mesh>
    {[0, 1, 2].map(i => <mesh key={i} position={[Math.cos(i * 2.1) * R * M, 0.02 * M, Math.sin(i * 2.1) * R * M]}><boxGeometry args={[0.06 * M, 0.04 * M, 0.06 * M]} /><Metal kind="iron" grain="cast" /></mesh>)}
  </group>
}

/** 档案柜：灰色的四屉钢柜，最上一屉拉开着，里面塞着纸和文件夹；char 是被烧过的程度 */
export function FileCabinet({ char = 0 }: { char?: number }) {
  const W = 0.47 * M, D = 0.62 * M, H = 1.32 * M
  const grey = <meshPhysicalMaterial color={new THREE.Color('#8b9297').lerp(new THREE.Color('#2a2b2c'), char * 0.6)} roughness={0.45} clearcoat={0.3} />
  return <group>
    <RoundedBox args={[W, H, D]} radius={0.04} position={[0, H / 2, 0]} castShadow receiveShadow>{grey}</RoundedBox>
    {[0, 1, 2, 3].map(i => {
      const y = H - (i + 0.5) * H / 4, open = i === 0 ? 0.26 * M : 0
      return <group key={i} position={[0, y, D / 2 + open]}>
        <RoundedBox args={[W - 0.12, H / 4 - 0.12, 0.08]} radius={0.03} castShadow>{grey}</RoundedBox>
        <mesh position={[0, 0.25, 0.07]}><boxGeometry args={[0.8, 0.14, 0.1]} /><Metal kind="chrome" rough={0.15} /></mesh>
        <mesh position={[0, 0.6, 0.045]}><planeGeometry args={[0.5, 0.26]} /><meshStandardMaterial color="#efece2" /></mesh>
        {i === 0 && <>
          {[-1, 1].map(s => <mesh key={s} position={[s * (W / 2 - 0.1), 0, -open / 2]}><boxGeometry args={[0.05, H / 4 - 0.3, open]} />{grey}</mesh>)}
          {Array.from({ length: 7 }, (_, k) => <mesh key={k} position={[0, -0.05 + (k % 2) * 0.12, -open + 0.2 + k * 0.2]} rotation-x={0.06 * (k - 3)}><boxGeometry args={[W - 0.4, 1.2, 0.05]} /><meshStandardMaterial color={new THREE.Color(k % 3 === 0 ? '#e1c98f' : '#f1eee4').lerp(new THREE.Color('#1d1a17'), char)} roughness={0.95} /></mesh>)}
        </>}
      </group>
    })}
  </group>
}

// ---------- 灭火实训台 ----------
/** 不锈钢的操作台：台面加四条腿，下面一层搁板。原点在台面正中，台面高 0.8 m */
export const TABLE_H = 0.8
export function SteelTable({ w = 1.2, d = 0.7 }: { w?: number; d?: number }) {
  const W = w * M, D = d * M, H = TABLE_H * M
  return <group position={[0, -H, 0]}>
    <RoundedBox args={[W, 0.04 * M, D]} radius={0.03} position={[0, H - 0.02 * M, 0]} castShadow receiveShadow><Metal kind="stainless" grain="brushed" rough={0.35} /></RoundedBox>
    {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.2), H / 2, sz * (D / 2 - 0.2)]} castShadow><cylinderGeometry args={[0.13, 0.13, H, 14]} /><Metal kind="stainless" grain="brushed" /></mesh>))}
    <mesh position={[0, 0.18 * M, 0]} castShadow receiveShadow><boxGeometry args={[W - 0.3, 0.02 * M, D - 0.3]} /><Metal kind="stainless" grain="brushed" rough={0.4} /></mesh>
  </group>
}
/** 单眼的燃气灶：黑色的灶面、铸铁的锅架、中间的火盖；正面一只旋钮。原点在灶面底，火盖顶在 STOVE.top */
export const STOVE = { top: 0.1 }
export function Stove() {
  const W = 0.44 * M, D = 0.38 * M
  const cap = useMemo(() => lathe(m([[0, 0.05], [0.04, 0.05], [0.045, 0.06], [0.04, 0.07], [0.03, 0.075], [0, 0.075]]), { segs: 32 }), [])
  return <group>
    <RoundedBox args={[W, 0.05 * M, D]} radius={0.04} position={[0, 0.025 * M, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#141518" roughness={0.25} clearcoat={0.8} /></RoundedBox>
    <mesh geometry={cap} castShadow><Metal kind="iron" grain="cast" /></mesh>
    {/* 锅架：一圈铸铁环和四只爪 */}
    <mesh position={[0, 0.09 * M, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.11 * M, 0.007 * M, 8, 40]} /><Metal kind="iron" grain="cast" /></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 2 + 0.78) * 0.1 * M, 0.08 * M, Math.sin(i * Math.PI / 2 + 0.78) * 0.1 * M]} rotation-y={-(i * Math.PI / 2 + 0.78)}><boxGeometry args={[0.07 * M, 0.04 * M, 0.012 * M]} /><Metal kind="iron" grain="cast" /></mesh>)}
    <mesh position={[0, 0.025 * M, D / 2 + 0.02]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.025 * M, 0.025 * M, 0.025 * M, 20]} /><Metal kind="chrome" rough={0.15} /></mesh>
  </group>
}
/** 液化气钢瓶：灰白色的钢瓶，底下一圈底座，顶上护罩里一只角阀和手轮（open 1 开、0 关，手轮转过的角度跟着变）。原点在瓶底 */
export function GasCylinder({ open }: { open: number }) {
  const body = useMemo(() => lathe(m([[0, 0.04], [0.14, 0.04], [0.155, 0.08], [0.155, 0.46], [0.13, 0.54], [0.07, 0.58], [0.03, 0.585], [0, 0.585]]), { segs: 48, crease: 40 }), [])
  const foot = useMemo(() => shell(m([[0.13, 0], [0.13, 0.06]]), 0.006 * M, { segs: 40 }), [])
  const guard = useMemo(() => shell(m([[0.09, 0.56], [0.09, 0.68]]), 0.005 * M, { segs: 40 }), [])
  const wheel = useMemo(() => disc(0.035 * M, 0.012 * M, { hole: 0.008 * M }), [])
  return <group>
    <mesh geometry={body} castShadow receiveShadow><meshPhysicalMaterial color="#b9bec0" roughness={0.35} clearcoat={0.6} /></mesh>
    <mesh geometry={foot} castShadow><meshStandardMaterial color="#8b9093" metalness={0.6} roughness={0.5} /></mesh>
    <mesh geometry={guard} castShadow><meshStandardMaterial color="#8b9093" metalness={0.6} roughness={0.5} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.615 * M, 0]}><cylinderGeometry args={[0.014 * M, 0.018 * M, 0.06 * M, 16]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0.03 * M, 0.62 * M, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.008 * M, 0.008 * M, 0.05 * M, 12]} /><Metal kind="brass" grain="turned" /></mesh>
    <group position={[0, 0.65 * M, 0]} rotation-y={open * 4}>
      <mesh geometry={wheel}><meshStandardMaterial color="#c3281f" roughness={0.4} /></mesh>
      <mesh position={[0.03 * M, 0.012 * M, 0]}><boxGeometry args={[0.012 * M, 0.01 * M, 0.012 * M]} /><meshStandardMaterial color="#c3281f" /></mesh>
    </group>
  </group>
}
/** 一口铁锅：黑色的圆底锅，一侧一根木柄。原点在锅底，锅口高 WOK.h */
export const WOK = { r: 0.17, h: 0.09 }
export function Wok({ oil = '#7a5a1a' }: { oil?: string }) {
  const g = useMemo(() => shell(m([[0, 0], [0.06, 0.004], [0.12, 0.025], [0.155, 0.06], [0.17, 0.09]]), 0.004 * M, { segs: 56, crease: 60 }), [])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><meshStandardMaterial color="#1b1c1d" metalness={0.7} roughness={0.5} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.03 * M, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.095 * M, 36]} /><meshPhysicalMaterial color={oil} roughness={0.05} clearcoat={1} /></mesh>
    <mesh position={[0.25 * M, 0.1 * M, 0]} rotation-z={Math.PI / 2 - 0.15} castShadow><cylinderGeometry args={[0.014 * M, 0.016 * M, 0.17 * M, 14]} /><meshStandardMaterial color="#5a3a1e" roughness={0.7} /></mesh>
    <mesh position={[0.17 * M, 0.088 * M, 0]} rotation-z={Math.PI / 2 - 0.15}><cylinderGeometry args={[0.008 * M, 0.008 * M, 0.05 * M, 10]} /><Metal kind="steel" /></mesh>
  </group>
}
/** 锅盖：不锈钢的拱形盖，顶上一个黑色的提手。原点在盖口 */
export function Lid() {
  const g = useMemo(() => shell(m([[0.18, 0], [0.17, 0.02], [0.13, 0.05], [0.07, 0.068], [0, 0.074]].reverse() as RY[]).reverse() as RY[], 0.002 * M, { segs: 56 }), [])
  return <group>
    <mesh geometry={g} castShadow><Metal kind="stainless" grain="turned" /></mesh>
    <mesh position={[0, 0.085 * M, 0]} castShadow><cylinderGeometry args={[0.022 * M, 0.016 * M, 0.025 * M, 18]} /><meshStandardMaterial color="#151515" roughness={0.4} /></mesh>
  </group>
}
/** 铁皮水桶：上大下小，一道道箍，一根提梁。原点在桶底 */
export function Bucket({ water = 0.7 }: { water?: number }) {
  const g = useMemo(() => shell(m([[0, 0], [0.13, 0], [0.16, 0.3], [0.165, 0.305]]), 0.003 * M, { segs: 40 }), [])
  return <group>
    <mesh geometry={g} castShadow receiveShadow><Metal kind="zinc" grain="brushed" rough={0.5} /></mesh>
    {[0.06, 0.24].map(y => <mesh key={y} position={[0, y * M, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[(0.13 + y * 0.1) * M, 0.004 * M, 6, 40]} /><Metal kind="zinc" /></mesh>)}
    {water > 0.02 && <mesh position={[0, 0.3 * water * M, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[(0.13 + 0.3 * water * 0.1) * M, 36]} /><meshPhysicalMaterial color="#6f8f9a" roughness={0.05} clearcoat={1} transparent opacity={0.85} /></mesh>}
    <mesh position={[0, 0.31 * M, 0]} rotation-x={0}><torusGeometry args={[0.165 * M, 0.004 * M, 6, 30, Math.PI]} /><Metal kind="steel" /></mesh>
  </group>
}

/** 训练假人：一个穿着橙色训练服的人形，戴头盔。crouch 0 站着、1 弯腰低姿；原点在两脚中间 */
export function Dummy({ crouch = 0 }: { crouch?: number }) {
  const suit = <meshStandardMaterial color="#d8792a" roughness={0.8} />, dark = <meshStandardMaterial color="#26292c" roughness={0.7} />
  const hip = (0.95 - crouch * 0.38) * M, lean = crouch * 0.9
  return <group>
    {[-1, 1].map(s => <group key={s} position={[0, 0, s * 0.11 * M]}>
      <mesh position={[crouch * 0.12 * M, hip * 0.5, 0]} rotation-z={-crouch * 0.5}><capsuleGeometry args={[0.075 * M, hip * 0.8, 6, 12]} />{suit}</mesh>
      <mesh position={[0.04 * M, 0.04 * M, 0]}><boxGeometry args={[0.28 * M, 0.08 * M, 0.12 * M]} />{dark}</mesh>
    </group>)}
    <group position={[0, hip, 0]} rotation-z={-lean}>
      <mesh position={[0, 0.3 * M, 0]} castShadow><capsuleGeometry args={[0.17 * M, 0.36 * M, 6, 14]} />{suit}</mesh>
      {[0.2, 0.36].map(y => <mesh key={y} position={[0, y * M, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.172 * M, 0.012 * M, 6, 24]} /><meshStandardMaterial color="#e6ea5a" roughness={0.4} /></mesh>)}
      <mesh position={[0, 0.74 * M, 0]} castShadow><sphereGeometry args={[0.12 * M, 20, 16]} /><meshStandardMaterial color="#d9b48c" roughness={0.6} /></mesh>
      <mesh position={[0, 0.8 * M, 0]} castShadow><sphereGeometry args={[0.14 * M, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#e8c320" roughness={0.3} clearcoat={0.6} /></mesh>
      {/* 捂住口鼻的那只手（弯腰时抬起来） */}
      {[-1, 1].map(s => <mesh key={s} position={[0.12 * M * crouch + 0.02 * M, (0.42 + 0.2 * crouch * (s > 0 ? 1 : 0)) * M, s * 0.2 * M]} rotation-z={s > 0 ? -crouch * 1.4 : 0.1}><capsuleGeometry args={[0.055 * M, 0.42 * M, 6, 10]} />{suit}</mesh>)}
    </group>
  </group>
}
