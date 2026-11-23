// 燃烧和灭火 · 第 2 课 燃烧需要氧气：实验台第 2 格，两支点着的蜡烛，旁边一大一小两只烧杯。
// 拿一只烧杯倒扣着罩住左边的蜡烛：罩里的氧气一点点被用掉，火焰变小、熄灭；右边没罩的那支一直在烧。拿开烧杯重新点燃，换大烧杯再罩一次，熄灭得更晚。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { BEAKER, Beaker, CANDLE, Candle, Glove } from './gear'
import { Flame, Puffs, SMOKE } from './fx'
import { ease, lerp, seg, useClock, useRun } from './parts'
import { AIR_O2, BEAKERS, O2_OUT, flameAt, o2At, outTime, pct, round, type BeakerKey } from './physics'
import { BZ, M, ST, TOP, Place, type V3 } from './world'

const X0 = ST.l2, Y = TOP
const A = X0 + 0.06 * M, B = X0 + 0.19 * M             // 左边要罩的蜡烛、右边一直烧的蜡烛
const HOME: Record<BeakerKey, number> = { small: X0 - 0.08 * M, big: X0 - 0.22 * M }
const MOVE = 1.8
const TASKS: Task[] = [
  { id: 'small', text: '用 500 mL 的烧杯罩住左边的蜡烛', note: `约 ${round(outTime(500))} 秒后熄灭；右边没罩的那支一直在烧` },
  { id: 'relight', text: '拿开烧杯，把蜡烛重新点燃', note: '拿开烧杯，又有了氧气，蜡烛能重新燃烧' },
  { id: 'big', text: '换 1000 mL 的烧杯再罩一次', note: `大烧杯里的氧气多，约 ${round(outTime(1000))} 秒才熄灭` },
]
const KEYS: BeakerKey[] = ['small', 'big']
const vol = (k: BeakerKey) => BEAKERS[k].vol as 500 | 1000

/** 罩里氧气随时间变化的小图：每次罩上都画一条线 */
function O2Chart({ runs, cur }: { runs: { k: BeakerKey; t: number }[]; cur: { k: BeakerKey; t: number } | null }) {
  const W = 260, H = 110, x0 = 30, y0 = 12, w = W - 42, h = H - 34, tMax = 14
  const X = (t: number) => x0 + Math.min(1, t / tMax) * w, Y2 = (o: number) => y0 + (AIR_O2 - o) / (AIR_O2 - 0.15) * h
  const line = (k: BeakerKey, t: number) => { const pts: string[] = []; for (let s = 0; s <= t + 1e-6; s += 0.25) pts.push(`${X(s).toFixed(1)},${Y2(o2At(BEAKERS[k].vol, s)).toFixed(1)}`); return pts.join(' ') }
  const color = { small: '#ffb547', big: '#5ec8ff' }
  return <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="罩里氧气的体积分数随时间的变化">
    <rect width={W} height={H} fill="#182026" />
    {[0.21, 0.18, 0.16].map(o => <g key={o}><line x1={x0} x2={x0 + w} y1={Y2(o)} y2={Y2(o)} stroke="#ffffff" strokeOpacity={o === O2_OUT ? 0.3 : 0.1} strokeDasharray={o === O2_OUT ? '3 3' : undefined} /><text x={x0 - 4} y={Y2(o) + 4} textAnchor="end" fontSize={10} fill="#cfd9df">{pct(o)}</text></g>)}
    {[0, 5, 10].map(t => <text key={t} x={X(t)} y={H - 8} textAnchor="middle" fontSize={10} fill="#cfd9df">{t} s</text>)}
    {runs.map((r, i) => <polyline key={i} points={line(r.k, r.t)} fill="none" stroke={color[r.k]} strokeWidth={2} />)}
    {cur && <polyline points={line(cur.k, cur.t)} fill="none" stroke={color[cur.k]} strokeWidth={2.4} />}
  </svg>
}

export default function Lesson2() {
  const [bk, setBk] = useState<BeakerKey>('small')
  const [phase, setPhase] = useState<'idle' | 'down' | 'on' | 'out' | 'up'>('idle')
  const [runs, setRuns] = useState<{ k: BeakerKey; t: number }[]>([])
  const T = useTasks('gewu:fire:2', TASKS)
  const clock = useClock()
  const down = useRun(MOVE, () => { setPhase('on'); clock.start() })
  const up = useRun(MOVE, () => { setPhase('idle'); T.check(id => id === 'relight') })
  const V = BEAKERS[bk].vol, tOut = outTime(V)
  const t = phase === 'on' ? clock.t : phase === 'out' ? tOut : 0
  const o2 = phase === 'on' || phase === 'out' ? o2At(V, t) : AIR_O2
  const level = phase === 'out' ? 0 : flameAt(o2)
  useEffect(() => {
    if (phase !== 'on' || clock.t < tOut) return
    clock.stop(); setPhase('out'); setRuns(r => [...r, { k: bk, t: tOut }]); T.check(id => id === bk)
  }, [clock.t, phase])   // eslint-disable-line react-hooks/exhaustive-deps
  // 烧杯的位置：放在桌上（口朝上）→ 提起来翻过来 → 罩到蜡烛上（口朝下）
  const { r, h } = BEAKER[vol(bk)], Rr = r * M, Hh = h * M
  const k = phase === 'down' ? down.k : phase === 'up' ? 1 - up.k : phase === 'idle' ? 0 : 1
  const home: V3 = [HOME[bk], Y, BZ], over: V3 = [A, Y, BZ], top = Y + (CANDLE.h + 0.06) * M
  const lift = seg(k, 0, 0.3), across = seg(k, 0.3, 0.7), drop = seg(k, 0.7, 1)
  const pos: V3 = [lerp(home[0], over[0], ease(across)), lerp(lerp(Y, top + 0.04 * M, ease(lift)), Y, ease(drop)), BZ]
  const flip = ease(seg(k, 0.15, 0.62))
  const cover = () => { if (phase !== 'idle') return; setPhase('down'); down.run() }
  const lift2 = () => { if (phase !== 'out') return; setPhase('up'); up.run() }
  const resetAll = () => { down.snap(0); up.snap(0); clock.stop(); setPhase('idle'); setBk('small'); setRuns([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'cover' | 'lift' | 'bk' | null } = !task ? { hint: '罩住蜡烛，氧气用完，火就灭了。燃烧需要氧气。', next: null }
    : phase === 'down' ? { hint: '把烧杯倒过来，罩住左边的蜡烛…', next: null }
    : phase === 'up' ? { hint: '拿开烧杯，重新点燃…', next: null }
    : phase === 'on' ? { hint: `罩里的氧气越来越少，火焰在变小…（${round(t, 1).toFixed(1)} s）`, next: null }
    : phase === 'out' ? { hint: '蜡烛熄灭了；右边那支还在烧。按“拿开烧杯，重新点燃”', next: 'lift' }
    : task.id === 'big' && bk !== 'big' ? { hint: '把烧杯换成 1000 mL 的', next: 'bk' }
    : { hint: `按“罩上烧杯”：用 ${BEAKERS[bk].name} 的烧杯罩住左边的蜡烛`, next: 'cover' }
  const labels: Label[] = [
    ...(phase === 'on' || phase === 'out' ? [{ id: 'o2', at: [A + Rr + 0.15, Y + Hh * 0.75, BZ] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>罩里的氧气</small>{pct(o2, 1)}</> }] : []),
    ...(phase === 'out' ? [{ id: 'out', at: [A + Rr + 0.15, Y + Hh * 0.35, BZ] as V3, className: 'scene-tag -translate-y-1/2', children: <><small>熄灭用时</small>约 {round(tOut)} s</> }] : []),
    { id: 'b', at: [B + 0.15, Y + (CANDLE.h + 0.02) * M, BZ], className: 'scene-tag -translate-y-1/2', children: <><small>没罩的</small>一直在烧</> },
    ...KEYS.map(kk => ({ id: `n${kk}`, at: [HOME[kk], Y + (BEAKER[vol(kk)].h + 0.02) * M, BZ + 0.3] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `${BEAKERS[kk].name} 烧杯` })),
  ]
  return (
    <LabShell title="燃烧和灭火" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="烧杯"
      stage={<Place at="l2" labels={labels}>
        <group position={[A, Y, BZ]}><Candle /></group>
        <Flame at={[A, Y + (CANDLE.h + 0.008) * M, BZ]} w={0.016 * M} h={0.048 * M} kind="candle" level={level} seed={1} light={0.9} />
        <Puffs at={[A, Y + (CANDLE.h + 0.01) * M, BZ]} on={phase === 'out'} opt={{ ...SMOKE.wisp(0.35), rate: 8 }} seed={4} />
        <group position={[B, Y, BZ]}><Candle /></group>
        <Flame at={[B, Y + (CANDLE.h + 0.008) * M, BZ]} w={0.016 * M} h={0.048 * M} kind="candle" seed={2} light={0.9} />
        {/* 没在用的那只烧杯放在桌上 */}
        {KEYS.filter(kk => kk !== bk).map(kk => <group key={kk} position={[HOME[kk], Y, BZ]}><Beaker vol={vol(kk)} /></group>)}
        {/* 正在用的那只：提起来、翻过来、罩下去；一只手套捏着它的杯身 */}
        <group position={pos}>
          <group position={[0, Hh / 2, 0]} rotation-z={flip * Math.PI}>
            <group position={[0, -Hh / 2, 0]}><Beaker vol={vol(bk)} /></group>
            {(phase === 'down' || phase === 'up') && <group position={[-Rr - 0.012 * M, 0, 0.005 * M]} rotation={[0.9, 0, Math.PI / 2 + 0.3]}><Glove /></group>}
          </group>
        </group>
      </Place>}
      lesson={<LessonBlock no="2" title="燃烧需要氧气" concept="隔绝氧气，燃烧就停止" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>蜡烛燃烧要消耗氧气。罩上烧杯以后，外面的空气进不来，罩里的氧气越用越少，火焰越来越小，最后熄灭。没罩的那支和空气接触，一直在燃烧。</p>
          <p className="mt-3">烧杯越大，罩里的氧气越多，蜡烛烧得越久。这说明燃烧需要<b className="text-white">氧气</b>（或空气）。</p>
          <p className="mt-3 text-[13.5px] text-white/65">蜡烛熄灭时，罩里的氧气并没有用光，还剩约 16%：氧气太少，就维持不了燃烧。图里的时间按简化的模型算，是约数。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两只烧杯都罩过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">燃烧的第二个条件：可燃物要与氧气接触</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">500 mL 的烧杯约 {round(outTime(500))} 秒熄灭，1000 mL 的约 {round(outTime(1000))} 秒；没罩的那支一直在烧。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">罩里的氧气（体积分数）</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{phase === 'on' || phase === 'out' ? pct(o2, 1) : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="V" value={`${V} mL`} unit="烧杯的容积" />
            <ParamTile symbol="t" value={phase === 'on' ? `${t.toFixed(1)} s` : phase === 'out' ? `约 ${round(tOut)} s` : '—'} unit={phase === 'out' ? '熄灭用时' : '罩上了多久'} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">罩里的氧气怎样变化</h2>
          <O2Chart runs={runs} cur={phase === 'on' ? { k: bk, t } : null} />
          <div className="mt-1.5 flex gap-4 text-[12px] text-white/60"><span><b className="text-[#ffb547]">—</b> 500 mL</span><span><b className="text-[#5ec8ff]">—</b> 1000 mL</span><span>空气里约 21%</span></div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'cover'} pulse={next === 'cover'} onClick={cover} disabled={phase !== 'idle'}>罩上烧杯</LabButton>
        <LabButton primary={next === 'lift'} pulse={next === 'lift'} onClick={lift2} disabled={phase !== 'out'}>拿开烧杯，重新点燃</LabButton>
      </>}
      extras={
        <Control label="烧杯">
          <Segmented label="烧杯" pulse={next === 'bk'} want={next === 'bk' ? 'big' : null} disabled={phase !== 'idle'} value={bk} onChange={kk => setBk(kk as BeakerKey)} options={KEYS.map(kk => ({ value: kk, label: BEAKERS[kk].name }))} />
        </Control>
      }
    />
  )
}
