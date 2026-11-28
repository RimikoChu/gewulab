// 种群和生态系统 · 第 4 课 J 形增长：20 只兔从栈桥登上没有天敌的岛。沙丘草地上立着一块监测屏，
// 选一个 λ，观察 10 年：屏上逐年描点连成 J 形，草地上的兔越来越多（画面里 1 只代表 4 只）。
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { RabbitHerd } from './animals'
import { BoardFace, C, axes, head, line, note, text, type Draw } from './board'
import { useYears, upto } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { J_N0, J_YEARS, LAMBDAS, jGrowth, type Lambda } from './physics'
import { Big, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room, SITE, ground, herdShot, onGround } from './world'

const S = SITE.beach, AREA = S.area(0, 5, 5.5, 3.1), PER = 4, MAX = Math.ceil(jGrowth(1.5, J_YEARS) / PER)
const end = (l: number) => Math.round(jGrowth(l, J_YEARS))
const key = (l: number) => `l${l}`
const TASKS: Task[] = [
  { id: key(1.3), text: 'λ = 1.3，观察 10 年', note: `每年是上一年的 1.3 倍，10 年后 ${end(1.3)} 只：曲线越来越陡，像字母 J` },
  { id: key(1.5), text: 'λ = 1.5，再观察 10 年', note: `10 年后 ${end(1.5)} 只：λ 越大，增长越快` },
  { id: key(1), text: 'λ = 1，再观察 10 年', note: `一直是 ${J_N0} 只：λ = 1 时数量不变，λ 大于 1 才增长` },
]
const DESC: Record<string, string> = {
  [key(1.3)]: '20 只兔刚上岛：没有天敌，食物和空间都充裕。λ 取 1.3，按“观察 10 年”',
  [key(1.5)]: 'λ = 1.5：每年是上一年的 1.5 倍。按“观察 10 年”',
  [key(1)]: 'λ = 1：每年和上一年一样多。按“观察 10 年”',
}

export default function Lesson4() {
  const [lam, setLam] = useState<Lambda>(1.3), [ran, setRan] = useState<Record<string, boolean>>({})
  const Y = useYears(J_YEARS, 0.85), T = useTasks('gewu:population:4', TASKS)
  useEffect(() => { if (Y.done) { setRan(r => ({ ...r, [key(lam)]: true })); T.check(id => id === key(lam)) } }, [Y.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const yr = Math.floor(Y.t + 1e-6), now = jGrowth(lam, Y.t)
  const choose = (v: string) => { if (Y.running) return; setLam(+v as Lambda); Y.clear() }
  const resetAll = () => { setLam(1.3); setRan({}); Y.clear(); T.reset() }

  const draw = useCallback<Draw>((g, W, H) => {
    const M = axes(g, { x: W * 0.02, y: H * 0.03, w: W * 0.96, h: H * 0.94, xr: [0, J_YEARS], yr: [0, 1200], xStep: 1, yStep: 300, xName: '时间/年', yName: '数量/只', fs: 28 })
    for (const l of LAMBDAS) if (l !== lam && ran[key(l)]) { line(g, M, upto(J_YEARS).map(t => [t, jGrowth(l, t)]), C.idle, { dots: true, width: 3.5, alpha: 0.6 }); note(g, M, [J_YEARS, jGrowth(l, J_YEARS)], `λ = ${l}`, { color: '#b8c2c9', align: 'right', dy: l === 1 ? -14 : 44 }) }
    line(g, M, upto(yr).map(t => [t, jGrowth(lam, t)]), C.rabbit, { dots: true }); head(g, M, yr, jGrowth(lam, yr), C.rabbit)
    if (yr > 0) note(g, M, [yr, jGrowth(lam, yr)], `第 ${yr} 年 ${Math.round(jGrowth(lam, yr))} 只`, { color: C.rabbit, align: yr > 6 ? 'right' : 'left' })
    text(g, `N₀ = ${J_N0} 只    λ = ${lam}`, W * 0.34, H * 0.14, { fs: 34, weight: 700 })
  }, [lam, yr, ran])

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'run' | 'lam' | null } = (() => {
    if (!task) return { hint: '三个 λ 都看过了：理想条件下，种群数量每年以一定的倍数增长。', nx: null }
    if (Y.running) return { hint: `第 ${yr} 年…`, nx: null }
    if (key(lam) !== task.id) return { hint: `把 λ 换成 ${task.id.slice(1)}`, nx: 'lam' }
    return { hint: DESC[task.id], nx: 'run' }
  })()
  const shown = Math.max(1, Math.round(now / PER)), shot = useMemo(() => herdShot('beach', 's4', Y.t === 0 ? 1 : Math.max(shown, lam === 1 ? 41 : 9)), [Y.t === 0, lam, shown <= 8, shown <= 40, shown <= 130])   // eslint-disable-line react-hooks/exhaustive-deps
  const labels: Label[] = [
    { id: 'n', at: onGround(AREA.x, AREA.z, 1.05), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>兔</small>{Math.round(now)} 只</> },
    { id: 'per', at: onGround(...S.front(-5.2, 7), 0.9), name: true, className: 'scene-name -translate-y-full', children: `画面里 1 只代表 ${PER} 只` },
  ]
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={`λ = ${lam}`}
      stage={<Room at="s4" labels={labels} {...shot}>
        <group position={onGround(S.x, S.z)} rotation-y={S.az}><BoardFace w={S.w} h={S.h} lift={S.lift} draw={draw} dep={draw} /></group>
        <RabbitHerd grow n={shown} max={MAX} area={AREA} ground={ground} scale={1.3} seed={4} lo />
      </Room>}
      lesson={<LessonBlock no="4" title="J 形增长" concept="理想条件下，数量每年翻 λ 倍" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在食物和空间条件充裕、气候适宜、没有天敌和其他竞争物种等条件下，种群的数量每年以一定的倍数增长，第二年的数量是第一年的 λ 倍。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>数学模型：<b className="text-white">Nt = N0 λ^t</b>。N0 是起始数量，t 是时间，Nt 是 t 年后的数量，λ 是该种群数量是前一年种群数量的倍数。</li>
            <li>以时间为横坐标、种群数量为纵坐标画出曲线，大致呈“J”形。</li>
            <li>λ 大于 1，数量增长；λ 等于 1，数量不变；λ 小于 1，数量减少。λ 不是增长率，增长率是 λ − 1。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="三个 λ 都看过了" title="理想条件下，种群数量呈 J 形增长" text={`Nt = N0 λ^t。${J_N0} 只兔，λ = 1.3 时 10 年后 ${end(1.3)} 只，λ = 1.5 时 ${end(1.5)} 只，λ = 1 时还是 ${J_N0} 只。`} notes="J 形增长只在理想条件下出现；自然界里资源和空间总是有限的。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula={<>N<sub>t</sub> = N<sub>0</sub> λ<sup>t</sup></>} value={Math.round(now)} unit="只" />
          <H>关键参数</H>
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="N₀" value={String(J_N0)} unit="只" />
            <ParamTile symbol="λ" value={String(lam)} unit="倍/年" />
            <ParamTile symbol="t" value={String(yr)} unit="年" />
          </div>
          <H>10 年后的数量</H>
          <div className="flex flex-col gap-1.5">
            {LAMBDAS.map(l => <Row key={l} name={`λ = ${l}`} value={ran[key(l)] ? `${end(l)} 只` : '—'} dim={!ran[key(l)]} on={l === lam} />)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'run'} onClick={Y.start} disabled={Y.running || Y.t > 0}>观察 10 年</LabButton>
      </>}
      extras={<Control label="λ"><Segmented label="λ" pulse={nx === 'lam'} want={nx === 'lam' ? task!.id.slice(1) : null} value={String(lam)} disabled={Y.running} onChange={choose} options={LAMBDAS.map(l => ({ value: String(l), label: `λ = ${l}` }))} /></Control>}
    />
  )
}
