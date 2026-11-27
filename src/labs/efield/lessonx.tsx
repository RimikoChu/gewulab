// 静电场 · 拓展课：两个课本之外的小实验。一、喷码：纸带匀速走过打印头，每一列按点阵给墨滴充上不同的电荷量，打出一个字。
// 二、静电屏蔽：带电的橡胶棒靠近验电器，金箔张开；罩上金属网再靠近，金箔不动。随堂检测不考。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { LESSONS, goLesson } from './lessons'
import { ST, TOP } from './layout'
import { GLYPHS, JET, rowCharge, rowOffset, sci } from './physics'
import { R7, Rig7, type Shot } from './scene7'
import { RX, RigX } from './scenex'
import { useClock, useSettled } from './anim'
import { Big, Final, Sub } from './ui'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'print', text: '按“打印”，看七行墨滴怎样打出一个字', note: '越高的点，墨滴带的电越多；不打点的墨滴不充电，进回收槽' },
  { id: 'rod', text: '把带电的橡胶棒靠近验电器', note: '没有碰到，金箔也张开了：棒的电场让验电器里的电荷重新分布' },
  { id: 'cage', text: '罩上金属网，再把带电棒靠近', note: '金箔不动：金属网把外面的电场挡在了外面' },
]
const SPEED = 1.0, COL_T = 1.0, ROW_T = 0.06, PITCH = 0.011, FLIGHT = (R7.paper - R7.nozzle) / SPEED
type Glyph = 'E' | '7'

export default function LessonX() {
  const [glyph, setGlyph] = useState<Glyph>('E')
  const [near, setNear] = useState(false)
  const [down, setDown] = useState(false)
  const T = useTasks('gewu:efield:x', TASKS)
  const clock = useClock(0.1)
  const printing = clock.tick > 0
  // 这个字要喷的全部墨滴：第 c 列、从下往上第 k 行
  const shots = useMemo(() => GLYPHS[glyph].flatMap((row, r) => [...row].flatMap((ch, c) => ch === '1' ? [{ c, k: 7 - r }] : [])).map(({ c, k }) => ({ c, k, q: rowCharge(k), U: JET.U, t0: c * COL_T + k * ROW_T })), [glyph])
  const total = 4 * COL_T + 7 * ROW_T + FLIGHT + 0.4, finished = clock.tick >= total
  const dots = printing ? shots.filter(s => clock.tick >= s.t0 + FLIGHT).map(s => ({ y: rowOffset(s.k), z: s.c * PITCH })) : []
  const paperZ = printing ? -Math.min(4.6, Math.max(0, (clock.tick - FLIGHT) / COL_T)) * PITCH : 0
  const rod = useSlide(near ? RX.near : RX.far, 0.22), cage = useSlide(down ? 0 : 0.3, 0.28)
  const shielded = cage < 0.02, arrived = rod === RX.near
  const open = useSlide(arrived && !shielded ? 0.6 : 0, 1.4)
  const calm = useSettled(`${near}${down}`, 2600)
  useEffect(() => { if (finished) T.check(id => id === 'print') }, [finished])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (arrived && open >= 0.6) T.check(id => id === 'rod' && !!T.done.print) }, [arrived, open])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (calm && arrived && shielded) T.check(id => id === 'cage' && !!T.done.rod) }, [calm, arrived, shielded])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { clock.stop(); setGlyph('E'); setNear(false); setDown(false); T.reset() }

  const task = T.current, onPrint = task?.id === 'print'
  type Next = 'print' | 'rod' | 'cage' | null
  const { hint, next }: { hint: string; next: Next } = (() => {
    if (!task) return { hint: '静电屏蔽：金属网里面不受外面电场的影响。', next: null }
    if (task.id === 'print') return printing ? { hint: '纸带在走，墨滴一列一列打上去…', next: null } : { hint: '按“打印”，打出一个点阵字', next: 'print' }
    if (task.id === 'rod') return near ? { hint: '带电棒靠近了，看金箔…', next: null } : { hint: '把带电的橡胶棒靠近验电器', next: 'rod' }
    if (!down) return near ? { hint: '先把带电棒拿开', next: 'rod' } : { hint: '把金属网罩下来', next: 'cage' }
    return near ? { hint: '带电棒靠近了，看金箔动不动…', next: null } : { hint: '再把带电棒靠近', next: 'rod' }
  })()

  const X7 = ST.l7, XX = ST.x
  const labels: Label[] = onPrint ? [
    { id: 'n1', at: [X7 + R7.gutter + 0.03, TOP + R7.y - 0.03, 0.02], ax: 0.5, name: true, className: 'scene-name', children: '回收槽' },
    { id: 'n2', at: [X7 + R7.paper + 0.01, TOP + R7.y + 0.13, 0.1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '纸带' },
    { id: 'n3', at: [X7 + 0.08, TOP + 0.79, R7.back], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '检视屏：把纸带上的字放大' },
    { id: 'n4', at: [X7 - 0.4, TOP + R7.y - 0.05, 0.04], ax: 0.5, name: true, className: 'scene-name', children: '喷嘴' },
    { id: 'n5', at: [X7, TOP + R7.y - 0.075, 0.04], ax: 0.5, name: true, className: 'scene-name', children: '偏转板' },
    { id: 'top', at: [X7 + R7.paper - 0.02, TOP + R7.y + rowOffset(7) * R7.S + 0.03, 0.02], ax: 1, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: printing ? 1 : 0 }, children: <><small>最高一行</small>{sci(rowCharge(7))} C</> },
    { id: 'bot', at: [X7 + R7.paper - 0.02, TOP + R7.y - 0.03, 0.02], ax: 1, className: 'scene-tag transition-opacity', style: { opacity: printing ? 1 : 0 }, children: <><small>最低一行</small>{sci(rowCharge(1))} C</> },
  ] : [
    { id: 'm1', at: [XX - 0.07, TOP + 0.12, 0.03], ax: 1, name: true, className: 'scene-name', children: '验电器' },
    { id: 'm2', at: [XX + rod + 0.14, TOP + RX.top + 0.03, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '带负电的橡胶棒' },
    { id: 'm3', at: [XX - RX.cage - 0.01, TOP + cage + 0.2, 0], ax: 1, name: true, className: 'scene-name', children: '金属网罩' },
    { id: 'leaf', at: [XX + 0.075, TOP + 0.075, 0.03], ax: 0, className: 'scene-tag key transition-opacity', style: { opacity: arrived ? 1 : 0 }, children: open > 0.3 ? '金箔张开' : '金箔不动' },
  ]
  return (
    <LabShell title="静电场" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="喷码 · 静电屏蔽"
      stage={onPrint
        ? <Place at="xa" cur="l7" labels={labels}><Rig7 shots={printing ? shots as Shot[] : []} clock={clock.now} speed={SPEED} dots={dots} paperZ={paperZ} strip screen={printing ? shots.filter(s => clock.tick >= s.t0 + FLIGHT) : []} /></Place>
        : <Place at="xb" cur="x" labels={labels}><RigX rod={rod} cage={cage} open={open} /></Place>}
      lesson={<LessonBlock no="拓展" title="喷码 · 静电屏蔽" concept="用电场写字；用金属网挡住电场" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">喷码。</b>生产线上的纸箱、瓶盖匀速从打印头前走过。打印头把字拆成一列一列的点：一列七个位置，要打点的墨滴按高度充上不同的电荷量，电荷量越大偏得越高；不打点的墨滴不充电，回收再用。纸箱自己在走，所以打印头不用动。</p>
          <p className="mt-3"><b className="text-white">静电屏蔽。</b>导体放在电场里，里面的自由电荷重新分布，直到导体内部的电场强度处处为 0。金属网罩也有这个作用：罩里面的验电器感受不到外面的带电棒。电子仪器的金属外壳、信号线外面的那层金属网，都是做这个用的。</p>
        </>} />}
      finale={T.finale && <Final kicker="两个小实验都做完了" title="电场能把墨滴送到指定的位置，也能被一层金属网挡在外面"
        body={<>点阵最低一行的墨滴带 {sci(rowCharge(1))} C，最高一行带 {sci(rowCharge(7))} C，落点相差 {((rowOffset(7) - rowOffset(1)) * 1e3).toFixed(1)} mm。</>} />}
      panel={onPrint ? (
        <Glass className="px-4 py-4">
          <Big formula="y ∝ q" value={String(dots.length)} unit={`/ ${shots.length} 滴`} note="已经打到纸带上的墨滴" />
          <Sub>七行墨滴各带多少电</Sub>
          <table className="mt-1.5 w-full text-[13px] tabular-nums">
            <thead><tr className="text-white/50"><th className="py-1 text-left font-normal">行（从下往上）</th><th className="text-right font-normal">q / C</th><th className="text-right font-normal">落点 / mm</th></tr></thead>
            <tbody>{[7, 6, 5, 4, 3, 2, 1].map(k => <tr key={k} className="border-t border-white/10"><td className="py-1">第 {k} 行</td><td className="text-right">{sci(rowCharge(k))}</td><td className="text-right">{(rowOffset(k) * 1e3).toFixed(1)}</td></tr>)}</tbody>
          </table>
          <p className="mt-3 text-[12.5px] text-white/55">偏转电压 {JET.U} V 不变，只改每一滴的电荷量。</p>
        </Glass>
      ) : (
        <Glass className="px-4 py-4">
          <Big formula="导体内部 E = 0" value={open > 0.3 ? '张开' : '闭合'} unit="金箔" note={shielded ? '金属网罩着验电器' : '验电器外面没有罩'} />
          <Sub>现在的情况</Sub>
          <p className="mt-2 text-[14px] leading-relaxed text-white/80">{!arrived ? '带电棒离得远，验电器不受影响。' : shielded ? '带电棒就在网罩外面，罩里的金箔却不动：金属网上的电荷重新分布，把棒的电场抵消了。' : '带电棒把验电器里的电子推向下端，两片金箔带上同种电荷，互相排斥而张开。'}</p>
        </Glass>
      )}
      actions={<>
        <LabButton primary={next === 'print'} pulse={next === 'print'} onClick={clock.start} disabled={printing && !finished}>打印</LabButton>
        <LabButton pulse={next === 'rod'} onClick={() => setNear(n => !n)} disabled={onPrint}>{near ? '带电棒拿开' : '带电棒靠近'}</LabButton>
        <LabButton pulse={next === 'cage'} onClick={() => setDown(d => !d)} disabled={onPrint || near}>{down ? '把网罩升起来' : '罩上金属网'}</LabButton>
      </>}
      extras={onPrint ? <Control label="要打的字"><Segmented label="要打的字" value={glyph} onChange={g => { clock.stop(); setGlyph(g) }} options={[{ value: 'E', label: 'E' }, { value: '7', label: '7' }]} /></Control> : null}
    />
  )
}
