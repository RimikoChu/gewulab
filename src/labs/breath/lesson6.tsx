// 呼吸 · 第 6 课 肺泡里的气体交换：推近到一段肺泡壁。让血流过，看橙色的氧从肺泡穿过两层细胞进到红细胞里、红细胞由蓝变红；
// 换成看灰紫色的二氧化碳，它反过来走；数一数要穿过几层细胞；最后屏住呼吸，看肺泡里的氧变少后交换为什么变慢。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { GAS, bloodAlong, gasDir, layersToCross, type GasKey } from './physics'
import { WALL_AT, at } from './world'
import { WALL } from './alveoli'
import type { V3 } from './sdf'

const TASKS: Task[] = [
  { id: 'o2', text: '让血流过，看氧往哪里走', note: '肺泡里的氧多、血液里的少，氧从肺泡扩散进血液，静脉血变成动脉血' },
  { id: 'co2', text: '换成看二氧化碳', note: '血液里的二氧化碳多、肺泡里的少，二氧化碳从血液扩散进肺泡' },
  { id: 'layers', text: '数一数要穿过几层细胞', note: `肺泡壁一层、毛细血管壁一层，一共 ${layersToCross()} 层，所以交换得很快` },
  { id: 'hold', text: '屏住呼吸，看交换为什么变慢', note: '不换新鲜空气，肺泡里的氧变少，两边差得少了，进到血里的氧也少了' },
]
const NAME: Record<GasKey, string> = { o2: '氧', co2: '二氧化碳' }

export default function Lesson6() {
  const [flow, setFlow] = useState(false)
  const [gas, setGas] = useState<GasKey>('o2')
  const [layers, setLayers] = useState(false)
  const T = useTasks('gewu:breath:6', TASKS)
  const hold = useRun(3.5, () => setTimeout(() => T.check(id => id === 'hold'), 1500))
  useEffect(() => { if (!flow) return; const t = setTimeout(() => T.check(id => id === gas), 4200); return () => clearTimeout(t) }, [flow, gas])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!layers) return; const t = setTimeout(() => T.check(id => id === 'layers'), 2600); return () => clearTimeout(t) }, [layers])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setFlow(false); setGas('o2'); setLayers(false); hold.snap(0); T.reset() }
  const task = T.current
  const want: GasKey | null = task?.id === 'co2' && gas !== 'co2' ? 'co2' : task?.id === 'o2' && gas !== 'o2' ? 'o2' : null
  const { hint, next }: { hint: string; next: 'flow' | 'gas' | 'layers' | 'hold' | null } = !task ? { hint: '气体总是从含量高的地方扩散到含量低的地方。血液流经肺泡，静脉血变成动脉血。', next: null }
    : want ? { hint: `把“看哪种气”换成“${NAME[want]}”`, next: 'gas' }
    : task.id === 'o2' || task.id === 'co2' ? (flow ? { hint: `看：${NAME[gas]}从${gasDir(gas).replace(' → ', '到')}…`, next: null } : { hint: '上面是肺泡里的空气，下面是一根剖开的毛细血管。按“让血流过”', next: 'flow' })
    : task.id === 'layers' ? (layers ? { hint: '一层，两层…', next: null } : { hint: '氧要穿过几层细胞？按“数细胞层数”', next: 'layers' })
    : hold.busy || hold.k > 0.99 ? { hint: '屏住呼吸：肺泡里的氧越来越少…', next: null } : { hint: '如果一直不换新鲜空气呢？按“屏住呼吸”', next: 'hold' }
  const h = hold.k
  const inV = bloodAlong(gas, 0, h), outV = bloodAlong(gas, 1, h), alvV = gas === 'o2' ? GAS.o2.alv - 0.45 * h : GAS.co2.alv + 0.05 * h
  const Y = WALL.capY
  const labels: Label[] = [
    { id: 'air', at: at(WALL_AT, [0, 1.35, 0]), ax: 0.5, className: 'scene-name -translate-y-1/2', children: '肺泡里的空气' },
    { id: 'aw', at: at(WALL_AT, [-0.75, 0.16, 0.1]), ax: 0.5, className: `scene-tag ${layers ? 'key' : ''} -translate-y-full`, children: layers ? <><small>1</small>肺泡壁 · 一层细胞</> : '肺泡壁' },
    { id: 'cw', at: at(WALL_AT, [0.75, Y - WALL.capR - 0.05, 0.1]), ax: 0.5, className: `scene-tag ${layers ? 'key' : ''}`, children: layers ? <><small>2</small>毛细血管壁 · 一层细胞</> : '毛细血管壁' },
    { id: 'rb', at: at(WALL_AT, [0.1, Y + 0.05, 0.3]), ax: 0.5, className: 'scene-name -translate-y-1/2', name: true, children: '红细胞' },
    { id: 'in', at: at(WALL_AT, [-1.45, Y - WALL.capR - 0.05, 0.1]), ax: 0.5, className: 'scene-tag', children: <><small>流进来</small><span className="text-[#2f55b5]">静脉血</span></> },
    { id: 'out', at: at(WALL_AT, [1.55, 0.16, 0.1]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>流出去</small><span className="text-[#c0392b]">{flow ? '动脉血' : '—'}</span></> },
    { id: 'mag', at: at(WALL_AT, [0, -1.95, 0]), ax: 0.5, className: 'scene-name', name: true, children: '肺泡壁 · 放大的示意' },
  ]
  const bar = (v: number, max: number) => `${Math.round(100 * v / max)}%`
  const max = gas === 'o2' ? 1 : 0.5
  return (
    <LabShell title="呼吸" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['6'], VOICE)} actionsLabel="气体交换"
      stage={<Place at="wall" labels={labels} want={{ wall: { gas: flow ? gas : null, flow, hold: h } }} />}
      lesson={<LessonBlock no="6" title="肺泡里的气体交换" concept="气体从含量高的地方扩散到含量低的地方" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>肺泡里的气体和血液之间进行交换，靠的是<b className="text-white">气体的扩散作用</b>：一种气体总是由含量高的地方向含量低的地方扩散，直到平衡为止。</p>
          <p className="mt-3">吸进肺泡的空气里，氧的含量比血液里高，氧就穿过肺泡壁和毛细血管壁进入血液，和红细胞里的血红蛋白结合；血液里二氧化碳的含量比肺泡里高，二氧化碳就进入肺泡，随呼气排出。血液流经肺泡后，由含氧少的<b className="text-white">静脉血</b>变成含氧多的<b className="text-white">动脉血</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">含量条只表示多少的比较，不是测得的数；小球只表示气体往哪里走，个数不代表多少。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">氧和二氧化碳都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">氧从肺泡进入血液，二氧化碳从血液进入肺泡，静脉血变成动脉血</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">两种气体都从含量高处向含量低处扩散，只隔着两层细胞。不停地吸进新鲜空气，才能保持这个差。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[gas]}往哪里走</div>
            <div className="mt-1 text-[28px] leading-tight font-bold">{gasDir(gas)}</div>
            <div className="mt-1 text-[13px] text-white/60">要穿过 {layers || T.done.layers ? `${layersToCross()} 层细胞` : '几层细胞？'}</div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">{NAME[gas]}的含量（相对多少，示意）</h2>
          <div className="mt-2 flex flex-col gap-2 text-[13.5px]">
            {([['肺泡里', alvV, gas === 'o2' ? '#ff9b2f' : '#a493d6'], ['流进来的血', inV, '#5b78c8'], ['流出去的血', flow ? outV : inV, '#d94550']] as [string, number, string][]).map(([n, v, c]) => <div key={n}>
              <div className="flex justify-between text-white/70"><span>{n}</span></div>
              <div className="mt-1 h-2.5 rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: bar(v, max), background: c }} /></div>
            </div>)}
          </div>
          {h > 0.01 && <p className="hint-in mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/70">屏住呼吸：肺泡里的氧一直被血液带走，又没有新鲜空气补进来，两边的差变小，流出去的血里氧也少了。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'flow'} pulse={next === 'flow'} onClick={() => setFlow(true)} disabled={flow}>让血流过</LabButton>
        <LabButton primary={next === 'layers'} pulse={next === 'layers'} onClick={() => setLayers(true)} disabled={layers || !T.done.co2}>数细胞层数</LabButton>
        <LabButton primary={next === 'hold'} pulse={next === 'hold'} onClick={() => { setGas('o2'); hold.run(1, 0) }} disabled={!T.done.layers || hold.busy || h > 0.99}>屏住呼吸</LabButton>
      </>}
      extras={
        <Control label="看哪种气">
          <Segmented label="看哪种气" pulse={next === 'gas'} want={want} value={gas} onChange={k => setGas(k as GasKey)} options={(['o2', 'co2'] as GasKey[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
