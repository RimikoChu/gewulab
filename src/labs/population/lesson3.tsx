// 种群和生态系统 · 第 3 课 年龄结构：观测站前的监测屏上是兔群的年龄金字塔，屏前围着一群兔（幼兔小，老兔毛色暗）。
// 换三种年龄结构，各推演 5 年：数量曲线逐年描点，兔群跟着增减。
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { RabbitHerd } from './animals'
import { BoardFace, C, axes, bar, head, line, text, type Draw } from './board'
import { useYears, upto } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { AGES, AGE_N0, AGE_YEARS, growthRate, pct, projectAge, type AgeKey } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { PADDOCK, Room, SITE, ground, onGround } from './world'

const KINDS: AgeKey[] = ['grow', 'stable', 'decline'], S = SITE.station, PER = 2, MAX = 156
const end = (k: AgeKey) => Math.round(projectAge(k, AGE_YEARS))
const sign = (v: number) => (v > 0 ? `+${pct(v)}` : v < 0 ? `−${pct(-v)}` : '0')
const TASKS: Task[] = [
  { id: 'grow', text: '增长型：推演 5 年', note: `出生率大于死亡率，${AGE_N0} 只变成 ${end('grow')} 只：种群密度会越来越大` },
  { id: 'stable', text: '稳定型：推演 5 年', note: `出生率等于死亡率，还是 ${end('stable')} 只：种群密度保持稳定` },
  { id: 'decline', text: '衰退型：推演 5 年', note: `出生率小于死亡率，只剩 ${end('decline')} 只：种群密度会越来越小` },
]
const DESC: Record<AgeKey, string> = {
  grow: '增长型：幼年个体多，老年个体少。按“推演 5 年”，看数量怎样变',
  stable: '稳定型：各年龄期的个体比例适中。按“推演 5 年”',
  decline: '衰退型：幼年个体少，老年个体多。按“推演 5 年”',
}
/** 每只兔属于哪个年龄期：按比例分，换一种年龄结构就重分一次。幼兔个头小，老兔毛色暗 */
function castOf(k: AgeKey) {
  const A = AGES[k], sizes: number[] = [], shades: number[] = []
  for (let i = 0; i < MAX; i++) { const u = (i * 0.618034) % 1 * 100; sizes.push(u < A.young ? 0.58 : 1); shades.push(u >= A.young + A.adult ? 0.62 : 1) }
  return { sizes, shades }
}

export default function Lesson3() {
  const [kind, setKind] = useState<AgeKey>('grow'), [ran, setRan] = useState<Record<string, boolean>>({})
  const Y = useYears(AGE_YEARS, 1.3), T = useTasks('gewu:population:3', TASKS)
  useEffect(() => { if (Y.done) { setRan(r => ({ ...r, [kind]: true })); T.check(id => id === kind) } }, [Y.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const A = AGES[kind], now = projectAge(kind, Y.t), yr = Math.floor(Y.t + 1e-6), cast = useMemo(() => castOf(kind), [kind])
  const choose = (k: AgeKey) => { if (Y.running) return; setKind(k); Y.clear() }
  const resetAll = () => { setKind('grow'); setRan({}); Y.clear(); T.reset() }

  const draw = useCallback<Draw>((g, W, H) => {
    // 左边：年龄金字塔，左雄右雌
    const cx = W * 0.25, top = H * 0.2, rowH = H * 0.19, full = W * 0.13
    text(g, `年龄结构 · ${A.name}`, cx, H * 0.09, { fs: 32, weight: 700, align: 'center' })
    ;([['老年', A.old], ['成年', A.adult], ['幼年', A.young]] as [string, number][]).forEach(([name, v], i) => {
      const y = top + i * (rowH + 10), w = (v / 60) * full
      bar(g, cx - w - 3, y, w, rowH, '#5cc4ff'); bar(g, cx + 3, y, w, rowH, '#ff9ab0')
      text(g, name, 18, y + rowH / 2, { fs: 25 }); text(g, `${v}%`, cx + full + 12, y + rowH / 2, { fs: 27, num: true, weight: 700 })
    })
    text(g, '雄', cx - full * 0.5, top + 3 * (rowH + 10) + 26, { fs: 26, color: '#5cc4ff', align: 'center' }); text(g, '雌', cx + full * 0.5, top + 3 * (rowH + 10) + 26, { fs: 26, color: '#ff9ab0', align: 'center' })
    // 右边：数量随时间的变化，逐年描点
    const M = axes(g, { x: W * 0.49, y: H * 0.03, w: W * 0.5, h: H * 0.94, xr: [0, AGE_YEARS], yr: [0, 320], xStep: 1, yStep: 80, xName: '时间/年', yName: '数量/只', fs: 26 })
    for (const k of KINDS) if (k !== kind && ran[k]) line(g, M, upto(AGE_YEARS).map(t => [t, projectAge(k, t)]), C.idle, { dots: true, width: 3.5, alpha: 0.55 })
    const pts = upto(yr).map(t => [t, projectAge(kind, t)] as [number, number])
    line(g, M, pts, C.rabbit, { dots: true }); head(g, M, yr, projectAge(kind, yr), C.rabbit)
  }, [A, kind, yr, ran])

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'run' | 'kind' | null } = (() => {
    if (!task) return { hint: '三种年龄结构都推演过了：看年龄结构，就能预测种群数量的变化趋势。', nx: null }
    if (Y.running) return { hint: `第 ${yr} 年…`, nx: null }
    if (kind !== task.id) return { hint: `把年龄结构换成“${AGES[task.id as AgeKey].name}”`, nx: 'kind' }
    return { hint: DESC[kind], nx: 'run' }
  })()
  const labels: Label[] = [
    { id: 'n', at: onGround(PADDOCK.x, PADDOCK.z, 1.5), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>兔</small>{Math.round(now)} 只</> },
    { id: 'per', at: onGround(...S.front(-5.2, 6.8), 0.9), name: true, className: 'scene-name -translate-y-full', children: `画面里 1 只代表 ${PER} 只` },
    { id: 'nSt', at: onGround(S.x + 9, S.z - 10, 4.6), name: true, className: 'scene-name -translate-y-full', children: '观测站' },
  ]
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={A.name}
      stage={<Room at="s3" labels={labels}>
        <group position={onGround(S.x, S.z)} rotation-y={S.az}><BoardFace w={S.w} h={S.h} lift={S.lift} draw={draw} dep={draw} /></group>
        <RabbitHerd n={Math.round(now / PER)} max={MAX} area={PADDOCK} ground={ground} scale={1.25} seed={3} lo sizes={cast.sizes} shades={cast.shades} />
      </Room>}
      lesson={<LessonBlock no="3" title="年龄结构" concept="年龄结构能预测数量的变化" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>种群密度反映了种群在一定时期的数量，但要知道数量的变化趋势，还要看种群的其他数量特征。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">出生率和死亡率</b>、迁入率和迁出率直接决定种群密度。这一课不考虑迁入和迁出，增长率 = 出生率 − 死亡率。</li>
            <li><b className="text-white">年龄结构</b>是一个种群中各年龄期的个体数目的比例，分为增长型、稳定型、衰退型，它通过影响出生率和死亡率来影响种群密度，可以用来<b className="text-white">预测</b>种群数量的变化趋势。</li>
            <li><b className="text-white">性别比例</b>是种群中雌雄个体数目的比例，它通过影响出生率来影响种群密度。用性引诱剂诱杀害虫的雄性个体，就是破坏正常的性别比例，使出生率下降。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="三种年龄结构都推演过了" title="年龄结构可以预测种群数量的变化趋势" text={`同样从 ${AGE_N0} 只开始，5 年后：增长型 ${end('grow')} 只，稳定型 ${end('stable')} 只，衰退型 ${end('decline')} 只。年龄结构通过影响出生率和死亡率，影响种群密度。`} notes="出生率、死亡率是为了算得清楚设定的，并假定 5 年里保持不变。画面里幼兔画得小，老兔毛色暗。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">增长率 = 出生率 − 死亡率</div>
            <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{sign(growthRate(kind))}<span className="ml-1 text-[15px] font-medium text-white/55">每年</span></div>
          </div>
          <H>关键参数（{A.name} · 示意）</H>
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="出生率" value={pct(A.birth)} unit="每年" />
            <ParamTile symbol="死亡率" value={pct(A.death)} unit="每年" />
            <ParamTile symbol="性别比例" value="1 : 1" unit="雌 : 雄" />
          </div>
          <H>{AGE_N0} 只兔，5 年后</H>
          <div className="flex flex-col gap-1.5">
            {KINDS.map(k => <Row key={k} name={`${AGES[k].name}（幼 ${AGES[k].young}% · 老 ${AGES[k].old}%）`} value={ran[k] ? `${end(k)} 只` : k === kind && Y.t > 0 ? `${Math.round(now)} 只` : '—'} dim={!ran[k] && k !== kind} on={k === kind} />)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'run'} onClick={Y.start} disabled={Y.running || Y.t > 0}>推演 5 年</LabButton>
      </>}
      extras={<Control label="年龄结构"><Segmented label="年龄结构" pulse={nx === 'kind'} want={nx === 'kind' ? (task?.id as AgeKey) : null} value={kind} disabled={Y.running} onChange={choose} options={KINDS.map(k => ({ value: k, label: AGES[k].name }))} /></Control>}
    />
  )
}
