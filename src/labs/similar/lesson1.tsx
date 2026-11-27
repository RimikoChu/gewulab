// 相似和测量 · 第 1 课 放大和缩小：篮球场上用四根彩色木条拼一个四边形 ABCD，旁边按三种做法拼一个新的：放大 1.5 倍、放大 2 倍、只把横向拉长一倍。
// 量四条边和四个角：前两种角都不变、边都成同一个比，是相似图形；第三种角变了，不相似。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Basketball, Clipboard, Place, SIDE, ease, spot, useRun, Tape } from './parts'
import { Figure, angleLabels, onPlane, sideLabels, vertexLabels } from './figure'
import { QUAD, SCALE1, compare1, f2, quadOf, type P2, type Scale1 } from './physics'
import { ST } from './world'

const KEYS = Object.keys(SCALE1) as Scale1[]
const C1 = Object.fromEntries(KEYS.map(k => [k, compare1(k)])) as Record<Scale1, ReturnType<typeof compare1>>
const TASKS: Task[] = [
  { id: 'k15', text: '放大 1.5 倍：拼出来，量边和角', note: '四个角都没变，每条边都是原来的 1.5 倍' },
  { id: 'k2', text: '放大 2 倍：再拼一个、量一次', note: '角还是不变，边都是原来的 2 倍：相似比 2' },
  { id: 'wide', text: '只把横向拉长一倍：它和原来相似吗', note: '角变了，各边的比也不一样：不相似' },
]
const GAP = 1.7                     // 新图形放在原图右边多远（m）
const O: [number, number, number] = [ST.l1.x - 1.9, 0.022, ST.l1.z + 0.3]
const at = onPlane(O)
const NAMES = ['A', 'B', 'C', 'D'], NAMES2 = ["A'", "B'", "C'", "D'"]

export default function Lesson1() {
  const [k, setK] = useState<Scale1>('k15')
  const [rows, setRows] = useState<Scale1[]>([])
  const T = useTasks('gewu:similar:1', TASKS)
  const build = useRun(2.4), meas = useRun(1.8)
  const c = C1[k], built = build.k >= 1, measured = meas.k >= 1, recorded = rows.includes(k)
  const pick = (v: Scale1) => { if (build.busy || meas.busy) return; setK(v); build.snap(0); meas.snap(0) }
  const record = () => { if (!measured || recorded) return; const n = [...rows, k]; setRows(n); T.check(id => n.includes(id as Scale1)) }
  const resetAll = () => { setK('k15'); setRows([]); build.snap(0); meas.snap(0); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'k' | 'build' | 'meas' | 'rec' | null } = (() => {
    if (!task) return { hint: '形状相同的图形：对应角相等，对应边成比例。', next: null }
    if (k !== task.id) return { hint: `换成“${SCALE1[task.id as Scale1].name}”`, next: 'k' }
    if (build.busy) return { hint: '照着原图拼新图形…', next: null }
    if (!built) return { hint: `${SCALE1[k].name}，在旁边拼出新的四边形`, next: 'build' }
    if (meas.busy) return { hint: '量边和角…', next: null }
    if (!measured) return { hint: '量一量两个图形的四条边和四个角', next: 'meas' }
    return { hint: c.similar ? `四个角都没变，四条边都是原来的 ${c.k} 倍：记下来` : '角变了，四条边的比也不一样：记下来', next: 'rec' }
  })()

  // 新图形：从原图的样子慢慢变成新的
  const pts = useMemo<P2[]>(() => { const e = ease(build.k), q = quadOf(k); return QUAD.map(([x, y], i) => [GAP + x + (q[i][0] - x) * e, y + (q[i][1] - y) * e]) }, [k, build.k])
  const ap = Math.min(1, meas.k * 1.6), bp = Math.max(0, meas.k * 1.6 - 0.6)
  const view = useMemo(() => { const q = quadOf(k); return spot(O[0] + (GAP + q[1][0]) / 2, 0.1, O[2] - 1.0, GAP + q[1][0] + 0.4, 1.8, -0.3, 0.38) }, [k])
  const labels: Label[] = [
    ...sideLabels('o', QUAD, at, i => `${f2(c.s0[i])} m`, ap),
    ...angleLabels('o', QUAD, at, i => `${Math.round(c.a0[i])}°`, ap),
    ...sideLabels('n', pts, at, i => `${f2(c.s1[i])} m`, bp),
    ...angleLabels('n', pts, at, i => `${Math.round(c.a1[i])}°`, bp),
    ...vertexLabels('o', QUAD, at, NAMES),
    ...(built ? vertexLabels('n', pts, at, NAMES2) : []),
  ]
  const ab0 = at(0, -0.09, 0), ab1 = at(GAP, -0.09, 0)
  return (
    <LabShell title="相似和测量" lessons={LESSONS} current="1" narration={voiced(NARRATION['1'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="木条和卷尺"
      stage={<Place view={view} labels={labels} elev={55}>
        <Basketball at={at(1.45, 1.15, 0.021)} />
        <Clipboard at={at(-0.5, -0.45, 0.021)} yaw={0.3} />
        <Figure pts={QUAD} at={at} arcs={ap} />
        {build.k > 0 && <Figure pts={pts} at={at} arcs={bp} />}
        {/* 卷尺沿着底边量过去 */}
        {meas.k > 0 && <Tape a={ab0} b={[ab0[0] + (QUAD[1][0]) * Math.min(1, meas.k * 1.6), ab0[1], ab0[2]]} />}
        {meas.k > 0.6 && <Tape a={ab1} b={[ab1[0] + (pts[1][0] - GAP) * Math.min(1, (meas.k - 0.6) * 2.5), ab1[1], ab1[2]]} />}
      </Place>}
      lesson={<LessonBlock no="1" title="放大和缩小" concept="形状相同：对应角相等，对应边成比例" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>形状相同的图形叫<b className="text-white">相似图形</b>。照片放大、地图缩小，得到的都是和原来相似的图形。</p>
          <p className="mt-3">两个多边形相似：<b className="text-white">对应角相等，对应边成比例</b>。对应边的比叫<b className="text-white">相似比</b>。</p>
          <p className="mt-3">只有角相等不够（长方形和正方形的角都是 90°，却不相似）；只有边成比例也不够。两条要同时满足。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">放大、缩小，形状不变：对应角相等，对应边成比例</p>
        <p className="mt-1 text-[14px] text-white/70">放大 1.5 倍、2 倍，相似比就是 1.5、2；只拉长一个方向，角变了，就不相似了。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">新边 ÷ 原边</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight tabular-nums">{measured ? (c.similar ? `都是 ${c.k}` : '不一样') : '—'}</div>
          </div>
          <table className="mt-4 w-full text-[14px] tabular-nums">
            <thead><tr className="text-white/55"><th className="py-1 text-left font-normal">边</th><th className="font-normal">原来</th><th className="font-normal">新的</th><th className="font-normal">比</th></tr></thead>
            <tbody>{NAMES.map((nm, i) => <tr key={i} className={measured ? 'text-white' : 'text-white/35'}>
              <td className="py-1"><span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: SIDE[i] }} />{nm}{NAMES[(i + 1) % 4]}</td>
              <td className="text-center">{f2(c.s0[i])}</td><td className="text-center">{measured ? f2(c.s1[i]) : '—'}</td><td className="text-center">{measured ? f2(c.ratios[i]) : '—'}</td>
            </tr>)}</tbody>
          </table>
          <h2 className="mt-4 text-[12.5px] text-white/55">四个角（原来 → 新的）</h2>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center text-[14px] tabular-nums">
            {NAMES.map((nm, i) => <div key={i} className="rounded-lg bg-white/8 px-1 py-1.5"><div className="text-[12px] text-white/55">∠{nm}</div><div>{Math.round(c.a0[i])}°</div><div className={measured && !c.sameAngles ? 'text-[#ffb27a]' : ''}>{measured ? `${Math.round(c.a1[i])}°` : '—'}</div></div>)}
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
          <div className="mt-1.5 flex flex-col gap-1 text-[14px]">{KEYS.map(x => <div key={x} className={rows.includes(x) ? 'text-white' : 'text-white/30'}>{SCALE1[x].name}：{rows.includes(x) ? (C1[x].similar ? `相似，相似比 ${C1[x].k}` : '不相似') : '—'}</div>)}</div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'build'} onClick={build.run} disabled={build.busy || built}>拼出新图形</LabButton>
        <LabButton pulse={next === 'meas'} onClick={meas.run} disabled={!built || meas.busy || measured}>量边和角</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!measured || recorded}>记录数据</LabButton>
      </>}
      extras={<Control label="新图形怎么拼"><Segmented label="怎么拼" pulse={next === 'k'} want={next === 'k' ? task!.id as Scale1 : null} disabled={build.busy || meas.busy} value={k} onChange={pick} options={KEYS.map(x => ({ value: x, label: SCALE1[x].name }))} /></Control>}
    />
  )
}
