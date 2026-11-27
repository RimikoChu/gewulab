// 动量和碰撞 · 第 2 课 冲量和动量定理：实验台上，鸡蛋从同一高度落到钢板、薄海绵、厚海绵上。
// 落到垫子上时的动量一样，停下来用的时间不同，垫子对鸡蛋的平均作用力就不同：读数表上是力，面板上的图里矩形的面积是冲量。
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import type { Label } from '@/lab-kit'
import { EGG_H, Egg, EggRig, Splat, padTop } from './bench'
import { Glove, Vec, gloveQuat, useRun, type VecHandle } from './gear'
import { BENCH_Z, COL, ST, TOP } from './layout'
import { LESSONS, goLesson } from './lessons'
import { DROPS, EGG, drop, fallAt, momentum, type DropKey } from './physics'
import { useSpace, useTrial } from './trial'
import { FtPlot, num } from './views'
import { Place } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS: DropKey[] = ['steel', 'thin', 'thick', 'high']
const says = (k: DropKey) => `${num(drop(k).F)} N`
const TASKS: Task[] = [
  { id: 'steel', text: '让鸡蛋从 0.4 m 落到钢板上', note: `约 ${DROPS.steel.dt} s 就停住了，平均作用力 ${says('steel')}：鸡蛋碎了` },
  { id: 'thin', text: '垫上薄海绵，再落一次', note: `停下来用了约 ${DROPS.thin.dt} s，力降到 ${says('thin')}` },
  { id: 'thick', text: '换成厚海绵', note: `约 ${DROPS.thick.dt} s 才停住，力只有 ${says('thick')}：动量的变化一样，时间越长力越小` },
  { id: 'high', text: '把鸡蛋举到 0.9 m，落到厚海绵上', note: `动量变化更大了（${num(drop('high').p)} kg·m/s），力也只有 ${says('high')}` },
]
const COLORS: Record<DropKey, string> = { steel: '#ff7a59', thin: '#ffd24a', thick: '#7fe3d4', high: '#8fb4ff' }
const X0 = ST.egg, HAND_Q = gloveQuat([0, -1, 0.08], [0.2, 0, -1])
/** 箭头的比例：速度每 1 m/s、动量每 1 kg·m/s、力每 1 N 各画多长（m） */
const KV = 0.05, KP = 1, KF = 0.0045

function Rig({ mode, run, onMark, F }: { mode: DropKey; run: number; onMark: (i: number, last: number) => void; F: string }) {
  const d = DROPS[mode], r = useMemo(() => drop(mode), [mode]), top = padTop(d.thick)
  const egg = useRef<THREE.Group>(null), hand = useRef<THREE.Group>(null), mess = useRef<THREE.Group>(null)
  const vv = useRef<VecHandle>(null), pv = useRef<VecHandle>(null), fv = useRef<VecHandle>(null)
  const squash = useRef(0), splat = useRef(0)
  useRun(run, (t, dt) => {
    const hit = t >= r.t, after = t - r.t
    // 落下：自由落体；碰到垫子以后陷进去再回弹一点，停住
    const depth = !hit ? 0 : d.broken ? 0 : after < 0.1 ? r.sink * Math.sin(Math.PI * after / 0.2) : r.sink * (0.35 + 0.65 * Math.exp(-(after - 0.1) * 16))
    const y = hit ? top - depth : top + d.h - fallAt(t).y, v = hit ? 0 : fallAt(t).v
    squash.current = depth
    splat.current += ((hit && d.broken ? 1 : 0) - splat.current) * (1 - Math.exp(-dt / 0.07))
    if (egg.current) { egg.current.position.y = y; egg.current.visible = !(hit && d.broken) }
    if (mess.current) mess.current.visible = hit && d.broken
    // 手：松开以后张开手指，往上让一点
    const lift = Math.min(1, t / 0.25)
    if (hand.current) hand.current.position.set(0.004, top + d.h + EGG_H + 0.022 + lift * 0.035, 0.016)
    vv.current?.set([-0.045, y + EGG_H / 2, 0], [0, -v * KV, 0]); pv.current?.set([0.045, y + EGG_H / 2, 0], [0, -momentum(EGG.m, v) * KP, 0])
    fv.current?.set([0, top + 0.004, 0.03], [0, hit && after < 0.9 ? Math.max(0.025, r.F * KF) : 0, 0])
  }, [r.t, r.t + 0.9], i => onMark(i, 1))
  return <>
    <EggRig pad={d.thick} squash={squash} F={F} />
    <group ref={egg} position-y={top + d.h}><Egg /></group>
    <group ref={mess} position-y={top} visible={false}><Splat k={splat} /></group>
    <group ref={hand} quaternion={HAND_Q}><Glove pinch={run === 0 ? 0.62 : 0.1} arm={0.3} /></group>
    <Vec ref={vv} color={COL.v} thick={0.004} /><Vec ref={pv} color={COL.p} thick={0.005} /><Vec ref={fv} color={COL.F} thick={0.006} />
  </>
}

export default function Lesson2() {
  const L = useTrial<DropKey>('gewu:momentum:2', TASKS, 'steel')
  const { mode, stage, rows, task, next, busy } = L, d = DROPS[mode], r = drop(mode), hit = stage >= 1, top = padTop(d.thick)
  useSpace(L.go)
  const hint = !task ? '动量定理：合力的冲量等于动量的变化。要让力小，就把作用时间拉长。'
    : busy ? (hit ? '看读数表：垫子对鸡蛋的平均作用力…' : '鸡蛋落下去了…')
    : next === 'mode' ? `把条件换成“${DROPS[task.id as DropKey].name}”`
    : next === 'home' ? '按“换一只鸡蛋”，把鸡蛋举回去'
    : `按“松手”：让鸡蛋从 ${d.h} m 高处落到${d.thick ? '海绵' : '钢板'}上`
  const labels: Label[] = [
    { id: 'F', at: [X0 + 0.36, TOP + 0.2, BENCH_Z + 0.06], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: hit ? 1 : 0 }, children: <><small>平均作用力 F</small>{num(r.F)} N</> },
    { id: 'h', at: [X0 - 0.16, TOP + top + d.h + 0.02, BENCH_Z - 0.17], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: L.run === 0 ? 1 : 0.5 }, children: <><small>高度 h</small>{d.h} m</> },
    { id: 'res', at: [X0 + 0.12, TOP + top + 0.1, BENCH_Z], className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: L.done ? 1 : 0 }, children: d.broken ? '碎了' : '完好' },
    { id: 'pad', at: [X0 + 0.13, TOP + top - 0.01, BENCH_Z + 0.12], name: true, className: 'scene-name -translate-y-1/2', children: d.thick ? `海绵 · 厚 ${d.thick * 100} cm` : '钢板' },
    { id: 'plate', at: [X0 - 0.14, TOP + 0.03, BENCH_Z + 0.14], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '力传感器平台' },
    { id: 'egg', at: [X0 + 0.06, TOP + top + d.h + 0.03, BENCH_Z], name: true, className: 'scene-name -translate-y-1/2', children: `鸡蛋 · ${EGG.m * 1000} g` },
  ]
  return (
    <LabShell title="动量和碰撞" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={L.T.banner} onReset={L.resetAll} hint={hint} actionsLabel="鸡蛋"
      stage={<Place at={mode === 'high' ? 'l2h' : 'l2'} cur="egg" labels={labels}><group position={[X0, TOP, BENCH_Z]}><Rig key={mode} mode={mode} run={L.run} onMark={L.mark} F={hit ? num(r.F).replace('−', '-') : '0.00'} /></group></Place>}
      lesson={<LessonBlock no="2" title="冲量和动量定理" concept="动量变化相同，时间越长力越小" tasks={TASKS} done={L.T.done} current={task?.id}
        theory={<>
          <p>力和力的作用时间的乘积叫<b className="text-white">冲量</b>：I = FΔt，单位是牛秒（N·s）。冲量也是矢量。</p>
          <p className="mt-3"><b className="text-white">动量定理</b>：物体在一个过程中所受合力的冲量，等于它在这个过程始末的动量变化量，I = p′ − p。</p>
          <p className="mt-3">鸡蛋碰到垫子时速度是 v，停住后动量为 0。取向上为正，(F − mg)Δt = 0 − (−mv)，所以 F = mv/Δt + mg。动量的变化 mv 定了，Δt 越长，F 越小。</p>
          <p className="mt-3 text-[13.5px] text-white/65">安全气囊、包装用的泡沫、跳高用的海绵垫都是这个道理：延长作用时间来减小力。这里把垫子的作用力当成恒力，图上画成矩形，矩形的面积就是冲量。</p>
        </>} />}
      finale={L.T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四次都落完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">动量的变化一样，作用时间越长，力越小</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">同样从 0.4 m 落下，动量变化都是 {num(drop('steel').p)} kg·m/s：钢板上约 {DROPS.steel.dt} s 停住，力是 {says('steel')}；厚海绵上约 {DROPS.thick.dt} s，力只有 {says('thick')}。安全气囊、海绵垫就是这样保护人的。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => L.T.setFinale(false)}>再落几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">(F − mg) Δt = m v</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums" style={{ color: COL.F }}>{hit ? num(r.F) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="v" value={num(r.v, 1)} unit="m/s · 落到垫子时" />
            <ParamTile symbol="mv" value={num(r.p)} unit="kg·m/s" />
            <ParamTile symbol="Δt" value={hit ? `约 ${d.dt}` : '—'} unit="s · 停住用的时间" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">力和时间的图（面积是冲量）</h2>
          <FtPlot cur={mode} bars={rows.map(k => ({ key: k, name: DROPS[k].name, dt: DROPS[k].dt, F: drop(k).F, color: COLORS[k] }))} />
          {rows.length > 0 && <table className="mt-2 w-full text-[13px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">垫子</th><th className="text-right font-normal">mv</th><th className="text-right font-normal">Δt / s</th><th className="text-right font-normal">F / N</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80"><span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: COLORS[k] }} />{DROPS[k].name}</td><td className="text-right tabular-nums">{num(drop(k).p)}</td><td className="text-right tabular-nums">约 {DROPS[k].dt}</td><td className="text-right font-semibold tabular-nums" style={{ color: COL.F }}>{num(drop(k).F)}</td></tr>)}</tbody>
          </table>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={L.go} disabled={busy || L.run !== 0}>松手</LabButton>
        <LabButton pulse={next === 'home'} onClick={L.home} disabled={busy || L.run === 0}>换一只鸡蛋</LabButton>
      </>}
      extras={<Control label="条件"><Segmented label="条件" pulse={next === 'mode'} want={next === 'mode' ? L.want : null} value={mode} disabled={busy} onChange={L.pick} options={KEYS.map(k => ({ value: k, label: DROPS[k].name }))} /></Control>}
    />
  )
}
