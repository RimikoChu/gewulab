// 光反应和暗反应 · 第 4–6 课里流动的分子：类囊体薄膜上的光反应、基质里的卡尔文循环、两处之间的往返。
// 不动的结构（类囊体的剖面、膜上的蛋白质）在 macro.tsx；这里只管分子沿各条路流动，和把光照、ATP 合酶的转动告诉那边。
import { useEffect, useMemo } from 'react'
import type { V3 } from './kit'
import { MACS, PATH, RING, TRAY, arc, ringAt } from './macro'
import { Mol, Stream, Track, blobGeo, lobe } from './mol'
import { MAC } from './world'

/** 这一处的坐标换成世界坐标（标签用） */
export const mac = (x: number, y: number, z = 1): V3 => [MAC[0] + x, MAC[1] + y, MAC[2] + z]
/** 把光照、ATP 合酶转不转告诉 macro.tsx 里的光束和转子；离开这一课时关掉 */
export function useMacro(lit: number, spin: number, hideAtp = false) {
  useEffect(() => { MACS.lit = lit; MACS.spin = spin; MACS.hideAtp = hideAtp }, [lit, spin, hideAtp])
  useEffect(() => () => { MACS.lit = 0; MACS.spin = 0; MACS.hideAtp = false }, [])
}

/**
 * 光反应的分子：split 水在光系统Ⅱ靠类囊体腔的一侧分解（水进来、氧气出去、H⁺ 留在腔里）；
 * carry 电子沿膜传到光系统Ⅰ，NADP⁺ 变成 NADPH；make H⁺ 穿过 ATP 合酶，ADP 和 Pi 合成 ATP。
 * rate：整体快慢（0–1）；out：NADPH 和 ATP 往哪走（false 是往上飘走，true 是不画，由第 6 课自己接到基质去）
 */
export function LightFlows({ split, carry, make, rate = 1, away = true }: { split: boolean; carry: boolean; make: boolean; rate?: number; away?: boolean }) {
  return <group position={MAC}>
    <Stream pts={PATH.waterIn} kinds={['h2o']} n={3} on={split} speed={0.22} rate={rate} s={0.95} />
    <Stream pts={PATH.o2Out} kinds={['o2']} n={2} on={split} speed={0.14} rate={rate} s={1.0} />
    <Stream pts={PATH.hLumen} kinds={['h']} n={7} on={split} speed={0.1} rate={make ? rate : rate * 0.25} s={1.1} />
    <Stream pts={PATH.eHop} kinds={['e']} n={5} on={carry} speed={0.3} rate={rate} s={1.3} spin={0} />
    <Stream pts={PATH.nadpIn} kinds={['nadp']} n={2} on={carry} speed={0.2} rate={rate} s={0.95} />
    <Stream pts={PATH.hUp} kinds={['h']} n={4} on={make} speed={0.26} rate={rate} s={1.1} />
    <Stream pts={PATH.adpIn} kinds={['adp', 'pi']} n={4} on={make} speed={0.2} rate={rate} s={0.95} />
    {away && <>
      <Stream pts={PATH.nadphOut} kinds={['nadph']} n={2} on={carry} speed={0.2} rate={rate} s={1.05} phase={0.5} />
      <Stream pts={PATH.atpOut} kinds={['atp']} n={2} on={make} speed={0.2} rate={rate} s={1.05} phase={0.5} />
    </>}
  </group>
}

const ARC_C3 = arc(100, 262), ARC_C5 = arc(278, 440)
const C3A = arc(100, 185, 8), C3B = arc(185, 262, 8), C5A = arc(278, 360, 8), C5B = arc(0, 80, 8)
const enzymeGeo = () => blobGeo(v => 1 + lobe(v, [0.8, 0.5, 0], 0.4, 0.25) + lobe(v, [-0.8, 0.4, 0], 0.4, 0.22) + lobe(v, [0, -1, 0], 0.5, 0.18), { amp: 0.1, freq: 2.8, seed: 12, color: '#8a72cc', seg: 56 })
/**
 * 暗反应的分子，绕着一个圈走：fix CO₂ 进来，和 C₅ 结合成两个 C₃（上面，酶那里）；reduce C₃ 接受 ATP、NADPH 被还原（左边），
 * 一部分去合成糖类（下面出去）；regen 其余的再生成 C₅（右边）。c3、c5 是圈上画几成（0–1）；各个 rate 是快慢。
 * supply：ATP 和 NADPH 从类囊体那边过来多少（0–1）；sugar：攒了几个去合成糖类的碳（0–6 摆成一个六边形）
 */
export function DarkFlows({ fix, reduce, regen, c3 = 1, c5 = 1, fixRate = 1, redRate = 1, supply = 1, supplyRate = 1, sugar = 0, glucose = 0, co2 = true }: { fix: boolean; reduce: boolean; regen: boolean; c3?: number; c5?: number; fixRate?: number; redRate?: number; supply?: number; supplyRate?: number; sugar?: number; glucose?: number; co2?: boolean }) {
  const enzyme = useMemo(enzymeGeo, [])
  const top = ringAt(90)
  return <group position={MAC}>
    <Track pts={ARC_C3} color="#ffb060" on={fix} arrows={4} r={0.09} dim={0.22} />
    <Track pts={ARC_C5} color="#6cb4ff" on={fix || regen} arrows={4} r={0.09} dim={0.22} />
    <mesh geometry={enzyme} position={[top[0], top[1], top[2] - 1.3]} scale={[1.9, 1.5, 1.2]}><meshStandardMaterial vertexColors roughness={0.6} emissive="#22183a" emissiveIntensity={0.5} /></mesh>
    <Stream pts={PATH.co2In} kinds={['co2']} n={2} on={fix && co2} speed={0.25} rate={fixRate} s={1.05} />
    {/* C₃：上半段固定出来就有，下半段要还原了才走 */}
    <Stream pts={C3A} kinds={['c3']} n={6} on={fix} level={c3} speed={0.16} rate={reduce ? redRate : 0.18} s={0.92} />
    <Stream pts={C3B} kinds={['c3']} n={6} on={fix && reduce} level={c3} speed={0.16} rate={redRate} s={0.92} phase={0.08} />
    <Stream pts={C5A} kinds={['c5']} n={3} on={regen} level={c5} speed={0.16} rate={fixRate} s={0.9} />
    <Stream pts={C5B} kinds={['c5']} n={3} on level={c5} speed={0.16} rate={fix ? fixRate : 0.12} s={0.9} phase={0.08} />
    {/* ATP、NADPH 从类囊体过来，ADP、Pi、NADP⁺ 回去 */}
    <Track pts={PATH.toStroma} color="#ffd24a" on={reduce && supply > 0.05} arrows={2} />
    <Track pts={PATH.toThylakoid} color="#b9a6d8" on={reduce && supply > 0.05} arrows={2} />
    <Stream pts={PATH.toStroma} kinds={['atp', 'nadph']} n={6} on={reduce} level={supply} speed={0.18} rate={supplyRate} s={1.0} />
    <Stream pts={PATH.toThylakoid} kinds={['adp', 'nadp', 'pi']} n={6} on={reduce} level={Math.min(1, redRate)} speed={0.18} rate={redRate} s={0.92} />
    {/* 去合成糖类的碳：一个个出来，六个攒成一个葡萄糖 */}
    <Track pts={PATH.sugarOut} color="#ffb7c8" on={reduce} arrows={2} />
    <Stream pts={PATH.sugarOut} kinds={['c1']} n={2} on={reduce} speed={0.22} rate={redRate} s={1.0} />
    <group position={TRAY}>
      {Array.from({ length: 6 }, (_, i) => <Mol key={i} kind="c1" position={[Math.cos(i / 6 * Math.PI * 2) * 0.95, Math.sin(i / 6 * Math.PI * 2) * 0.95, 0]} s={i < sugar ? 1.3 : 0.0001} />)}
      <mesh rotation-z={Math.PI / 6}><torusGeometry args={[0.95, 0.05, 6, 6]} /><meshBasicMaterial color="#ffb7c8" transparent opacity={reduce ? 0.5 : 0.15} /></mesh>
      {Array.from({ length: Math.min(3, glucose) }, (_, i) => <Mol key={i} kind="sugar" position={[2.4 + i * 1.8, 0.2, 0]} s={1.35} />)}
    </group>
  </group>
}
export { RING }
