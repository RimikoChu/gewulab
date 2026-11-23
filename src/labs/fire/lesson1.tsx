// 燃烧和灭火 · 第 1 课 燃烧需要可燃物：实验台第 1 格，一盏酒精灯，旁边一块白瓷板上放着小木条、小石块和两只棉球（一只蘸了酒精，一只蘸了水）。
// 用坩埚钳夹起一样，放到火焰上加热约 3 秒，看它着不着。木条、酒精棉球是可燃物，着了；石块、水棉球烧不着。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { AlcoholLamp, Glove, LAMP, LampCap, Tongs } from './gear'
import { Flame, Puffs, SMOKE } from './fx'
import { useRun, liftPath, seg } from './parts'
import { HEAT_SEC, ITEMS, type Item } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l1, Y = TOP
const TASKS: Task[] = [
  { id: 'wood', text: '用坩埚钳夹起小木条，放到火焰上加热', note: '小木条着了：木条是可燃物' },
  { id: 'stone', text: '换成小石块，加热一会儿', note: '石块烧不着：它不是可燃物' },
  { id: 'alc', text: '换成蘸酒精的棉球', note: '酒精棉球一碰到火就着了：酒精是可燃物' },
  { id: 'water', text: '换成蘸水的棉球', note: '水棉球只冒白汽，不燃烧：水不是可燃物' },
]
const ORDER: Item[] = ['wood', 'stone', 'alc', 'water']
/** 白瓷板上四样东西的位置（相对 X0，m） */
const SLOT: Record<Item, number> = { wood: -0.3, stone: -0.22, alc: -0.15, water: -0.08 }
const TILE_X = -0.19, LAMP_X = 0.06
/** 动作的时间（s）：夹起、送到火焰上、加热、停一会儿看结果 */
const GO = 1.4, HOLD = HEAT_SEC, LOOK = 1.2, TOTAL = GO + HOLD + LOOK

/** 一个毛茸茸的棉球：细分的球，表面按噪声起伏 */
function cottonGeo() {
  const g = new THREE.IcosahedronGeometry(0.009 * M, 4), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.12 * Math.sin(x * 90) * Math.sin(y * 80 + 1) * Math.sin(z * 70 + 2) + 0.05 * Math.sin(x * 260 + y * 230); p.setXYZ(i, x * k, y * k * 0.85, z * k) }
  g.computeVertexNormals(); return g
}
function stoneGeo() {
  const g = new THREE.IcosahedronGeometry(0.011 * M, 2), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.2 * Math.sin(x * 40 + 1) * Math.cos(z * 37) + 0.08 * Math.sin(y * 90); p.setXYZ(i, x * k * 1.15, y * k * 0.7, z * k) }
  g.computeVertexNormals(); return g
}
/** 四样东西的样子。原点在它被钳子夹住的那一点；burnt：烧过了 */
function Thing({ k, burnt }: { k: Item; burnt: boolean }) {
  const g = useMemo(() => ({ cotton: cottonGeo(), stone: stoneGeo() }), [])
  if (k === 'wood') return <group>
    <RoundedBox args={[0.1 * M, 0.006 * M, 0.006 * M]} radius={0.001 * M} smoothness={2} position={[-0.045 * M, 0, 0]} castShadow><meshStandardMaterial color="#d3b07a" roughness={0.8} /></RoundedBox>
    {burnt && <mesh position={[-0.094 * M, 0, 0]}><boxGeometry args={[0.014 * M, 0.0064 * M, 0.0064 * M]} /><meshStandardMaterial color="#1a1512" roughness={1} /></mesh>}
  </group>
  if (k === 'stone') return <mesh geometry={g.stone} position={[-0.006 * M, 0, 0]} castShadow><meshStandardMaterial color="#7d7a72" roughness={0.9} /></mesh>
  return <mesh geometry={g.cotton} position={[-0.006 * M, 0, 0]} castShadow>
    <meshStandardMaterial color={k === 'alc' ? (burnt ? '#6e5a44' : '#f2f2ec') : '#dfe4e6'} roughness={k === 'water' ? 0.45 : 1} />
  </mesh>
}

export default function Lesson1() {
  const [item, setItem] = useState<Item>('wood')
  const [rows, setRows] = useState<Partial<Record<Item, boolean>>>({})
  const T = useTasks('gewu:fire:1', TASKS)
  const heat = useRun(TOTAL, () => { setRows(r => ({ ...r, [item]: ITEMS[item].burn })); T.check(id => id === item) })
  const t = heat.t, going = heat.busy || t > 0
  // 钳嘴的位置：白瓷板上方 → 火焰的外焰
  const rest: V3 = [X0 + SLOT[item] * M, Y + 0.02 * M, BZ + 0.02 * M], fire: V3 = [X0 + LAMP_X * M, Y + (LAMP.top + 0.04) * M, BZ]
  const back = seg(t, TOTAL - 0.01, TOTAL)
  const tip = going && back < 1 ? liftPath(rest, fire, fire[1] + 0.03 * M, seg(t, 0, GO)) : rest
  const inFlame = t > GO && t < TOTAL
  const lit = inFlame && ITEMS[item].burn && t > GO + (item === 'alc' ? 0.3 : 1.6)
  const steaming = inFlame && item === 'water'
  const pick = (k: Item) => { if (heat.busy) return; heat.snap(0); setItem(k) }
  const resetAll = () => { heat.snap(0); setItem('wood'); setRows({}); T.reset() }
  const task = T.current
  const want = (task?.id as Item | undefined) ?? null
  const { hint, next }: { hint: string; next: 'heat' | 'item' | null } = !task ? { hint: '能燃烧的物质叫可燃物。木条、酒精能燃烧，石块、水不能。', next: null }
    : heat.busy ? { hint: t < GO ? '夹起来，送到火焰上…' : `在火焰上加热，看它着不着…`, next: null }
    : item !== want ? { hint: `把坩埚钳夹的东西换成“${ITEMS[want!].short}”`, next: 'item' }
    : { hint: `按“放到火焰上加热”：夹起${ITEMS[item].name}，在火焰上烧一会儿`, next: 'heat' }
  const res = rows[item]
  const labels: Label[] = [
    ...(t >= TOTAL - 0.2 || (res !== undefined && !heat.busy) ? [{ id: 'r', at: [fire[0] + 0.07 * M, fire[1] + 0.06 * M, BZ] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>{ITEMS[item].short}</small>{ITEMS[item].burn ? '燃烧' : '不燃烧'}</> }] : []),
    { id: 'n1', at: [X0 + (LAMP_X - 0.05) * M, Y + 0.03 * M, BZ + 0.2], ax: 1, name: true, className: 'scene-name', children: '酒精灯' },
    { id: 'n2', at: [X0 + TILE_X * M, Y - 0.02 * M, BZ + 0.6], ax: 0.5, name: true, className: 'scene-name', children: '白瓷板' },
    { id: 'n3', at: [X0 + (SLOT[item] + 0.1) * M, Y + 0.075 * M, BZ + 0.5], name: true, className: 'scene-name', children: '坩埚钳' },
  ]
  return (
    <LabShell title="燃烧和灭火" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="坩埚钳"
      stage={<Place at="l1" labels={labels}>
        <group position={[X0 + LAMP_X * M, Y, BZ]}><AlcoholLamp /></group>
        <Flame at={[X0 + LAMP_X * M, Y + LAMP.top * M, BZ]} w={0.026 * M} h={0.075 * M} kind="alcohol" light={1.4} lightColor="#ffb26a" />
        <group position={[X0 + (LAMP_X + 0.09) * M, Y, BZ - 0.04 * M]}><LampCap /></group>
        {/* 白瓷板和上面的东西（被夹走的那一样不画在板上） */}
        <RoundedBox args={[0.3 * M, 0.008 * M, 0.12 * M]} radius={0.004 * M} smoothness={2} position={[X0 + TILE_X * M, Y + 0.004 * M, BZ + 0.02 * M]} receiveShadow castShadow><meshPhysicalMaterial color="#f4f4f0" roughness={0.2} clearcoat={0.8} /></RoundedBox>
        {ORDER.filter(k => k !== item).map(k => <group key={k} position={[X0 + SLOT[k] * M, Y + 0.016 * M, BZ + 0.02 * M]} rotation-y={Math.PI}><Thing k={k} burnt={rows[k] === true} /></group>)}
        {/* 坩埚钳和握着它的手：钳嘴在 tip，钳柄伸向右前方；不用时钳子搁在白瓷板上 */}
        <group position={tip} rotation={[0, Math.PI - 0.35, heat.busy ? 0.18 : 0.06]}>
          <Thing k={item} burnt={rows[item] === true || lit} />
          <Tongs />
          {heat.busy && <group position={[-0.19 * M, 0, 0]} rotation={[0.75, 0, 0.12]}><Glove s={0.0058 * M} /></group>}
        </group>
        {lit && <Flame at={[tip[0] + 0.008 * M, tip[1], tip[2]]} w={(item === 'alc' ? 0.045 : 0.022) * M} h={(item === 'alc' ? 0.09 : 0.05) * M} kind={item === 'alc' ? 'alcohol' : 'wood'} seed={3} light={0.8} />}
        <Puffs at={[tip[0], tip[1] + 0.012 * M, tip[2]]} on={steaming && t > GO + 0.4} opt={SMOKE.steam(0.06)} seed={5} />
        <Puffs at={[tip[0], tip[1] + 0.05 * M, tip[2]]} on={lit && item === 'wood'} opt={SMOKE.wisp(0.5)} seed={7} />
      </Place>}
      lesson={<LessonBlock no="1" title="燃烧需要可燃物" concept="能燃烧的物质才会燃烧：可燃物" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>燃烧是可燃物与氧气发生的一种发光、放热的剧烈的氧化反应。</p>
          <p className="mt-3">小木条、蘸酒精的棉球放到火焰上，很快燃烧起来；小石块、蘸水的棉球加热一会儿，不燃烧。木材、酒精是<b className="text-white">可燃物</b>，石块、水不是。</p>
          <p className="mt-3 text-[13.5px] text-white/65">蘸水的棉球加热久了也会着：水烧干以后，剩下的棉花是可燃物。这个对比说明的是“水不能燃烧”。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四样东西都烧过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">燃烧的第一个条件：物质本身是可燃物</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">同样在火焰上加热，木条和酒精棉球燃烧了，石块和水棉球没有。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{ITEMS[item].name} · 加热约 {HEAT_SEC} 秒</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight">{res === undefined || heat.busy ? '—' : res ? '燃烧' : '不燃烧'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">放到火焰上的</th><th className="pb-1 font-medium">现象</th><th className="pb-1 font-medium">可燃物</th></tr></thead>
            <tbody>{ORDER.map(k => <tr key={k} className={k === item ? 'bg-white/10' : 'bg-white/[0.04]'}>
              <td className="rounded-l-lg px-2 py-1.5 text-left">{ITEMS[k].name}</td>
              <td className="py-1.5">{rows[k] === undefined ? '—' : rows[k] ? '燃烧' : '不燃烧'}</td>
              <td className={`rounded-r-lg py-1.5 font-semibold ${rows[k] ? 'text-[#7fe3d4]' : ''}`}>{rows[k] === undefined ? '—' : ITEMS[k].fuel ? '是' : '不是'}</td>
            </tr>)}</tbody>
          </table>
          {res !== undefined && !heat.busy && <p className="hint-in mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">{ITEMS[item].why}</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'heat'} onClick={() => heat.run()} disabled={heat.busy || rows[item] !== undefined}>放到火焰上加热</LabButton>
      </>}
      extras={
        <Control label="坩埚钳夹的">
          <Segmented label="坩埚钳夹的" pulse={next === 'item'} want={next === 'item' ? want : null} disabled={heat.busy} value={item} onChange={k => pick(k as Item)} options={ORDER.map(k => ({ value: k, label: ITEMS[k].short }))} />
        </Control>
      }
    />
  )
}
