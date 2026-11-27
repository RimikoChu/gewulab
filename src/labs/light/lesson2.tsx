// 光的波动性和光电效应 · 第 2 课 条纹间距由什么决定（Δx = Lλ/d）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Bench, { X_LASER, X_SLIT, benchAt, onScreen } from './bench'
import { useSpace } from './gear'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { DISTS, GAPS, LIGHTS, doubleSlitI, fringeGap, type LightKey } from './physics'
import { FringeView } from './views'
import { VOICE } from './voice'

type C = 'red' | 'green' | 'blue'
const COLORS: C[] = ['red', 'green', 'blue']
const gap = (c: LightKey, d: number, L: number) => fringeGap(L, LIGHTS[c].nm, d)
const id = (c: C, d: number, L: number) => `${c}:${d}:${L}`
const TASKS: Task[] = [
  { id: id('red', 0.2, 1.2), text: '红光、缝距 0.20 mm、屏距 1.20 m，记下条纹间距', note: `${gap('red', 0.2, 1.2).toFixed(2)} mm，拿它当基准` },
  { id: id('red', 0.1, 1.2), text: '换成缝距 0.10 mm 的双缝，再记一次', note: `${gap('red', 0.1, 1.2).toFixed(2)} mm：缝距减半，间距加倍` },
  { id: id('red', 0.2, 0.6), text: '换回 0.20 mm，把光屏移近到 0.60 m', note: `${gap('red', 0.2, 0.6).toFixed(2)} mm：屏距减半，间距减半` },
  { id: id('green', 0.2, 1.2), text: '光屏移回 1.20 m，换成绿光', note: `${gap('green', 0.2, 1.2).toFixed(2)} mm：波长短了，条纹变密` },
  { id: id('blue', 0.2, 1.2), text: '再换成蓝光', note: `${gap('blue', 0.2, 1.2).toFixed(2)} mm：波长越短，间距越小` },
]

export default function Lesson2() {
  const [c, setC] = useState<C>('red')
  const [d, setD] = useState<number>(GAPS[0])
  const [dist, setDist] = useState<number>(DISTS[0])
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:light:2', TASKS)
  const L = useSlide(dist, 0.45), dd = useSlide(d, 0.25), steady = L === dist && dd === d, key = id(c, d, dist), dup = rows.includes(key)
  const record = () => { if (!steady || dup) return; const next = [...rows, key]; setRows(next); T.check(k => next.includes(k)) }
  useSpace(record)
  const resetAll = () => { setC('red'); setD(GAPS[0]); setDist(DISTS[0]); setRows([]); T.reset() }
  const task = T.current, [tc, td, tl] = (task?.id ?? '::').split(':'), wd = Number(td), wl = Number(tl)
  const { hint, next }: { hint: string; next: 'd' | 'L' | 'c' | 'record' | null } = !task ? { hint: '都记完了。间距和屏距、波长成正比，和缝距成反比。', next: null }
    : d !== wd ? { hint: `按“换成 ${wd.toFixed(2)} mm 的双缝”`, next: 'd' }
    : dist !== wl ? { hint: `按“把光屏移到 ${wl.toFixed(2)} m”`, next: 'L' }
    : c !== tc ? { hint: `把激光换成${LIGHTS[tc as C].name}`, next: 'c' }
    : steady ? { hint: '读出条纹间距，按“记录”', next: 'record' } : { hint: '等条纹稳定…', next: null }
  const { nm, hex, name } = LIGHTS[c], now = fringeGap(L, nm, dd)
  const labels: Label[] = [
    { id: 'laser', at: benchAt(X_LASER - 0.3, 0.3), ax: 0.2, name: true, className: 'scene-name -translate-y-full', children: `激光器 · ${name} ${nm} nm` },
    { id: 'slit', at: benchAt(X_SLIT, 0.42), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>缝距 d</small>{d.toFixed(2)} mm</> },
    { id: 'L', at: benchAt((X_SLIT + onScreen(L, 0)[0]) / 2, -0.62, 0.3), ax: 0.5, className: 'scene-tag', children: <><small>屏距 L</small>{L.toFixed(2)} m</> },
    { id: 'gap', at: onScreen(L, 0, 0.5), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>Δx</small>{now.toFixed(2)} mm</> },
  ]
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title={TITLE} lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="双缝和光屏"
      stage={<Bench light={c} d={dd} L={L} labels={labels} view={[-0.78, 0.27]} span={[4.6, 2.4]} dx={-0.42} />}
      lesson={<LessonBlock no="2" title="间距由什么决定" concept="Δx = Lλ/d：屏远、波长长、缝近，条纹就宽" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>相邻两条亮条纹（或暗条纹）中心的间距</p>
          <p className="font-formula my-2 text-center text-[19px] text-white">Δx = <i>L</i>λ / <i>d</i></p>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><i>L</i>：双缝到光屏的距离。屏越远，条纹越宽</li>
            <li>λ：光的波长。红光波长最长，条纹最宽；蓝光最窄</li>
            <li><i>d</i>：两条缝之间的距离。缝靠得越近，条纹越宽</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">每次只改一个量，别的不动，才看得出间距跟着谁变。用白光做这个实验，各色光的条纹宽窄不同，叠起来就是彩色条纹。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">五组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">Δx = Lλ/d：和屏距、波长成正比，和缝距成反比</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">红光基准 {gap('red', 0.2, 1.2).toFixed(2)} mm；缝距减半变 {gap('red', 0.1, 1.2).toFixed(2)} mm；屏距减半变 {gap('red', 0.2, 0.6).toFixed(2)} mm；换蓝光变 {gap('blue', 0.2, 1.2).toFixed(2)} mm。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">Δx = Lλ / d</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{now.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">mm</span></div>
          </div>
          <FringeView I={x => doubleSlitI(x, L, nm, dd)} hex={hex} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="λ" value={String(nm)} unit="nm · 波长" />
            <ParamTile symbol="d" value={d.toFixed(2)} unit="mm · 缝距" />
            <ParamTile symbol="L" value={dist.toFixed(2)} unit="m · 屏距" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每次只改一个量，改完记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">光</th><th className="text-right font-normal">d / mm</th><th className="text-right font-normal">L / m</th><th className="text-right font-normal">Δx / mm</th></tr></thead>
                <tbody>{rows.map(k => { const [rc, rd, rl] = k.split(':'); return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{LIGHTS[rc as C].name}</td><td className="text-right tabular-nums">{Number(rd).toFixed(2)}</td><td className="text-right tabular-nums">{Number(rl).toFixed(2)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{gap(rc as C, Number(rd), Number(rl)).toFixed(2)}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'd'} onClick={() => setD(v => v === GAPS[0] ? GAPS[1] : GAPS[0])} disabled={!steady}>换成 {(d === GAPS[0] ? GAPS[1] : GAPS[0]).toFixed(2)} mm 的双缝</LabButton>
        <LabButton pulse={next === 'L'} onClick={() => setDist(v => v === DISTS[0] ? DISTS[1] : DISTS[0])} disabled={!steady}>把光屏移到 {(dist === DISTS[0] ? DISTS[1] : DISTS[0]).toFixed(2)} m</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="激光的颜色"><Segmented label="激光的颜色" pulse={next === 'c'} want={next === 'c' ? tc as C : null} value={c} onChange={setC} options={COLORS.map(k => ({ value: k, label: LIGHTS[k].name }))} /></Control>}
    />
  )
}
