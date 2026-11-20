// 光合作用和呼吸作用 · 第 5 课的三维场景：五号台。两只瓶子，一瓶装萌发的种子，一瓶装煮熟的种子；各插一支温度计，旁边各有一支装澄清石灰水的试管。
import { useMemo } from 'react'
import { LabStage, Led, useSlide, type Label } from '@/lab-kit'
import { Beaker, Bubbles, C, Candle } from './parts'
import { SEEDS, breathes, flaskTemp, type SeedKey } from './physics'
import { S_BENCH, SPOT } from './spots'
import { ST, TOP } from './world'

const X = ST.five, AT: Record<SeedKey, number> = { alive: -0.6, boiled: 0.6 }

function Flask({ k, hours, pick, lime, candle }: { k: SeedKey; hours: number; pick: boolean; lime: boolean; candle: boolean }) {
  const seeds = useMemo(() => Array.from({ length: 34 }, (_, i) => { const a = i * 2.4, r = 0.03 + (i % 5) * 0.022; return [Math.cos(a) * r, 0.03 + (i % 4) * 0.028, Math.sin(a) * r] as [number, number, number] }), [])
  const dip = useSlide(candle ? 0.2 : 0.62, 0.5), alive = breathes(k), out = alive && dip < 0.3
  return (
    <group position={[AT[k], 0, 0]}>
      <Beaker position={[0, 0, 0]} r={0.16} h={0.36} fill={0} />
      {seeds.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.022, 8, 6]} /><meshStandardMaterial color={alive ? '#c9a45a' : '#8d7a5c'} roughness={0.8} /></mesh>)}
      {alive && seeds.filter((_, i) => i % 3 === 0).map((p, i) => <mesh key={i} position={[p[0], p[1] + 0.03, p[2]]} rotation-z={0.5}><cylinderGeometry args={[0.004, 0.004, 0.04, 5]} /><meshStandardMaterial color="#eef3df" /></mesh>)}
      {/* 温度计和读数 */}
      <mesh position={[-0.08, 0.34, 0]}><cylinderGeometry args={[0.009, 0.009, 0.5, 8]} /><meshStandardMaterial color="#f1f4f5" transparent opacity={0.7} /></mesh>
      <mesh position={[-0.08, 0.14 + (flaskTemp(k, hours) - 18) * 0.018, 0]}><cylinderGeometry args={[0.005, 0.005, 0.1 + (flaskTemp(k, hours) - 18) * 0.036, 6]} /><meshBasicMaterial color="#e5484d" /></mesh>
      <Led text={`${flaskTemp(k, hours).toFixed(1)}`} w={0.26} h={0.1} position={[0, 0.05, 0.19]} />
      {/* 石灰水试管：通了瓶里的气体，活种子那一支变浑浊 */}
      <Beaker position={[0.3, 0, 0.12]} r={0.04} h={0.22} fill={0.6} liquid={lime && alive ? '#f4f4ee' : '#cfe8ef'} opacity={lime && alive ? 0.95 : 0.45} />
      {lime && <mesh position={[0.2, 0.34, 0.06]} rotation-z={-1.05} rotation-y={-0.4}><cylinderGeometry args={[0.007, 0.007, 0.34, 6]} /><meshStandardMaterial color="#d9e3e6" transparent opacity={0.8} /></mesh>}
      <Bubbles from={[0.3, 0.02, 0.12]} top={0.13} rate={lime ? 3 : 0} size={0.008} spread={0.012} n={6} />
      {/* 伸进瓶里的蜡烛 */}
      <group position={[0.05, dip, 0]}>
        <Candle position={[0, 0, 0]} lit={candle ? !out : false} h={0.1} />
        <mesh position={[0, 0.32, 0]}><cylinderGeometry args={[0.003, 0.003, 0.5, 4]} /><meshStandardMaterial color="#444" /></mesh>
      </group>
      <mesh position={[0, 0.004, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.24, 0.27, 40]} /><meshBasicMaterial color="#35c7b3" transparent opacity={pick ? 0.95 : 0} toneMapped={false} /></mesh>
    </group>
  )
}

export default function Scene5({ hours, pick, lime, candle }: { hours: number; pick: SeedKey; lime: SeedKey[]; candle: SeedKey[] }) {
  const labels: Label[] = (Object.keys(SEEDS) as SeedKey[]).flatMap((k): Label[] => [
    { id: `n${k}`, at: [X + AT[k], TOP + 0.02, 0.5], ax: 0.5, className: 'scene-tag', children: <><small>{SEEDS[k].name}</small>{flaskTemp(k, hours).toFixed(1)} ℃</> },
    { id: `l${k}`, at: [X + AT[k] + 0.36, TOP + 0.26, 0.12], className: `scene-name -translate-y-1/2 transition-opacity`, style: { opacity: lime.includes(k) ? 1 : 0 }, children: breathes(k) ? '石灰水变浑浊' : '石灰水没变' },
    { id: `c${k}`, at: [X + AT[k], TOP + 0.95, 0], ax: 0.5, className: `scene-name -translate-y-full transition-opacity`, style: { opacity: candle.includes(k) ? 1 : 0 }, children: breathes(k) ? '蜡烛熄灭了' : '蜡烛还在烧' },
  ])
  return (
    <LabStage labels={labels} target={SPOT.five} span={S_BENCH}>
      <group position={[X, TOP, 0]}>
        {(Object.keys(SEEDS) as SeedKey[]).map(k => <Flask key={k} k={k} hours={hours} pick={pick === k} lime={lime.includes(k)} candle={candle.includes(k)} />)}
        <mesh position={[0, 0.03, -0.35]}><boxGeometry args={[0.3, 0.06, 0.2]} /><meshStandardMaterial color={C.wood} roughness={0.8} /></mesh>
      </group>
    </LabStage>
  )
}
