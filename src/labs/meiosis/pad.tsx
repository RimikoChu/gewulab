// 麻醉板上的果蝇（第 5、6、7 课）：麻醉后的果蝇侧躺在白色多孔板上，先堆在中间；“数一数”时戴手套的手拿毛笔把它们按性状拨成几堆。
// 位置都是相对麻醉板中心（x 沿板宽，z 沿板深，单位 cm）。真实大小：一只果蝇约 0.25 cm。
import { useEffect, useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Metal } from '@/lab-kit'
import { Pen } from './board'
import * as THREE from 'three'
import { Fly, FlyFlock, GloveHand, PAD, SortBrush, Vial, type FlyLook, type FlyPose } from './bench'
import { ease, lerp, rng, type V3 } from './parts'

export interface PadFly { o: FlyLook; group: number }
/** 摆位：开始时堆在中间一团（随机），分好以后每堆排成整齐的几行 */
export function layout(list: PadFly[], groups: number, seed: number) {
  const r = rng(seed), counts = new Array(groups).fill(0) as number[]
  const n = list.length, R = Math.sqrt(n) * 0.2 + 0.4
  return list.map(f => {
    const a = r() * Math.PI * 2, q = Math.sqrt(r()) * R
    const start: [number, number] = [Math.cos(a) * q * 1.25, Math.sin(a) * q * 0.75]
    const k = counts[f.group]++
    let end: [number, number]
    if (groups === 4) {
      // 四堆排成 2×2：上面两堆往后排，下面两堆往前排
      const c = GRID4[f.group], row = Math.floor(k / 8)
      end = [c[0] + ((k % 8) - 3.5) * 0.36 + (r() - 0.5) * 0.05, c[1] + (c[1] < 0 ? -row : row) * 0.38 + (r() - 0.5) * 0.05]
    } else {
      const cols = groups > 2 ? 4 : 6, gx = (f.group - (groups - 1) / 2) * GAP(groups)
      end = [gx + ((k % cols) - (cols - 1) / 2) * 0.4 + (r() - 0.5) * 0.06, -0.9 + Math.floor(k / cols) * 0.42 + (r() - 0.5) * 0.06]
    }
    return { ...f, start, end, yaw: r() * Math.PI * 2, delay: r() * 0.7 }
  })
}
/** 每堆的中心（标签用）：相对麻醉板中心 */
const GAP = (n: number) => (n > 2 ? 3.1 : 5)
const GRID4: [number, number][] = [[-2.3, -0.5], [2.3, -0.5], [-2.3, 0.6], [2.3, 0.6]]
export const groupAt = (g: number, groups: number): V3 => (groups === 4 ? [PAD.p[0] + GRID4[g][0], PAD.p[1], PAD.p[2] + GRID4[g][1] + (g < 2 ? -2.1 : 2.2)] : [PAD.p[0] + (g - (groups - 1) / 2) * GAP(groups), PAD.p[1], PAD.p[2] - 1.35])
/** 每堆的数量标签：堆多的时候一上一下错开，免得挤在一起 */
export const groupTag = (g: number, groups: number) => groups === 4 ? { at: groupAt(g, 4), cls: g < 2 ? '-translate-y-full' : 'translate-y-1', ax: g % 2 ? 0.15 : 0.85 } : groups > 2 && g % 2 ? { at: [groupAt(g, groups)[0], PAD.p[1], PAD.p[2] + 1.6] as V3, cls: 'translate-y-1', ax: 0.5 } : { at: groupAt(g, groups), cls: '-translate-y-full', ax: g ? 0.1 : 0.9 }

const BRUSH_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.78, 0.42, 0.46).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 2.4))
/** e：拨开的进度（0–1） */
export function PadScene({ flies, e }: { flies: ReturnType<typeof layout>; e: number }) {
  const poses: FlyPose[] = flies.map(f => {
    const k = ease(Math.min(1, Math.max(0, (e - f.delay * 0.4) / 0.6)))
    return { o: f.o, p: [PAD.p[0] + lerp(f.start[0], f.end[0], k), PAD.p[1], PAD.p[2] + lerp(f.start[1], f.end[1], k)], yaw: f.yaw + k * 0.6, lie: true }
  })
  // 手和毛笔：分拣时在板上来回拨，平时搁在板的右前方
  const sweep = e > 0 && e < 1, t = e * 6
  const tip: V3 = sweep ? [PAD.p[0] + Math.sin(t * Math.PI) * 2.6, PAD.p[1] + 0.15, PAD.p[2] + 0.3 + Math.cos(t * 2.1) * 0.6] : [PAD.p[0] + 5.4, PAD.p[1] + 0.3, PAD.p[2] + 2.2]
  return <group>
    <FlyFlock flies={poses} />
    {/* 毛笔从右后方斜伸进来，笔杆往远处去，不挡住果蝇 */}
    <group position={tip} quaternion={BRUSH_Q}><GloveHand grip={9}><SortBrush /></GloveHand></group>
  </group>
}

// ---------- 第 5–7 课的果蝇台近景 ----------
/** 两只培养瓶放在显微镜底座右边的台面上（世界坐标，瓶底中心） */
export const VIALS: V3[] = [[PAD.p[0] + 15.5, 90, PAD.p[2] - 6], [PAD.p[0] + 19.5, 90, PAD.p[2] - 3]]
/** 放大镜：镜框中心（世界坐标）、半径、里面的果蝇放大几倍 */
export const LOUPE = { at: [PAD.p[0] - 12.5, PAD.p[1] + 2.4, PAD.p[2] + 3] as V3, R: 7.4, k: 14 }
/** 放大镜里第 i 只（共 n 只）果蝇的位置：镜面上的 x、y（cm） */
export const loupeSpot = (i: number, n: number): [number, number] => n <= 2 ? [(i - (n - 1) / 2) * 7, 0.8] : [((i % 2) - 0.5) * 7, Math.floor(i / 2) === 0 ? 3.1 : -2.1]
/** 放大镜：黑色镜框、木柄，镜面下垫一块白板，上面是放大的几只果蝇，让人看清眼色、翅形、体色和雌雄 */
export function Loupe({ looks }: { looks: FlyLook[] }) {
  const { at, R, k } = LOUPE
  return <group position={at} rotation={[-0.95, 0.1, 0]}>
    <mesh position={[0, 0, -0.25]}><circleGeometry args={[R, 48]} /><meshStandardMaterial color="#f3f1ea" roughness={0.9} /></mesh>
    <mesh><torusGeometry args={[R + 0.2, 0.42, 14, 64]} /><meshPhysicalMaterial color="#17191c" roughness={0.3} clearcoat={0.8} /></mesh>
    <mesh position={[0, 0, 0.35]}><circleGeometry args={[R, 48]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.02} clearcoat={1} depthWrite={false} /></mesh>
    <group position={[-R * 0.72, -R * 0.72, 0]} rotation-z={-0.78}>
      <mesh position={[0, -R - 2.6, 0]} castShadow><cylinderGeometry args={[0.55, 0.7, 6, 20]} /><meshStandardMaterial color="#6b4528" roughness={0.6} /></mesh>
      <mesh position={[0, -R + 0.3, 0]}><cylinderGeometry args={[0.6, 0.6, 1.2, 20]} /><Metal kind="brass" /></mesh>
    </group>
    <group rotation-x={Math.PI / 2}>
      {looks.map((o, i) => { const [x, y] = loupeSpot(i, looks.length); return <Fly key={i} o={o} position={[x, -0.2, -y]} yaw={0.25} lie={false} scale={k} /> })}
    </group>
  </group>
}
/** 放大镜里第 i 只果蝇下方的标签位置（世界坐标，近似：忽略镜面的倾斜） */
export const loupeLabel = (i: number, n: number): V3 => { const [x, y] = loupeSpot(i, n); return [LOUPE.at[0] + x, LOUPE.at[1] + (y - 2.4) * 0.58, LOUPE.at[2] - (y - 2.4) * 0.81 + 1] }
/** 记录卡：竖在麻醉板后面的一块小白板，写着这一课的杂交过程 */
export const CARD = { at: [PAD.p[0] - 11, 95.2, PAD.p[2] - 15] as V3, w: 15, h: 8.6 }
export function RecordCard({ draw, deps }: { draw: (p: Pen) => void; deps: unknown[] }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = Math.round(1200 * CARD.h / CARD.w); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }, [])
  useEffect(() => {
    const c = tex.image as HTMLCanvasElement, g = c.getContext('2d')!
    g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, c.width, c.height)
    draw(new Pen(g, CARD.w, CARD.h, c.width / CARD.w)); tex.needsUpdate = true
  }, deps)   // eslint-disable-line react-hooks/exhaustive-deps
  return <group position={CARD.at} rotation={[-0.35, 0.25, 0]}>
    <RoundedBox args={[CARD.w + 0.8, CARD.h + 0.8, 0.5]} radius={0.2} smoothness={2} position={[0, CARD.h / 2 + 0.6, 0]} castShadow><Metal kind="aluminum" grain="brushed" /></RoundedBox>
    <mesh position={[0, CARD.h / 2 + 0.6, 0.26]}><planeGeometry args={[CARD.w, CARD.h]} /><meshStandardMaterial map={tex} roughness={0.35} /></mesh>
    {/* 后面的支架 */}
    <mesh position={[0, 3, -1.6]} rotation-x={0.5}><boxGeometry args={[CARD.w * 0.5, 0.3, 4]} /><Metal kind="aluminum" /></mesh>
  </group>
}
/** 培养瓶：亲代或子代，瓶里停着几只果蝇 */
export function TwoVials({ a, b }: { a: FlyLook; b: FlyLook }) {
  return <group>
    <Vial position={VIALS[0]} big flies={6} look={a} seed={3} />
    <Vial position={VIALS[1]} big flies={6} look={b} seed={7} />
  </group>
}

/** 一批果蝇：按基因型决定样子（翅、体色、眼色、性别） */
export function useFlies<T>(src: T[], look: (x: T, i: number) => FlyLook, group: (x: T) => number, groups: number, seed: number) {
  return useMemo(() => layout(src.map((x, i) => ({ o: look(x, i), group: group(x) })), groups, seed), [src, groups, seed])   // eslint-disable-line react-hooks/exhaustive-deps
}

/** 第 5–7 课果蝇台近景的一整套：两只标好的培养瓶、麻醉板上的果蝇、放大镜、记录卡 */
export interface BenchSet { vials: [FlyLook, FlyLook]; vialNames: [string, string]; flies: ReturnType<typeof layout>; e: number; loupe: { o: FlyLook; name: string }[]; card: (p: Pen) => void; cardDeps: unknown[] }
export function BenchView({ s }: { s: BenchSet }) {
  return <group>
    <TwoVials a={s.vials[0]} b={s.vials[1]} />
    <PadScene flies={s.flies} e={s.e} />
    <Loupe looks={s.loupe.map(l => l.o)} />
    <RecordCard draw={s.card} deps={s.cardDeps} />
  </group>
}
/** 这一套的文字标签：瓶子写亲代 / 子代，放大镜里每只写样子 */
export function benchLabels(s: BenchSet) {
  const out: { id: string; at: V3; ax: number; className: string; children: string }[] = []
  s.vialNames.forEach((n, i) => out.push({ id: `v${i}`, at: [VIALS[i][0], VIALS[i][1] + 12.5, VIALS[i][2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: n }))
  s.loupe.forEach((l, i) => out.push({ id: `l${i}`, at: loupeLabel(i, s.loupe.length), ax: 0.5, className: 'scene-tag !px-1.5 !py-0 text-[14px]', children: l.name }))
  return out
}
