// 光合作用和呼吸作用 · 第 3 课的三维场景：三号台。两只钟罩各罩着一盆植物和一只小烧杯：一只装清水，一只装氢氧化钠溶液。
import { LabStage, type Label } from '@/lab-kit'
import { BellJar, Beaker, C, Lamp, Leaf, Plant } from './parts'
import { JARS, makesStarch, type JarKey } from './physics'
import { S_BENCH, SPOT } from './spots'
import { ST, TOP } from './world'

const X = ST.three, AT: Record<JarKey, number> = { water: -0.52, naoh: 0.52 }

export default function Scene3({ lit, pick, tested }: { lit: boolean; pick: JarKey; tested: JarKey[] }) {
  const labels: Label[] = (Object.keys(JARS) as JarKey[]).flatMap((k): Label[] => {
    const blue = makesStarch({ light: true, co2: JARS[k].co2, chloroplast: true }), done = tested.includes(k)
    return [
      { id: `n${k}`, at: [X + AT[k], TOP + 0.02, 0.5], ax: 0.5, className: 'scene-tag', children: <><small>小烧杯里</small>{JARS[k].name}</> },
      { id: `r${k}`, at: [X + AT[k], TOP + 1.42, 0], ax: 0.5, className: `scene-tag -translate-y-full transition-opacity${blue ? ' key' : ''}`, style: { opacity: done ? 1 : 0 }, children: blue ? '变蓝' : '不变蓝' },
    ]
  })
  return (
    <LabStage labels={labels} target={SPOT.three} span={S_BENCH}>
      <group position={[X, TOP, 0]}>
        {(Object.keys(JARS) as JarKey[]).map(k => (
          <group key={k} position={[AT[k], 0, 0]}>
            <BellJar position={[0, 0, 0]} r={0.36} h={0.52}>
              <Plant position={[-0.07, 0, 0]} s={1.25} compact />
              <Beaker position={[0.2, 0, 0.12]} r={0.07} h={0.11} fill={0.65} liquid={k === 'naoh' ? '#e8e2f5' : C.water} />
            </BellJar>
            {/* 选中的那一罩，底下亮一圈 */}
            <mesh position={[0, 0.004, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.43, 0.46, 48]} /><meshBasicMaterial color="#35c7b3" transparent opacity={pick === k ? 0.95 : 0} toneMapped={false} /></mesh>
            {/* 取下来检验的那片叶子：脱色后滴了碘液 */}
            {tested.includes(k) && <group position={[0, 1.2, 0]} rotation-y={-0.42}><Leaf r={0.15} color={makesStarch({ light: true, co2: JARS[k].co2, chloroplast: true }) ? C.blue : C.pale} /></group>}
          </group>
        ))}
        <Lamp position={[0, 0, -0.42]} on={lit} h={1.25} />
      </group>
    </LabStage>
  )
}
