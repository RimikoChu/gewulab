// 遗传和变异 · 第 6 课 人的性别遗传：看片灯上排好了人的 23 对染色体，男女各看一次，找出那一对性染色体；
// 再用两袋围棋子模拟精子和卵细胞随机结合（精子袋黑白各 10 枚，卵细胞袋白棋子 20 枚，摸后放回），摸满 50 次。
import { useEffect, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun } from './parts'
import { BAGS, CHROMOSOMES, DRAW_TOTAL, KARYOTYPE, ROUND, boys as countBoys, draws, type Sex } from './physics'
import { BAGS_AT, Bags, BOX, Karyotype, MEET, SEX_AT } from './scene6'
import { Finale, H } from './ui'
import { VOICE } from './voice'
import { Room } from './world'

const ALL = draws(DRAW_TOTAL)
const TASKS: Task[] = [
  { id: 'male', text: '看男性的染色体，找出性染色体', note: `男性：${KARYOTYPE.male.auto} 对常染色体 + ${KARYOTYPE.male.sex}` },
  { id: 'female', text: '换成女性，比一比哪一对不一样', note: `女性：${KARYOTYPE.female.auto} 对常染色体 + ${KARYOTYPE.female.sex}` },
  { id: 'ten', text: '模拟精子和卵细胞随机结合，摸 10 次', note: '每次摸出一对，记下是男还是女，再放回袋里' },
  { id: 'all', text: `一共摸满 ${DRAW_TOTAL} 次，看男孩和女孩的比例`, note: '生男生女的机会均等' },
]
const SEX_NAME: Record<Sex, string> = { male: '男性', female: '女性' }
export default function Lesson6() {
  const [sex, setSex] = useState<Sex>('male')
  const [found, setFound] = useState<Sex[]>([])
  const [target, setTarget] = useState(0)          // 要摸到第几次
  const T = useTasks('gewu:gene:6', TASKS)
  const t = useRun(target, 0.5)            // 一次 0.5 秒
  const done = Math.floor(t + 1e-6), drawing = t < target
  const shown = ALL.slice(0, done), b = countBoys(shown), g = done - b
  useEffect(() => { T.check(id => id === 'male' || id === 'female' ? found.includes(id as Sex) : id === 'ten' ? done >= ROUND : done >= DRAW_TOTAL) }, [found, done])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSex('male'); setFound([]); setTarget(0); T.reset() }
  const task = T.current
  const wantSex: Sex | null = task?.id === 'male' || task?.id === 'female' ? task.id as Sex : null
  const { hint, next }: { hint: string; next: 'sex' | 'find' | 'draw' | null } = (() => {
    if (!task) return { hint: '含 X 和含 Y 的精子数量相等，和卵细胞结合的机会也相等。', next: null }
    if (drawing) return { hint: '从两只袋里各摸一枚，记下来，再放回去…', next: null }
    if (wantSex && sex !== wantSex) return { hint: `在“看谁的”里选“${SEX_NAME[wantSex]}”`, next: 'sex' }
    if (wantSex) return { hint: `这是${SEX_NAME[sex]}体细胞里的 23 对染色体，按大小排好了。按“找出性染色体”`, next: 'find' }
    return { hint: done === 0 ? '黑棋子代表含 Y 的精子，白棋子代表含 X 的精子和卵细胞。按“摸 10 次”' : `摸了 ${done} 次。按“摸 10 次”，接着摸`, next: 'draw' }
  })()
  const onBags = !wantSex
  const cur = drawing ? { d: ALL[done], u: t - done } : null
  const labels: Label[] = onBags ? [
    { id: 's', at: [BAGS_AT.sperm[0], BAGS_AT.sperm[1] + 1.6, BAGS_AT.sperm[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>精子</small>黑 {BAGS.sperm.Y} · 白 {BAGS.sperm.X}</> },
    { id: 'e', at: [BAGS_AT.egg[0], BAGS_AT.egg[1] + 1.6, BAGS_AT.egg[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>卵细胞</small>白 {BAGS.egg.X}</> },
    ...(cur && cur.u > 0.35 && cur.u < 0.72 ? [{ id: 'r', at: [MEET[0], MEET[1] + 0.45, MEET[2]] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: cur.d.boy ? 'XY · 男' : 'XX · 女' }] : []),
  ] : [
    { id: 'lb', at: [BOX.x, BOX.y + BOX.h / 2 + 0.4, BOX.z], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{SEX_NAME[sex]}的体细胞</small>{CHROMOSOMES.human} 条 · 23 对</> },
    ...(found.includes(sex) ? [{ id: 'x', at: [SEX_AT[0] + 0.8, SEX_AT[1], SEX_AT[2]] as [number, number, number], className: 'scene-tag key translate-x-2 -translate-y-1/2', children: <><small>性染色体</small>{KARYOTYPE[sex].sex}</> }] : []),
  ]
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="性别遗传"
      stage={<Room at={onBags ? 'bags' : 'karyo'} labels={labels}>
        <Karyotype sex={sex} found={found.includes(sex)} />
        <Bags boys={b} girls={g} cur={cur} />
      </Room>}
      lesson={<LessonBlock no="6" title="人的性别遗传" concept="生男生女的机会均等" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>人的体细胞有 23 对染色体，其中 22 对男女都一样，叫常染色体；有 1 对决定性别，叫<b className="text-white">性染色体</b>。男性是 XY，女性是 XX。</p>
          <p className="mt-2">男性产生两种精子：含 X 的和含 Y 的，数量相等；女性只产生一种含 X 的卵细胞。</p>
          <p className="mt-2">含 X 的精子和卵细胞结合，受精卵是 XX，发育成女孩；含 Y 的精子和卵细胞结合，是 XY，发育成男孩。两种精子和卵细胞结合的机会相等，所以生男生女的机会均等。</p>
        </>} />}
      finale={T.finale && <Finale kicker={`摸了 ${DRAW_TOTAL} 次`} title="生男生女的机会均等" text={`男性 XY，产生含 X 和含 Y 两种精子；女性 XX，只产生含 X 的卵细胞。摸了 ${DRAW_TOTAL} 次，男孩 ${b} 次、女孩 ${g} 次，接近一半对一半；次数越多越接近。`} notes="棋子代表生殖细胞；摸出来记下以后放回袋里，袋里的比例才不变。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">性染色体</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="男性" value={found.includes('male') ? KARYOTYPE.male.sex : '—'} unit={`${KARYOTYPE.male.auto} 对 + 1 对`} />
            <ParamTile symbol="女性" value={found.includes('female') ? KARYOTYPE.female.sex : '—'} unit={`${KARYOTYPE.female.auto} 对 + 1 对`} />
          </div>
          <H>模拟：摸了 {done} 次</H>
          <div className="grid grid-cols-2 gap-2">
            <ParamTile symbol="男孩" value={done ? String(b) : '—'} unit="次 · XY" />
            <ParamTile symbol="女孩" value={done ? String(g) : '—'} unit="次 · XX" />
          </div>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10">
            <div className="bg-[#35c7b3] transition-[width]" style={{ width: `${done ? (b / done) * 100 : 0}%` }} />
            <div className="transition-[width]" style={{ background: '#ffb84a', width: `${done ? (g / done) * 100 : 0}%` }} />
          </div>
          <div className="mt-1.5 text-center text-[13px] text-white/65 tabular-nums">{done ? `男孩占 ${Math.round((b / done) * 100)}%` : '还没摸'}</div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'find'} onClick={() => !found.includes(sex) && setFound([...found, sex])} disabled={!wantSex || found.includes(sex)}>找出性染色体</LabButton>
        <LabButton primary pulse={next === 'draw'} onClick={() => setTarget(n => Math.min(DRAW_TOTAL, n + ROUND))} disabled={!!wantSex || drawing || target >= DRAW_TOTAL}>摸 {ROUND} 次</LabButton>
      </>}
      extras={<Control label="看谁的"><Segmented label="看谁的" pulse={next === 'sex'} want={next === 'sex' ? wantSex : null} value={sex} onChange={v => { if (!drawing) setSex(v) }} options={[{ value: 'male', label: '男性' }, { value: 'female', label: '女性' }]} /></Control>}
    />
  )
}
