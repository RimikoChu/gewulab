// 地震 · 第 5 课 找到震中：一次假想的小地震。读 A、B、C 三个地震台记录里横波比纵波晚到几秒，算出各台到震中的距离，
// 以台站为圆心画圆；两个圆交出两个点，第三个圆把震中挑出来。
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './world'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { ABC, K, QUIZ_QUAKE, circleCross, hypoFromLag, locate, radiusFromLag, stationLag, type StationKey } from './physics'
import { Y, height } from './terrain'
import { Pin, StationMark } from './marks'
import { TrioChart } from './charts'
import { useLater } from './clock'

const KEYS: StationKey[] = ['A', 'B', 'C']
const LAG = Object.fromEntries(KEYS.map(k => [k, stationLag(k)])) as Record<StationKey, number>
const RAD = Object.fromEntries(KEYS.map(k => [k, radiusFromLag(LAG[k])])) as Record<StationKey, number>
const CIRC = KEYS.map(k => ({ c: ABC[k].at, r: RAD[k] }))
const CROSS = circleCross(CIRC[0], CIRC[1])
const FOUND = locate(CIRC).at
const TASKS: Task[] = [
  { id: 'A', text: '读 A 台的时间差，画第一个圆', note: `A 台晚 ${LAG.A.toFixed(1)} s，震中在离它约 ${Math.round(RAD.A)} km 的圆上` },
  { id: 'B', text: '读 B 台，画第二个圆', note: '两个圆交出两个点，震中是哪一个还定不下来' },
  { id: 'C', text: '读 C 台，画第三个圆', note: '三个圆交在同一点' },
  { id: 'epi', text: '标出震中', note: '三个圆的交点就是震中' },
]
const pos = (p: [number, number], up: number): [number, number, number] => [p[0], Y(height(p[0], p[1])) + up, p[1]]

export default function Lesson5() {
  const [n, setN] = useState(0)
  const [mark, setMark] = useState(false)
  const T = useTasks('gewu:quake:5', TASKS)
  const g = [useSlide(n > 0 ? 1 : 0, 0.6), useSlide(n > 1 ? 1 : 0, 0.6), useSlide(n > 2 ? 1 : 0, 0.6)]
  const drawing = n > 0 && g[n - 1] < 0.999
  useLater(n > 0 && !drawing, 300, () => T.check(id => id === KEYS[n - 1]), [n, drawing])
  useLater(mark, 1200, () => T.check(id => id === 'epi'), [mark])
  const resetAll = () => { setN(0); setMark(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'draw' | 'mark' | null } = (() => {
    if (!task) return { hint: '都做完了。三个台站画三个圆，交点就是震中。', next: null }
    if (drawing) return { hint: `以 ${KEYS[n - 1]} 台为圆心画圆…`, next: null }
    if (n > 0 && !T.done[KEYS[n - 1]]) return { hint: `以 ${KEYS[n - 1]} 台为圆心画圆…`, next: null }
    if (task.id === 'epi') return { hint: '三个圆交在一点：标出震中', next: 'mark' }
    if (n === 0) return { hint: '读 A 台记录里横波比纵波晚几秒，画出第一个圆', next: 'draw' }
    if (n === 1) return { hint: '只知道震中在圆上某处。再读 B 台，画第二个圆', next: 'draw' }
    return { hint: '两个圆有两个交点。再读 C 台，画第三个圆', next: 'draw' }
  })()

  const labels: Label[] = [
    ...KEYS.map(k => ({ id: k, at: pos(ABC[k].at, 4.6), ax: 0.5, className: 'scene-tag -translate-y-full', children: n > KEYS.indexOf(k) ? <><small>{k} 台</small>约 {Math.round(RAD[k])} km</> : `${k} 台` })),
    ...(n === 2 && !drawing ? CROSS.map((p, i) => ({ id: 'x' + i, at: pos(p, 2), ax: 0, className: 'scene-name -translate-y-1/2', children: '交点？' })) : []),
    { id: 'epi', at: pos(FOUND, 4.4), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: mark ? 1 : 0 }, children: '震中' },
  ]
  return (
    <LabShell title="地震" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="定位"
      stage={<Spot at="locate" labels={labels} want={{ region: { circles: KEYS.slice(0, n).map((k, i) => [ABC[k].at[0], ABC[k].at[1], RAD[k] * g[i]] as [number, number, number]) } }}>
        {KEYS.map((k, i) => <StationMark key={k} at={ABC[k].at} hot={n === i + 1 && drawing} />)}
        {n === 2 && !drawing && CROSS.map((p, i) => <Pin key={i} at={p} color="#ffffff" s={0.7} />)}
        {mark && <Pin at={FOUND} color="#ff6b4a" s={1.3} />}
      </Spot>}
      lesson={<LessonBlock no="5" title="找到震中" concept="三个台站画三个圆，交点就是震中" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>纵波快、横波慢，离震源越远，横波比纵波晚到得越多。在地壳里，晚到 1 s 大约就是远了 {K.toFixed(1)} km，所以：到震源的距离 ≈ 晚到的秒数 × {K.toFixed(1)} km/s。</p>
          <p className="mt-2">一个地震台只知道“震中离我多远”，震中可能在一个圆上的任何地方。两个圆一般交出两个点；第三个台站的圆把其中一个挑出来。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这是一次假想的小地震，震源深 {QUIZ_QUAKE.h} km：画圆的半径是把到震源的距离扣掉震源深度后的震中距。台站的位置是示意。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,420px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">震中找到了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">三个台站画三个圆，交点就是震中</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">A、B、C 三台的横波分别晚到 {LAG.A.toFixed(1)}、{LAG.B.toFixed(1)}、{LAG.C.toFixed(1)} s，换成距离约 {Math.round(RAD.A)}、{Math.round(RAD.B)}、{Math.round(RAD.C)} km。只有两个台站时，有两个可能的交点。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">三个台站的记录：横波比纵波晚几秒</h2>
          <div className="mt-2"><TrioChart rows={KEYS.map((k, i) => ({ name: k, d: Math.hypot(ABC[k].at[0] - QUIZ_QUAKE.epi[0], ABC[k].at[1] - QUIZ_QUAKE.epi[1]), h: QUIZ_QUAKE.h, show: n > i, lag: LAG[k] }))} /></div>
          <p className="mt-3 font-formula text-[15px] text-white/70">距离 ≈ 晚到的秒数 × {K.toFixed(1)} km/s</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {KEYS.map((k, i) => <ParamTile key={k} symbol={`${k} 台`} value={n > i ? `${Math.round(hypoFromLag(LAG[k]))}` : '—'} unit="km · 到震源" />)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'draw'} onClick={() => setN(x => Math.min(3, x + 1))} disabled={drawing || n >= 3}>画下一个圆</LabButton>
        <LabButton pulse={next === 'mark'} onClick={() => setMark(true)} disabled={!T.done.C || mark}>标出震中</LabButton>
      </>}
      extras={null}
    />
  )
}
