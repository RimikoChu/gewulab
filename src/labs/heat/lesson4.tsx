// 内能和热机 · 第 4 课 比热容：等质量的水和食用油，用两个相同的电加热器同时加热，比升温；再只给水加热到同样的温度；
// 最后用水的读数算出加热器给的热，再算出食用油的比热容。
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Puffs } from './fx'
import { BEAKER, Beaker, Cable, Clamp, Heater, PowerBox, Stand, Thermo, WATER } from './gear'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Calc, Done, H2, useRun } from './parts'
import { C_WATER, HEAT, depthIn, heatQ, heaterQ, heaterT, oilFromRun, sci } from './physics'
import { TChart } from './views'
import { VOICE } from './voice'
import { BZ, Room, ST, TOP } from './world'

const TASKS: Task[] = [
  { id: 'both', text: `同时给水和食用油加热 ${HEAT.first} 分钟，比一比谁升温多`, note: `水升了 ${heaterT('water', HEAT.first) - HEAT.start} ℃，油升了 ${heaterT('oil', HEAT.first) - HEAT.start} ℃` },
  { id: 'water', text: `只给水接着加热，直到它也升高 ${heaterT('oil', HEAT.first) - HEAT.start} ℃`, note: `水要加热 ${HEAT.total} 分钟：升高同样的温度，水吸收的热量多` },
  { id: 'calc', text: '算出食用油的比热容', note: `约 ${sci(oilFromRun(), 1)} J/(kg·℃)，比水的小` },
]
const X = ST.s4, Z = BZ + 0.15
const WX = X - 0.7, OX = X + 0.75, OIL = '#d9a521'
/** 画面里一秒钟算实验的几分钟 */
const SPEED = 1 / 1.3
const DW = depthIn('water', 0.0338) * 10, DO = depthIn('oil', 0.0338) * 10

export default function Lesson4() {
  const [mode, setMode] = useState<'idle' | 'both' | 'water'>('idle')
  const [tB, setB] = useRun(mode === 'both' || mode === 'water', SPEED, HEAT.first)
  const [tW, setW] = useRun(mode === 'water', SPEED, HEAT.total - HEAT.first)
  const [calc, setCalc] = useState(false)
  const T = useTasks('gewu:heat:4', TASKS)
  const minW = tB + tW, minO = tB
  const Tw = heaterT('water', minW), To = heaterT('oil', minO)
  const bothDone = tB >= HEAT.first - 1e-6, waterDone = tW >= HEAT.total - HEAT.first - 1e-6
  useEffect(() => { T.check(id => id === 'both' ? bothDone : id === 'water' ? waterDone : calc) })
  const resetAll = () => { setMode('idle'); setB(0); setW(0); setCalc(false); T.reset() }
  const onW = (mode === 'both' && !bothDone) || (mode === 'water' && !waterDone), onO = mode === 'both' && !bothDone
  const task = T.current
  const { hint, next }: { hint: string; next: 'both' | 'water' | 'calc' | null } = (() => {
    if (!task) return { hint: '质量相同的水和食用油，吸收相同的热量，水升温少：水的比热容大。', next: null }
    if (task.id === 'both') return mode === 'idle' ? { hint: `两杯各 ${HEAT.m * 1000} g，都是 ${HEAT.start} ℃，加热器一样。按“通电加热”`, next: 'both' } : { hint: '加热时间相同，两杯吸收的热量相同。看温度…', next: null }
    if (task.id === 'water') return mode !== 'water' ? { hint: `油已经升到 ${heaterT('oil', HEAT.first)} ℃，水才 ${heaterT('water', HEAT.first)} ℃。按“只给水加热”`, next: 'water' } : { hint: `给水接着加热，看它什么时候也到 ${heaterT('oil', HEAT.first)} ℃…`, next: null }
    return { hint: '按“算比热容”：用水的读数算出加热器给了多少热', next: 'calc' }
  })()
  const pts = (s: 'water' | 'oil', upto: number) => Array.from({ length: Math.floor(upto + 1e-6) + 1 }, (_, m) => [m, heaterT(s, m)] as [number, number])
  const labels: Label[] = [
    { id: 'w', at: [WX - 0.3, TOP + 1.25, Z + 0.3], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>水</small>{Tw.toFixed(1)} ℃</> },
    { id: 'o', at: [OX + 0.3, TOP + 1.25, Z + 0.3], className: 'scene-tag key -translate-y-1/2', children: <><small>食用油</small>{To.toFixed(1)} ℃</> },
    { id: 'n1', at: [WX + 0.2, TOP + BEAKER.h + 0.5, Z], name: true, className: 'scene-name -translate-y-1/2', children: '电加热器' },
    { id: 'n2', at: [X - 1.95, TOP + 0.7, Z + 0.4], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '电源' },
  ]
  const Q = heatQ(C_WATER, HEAT.m, heaterT('water', HEAT.first) - HEAT.start)
  return (
    <LabShell title="内能和热机" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="加热"
      stage={<Room at="s4" labels={labels} bloom={0.3}>
        {([[WX, WATER, DW, Tw, onW], [OX, OIL, DO, To, onO]] as [number, string, number, number, boolean][]).map(([x, col, d, temp, on]) => <group key={x}>
          <Beaker at={[x, TOP, Z]} level={d} color={col} o={col === OIL ? 0.62 : 0.5}>
            <Heater at={[0.05, 0, 0]} hot={on ? 1 : 0} />
          </Beaker>
          <Thermo at={[x - 0.17, TOP + BEAKER.floor + 0.1, Z - 0.05]} T={temp} />
          <Cable a={[x + 0.1, TOP + 1.35, Z]} b={[X - 1.9, TOP + 0.35, Z + 0.35]} sag={1.1} />
          <Puffs at={[x, TOP + BEAKER.h - 0.05, Z]} on={Math.max(0, (temp - 25) / 25)} len={0.5} size={0.2} spread={0.1} dense={0.12} />
        </group>)}
        {/* 两支温度计各用一个铁架台夹着 */}
        <Stand at={[WX - 0.3, TOP, Z - 0.75]} h={3.4} w={1.0}><Clamp y={2.9} cx={0.13} grip={0.035} cz={0.7} /></Stand>
        <Stand at={[OX - 0.3, TOP, Z - 0.75]} h={3.4} w={1.0}><Clamp y={2.9} cx={0.13} grip={0.035} cz={0.7} /></Stand>
        <PowerBox at={[X - 1.95, TOP, Z + 0.35]} on={onW || onO} text={(minW).toFixed(1)} />
      </Room>}
      lesson={<LessonBlock no="4" title="比热容" concept="质量相同时，水升温慢，吸热本领强" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一定质量的某种物质，在温度升高时吸收的热量与它的质量和升高的温度乘积之比，叫做这种物质的<b className="text-white">比热容</b>，用 c 表示，单位是 J/(kg·℃)。</p>
          <p className="mt-3 font-formula text-[17px] italic">c = Q ⁄ (m Δt)</p>
          <p className="mt-3">水的比热容是 4.2×10³ J/(kg·℃)，比食用油、沙石大得多。质量相同时，吸收同样多的热，水升温少；升高同样的温度，水吸热多。所以汽车发动机用水做冷却液。</p>
          <p className="mt-3 text-[13.5px] text-white/65">两个相同的加热器，在相同时间里放出的热量相同，所以加热时间的长短可以表示吸收热量的多少。</p>
        </>} />}
      finale={T.finale && <Done head="三件事都做完了" title="质量相同时，水升温慢，吸热本领强" onClose={() => T.setFinale(false)}>同样加热 {HEAT.first} 分钟，油升了 {heaterT('oil', HEAT.first) - HEAT.start} ℃，水只升了 {heaterT('water', HEAT.first) - HEAT.start} ℃；水要加热 {HEAT.total} 分钟才升高同样的温度。水的比热容大，所以发动机用水来冷却。</Done>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="t" value={`${minW.toFixed(1)}`} unit="加热 min" />
            <ParamTile symbol="t水" value={`${Tw.toFixed(1)}`} unit="℃" />
            <ParamTile symbol="t油" value={`${To.toFixed(1)}`} unit="℃" />
          </div>
          <H2>温度–时间图</H2>
          <TChart tmax={HEAT.total} lo={20} hi={44} step={4} series={[{ name: '水', color: '#7fb8ff', pts: pts('water', minW) }, { name: '食用油', color: '#ffc94a', pts: pts('oil', minO) }]} />
          <H2>算比热容（m = {HEAT.m} kg）</H2>
          <Calc on={calc} f={<>Q = c水 m Δt水</>} v={calc ? `${sci(Q)} J` : '—'} />
          <Calc on={calc} f={<>c油 = Q ⁄ (m Δt油)</>} v={calc ? <>约 {sci(oilFromRun(), 1)}</> : '—'} />
          {calc && <p className="mt-2 text-[12.5px] text-white/60">前 {HEAT.first} 分钟两杯吸热一样多：{sci(heaterQ(HEAT.first))} J；比热容单位 J/(kg·℃)</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'both'} pulse={next === 'both'} onClick={() => setMode('both')} disabled={mode !== 'idle'}>通电加热</LabButton>
        <LabButton pulse={next === 'water'} onClick={() => setMode('water')} disabled={mode !== 'both' || !bothDone}>只给水加热</LabButton>
        <LabButton pulse={next === 'calc'} onClick={() => setCalc(true)} disabled={calc || !waterDone}>算比热容</LabButton>
      </>}
      extras={null}
    />
  )
}
