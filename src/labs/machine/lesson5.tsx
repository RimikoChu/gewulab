// 简单机械 · 第 5 课 定滑轮和动滑轮：一副铁架上并排挂着两套装置。左边一只定滑轮，绳子一头拴着 4 只钩码，另一头往下拉；
// 右边一只动滑轮，绳子一头拴在横梁上，绕过动滑轮往上拉，钩码挂在动滑轮下面。各匀速提升 10 cm，读测力计、量绳端移动的距离。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Frame, HookBox, MeterStick } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { FIXED_SLANT, rig5, round, type Rig5 } from './physics'
import { PulleyRig, type RigDef } from './pulley'
import { ScaleView, Table } from './views'
import { BZ, ST, TOP, U, type V3 } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const H = 110, X = ST.l5, Y0 = TOP + H * U, ORG: V3 = [X, Y0, BZ]
const FIX: RigDef = { fixed: [{ o: [-12, -1], wheels: [[0, -7]] }], start: { on: 'load', p: [-9, -50] }, wraps: [{ b: 'f', k: 0, w: 0, s: 1 }], out: [0, -1], free0: 20, hooks: 4, hang: 'start' }
const MOV: RigDef = { fixed: [], mov: { o: [24, -75], wheels: [[0, 5]] }, start: { on: 'frame', p: [21, -1] }, wraps: [{ b: 'm', k: 0, w: 0, s: 1 }], out: [0, 1], free0: 6, hooks: 4, hang: 'mov' }
const NAME: Record<Rig5, string> = { fixed: '定滑轮 · 竖直拉', slant: '定滑轮 · 斜着拉', movable: '动滑轮' }
const KEYS: Rig5[] = ['fixed', 'slant', 'movable']
const cm = (x: number) => round(x * 100, 1)
const TASKS: Task[] = [
  { id: 'fixed', text: '用定滑轮竖直向下拉，把钩码匀速提升 10 cm', note: `拉力 ${rig5('fixed').F} N，等于钩码的重；绳端也移动 ${cm(rig5('fixed').s)} cm` },
  { id: 'slant', text: '定滑轮换成斜着往下拉，再提一次', note: `拉力还是 ${rig5('slant').F} N：定滑轮只改变力的方向，不省力` },
  { id: 'movable', text: '换用动滑轮，把钩码匀速提升 10 cm', note: `拉力只要 ${rig5('movable').F} N，是钩码重的一半；绳端却移动了 ${cm(rig5('movable').s)} cm` },
]
const world = (p: [number, number]): V3 => [X + p[0] * U, Y0 + p[1] * U, BZ]

export default function Lesson5() {
  const [opt, setOpt] = useState<Rig5>('fixed')
  const [up, setUp] = useState({ fix: false, mov: false })
  const [rows, setRows] = useState<Rig5[]>([])
  const T = useTasks('gewu:machine:5', TASKS)
  const riseF = useSlide(up.fix ? 10 : 0, 4), riseM = useSlide(up.mov ? 10 : 0, 4)
  const deg = useSlide(opt === 'slant' ? FIXED_SLANT : 0, 24), th = deg * Math.PI / 180
  const side = opt === 'movable' ? 'mov' : 'fix', r = rig5(opt), rise = side === 'fix' ? riseF : riseM
  const ready = Math.abs(deg - (opt === 'slant' ? FIXED_SLANT : 0)) < 1e-6
  const top = up[side] && rise >= 10
  useEffect(() => { if (!top || rows.includes(opt)) return; const next = [...rows, opt]; setRows(next); T.check(id => next.includes(id as Rig5)) })   // eslint-disable-line react-hooks/exhaustive-deps
  const lift = () => { if (!ready || up[side]) return; setUp(u => ({ ...u, [side]: true })) }
  const lower = () => setUp(u => ({ ...u, [side]: false }))
  const pick = (k: Rig5) => { if (up.fix || up.mov || riseF > 0 || riseM > 0) return; setOpt(k) }
  const resetAll = () => { setOpt('fixed'); setUp({ fix: false, mov: false }); setRows([]); T.reset() }
  const task = T.current, moving = (side === 'fix' ? riseF : riseM) > 0 && !top && up[side]
  const { hint, next }: { hint: string; next: 'opt' | 'lift' | 'lower' | null } = !task ? { hint: '定滑轮改变力的方向，不省力；动滑轮省一半的力，却要多移动一倍的距离。', next: null }
    : moving ? { hint: '匀速往上提，看测力计和绳端…', next: null }
    : (up.fix || up.mov) && (task.id !== opt || top) ? { hint: top && rows.includes(opt) ? '记下了。按“放下”' : '先按“放下”', next: 'lower' }
    : (up.fix || up.mov) || riseF > 0 || riseM > 0 ? { hint: '钩码慢慢放回去…', next: null }
    : task.id !== opt ? { hint: `换成“${NAME[task.id as Rig5]}”`, next: 'opt' }
    : !ready ? { hint: '测力计慢慢转到斜着拉的方向…', next: null }
    : { hint: `测力计的示数是 ${r.F} N。按“匀速提升 10 cm”`, next: 'lift' }
  const fixF = rig5('fixed').F, movF = rig5('movable').F
  const out: [number, number] = [-Math.sin(th), -Math.cos(th)]       // 往外斜（离开动滑轮那一套）
  const labels: Label[] = [
    { id: 'Ff', at: world([-15 - Math.sin(th) * 34 - 4, -28 - riseF - Math.cos(th) * 18]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>F</small>{fixF} N</> },
    { id: 'Fm', at: world([32, -64 + 2 * riseM + 14]), className: 'scene-tag -translate-y-1/2', children: <><small>F</small>{movF} N</> },
    { id: 'Gf', at: world([-5, -60 + riseF]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>G</small>{r.G} N</> },
    { id: 'Gm', at: world([18, -86 + riseM]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>G</small>{r.G} N</> },
    ...(top ? [{ id: 'hs', at: world([0, -100]), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: <><small>钩码升高</small>{cm(r.h)} cm<small className="ml-2">绳端移动</small>{cm(r.s)} cm</> }] : []),
    { id: 'n1', at: world([-12, 4]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '定滑轮' },
    { id: 'n2', at: world([29, -70 + riseM]), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '动滑轮' },
  ]
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="滑轮"
      stage={<Place at="l5" labels={labels}>
        <group position={[X, TOP, BZ]}><Frame w={96} h={H}>
          <group position={[6 * U, 0, 4 * U]}><MeterStick len={100} /></group>
        </Frame></group>
        <group position={ORG}>
          <PulleyRig def={FIX} rise={riseF} out={out} F={fixF} light />
          <PulleyRig def={MOV} rise={riseM} F={movF} light />
        </group>
        <group position={[X + 4.0, TOP, BZ + 1.2]} rotation-y={-0.3}><HookBox n={6} /></group>
      </Place>}
      lesson={<LessonBlock no="5" title="定滑轮和动滑轮" concept="定滑轮改变方向，动滑轮省一半力" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>轴固定不动的滑轮叫<b className="text-white">定滑轮</b>；轴和重物一起移动的滑轮叫<b className="text-white">动滑轮</b>。</p>
          <p className="mt-3">使用定滑轮不省力，但可以改变力的方向；绳端移动的距离等于物体升高的距离。定滑轮实质是一个等臂杠杆：支点在轴上，两边的力臂都是轮的半径。</p>
          <p className="mt-3">使用动滑轮能省一半的力，但不能改变力的方向，还要多移动一倍的距离：F = G ÷ 2，s = 2h。动滑轮实质是一个动力臂为阻力臂两倍的杠杆：支点在绳子和轮相切的那一边。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这里的两只滑轮是很轻的塑料轮，滑轮重、绳重和摩擦都不计。拉的时候要竖直、匀速。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两种滑轮都用过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">定滑轮改变力的方向，不省力；动滑轮省一半的力，费一倍的距离</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">提同样 {r.G} N 的钩码：定滑轮拉力 {fixF} N、绳端走 {cm(rig5('fixed').s)} cm；动滑轮拉力 {movF} N、绳端走 {cm(rig5('movable').s)} cm。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">测力计的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{r.F.toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <ScaleView F={r.F} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="G" value={`${r.G} N`} unit="4 只钩码" />
            <ParamTile symbol="F" value={`${r.F} N`} unit={NAME[opt]} />
            <ParamTile symbol="h" value={`${round(rise, 1)} cm`} unit="钩码升高" />
            <ParamTile symbol="s" value={`${round(rise * r.n, 1)} cm`} unit="绳端移动" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">实验数据</h2>
          <Table head={['滑轮', 'G/N', 'F/N', 'h/cm', 's/cm']} total={KEYS.length} hi={rows.length - 1}
            rows={rows.map(k => { const x = rig5(k); return [NAME[k].replace(' · ', ''), x.G, x.F, cm(x.h), cm(x.s)] })} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'lift'} onClick={lift} disabled={!ready || up[side]}>匀速提升 10 cm</LabButton>
        <LabButton pulse={next === 'lower'} onClick={lower} disabled={!up[side]}>放下</LabButton>
      </>}
      extras={
        <Control label="用哪种滑轮">
          <Segmented label="用哪种滑轮" pulse={next === 'opt'} want={next === 'opt' ? task!.id as Rig5 : null} disabled={up.fix || up.mov} value={opt} onChange={pick} options={KEYS.map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
