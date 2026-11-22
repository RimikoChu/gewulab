// 质量与密度 · 第 1 课 质量是什么（质量不随形状、状态、位置改变）
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Balance, WeightSet, panAt } from './balance'
import { LESSONS, goLesson } from './lessons'
import { Block, Clay, IceCup, Room, newLive, useSettled, type V3 } from './parts'
import { ICE_M, THINGS, columnCm, reading, volumeOf, weigh, weightsText, type ThingKey } from './physics'
import { BalanceView } from './views'
import { CM, ST, TOP, YARD } from './world'

const KEYS: ThingKey[] = ['shape', 'state', 'place']
const SEG: Record<ThingKey, string> = { shape: '改变形状', state: '改变状态', place: '改变位置' }
const TASKS: Task[] = [
  { id: 'shape', text: '把橡皮泥压成饼，再看天平的读数', note: `还是 ${THINGS.shape.m} g：形状变了，质量不变` },
  { id: 'state', text: '等密封杯里的冰熔化成水，再看读数', note: `还是 ${THINGS.state.m} g：从固态变成液态，质量不变` },
  { id: 'place', text: '把铝块从化验室拿到料场，再称一次', note: `还是 ${THINGS.place.m} g：换了地方，质量不变` },
]
const SITE = { lab: { x: ST.s1, z: 0 }, yard: { x: YARD.x, z: YARD.z } }
/** 冰全化成水以后，杯里的水有多高 */
const WATER_H = columnCm(volumeOf('water', ICE_M), 0.155 / CM) * CM

export default function Lesson1() {
  const [kind, setKind] = useState<ThingKey>('shape')
  const [did, setDid] = useState<ThingKey[]>([])
  const [rows, setRows] = useState<ThingKey[]>([])
  const [kick, setKick] = useState(0)
  const T = useTasks('gewu:density:1', TASKS)
  const live = useRef(newLive())
  const thing = THINGS[kind], changed = did.includes(kind), w = weigh(thing.m), dup = rows.includes(kind)
  const flat = useSlide(did.includes('shape') ? 1 : 0, 0.8), melt = useSlide(did.includes('state') ? 1 : 0, 0.3)
  const settled = useSettled(`${kind}${changed}`, kind === 'state' ? 4200 : kind === 'place' ? 3800 : 2400)
  const site = SITE[kind === 'place' && changed ? 'yard' : 'lab']
  const base: V3 = [site.x - 0.35, TOP, site.z + 0.25], box: V3 = [site.x + 1.42, TOP, site.z + 0.85]
  const change = () => { if (changed) return; setDid(d => [...d, kind]); if (kind === 'shape') setKick(k => k + 1) }
  const record = () => { if (!changed || !settled || dup) return; const next = [...rows, kind]; setRows(next); T.check(id => next.includes(id as ThingKey)) }
  const resetAll = () => { setKind('shape'); setDid([]); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'kind' | 'change' | 'record' | null } = !task ? { hint: '三样都试过了。形状、状态、位置变了，质量都没有变。', next: null }
    : kind !== task.id ? { hint: `换成“${SEG[task.id as ThingKey]}”`, next: 'kind' }
    : !changed ? { hint: `现在天平平衡，${thing.name}的质量是 ${thing.m} g。按“${thing.act}”`, next: 'change' }
    : !settled ? { hint: kind === 'state' ? '冰在熔化，杯子盖着盖，水跑不掉…' : kind === 'place' ? '拿到料场的检验台上，再放到天平上…' : '压扁了，等天平停稳…', next: null }
    : { hint: '天平还是平衡的，砝码和游码都没动。按“记录”', next: 'record' }
  const pl = panAt(base, -1)
  const labels: Label[] = [
    { id: 'm', at: [base[0] + 0.1, TOP + 1.66, base[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>天平读数</small>{reading(w.on, w.rider).toFixed(1)} g</> },
    { id: 'o', at: [pl[0], pl[1] + 0.52, pl[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${thing.name}${changed && settled ? `（${thing.to}）` : ''}` },
    { id: 'b', at: [box[0], TOP + 0.62, box[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '砝码盒' },
  ]
  return (
    <LabShell title="质量与密度" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={thing.name}
      stage={<Room at={site === SITE.yard ? 'yard' : 's1'} labels={labels}>
        <Balance at={base} left={thing.m} right={reading(w.on, w.rider)} rider={w.rider} live={live} kick={kick}
          leftPan={kind === 'shape' ? <Clay flat={flat} /> : kind === 'state' ? <IceCup melt={melt} water={WATER_H} /> : <Block kind="al" size={[5, 2, 2]} />} />
        <WeightSet box={box} base={base} on={w.on} live={live} snap={`${kind}${site.x}`} />
      </Room>}
      lesson={<LessonBlock no="1" title="质量是什么" concept="质量不随形状、状态、位置改变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物体所含物质的多少叫<b className="text-white">质量</b>，用 m 表示。单位是千克（kg），常用的还有克（g）、毫克（mg）、吨（t）。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>1 t = 1000 kg，1 kg = 1000 g，1 g = 1000 mg</li>
            <li>橡皮泥捏成什么样，里面的橡皮泥还是那么多</li>
            <li>{ICE_M} g 冰的体积是 {volumeOf('ice', ICE_M)} cm³，化成水只有 {volumeOf('water', ICE_M)} cm³：体积变了，质量还是 {ICE_M} g</li>
            <li>把物体从一个地方拿到另一个地方，它的质量也不变</li>
          </ul>
          <p className="mt-3">质量是物体本身的一种属性。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三次都称过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">质量不随形状、状态、位置改变</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">压扁、熔化、换地方，天平上的砝码和游码一次都没有动。质量是物体本身的属性。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{thing.name}的质量</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{reading(w.on, w.rider).toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="砝码" value={`${w.sum} g`} unit={weightsText(w.on)} />
            <ParamTile symbol="游码" value={`${w.rider.toFixed(1)} g`} unit="标尺上的示数" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">指针和标尺</h2>
          <BalanceView t={0} rider={w.rider} />
          <h2 className="mt-4 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每改变一样，等天平停稳，按“记录”。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">物体</th><th className="font-normal">变化</th><th className="text-right font-normal">之前</th><th className="text-right font-normal">之后</th></tr></thead>
                <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{THINGS[k].name}</td><td className="text-white/80">{THINGS[k].from} → {THINGS[k].to}</td><td className="text-right tabular-nums">{THINGS[k].m} g</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{THINGS[k].m} g</td></tr>)}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'change'} onClick={change} disabled={changed}>{thing.act}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!changed || !settled || dup}>记录</LabButton>
      </>}
      extras={<Control label="改变什么"><Segmented label="改变什么" pulse={next === 'kind'} want={next === 'kind' ? task!.id as ThingKey : null} value={kind} onChange={setKind} options={KEYS.map(k => ({ value: k, label: SEG[k] }))} /></Control>}
    />
  )
}
