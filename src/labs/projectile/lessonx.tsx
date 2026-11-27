// 抛体运动 · 拓展课：两个小专题。斜面上的平抛（落到坡面时速度方向都一样）、有风的空投（竖直方向不变，水平方向不再匀速）。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import At, { Local, toWorld } from './at'
import { Dashed, Ghost, Trail, Vel, type V3 } from './fx'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { flat, fmt, HILL, SLOPE, slopeThrow, WIND, windAt, windDrop } from './physics'
import { Bomb, Crate, Drone, Helicopter } from './props'
import { useRun } from './run'
import { MUZZLE } from './terrain'
import { BigMonitor, P } from './world'

type Sub = 'slope' | 'wind'
const SUBS: Record<Sub, { name: string; title: string; button: string; say: string }> = {
  slope: { name: '斜面上的平抛', title: '落到斜面时，速度方向都一样', button: '抛两只', say: '从坡顶水平抛出，落回坡面时，下落的高度和水平走的距离之比正好等于坡度：½gt² ÷ v₀t = tan θ，所以 t = 2v₀ tan θ ÷ g，和初速度成正比。这时竖直分速度和水平分速度之比 gt ÷ v₀ = 2 tan θ，和初速度无关。这里坡度 tan θ = 0.5：初速度小的那只 1 s 落到坡上，初速度加倍的那只 2 s 落到，速度都和水平方向成 45°。' },
  wind: { name: '有风的空投', title: '风只改变水平方向的运动', button: '逆风投放', say: '把风的影响简化成一个恒定的水平加速度（示意）：逆风时水平方向每秒慢 2 m/s。竖直方向照样是自由落体，19.6 m 还是 2 s 落地；水平方向不再匀速，2 s 里少走 ½ × 2 × 2² = 4 m，落点从 40 m 变成 36 m。真正空投时，逆风要晚一点投。' },
}
const ORDER: Sub[] = ['slope', 'wind']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))

/** 坡顶：局部 x 朝西（下坡方向），所以绕 y 轴转半圈 */
const TOP: V3 = [MUZZLE[0] + HILL.foot + HILL.top / HILL.slope, MUZZLE[1] + HILL.top, 0]
const WS = (p: V3) => toWorld(TOP, Math.PI, p), WW = (p: V3) => toWorld(P.heli, 0, p)
const A = slopeThrow(SLOPE.speeds[0]), B = slopeThrow(SLOPE.speeds[1])
const LEAD = 40, IN = 1.0, NOW = windDrop(WIND.a), CALM = windDrop(0)

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('slope')
  const T = useTasks('gewu:projectile:x', TASKS)
  const run = useRun(sub === 'slope' ? B.t + 0.6 : IN + NOW.t + 0.8)
  useEffect(() => { run.reset() }, [sub])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (run.done) T.check(id => id === sub) }, [run.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSub('slope'); run.reset(); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '两个专题都看完了。', next: null }
    : run.running ? { hint: sub === 'slope' ? '两只灭火弹飞向坡面…' : '箱子顶着风往下落…', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const t = run.t, done = run.done

  // ---------- 斜面上的平抛 ----------
  const slope = () => {
    const pos = (v0: number, r: ReturnType<typeof slopeThrow>): V3 => { const f = flat(v0, Math.min(t ?? 0, r.t)); return [f.x, -f.drop + 0.7, 0] }
    const arc = (v0: number, r: ReturnType<typeof slopeThrow>, upTo: number): V3[] => Array.from({ length: 25 }, (_, i) => { const f = flat(v0, Math.min(upTo, r.t) * i / 24); return [f.x, -f.drop + 0.7, 0] as V3 })
    const labels: Label[] = [
      { id: 'top', at: WS([-1.5, 4.6, 0]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '坡顶：水平抛出（示意大小）' },
      { id: 'k', at: WS([24, -9.5, 3]), ax: 0.5, className: 'scene-tag', children: <><small>坡度</small>tan θ = {SLOPE.slope}</> },
      ...(done ? [[SLOPE.speeds[0], A], [SLOPE.speeds[1], B]].map(([v0, r]) => { const q = r as typeof A; return { id: `l${v0}`, at: WS([q.x - (v0 as number) * 0.2, -q.drop + q.vy * 0.2 + 1.6, 0]), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{fmt(v0 as number, 1)} m/s · {fmt(q.t, 0)} s</small>斜向下 {fmt(q.dip, 0)}°</> } satisfies Label }) : []),
    ]
    return <At at="slope" labels={labels}>
      <group position={MUZZLE}><BigMonitor angle={30} /></group>
      <Local origin={TOP} az={Math.PI}>
        <group position={[-0.8, 2.6, 0]}><Drone scale={3.4} /></group>
        {[[SLOPE.speeds[0], A, '#2f6fd6'], [SLOPE.speeds[1], B, '#d0271d']].map(([v, r, c]) => { const v0 = v as number, q = r as typeof A, f = flat(v0, Math.min(t ?? 0, q.t)), land = t !== null && t >= q.t; return <group key={v0}>
          <group position={pos(v0, q)}><Bomb r={0.7} color={c as string} /></group>
          {t !== null && <Trail pts={arc(v0, q, t)} r={0.11} />}
          {t !== null && !land && t > 0.05 && <Vel at={[f.x, -f.drop + 0.7, 0.2]} vx={f.vx} vy={-f.vy} k={0.2} thick={3.6} parts={false} />}
          {land && <Vel at={[q.x - v0 * 0.2, -q.drop + 0.6 + q.vy * 0.2, 0.2]} vx={v0} vy={-q.vy} k={0.2} thick={3.6} />}
        </group> })}
      </Local>
    </At>
  }

  // ---------- 有风的空投 ----------
  const wind = () => {
    const h = WIND.h, tf = t === null ? null : t - IN, heliX = t === null ? -LEAD - WIND.v0 * IN : -LEAD + WIND.v0 * (tf as number)
    const fall = tf !== null && tf > 0 ? Math.min(tf, NOW.t) : null
    const w = fall !== null ? windAt(WIND.a, fall) : null, c = fall !== null ? windAt(0, fall) : null
    const land = tf !== null && tf >= NOW.t
    const arc = (a: number, upTo: number): V3[] => Array.from({ length: 25 }, (_, i) => { const q = windAt(a, upTo * i / 24); return [-LEAD + q.x, Math.max(0.6, h - q.drop), 0] as V3 })
    const labels: Label[] = [
      { id: 'wind', at: WW([-8, h * 0.62, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>逆风</small>每秒慢 2 m/s（示意）</> },
      { id: 'h', at: WW([heliX - 1, h + 5.6, 0]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>高度</small>{h} m</> },
      ...(land ? [
        { id: 'calm', at: WW([-LEAD + CALM.x + 1, 2.6, 0]), className: 'scene-tag -translate-y-full', children: <><small>无风</small>{fmt(CALM.x, 0)} m</> } satisfies Label,
        { id: 'now', at: WW([-LEAD + NOW.x - 1, 2.6, 0]), ax: 1, className: 'scene-tag key -translate-y-full', children: <><small>逆风</small>{fmt(NOW.x, 0)} m · 还是 {fmt(NOW.t, 0)} s</> } satisfies Label,
      ] : []),
    ]
    return <At at="wind" labels={labels}>
      <Local origin={P.heli}>
        <group position={[heliX, h + 1.5, 0]} rotation-z={-0.07} scale={1.5}><Helicopter /></group>
        <group position={[w ? -LEAD + w.x : heliX, w ? Math.max(0.8, h - w.drop) : h - 2.2, 0]}><Crate s={2} /></group>
        {/* 没有风时会走的路线：白色虚影 */}
        {c && fall !== null && <><Trail pts={arc(0, fall)} r={0.1} opacity={0.35} /><Ghost at={[-LEAD + c.x, Math.max(0.6, h - c.drop), 0]} r={0.6} color="#ffffff" opacity={0.4} /></>}
        {w && fall !== null && <Trail pts={arc(WIND.a, fall)} r={0.14} />}
        {w && c && !land && <Dashed a={[-LEAD + w.x, h - w.drop, 0]} b={[-LEAD + c.x, h - c.drop, 0]} w={2.5} dash={0.3} opacity={0.9} />}
        {/* 风：几支往左的青色箭头 */}
        {[0.3, 0.55, 0.8].map(k => <Vel key={k} at={[-2 - k * 6, h * k, -1]} vx={-10} vy={0} k={0.5} thick={3} total={false} />)}
        <Dashed a={[-LEAD, h, 0]} b={[-LEAD, 0.1, 0]} w={2} dash={1} opacity={0.6} />
      </Local>
    </At>
  }

  return (
    <LabShell title="抛体运动" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={sub === 'slope' ? slope() : wind()}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">把运动分成水平和竖直两个方向，各算各的：斜面、有风，都是这个办法</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[21px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'slope' && <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">v₀</th><th className="text-right font-normal">时间</th><th className="text-right font-normal">水平</th><th className="text-right font-normal">落下</th><th className="text-right font-normal">方向</th></tr></thead>
            <tbody>{[[SLOPE.speeds[0], A], [SLOPE.speeds[1], B]].map(([v, r]) => { const q = r as typeof A; return <tr key={v as number} className="border-t border-white/12"><td className="py-1.5 tabular-nums">{fmt(v as number, 1)} m/s</td><td className="text-right tabular-nums">{done ? `${fmt(q.t, 0)} s` : '—'}</td><td className="text-right tabular-nums">{done ? `${fmt(q.x, 1)} m` : '—'}</td><td className="text-right tabular-nums">{done ? `${fmt(q.drop, 1)} m` : '—'}</td><td className="text-right font-semibold tabular-nums text-[#7fe3d4]">{done ? `${fmt(q.dip, 0)}°` : '—'}</td></tr> })}</tbody>
          </table>}
          {sub === 'wind' && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="下落时间" value={done ? `${fmt(NOW.t, 0)} s` : '—'} unit="和无风时一样" />
            <ParamTile symbol="落点" value={done ? `${fmt(NOW.x, 0)} m` : '—'} unit={`无风时 ${fmt(CALM.x, 0)} m`} />
          </div>}
          {done && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={run.start} disabled={run.running}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={k => { if (!run.running) setSub(k) }} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
