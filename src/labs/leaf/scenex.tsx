// 光合作用和呼吸作用 · 拓展课的三维场景：六号台。三个小实验轮流摆上来：钟罩里的蜡烛、海尔蒙特的柳树、银边天竺葵。
import { LabStage, Led, type Label } from '@/lab-kit'
import { BellJar, C, Candle, Lamp, Leaf, Plant } from './parts'
import { XJARS, candleKeeps, makesStarch, willowAt } from './physics'
import { S_BENCH, SPOT } from './spots'
import { ST, TOP } from './world'

const X = ST.six
export type Sub = 'jars' | 'willow' | 'rim'

/** burn：蜡烛点着以后过了多久（0 没点，1 到头）；years：柳树种了几年；rim：银边天竺葵做到哪一步（0 没做，1 照过光，2 滴了碘液） */
export default function SceneX({ sub, burn, years, rim }: { sub: Sub; burn: number; years: number; rim: number }) {
  const w = willowAt(years), grow = 0.35 + years / 5 * 0.65
  const labels: Label[] = sub === 'jars' ? XJARS.map((j, i): Label => {
    const keeps = candleKeeps(j)
    return { id: j.key, at: [X + (i - 1) * 0.9, TOP + 0.02, 0.5], ax: 0.5, className: `scene-tag${burn >= 1 && keeps ? ' key' : ''}`, children: <><small>{j.name}</small>{burn >= 1 ? (keeps ? '一直烧着' : '熄灭了') : burn > 0 ? '烧着' : '还没点'}</> }
  }) : sub === 'willow' ? [
    { id: 'tree', at: [X - 0.75, TOP + 0.5, 0.2], ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>柳树</small>{w.tree.toFixed(1)} kg</> },
    { id: 'soil', at: [X + 0.55, TOP + 0.2, 0.2], className: 'scene-tag -translate-y-1/2', children: <><small>土少了</small>{w.soilLost.toFixed(0)} g</> },
    { id: 'yr', at: [X, TOP + 1.5, 0], ax: 0.5, className: 'scene-name -translate-y-full', children: `第 ${years.toFixed(0)} 年 · 只浇雨水` },
  ] : [
    { id: 'in', at: [X + 0.5, TOP + 0.74, 0.3], ax: 0.5, className: `scene-tag -translate-y-1/2 transition-opacity${rim >= 2 ? ' key' : ''}`, style: { opacity: rim >= 2 ? 1 : 0 }, children: <><small>绿色部分</small>变蓝</> },
    { id: 'out', at: [X + 0.5, TOP + 1.12, 0.3], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: rim >= 2 ? 1 : 0 }, children: <><small>银边</small>不变蓝</> },
    { id: 'nRim', at: [X - 0.45, TOP + 1.0, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '银边天竺葵' },
  ]
  return (
    <LabStage labels={labels} target={SPOT.six} span={S_BENCH}>
      <group position={[X, TOP, 0]}>
        {sub === 'jars' && XJARS.map((j, i) => (
          <BellJar key={j.key} position={[(i - 1) * 0.9, 0, 0]} r={0.33} h={0.5} shade={!j.light}>
            <Candle position={[j.plant ? 0.16 : 0, 0, 0.08]} lit={burn > 0 && (candleKeeps(j) || burn < 0.62)} h={0.16} />
            {j.plant && <Plant position={[-0.1, 0, 0]} s={1.15} compact />}
          </BellJar>
        ))}
        {sub === 'willow' && <>
          {/* 一只大木桶，里面是称过的干土；桶放在一台秤上 */}
          <mesh position={[0, 0.04, 0]} castShadow><boxGeometry args={[1.0, 0.08, 0.8]} /><meshStandardMaterial color="#4a5058" metalness={0.5} roughness={0.5} /></mesh>
          <Led text={w.tree.toFixed(1)} w={0.42} h={0.14} position={[0, 0.04, 0.405]} />
          <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.36, 0.3, 0.44, 24]} /><meshStandardMaterial color={C.wood} roughness={0.85} /></mesh>
          <mesh position={[0, 0.525, 0]}><cylinderGeometry args={[0.345, 0.345, 0.012, 24]} /><meshStandardMaterial color={C.soil} roughness={1} /></mesh>
          <group position={[0, 0.53, 0]} scale={grow}>
            <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.035, 0.06, 0.8, 10]} /><meshStandardMaterial color="#6b5236" roughness={0.9} /></mesh>
            {[[0, 0.92, 0, 0.3], [-0.2, 0.78, 0.05, 0.22], [0.2, 0.8, -0.05, 0.22], [0, 0.7, 0.15, 0.18]].map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]} scale={[1, 1.25, 1]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={i % 2 ? '#6fa85a' : '#5c9a4d'} roughness={0.8} flatShading /></mesh>)}
          </group>
        </>}
        {sub === 'rim' && <>
          <Plant position={[-0.45, 0, 0]} s={1.9} rim="#efead0" />
          <Lamp position={[-1.15, 0, -0.15]} on={rim === 1} h={1.05} />
          {/* 放大的一片叶子：外面一圈是没有叶绿体的银边 */}
          <group position={[0.5, 0.92, 0.3]} rotation-y={-0.42}>
            <Leaf r={0.24} color={rim >= 2 ? C.pale : '#efead0'} position={[0, 0, -0.003]} />
            <Leaf r={0.165} color={rim >= 2 ? (makesStarch({ light: true, co2: true, chloroplast: true }) ? C.blue : C.pale) : C.leaf} />
          </group>
        </>}
      </group>
    </LabStage>
  )
}
