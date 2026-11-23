// 血液循环 · 第 7 课 在哪里换了气：推近到肺泡和肌肉旁边的两个放大模型。让血流过，看橙色的氧、灰紫色的二氧化碳往哪里走，
// 血在哪里由蓝变红、由红变蓝；最后对比吸入和呼出的气体。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useRef, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { AIR, BLOOD, EXCHANGE, type ExKey } from './physics'
import { ALV_CAP, TIS_CAP } from './zoom'
import { ALV_AT, TIS_AT } from './world'
import type { V3 } from './sdf'

const TASKS: Task[] = [
  { id: 'lung', text: '在肺泡处让血流过，看氧和二氧化碳往哪里走', note: '肺泡里的氧进入血液，血液里的二氧化碳进入肺泡：静脉血变成动脉血' },
  { id: 'tissue', text: '换到组织处，再让血流过', note: '血液里的氧进入组织细胞，细胞产生的二氧化碳进入血液：动脉血变成静脉血' },
  { id: 'air', text: '对比吸入和呼出的气体', note: `呼出的气体里氧从 ${AIR.in.o2}% 降到 ${AIR.out.o2}%，二氧化碳从 ${AIR.in.co2}% 升到 ${AIR.out.co2}%` },
]
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

export default function Lesson7() {
  const [site, setSite] = useState<ExKey>('lung')
  const [on, setOn] = useState(false)
  const [air, setAir] = useState(false)
  const T = useTasks('gewu:blood:7', TASKS)
  const timer = useRef(0)
  const run = () => { if (on) return; setOn(true); const here = site; timer.current = window.setTimeout(() => T.check(id => id === here), 5200) }
  const pick = (k: ExKey) => { clearTimeout(timer.current); setSite(k); setOn(false) }
  const resetAll = () => { clearTimeout(timer.current); setSite('lung'); setOn(false); setAir(false); T.reset() }
  const task = T.current
  const want: ExKey | null = task?.id === 'tissue' && site !== 'tissue' ? 'tissue' : task?.id === 'lung' && site !== 'lung' ? 'lung' : null
  const ex = EXCHANGE[site]
  const { hint, next }: { hint: string; next: 'run' | 'site' | 'air' | null } = !task ? { hint: '气体总是从多的地方扩散到少的地方：在肺泡处，血液得到氧；在组织处，血液交出氧。', next: null }
    : want ? { hint: `把地方换成“${EXCHANGE[want].name}”`, next: 'site' }
    : task.id === 'air' ? { hint: '按“对比吸入和呼出的气体”', next: 'air' }
    : on ? { hint: `看：氧从${ex.o2.from}到${ex.o2.to}，二氧化碳从${ex.co2.from}到${ex.co2.to}…`, next: null }
    : { hint: site === 'lung' ? '一串肺泡，外面缠着毛细血管。按“让血流过”' : '一根毛细血管穿过一片肌肉细胞。按“让血流过”', next: 'run' }
  const at = site === 'lung' ? ALV_AT : TIS_AT, cap = site === 'lung' ? ALV_CAP : TIS_CAP
  const inP = cap.getPointAt(0.04), outP = cap.getPointAt(0.97)
  const labels: Label[] = [
    { id: 'in', at: add(at, [inP.x, inP.y - 0.25, inP.z]), ax: 0.5, className: 'scene-tag -translate-y-0', children: <><small>流进来</small><span className={ex.before === 'artery' ? 'text-[#c0392b]' : 'text-[#2f55b5]'}>{BLOOD[ex.before].name}</span></> },
    { id: 'out', at: add(at, [outP.x, outP.y + 0.25, outP.z]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>流出去</small><span className={ex.after === 'artery' ? 'text-[#c0392b]' : 'text-[#2f55b5]'}>{on ? BLOOD[ex.after].name : '—'}</span></> },
    ...(site === 'lung' ? [
      { id: 'a', at: add(at, [0.1, 0.95, 0.3]), ax: 0.5, className: 'scene-name -translate-y-full', children: '肺泡' },
      { id: 'br', at: add(at, [-1.9, 1.6, -0.4]), ax: 0.5, className: 'scene-name -translate-y-full', children: '通到支气管' },
    ] : [
      { id: 'c', at: add(at, [0.6, 1.5, 0]), ax: 0.5, className: 'scene-name -translate-y-full', children: '组织细胞（肌肉细胞）' },
    ]),
    ...(on ? [
      { id: 'o2', at: add(at, site === 'lung' ? [-0.7, 0.2, 0.9] : [-0.4, 0.55, 0.9]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><span className="mr-1.5 inline-block size-3 rounded-full bg-[#ff9b2f] align-[-1px]" />氧 → {ex.o2.to}</> },
      { id: 'co2', at: add(at, site === 'lung' ? [0.75, -0.35, 0.9] : [0.5, -0.6, 0.9]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><span className="mr-1.5 inline-block size-3 rounded-full bg-[#a493d6] align-[-1px]" />二氧化碳 → {ex.co2.to}</> },
    ] : []),
    { id: 'mag', at: add(at, [0, -2.25, 0]), ax: 0.5, name: true, className: 'scene-name', children: '放大的示意' },
  ]
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="气体交换"
      stage={<Place at={site === 'lung' ? 'lung' : 'tissue'} labels={labels} want={{ look: { shell: 0.6, lungs: 0.5, tree: 1 }, gas: { lung: on && site === 'lung', tissue: on && site === 'tissue' } }} />}
      lesson={<LessonBlock no="7" title="在哪里换了气" concept="气体总是从多的地方扩散到少的地方" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">肺泡处</b>：肺泡里的氧比血液里多，氧扩散进血液；血液里的二氧化碳比肺泡里多，二氧化碳扩散进肺泡。肺泡壁和毛细血管壁都只有一层上皮细胞，气体很容易穿过。血液流过这里，静脉血变成动脉血。</p>
          <p className="mt-3"><b className="text-white">组织处</b>：血液里的氧比组织细胞里多，氧扩散进细胞；细胞进行呼吸作用产生的二氧化碳扩散进血液。血液流过这里，动脉血变成静脉血。</p>
          <p className="mt-3">细胞得到的氧，用来分解有机物、释放能量，供生命活动需要。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两处的气体交换都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">在肺泡处，静脉血变成动脉血；在组织处，动脉血变成静脉血</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">两处都靠气体扩散：从多的一侧到少的一侧。所以呼出的气体里氧变少、二氧化碳变多。</p>
          <p className="mt-2 text-[12.5px] text-white/50">两个模型都是放大的示意；小球只表示气体往哪里走，个数不代表多少。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{ex.name}</div>
            <div className="mt-1 text-[26px] leading-tight font-bold tracking-tight">{BLOOD[ex.before].name} → {on ? BLOOD[ex.after].name : '…'}</div>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-[13.5px]">
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><span className="mr-2 inline-block size-3 rounded-full bg-[#ff9b2f]" />氧：{ex.o2.from}里多，{ex.o2.to}里少<div className="mt-0.5 font-semibold text-white">{ex.o2.from} → {ex.o2.to}</div></div>
            <div className="rounded-xl bg-white/8 px-3 py-2.5"><span className="mr-2 inline-block size-3 rounded-full bg-[#a493d6]" />二氧化碳：{ex.co2.from}里多，{ex.co2.to}里少<div className="mt-0.5 font-semibold text-white">{ex.co2.from} → {ex.co2.to}</div></div>
          </div>
          {air && <>
            <h2 className="hint-in mt-4 text-[12.5px] text-white/55">吸入和呼出的气体（体积分数）</h2>
            <table className="hint-in mt-2 w-full text-center text-[13.5px] tabular-nums">
              <thead><tr className="text-white/55"><th className="pb-1 font-medium" /><th className="pb-1 font-medium">吸入</th><th className="pb-1 font-medium">呼出</th></tr></thead>
              <tbody>
                <tr className="bg-white/[0.06]"><td className="rounded-l-lg py-1.5 text-white/70">氧</td><td>{AIR.in.o2}%</td><td className="rounded-r-lg font-semibold">{AIR.out.o2}%</td></tr>
                <tr className="bg-white/[0.06]"><td className="rounded-l-lg py-1.5 text-white/70">二氧化碳</td><td>{AIR.in.co2}%</td><td className="rounded-r-lg font-semibold">{AIR.out.co2}%</td></tr>
              </tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'run'} pulse={next === 'run'} onClick={run} disabled={on}>让血流过</LabButton>
        <LabButton primary={next === 'air'} pulse={next === 'air'} onClick={() => { setAir(true); T.check(id => id === 'air') }} disabled={air || !T.done.tissue}>对比吸入和呼出的气体</LabButton>
      </>}
      extras={
        <Control label="在哪里">
          <Segmented label="在哪里" pulse={next === 'site'} want={want} value={site} onChange={k => pick(k as ExKey)} options={(['lung', 'tissue'] as ExKey[]).map(k => ({ value: k, label: EXCHANGE[k].name }))} />
        </Control>
      }
    />
  )
}
