// 机械振动和机械波 · 第 4 课 波的形成和传播：浮码头上的造波板一下一下推水，波沿着一串浮子传出去。
// 红浮子只在原地上下动；定格以后量相邻两个波峰的距离，就是波长；换一种频率，波长变了，波速没变。
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Paddle } from './boats'
import { Dim, Floats, num, useRun, useSpace } from './gear'
import { AT, PATCH, type V3 } from './layout'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { LINE, TONES, WATER, crests, lambda, speed, travel, type ToneKey } from './physics'
import { WavePatch, makeGrid } from './sea'
import { VOICE } from './voice'
import { Place } from './world'

const TASKS: Task[] = [
  { id: 'watch', text: '用 0.5 Hz 起波，盯住红浮子', note: '波传过去了，红浮子还在原地：它只是上下振动' },
  { id: 'm1', text: '定格，量相邻两个波峰的距离', note: `波长 ${num(lambda(TONES.slow.f), 1)} m，波速 v = λf = ${num(speed(lambda(TONES.slow.f), TONES.slow.f), 1)} m/s` },
  { id: 'fast', text: '把频率换成 1.0 Hz，再起波', note: '波源振动得快了，波纹变密了' },
  { id: 'm2', text: '再定格量一次波长', note: `波长 ${num(lambda(TONES.fast.f), 1)} m，波速还是 ${num(speed(lambda(TONES.fast.f), TONES.fast.f), 1)} m/s` },
]
const [X0, Z0] = AT.line
/** 造波板在哪（x）；浮子从离它 1 m 处排起 */
const XS = X0 - 12, far = (LINE.n + 0.5) * LINE.gap, REACH = far / WATER.v + 0.6
const floatX = (i: number) => (i + 1) * LINE.gap

function Rig({ tone, run, frozen, onReach, redAt, lamAt, measure }: { tone: ToneKey; run: number; frozen: boolean; onReach: () => void; redAt: V3; lamAt: V3; measure: boolean }) {
  const grid = useMemo(() => makeGrid(PATCH.line), [])
  // 造波板只有 10 m 长：两头以外没有波
  const win = useMemo(() => Float32Array.from(grid.zs, z => { const k = Math.min(1, Math.max(0, (6.2 - Math.abs(z - Z0)) / 1.6)); return k * k * (3 - 2 * k) }), [grid])
  const f = TONES[tone].f, t = useRef(0), amp = useRef(0), flap = useRef<THREE.Group>(null)
  useRun(run, (tt, dt) => {
    if (run !== 0) { t.current = tt; amp.current = 1 } else { t.current += dt; amp.current = Math.max(0, amp.current - dt * 1.4) }
    if (flap.current) flap.current.rotation.z = -0.13 * amp.current * Math.sin(2 * Math.PI * f * t.current)
    redAt[1] = amp.current * travel(LINE.A, f, floatX(LINE.red), t.current) + 1.2
  }, [REACH], onReach, frozen)
  const pair = useMemo(() => {
    if (!measure) return null
    const c = crests(f, t.current, far), i = c.findIndex(x => x >= 4.5)
    return i >= 0 && i + 1 < c.length ? [c[i], c[i + 1]] : null
  }, [measure, f])   // eslint-disable-line react-hooks/exhaustive-deps
  if (pair) { lamAt[0] = XS + (pair[0] + pair[1]) / 2; lamAt[1] = 2.3; lamAt[2] = Z0 }
  return <>
    <WavePatch grid={grid} high={LINE.A} fill={out => { const { xs, n } = grid, a = amp.current; for (let k = 0; k < n; k++) out[k] = a * win[k] * travel(LINE.A, f, xs[k] - XS, t.current) }} />
    <Floats n={LINE.n} mark={LINE.red} place={(i, p) => { p[0] = XS + floatX(i); p[1] = amp.current * travel(LINE.A, f, floatX(i), t.current); p[2] = Z0 }} />
    {pair && <Dim a={[XS + pair[0], 1.5, Z0]} b={[XS + pair[1], 1.5, Z0]} thick={0.09} tick={1.6} />}
    <group position={[XS - 2.0, 0, Z0]}><Paddle flap={flap} /></group>
  </>
}

export default function Lesson4() {
  const [tone, setTone] = useState<ToneKey>('slow')
  const [run, setRun] = useState(0), n = useRef(0)
  const [frozen, setFrozen] = useState(false)
  const [reached, setReached] = useState(false)
  const [rows, setRows] = useState<ToneKey[]>([])
  const T = useTasks('gewu:wave:4', TASKS)
  const redAt = useRef<V3>([XS + floatX(LINE.red), 0.75, Z0]).current, lamAt = useRef<V3>([X0, 1.4, Z0]).current
  const f = TONES[tone].f, measured = rows.includes(tone)
  const go = () => { if (run !== 0) return; setReached(false); setFrozen(false); setRun(++n.current) }
  const stop = () => { setRun(0); setFrozen(false); setReached(false) }
  const freeze = () => {
    if (run === 0) return
    if (frozen) { setFrozen(false); return }
    setFrozen(true)
    if (!reached) return
    const next = rows.includes(tone) ? rows : [...rows, tone]; setRows(next)
    T.check(id => (id === 'm1' && next.includes('slow')) || (id === 'm2' && next.includes('fast')))
  }
  const reach = () => { setReached(true); T.check(id => (id === 'watch' && tone === 'slow') || (id === 'fast' && tone === 'fast')) }
  const pick = (k: ToneKey) => { setTone(k); stop() }
  const resetAll = () => { setTone('slow'); stop(); setRows([]); T.reset() }
  useSpace(go)

  const task = T.current, want: ToneKey | null = !task ? null : task.id === 'watch' || task.id === 'm1' ? 'slow' : 'fast'
  const { hint, next }: { hint: string; next: 'tone' | 'go' | 'freeze' | null } = (() => {
    if (!task) return { hint: '波速由这片水决定，波长由波速和频率一起决定：λ = v / f。', next: null }
    if (tone !== want) return { hint: `把频率换成 ${TONES[want!].name}`, next: 'tone' }
    if (run === 0) return { hint: `按“起波”：造波板每秒推 ${f} 下`, next: 'go' }
    if (frozen && (task.id === 'watch' || task.id === 'fast' || !reached)) return { hint: '按“继续”，让波接着传', next: 'freeze' }
    if (!reached) return { hint: '波正在一只接一只地传过去，盯住红浮子…', next: null }
    return { hint: '按“定格”，量一量相邻两个波峰隔多远', next: 'freeze' }
  })()
  const showLam = frozen && reached
  const labels: Label[] = [
    { id: 'red', at: redAt, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>红浮子</small>只上下动</> },
    { id: 'lam', at: lamAt, ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: showLam ? 1 : 0 }, children: <><small>相邻波峰</small>λ = {num(lambda(f), 1)} m</> },
    { id: 'nPad', at: [XS - 0.2, 2.0, Z0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '造波板' },
    { id: 'nFl', at: [XS + floatX(11), 1.1, Z0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '一串浮子，每只相隔 1 m' },
  ]
  return (
    <LabShell title="机械振动和机械波" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="造波板"
      stage={<Place at="l4" labels={labels}><Rig key={tone} tone={tone} run={run} frozen={frozen} onReach={reach} redAt={redAt} lamAt={lamAt} measure={showLam} /></Place>}
      lesson={<LessonBlock no="4" title="波的形成和传播" concept="质点只在原地振动，传出去的是振动" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">机械波</b>是机械振动在介质里的传播。波源带动旁边的质点，旁边的质点再带动更远的：每个质点都在重复波源的振动，只是开始得晚一些。质点本身<b className="text-white">不随波迁移</b>，传出去的是振动这种运动形式，还有能量。</p>
          <p className="mt-3">相邻两个波峰（或波谷）之间的距离叫<b className="text-white">波长 λ</b>。波源振动一个周期 T，波正好向前传一个波长，所以波速 v = λ / T = λf。</p>
          <p className="mt-3 text-[13.5px] text-white/65">频率由波源决定，波速由介质决定。这片水里的波速是 {WATER.v.toFixed(1)} m/s，频率换了，变的是波长。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种频率都量过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">波在传，浮子只在原地上下动</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">0.5 Hz 时波长 {num(lambda(0.5), 1)} m，1.0 Hz 时波长 {num(lambda(1), 1)} m，两次的 λf 都是 {WATER.v.toFixed(1)} m/s：波速由介质决定，频率由波源决定。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">v = λ f</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{measured ? num(speed(lambda(f), f), 1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m/s</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="f" value={num(f, 1)} unit="Hz · 频率" />
            <ParamTile symbol="T" value={num(1 / f, 1)} unit="s · 周期" />
            <ParamTile symbol="λ" value={measured ? num(lambda(f), 1) : '—'} unit="m · 波长" />
            <ParamTile symbol="A" value={num(LINE.A, 2)} unit="m · 振幅" />
          </div>
          {rows.length > 0 && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">记录</h2>
            <table className="mt-1 w-full text-[13px]">
              <thead><tr className="text-[11.5px] text-white/50"><th className="py-1 text-left font-normal">f / Hz</th><th className="text-right font-normal">λ / m</th><th className="text-right font-normal">λf / (m/s)</th></tr></thead>
              <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{num(TONES[k].f, 1)}</td><td className="text-right tabular-nums">{num(lambda(TONES[k].f), 1)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{num(speed(lambda(TONES[k].f), TONES[k].f), 1)}</td></tr>)}</tbody>
            </table>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={run !== 0}>起波</LabButton>
        <LabButton pulse={next === 'freeze'} onClick={freeze} disabled={run === 0}>{frozen ? '继续' : '定格'}</LabButton>
        <LabButton onClick={stop} disabled={run === 0}>停波</LabButton>
      </>}
      extras={<Control label="频率"><Segmented label="频率" pulse={next === 'tone'} want={next === 'tone' ? want : null} value={tone} onChange={pick} options={(Object.keys(TONES) as ToneKey[]).map(k => ({ value: k, label: TONES[k].name }))} /></Control>}
    />
  )
}
