// 遗传和变异 · 第 1 课 性状和相对性状：两块亲代豆畦并排，一畦高茎、一畦矮茎。换着比三对性状：茎的高矮、种子的形状、花的颜色；最后判断一个反例。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { HEIGHT, TRAITS, TRAIT_KEYS, isRelative, type TraitKey } from './physics'
import { STAFF_AT, Staffs, TableSamples } from './scene1'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room, TABLE1 } from './world'

const TASKS: Task[] = [
  { id: 'stem', text: '比一比高茎和矮茎的株高', note: `高茎约 ${HEIGHT.tall} m，矮茎约 ${HEIGHT.short} m` },
  { id: 'seed', text: '换成“种子的形状”，剥开豆荚比一比', note: '圆粒饱满光滑，皱粒表面皱缩' },
  { id: 'flower', text: '换成“花的颜色”，比一比两枝花', note: '紫花和白花是一对相对性状' },
  { id: 'judge', text: '判断：高茎和圆粒是不是一对相对性状', note: '不是：它们不是同一种性状' },
]
const PEA = '豌豆'
export default function Lesson1() {
  const [trait, setTrait] = useState<TraitKey>('stem')
  const [seen, setSeen] = useState<TraitKey[]>([])
  const [judged, setJudged] = useState(false)
  const T = useTasks('gewu:gene:1', TASKS)
  const staff = useRun(seen.includes('stem') ? 1 : 0, 1.2), pod = useRun(seen.includes('seed') ? 1 : 0, 1.4)
  useEffect(() => { T.check(id => id === 'judge' ? judged : seen.includes(id as TraitKey) && (id !== 'stem' || staff >= 1) && (id !== 'seed' || pod >= 1)) }, [seen, judged, staff >= 1, pod >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setTrait('stem'); setSeen([]); setJudged(false); T.reset() }
  const task = T.current, busy = (seen.includes('stem') && staff < 1) || (seen.includes('seed') && pod < 1)
  const want = task && task.id !== 'judge' ? task.id as TraitKey : null
  const { hint, next }: { hint: string; next: 'cmp' | 'trait' | 'judge' | null } = (() => {
    if (!task) return { hint: '同种生物同一性状的不同表现形式，叫相对性状。', next: null }
    if (busy) return { hint: trait === 'stem' ? '立起标尺…' : '剥开豆荚…', next: null }
    if (task.id === 'judge') return { hint: '高茎和圆粒，是不是一对相对性状？按“判断”', next: 'judge' }
    if (trait !== want) return { hint: `在“性状”里选“${TRAITS[want!].name}”`, next: 'trait' }
    return { hint: task.id === 'stem' ? '两畦豌豆一高一矮。按“比一比”，量一量株高' : task.id === 'seed' ? '桌上两只豆荚，里面的豆子形状不同。按“比一比”' : '两枝豌豆花，颜色不同。按“比一比”', next: 'cmp' }
  })()
  const at = trait === 'stem' ? 'beds' : 'table'
  const showStem = trait === 'stem' && staff >= 1, showSeed = trait === 'seed' && pod >= 1, showFlower = trait === 'flower' && seen.includes('flower')
  const labels: Label[] = [
    ...(showStem ? [
      { id: 'ht', at: [STAFF_AT.tall[0] + 0.4, 1.8 + HEIGHT.tall * 10, STAFF_AT.tall[2]] as [number, number, number], className: 'scene-tag key translate-x-2 -translate-y-1/2', children: <><small>高茎</small>约 {HEIGHT.tall} m</> },
      { id: 'hs', at: [STAFF_AT.short[0] + 0.4, 1.8 + HEIGHT.short * 10, STAFF_AT.short[2]] as [number, number, number], className: 'scene-tag key translate-x-2 -translate-y-1/2', children: <><small>矮茎</small>约 {HEIGHT.short} m</> },
    ] : []),
    ...(showSeed ? [
      { id: 'r', at: [TABLE1.x - 1.4, TABLE1.h + 0.3, TABLE1.z + 1.0] as [number, number, number], ax: 0.5, className: 'scene-tag key translate-y-2', children: '圆粒' },
      { id: 'w', at: [TABLE1.x + 1.4, TABLE1.h + 0.3, TABLE1.z + 1.0] as [number, number, number], ax: 0.5, className: 'scene-tag key translate-y-2', children: '皱粒' },
    ] : []),
    ...(showFlower ? [
      { id: 'p', at: [TABLE1.x - 1.3, TABLE1.h + 2.3, TABLE1.z - 0.75] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: '紫花' },
      { id: 'wf', at: [TABLE1.x + 1.3, TABLE1.h + 2.3, TABLE1.z - 0.75] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: '白花' },
    ] : []),
    ...(trait === 'stem' ? [{ id: 'n', at: [-31, 23, -20] as [number, number, number], ax: 0.5, name: true, className: 'scene-name', children: '高茎豌豆' }, { id: 'n2', at: [-14, 7.5, -20] as [number, number, number], ax: 0.5, name: true, className: 'scene-name', children: '矮茎豌豆' }] : []),
  ]
  const nFound = seen.length
  const cmp = () => { if (!seen.includes(trait)) setSeen([...seen, trait]) }
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="豌豆"
      stage={<Room at={at} labels={labels}>
        <Staffs on={staff} />
        <TableSamples open={pod} />
      </Room>}
      lesson={<LessonBlock no="1" title="性状和相对性状" concept="同一性状的不同表现，叫相对性状" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>生物体的形态结构特征、生理特性和行为方式，都叫<b className="text-white">性状</b>，比如豌豆茎的高矮、种子的形状、花的颜色。</p>
          <p className="mt-2">同种生物同一性状的不同表现形式，叫<b className="text-white">相对性状</b>：高茎和矮茎、圆粒和皱粒、紫花和白花。</p>
          <p className="mt-2">性状是由基因控制的。把大鼠生长激素基因转进小鼠的受精卵，长出的小鼠比普通小鼠大得多（转基因超级鼠）。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三对性状都比过了" title="同一性状的不同表现，叫相对性状" text="高茎和矮茎、圆粒和皱粒、紫花和白花，都是豌豆的相对性状。高茎和圆粒说的是两种性状，不是一对相对性状。" notes="两枝花是放大了画的。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">正在比</div>
            <div className="mt-1 text-[30px] leading-tight font-bold">{TRAITS[trait].name}</div>
            <div className="mt-1 text-[13.5px] text-white/70">{seen.includes(trait) ? `${TRAITS[trait].a} 和 ${TRAITS[trait].b}` : '按“比一比”'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="高茎" value={showStem || seen.includes('stem') ? `约 ${HEIGHT.tall}` : '—'} unit="m · 株高" />
            <ParamTile symbol="矮茎" value={showStem || seen.includes('stem') ? `约 ${HEIGHT.short}` : '—'} unit="m · 株高" />
          </div>
          <H>找到的相对性状 · {nFound} 对</H>
          <div className="flex flex-col gap-1.5">{TRAIT_KEYS.map(k => <Row key={k} name={TRAITS[k].name} text={seen.includes(k) ? `${TRAITS[k].a} / ${TRAITS[k].b}` : '还没比'} on={trait === k} seen={seen.includes(k)} />)}</div>
          {judged && <p className="hint-in mt-3 rounded-xl bg-white/8 px-3.5 py-3 text-[14px] leading-relaxed text-white/85">高茎和圆粒：{isRelative({ species: PEA, trait: TRAITS.stem.name, form: TRAITS.stem.a }, { species: PEA, trait: TRAITS.seed.name, form: TRAITS.seed.a }) ? '是' : '不是'}一对相对性状。一个说茎的高度，一个说种子的形状，不是同一性状。</p>}
        </Card>
      }
      actions={<>
        <LabButton primary pulse={next === 'cmp'} onClick={cmp} disabled={busy || seen.includes(trait)}>比一比</LabButton>
        <LabButton pulse={next === 'judge'} onClick={() => setJudged(true)} disabled={!!task && task.id !== 'judge'}>判断</LabButton>
      </>}
      extras={<Control label="性状"><Segmented label="性状" pulse={next === 'trait'} want={next === 'trait' ? want : null} value={trait} onChange={v => { if (!busy) setTrait(v) }} options={TRAIT_KEYS.map(k => ({ value: k, label: TRAITS[k].name }))} /></Control>}
    />
  )
}
