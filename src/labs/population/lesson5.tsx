// 种群和生态系统 · 第 5 课 S 形增长：岛中央的大草场。草场有限，兔的数量长到环境容纳量 K 就停住。
// 屏上上面一格是数量，下面一格是增长速率；观察 20 年，标出增长最快的时刻（N = K/2），再换成草场退化看 K 怎样变。画面里 1 只兔代表 8 只。
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { RabbitHerd } from './animals'
import { BoardFace, C, axes, dash, head, line, note, type Draw } from './board'
import { useYears, upto } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { K_OF, PASTURE_NAME, S_N0, S_R, S_YEARS, logistic, logisticRate, maxRate, tHalf, type Pasture } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room, SITE, ground, herdShot, onGround } from './world'

const S = SITE.meadow, AREA = S.area(0, 5, 5.6, 3.1), PER = 8, MAX = K_OF.good / PER
const TASKS: Task[] = [
  { id: 'good', text: '草场完好：观察 20 年', note: `数量先慢、后快、再慢，最后停在 ${K_OF.good} 只左右：这就是 K 值` },
  { id: 'mark', text: '标出增长最快的时刻', note: `第 ${tHalf(K_OF.good).toFixed(1)} 年，数量是 ${K_OF.good / 2} 只（K/2），这时增长速率最大` },
  { id: 'poor', text: '草场退化：再观察 20 年', note: `只长到 ${K_OF.poor} 只：环境变差，K 值变小` },
]

export default function Lesson5() {
  const [pasture, setPasture] = useState<Pasture>('good'), [ran, setRan] = useState<Record<string, boolean>>({}), [marked, setMarked] = useState(false)
  const Y = useYears(S_YEARS, 0.55), T = useTasks('gewu:population:5', TASKS)
  useEffect(() => { if (Y.done) { setRan(r => ({ ...r, [pasture]: true })); T.check(id => id === pasture) } }, [Y.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const K = K_OF[pasture], now = logistic(K, Y.t), rate = logisticRate(now, K), q = Math.floor(Y.t * 4 + 1e-6) / 4, th = tHalf(K)
  const dry = useSlide(pasture === 'poor' ? 1 : 0, 0.7)
  const choose = (p: Pasture) => { if (Y.running) return; setPasture(p); Y.clear() }
  const mark = () => { if (!ran[pasture] || marked) return; setMarked(true); T.check(id => id === 'mark') }
  const resetAll = () => { setPasture('good'); setRan({}); setMarked(false); Y.clear(); T.reset() }
  const show = marked && Y.t >= th

  const draw = useCallback<Draw>((g, W, H) => {
    const ts = upto(q, 0.25)
    const A = axes(g, { x: W * 0.02, y: H * 0.01, w: W * 0.96, h: H * 0.55, xr: [0, S_YEARS], yr: [0, 2400], xStep: 2, yStep: 600, xName: '时间/年', yName: '数量/只', fs: 24 })
    dash(g, A, [0, K], [S_YEARS, K]); note(g, A, [S_YEARS, K], `K = ${K} 只`, { align: 'right', dy: pasture === 'good' ? 46 : -8, fs: 26 })
    if (pasture === 'poor' && ran.good) line(g, A, upto(S_YEARS, 0.25).map(t => [t, logistic(K_OF.good, t)]), C.idle, { width: 3.5, alpha: 0.6 })
    line(g, A, ts.map(t => [t, logistic(K, t)]), C.rabbit); line(g, A, upto(Math.floor(q)).map(t => [t, logistic(K, t)]), C.rabbit, { dots: true, width: 0.01 }); head(g, A, q, logistic(K, q), C.rabbit, 9)
    const B = axes(g, { x: W * 0.02, y: H * 0.55, w: W * 0.96, h: H * 0.44, xr: [0, S_YEARS], yr: [0, 400], xStep: 2, yStep: 100, xName: '时间/年', yName: '增长速率/(只/年)', fs: 24 })
    line(g, B, ts.map(t => [t, logisticRate(logistic(K, t), K)]), C.rate); head(g, B, q, logisticRate(logistic(K, q), K), C.rate, 9)
    if (show) {
      dash(g, A, [th, 0], [th, K / 2]); dash(g, A, [0, K / 2], [th, K / 2]); dash(g, B, [th, 0], [th, maxRate(K)])
      head(g, A, th, K / 2, '#ffffff', 8); head(g, B, th, maxRate(K), '#ffffff', 8)
      note(g, A, [th, K / 2], `K/2 = ${K / 2} 只`, { dy: 42, fs: 25 }); note(g, B, [th, maxRate(K)], `最大 ${maxRate(K).toFixed(0)} 只/年`, { color: C.rate, dy: 6 })
    }
  }, [q, K, pasture, ran, show, th])

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'run' | 'mark' | 'pasture' | null } = (() => {
    if (!task) return { hint: '数量到 K/2 时增长最快，到 K 值就停住；环境变了，K 值也跟着变。', nx: null }
    if (Y.running) return { hint: `第 ${Math.floor(Y.t)} 年…`, nx: null }
    if (task.id === 'good') return { hint: '草场只有这么大，草是有限的。还是 20 只兔起步，按“观察 20 年”', nx: 'run' }
    if (task.id === 'mark') return { hint: '下面一格是增长速率：先升后降。按“标出增长最快处”', nx: 'mark' }
    if (pasture !== 'poor') return { hint: '把草场换成“草场退化”', nx: 'pasture' }
    return { hint: '草场退化了，草少了一半。按“观察 20 年”', nx: 'run' }
  })()
  const shown = Math.max(1, Math.round(now / PER)), shot = useMemo(() => herdShot('meadow', 's5', Y.t === 0 ? 1 : Math.max(shown, 9)), [Y.t === 0, shown <= 8, shown <= 40, shown <= 130])   // eslint-disable-line react-hooks/exhaustive-deps
  const labels: Label[] = [
    { id: 'n', at: onGround(AREA.x, AREA.z, 1.05), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>兔</small>{Math.round(now)} 只</> },
    { id: 'per', at: onGround(...S.front(-5.2, 7), 0.9), name: true, className: 'scene-name -translate-y-full', children: `画面里 1 只代表 ${PER} 只` },
  ]
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={PASTURE_NAME[pasture]}
      stage={<Room at="s5" labels={labels} {...shot} world={{ dry }}>
        <group position={onGround(S.x, S.z)} rotation-y={S.az}><BoardFace w={S.w} h={S.h} lift={S.lift} draw={draw} dep={draw} /></group>
        <RabbitHerd grow n={shown} max={MAX} area={AREA} ground={ground} scale={1.2} seed={5} lo />
      </Room>}
      lesson={<LessonBlock no="5" title="S 形增长" concept="到 K/2 时增长最快，到 K 值停住" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>自然界的资源和空间总是有限的。种群密度增大时，种内竞争加剧，出生率降低、死亡率升高；当出生率等于死亡率时，种群数量就稳定在一定的水平。这样的增长曲线呈“S”形。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>一定的环境条件所能维持的种群最大数量称为<b className="text-white">环境容纳量</b>，又称 <b className="text-white">K 值</b>。</li>
            <li>数量在 <b className="text-white">K/2</b> 左右时，种群的增长速率最大；到 K 值时增长速率为 0。</li>
            <li>K 值不是固定不变的：环境遭到破坏，K 值变小；环境改善，K 值变大。保护大熊猫，根本措施是建立自然保护区，提高环境容纳量。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两种草场都看过了" title="资源有限时，种群数量呈 S 形增长" text={`草场完好时，兔长到 K = ${K_OF.good} 只就停住；数量到 K/2 = ${K_OF.good / 2} 只时增长最快，每年约 ${maxRate(K_OF.good).toFixed(0)} 只。草场退化后，K 值降到 ${K_OF.poor} 只。`} notes={`曲线来自逻辑斯谛模型（r = ${S_R}），数值是示意。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="N" value={String(Math.round(now))} unit="只" />
            <ParamTile symbol="K" value={String(K)} unit="只" />
            <ParamTile symbol="t" value={Y.t.toFixed(0)} unit="年" />
          </div>
          <H>增长速率（示意）</H>
          <div className="text-center text-[40px] leading-none font-bold tracking-tight tabular-nums">{rate.toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">只/年</span></div>
          <H>两种草场</H>
          <div className="flex flex-col gap-1.5">
            {(['good', 'poor'] as Pasture[]).map(p => <Row key={p} name={PASTURE_NAME[p]} value={ran[p] ? `K = ${K_OF[p]} 只` : '—'} dim={!ran[p]} on={p === pasture} />)}
            <Row name="增长最快时" value={marked ? `N = K/2，${maxRate(K).toFixed(0)} 只/年` : '—'} dim={!marked} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'run'} onClick={Y.start} disabled={Y.running || Y.t > 0}>观察 20 年</LabButton>
        <LabButton pulse={nx === 'mark'} onClick={mark} disabled={!ran[pasture] || marked || Y.running}>标出增长最快处</LabButton>
      </>}
      extras={<Control label="草场"><Segmented label="草场" pulse={nx === 'pasture'} want={nx === 'pasture' ? 'poor' : null} value={pasture} disabled={Y.running} onChange={choose} options={(['good', 'poor'] as Pasture[]).map(p => ({ value: p, label: PASTURE_NAME[p] }))} /></Control>}
    />
  )
}
