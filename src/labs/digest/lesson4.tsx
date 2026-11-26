// 消化和吸收 · 第 4 课 胃里的消化：右边展台上放大的胃。剖开看胃壁的皱襞；让胃蠕动，食物和胃液搅成食糜，蛋白质被初步分解；
// 最后打开幽门，食糜一小股一小股进入十二指肠。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { MACRO, leftAfter, proteinInStomach, type Macro } from './physics'
import { stW } from './stomach'
import { Bars } from './bars'

const TASKS: Task[] = [
  { id: 'cut', text: '剖开胃，看胃壁上的皱襞', note: '胃壁内表面有许多皱襞，胃壁里有胃腺' },
  { id: 'churn', text: '让胃蠕动：食物和胃液混合', note: '胃液里的胃蛋白酶把蛋白质初步分解' },
  { id: 'pylorus', text: '打开幽门，食糜进入小肠', note: '食糜一小股一小股地进入十二指肠' },
]

export default function Lesson4() {
  const T = useTasks('gewu:digest:4', TASKS)
  const cut = useRun(2.4, () => T.check(id => id === 'cut'))
  const churn = useRun(7.5, () => T.check(id => id === 'churn'))
  const pyl = useRun(4.5, () => T.check(id => id === 'pylorus'))
  const busy = cut.busy || churn.busy || pyl.busy
  const resetAll = () => { cut.snap(0); churn.snap(0); pyl.snap(0); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'cut' | 'churn' | 'pyl' | null } = !task ? { hint: '胃能暂时储存食物，胃液能初步分解蛋白质。', next: null }
    : cut.busy ? { hint: '正在剖开…', next: null }
    : churn.busy ? { hint: '胃在蠕动，胃腺分泌胃液，食物越搅越碎…', next: null }
    : pyl.busy ? { hint: '幽门打开了…', next: null }
    : cut.k < 1 ? { hint: '胃壁挡着，看不见里面。把胃剖开', next: 'cut' }
    : churn.k < 1 ? { hint: '胃里是刚吃下的瘦肉和馒头。让胃蠕动起来', next: 'churn' }
    : { hint: '食物成了糊状的食糜，蛋白质被初步分解。打开幽门', next: 'pyl' }
  const left: Record<Macro, number> = { starch: leftAfter('starch', 'B'), protein: proteinInStomach(churn.k), fat: leftAfter('fat', 'C') }
  const opened = cut.k >= 1
  const labels: Label[] = [
    { id: 'eso', at: stW([0.3, 11.78, -0.13]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>连着</small>食道</> },
    { id: 'pyl', at: stW([-0.06, 10.56, 0.26]), ax: 1, className: `scene-tag ${pyl.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>出口</small>幽门</> },
    ...(opened ? [
      { id: 'fold', at: stW([0.95, 11.3, -0.02]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>胃壁内表面</small>皱襞</> },
      { id: 'gland', at: stW([1.12, 10.85, 0.05]), ax: 0, className: `scene-tag ${churn.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>胃壁里</small>胃腺 → 胃液</> },
      { id: 'wall', at: stW([0.88, 11.62, -0.1]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>剖面</small>发达的肌肉层</> },
    ] as Label[] : [{ id: 'n', at: stW([1.15, 11.4, 0.1]), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '放大的胃 · 示意' } as Label]),
    ...(pyl.k > 0 ? [{ id: 'duo', at: stW([-0.6, 10.3, 0.0]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>小肠的起始段</small>十二指肠</> } as Label] : []),
  ]
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="放大的胃"
      stage={<Place at="st" labels={labels} want={{ st: { cut: cut.k, churn: churn.k, chyme: churn.k, pylorus: pyl.busy ? 1 : pyl.k >= 1 ? 0.3 : 0 } }} />}
      lesson={<LessonBlock no="4" title="胃里的消化" concept="胃液把蛋白质初步分解" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>胃是消化道中最膨大的部分，能暂时储存食物。胃壁有发达的肌肉层，收缩时胃蠕动，把食物和胃液充分混合，磨成糊状的食糜。</p>
          <p className="mt-3">胃壁内的胃腺分泌胃液。胃液里有盐酸和<b className="text-white">胃蛋白酶</b>，能把蛋白质初步分解。淀粉、脂肪在胃里基本不被消化。</p>
          <p className="mt-3">胃的出口是幽门。食糜一小股一小股地经幽门进入十二指肠。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">食糜进入了小肠</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">胃液把蛋白质初步分解</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">胃蠕动把食物和胃液混成食糜；胃里只初步分解蛋白质，淀粉、脂肪基本不变。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">胃液</div>
            <div className="mt-1 text-[22px] leading-tight font-bold">盐酸 + 胃蛋白酶</div>
          </div>
          <h2 className="mt-4 text-[13px] text-white/60">还没被消化的（示意）</h2>
          <Bars left={left} hl={churn.busy || churn.k >= 1 ? 'protein' : null} />
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13px] leading-relaxed text-white/70">{churn.k >= 1 ? `${MACRO.protein.name}被初步分解；${MACRO.starch.name}、${MACRO.fat.name}在胃里基本不变。` : '淀粉在口腔里已有一部分被分解，蛋白质、脂肪还没动。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'cut'} pulse={next === 'cut'} onClick={() => cut.run()} disabled={busy || cut.k > 0}>剖开胃</LabButton>
        <LabButton primary={next === 'churn'} pulse={next === 'churn'} onClick={() => churn.run()} disabled={busy || cut.k < 1 || churn.k > 0}>胃蠕动</LabButton>
        <LabButton primary={next === 'pyl'} pulse={next === 'pyl'} onClick={() => pyl.run()} disabled={busy || churn.k < 1 || pyl.k > 0}>打开幽门</LabButton>
      </>}
      extras={null}
    />
  )
}
