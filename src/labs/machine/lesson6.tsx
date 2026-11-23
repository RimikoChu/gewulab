// 简单机械 · 第 6 课 滑轮组：一副宽铁架下并排挂着三套滑轮组，每套下面都挂 6 只钩码（3 N）。
// 一定一动、绳端向下拉（2 段绳子吊着动滑轮）；同样一定一动、绳头拴在动滑轮上、绳端向上拉（3 段）；二定二动（4 段）。
// 各匀速提升 10 cm：数一数吊着动滑轮的绳子有几段，读拉力、看绳端走了多远。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Frame, MeterStick } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { WINDS, rig6, round, type Wind } from './physics'
import { PulleyRig, type RigDef } from './pulley'
import { ScaleView, Table } from './views'
import { BZ, ST, TOP, U, type V3 } from './world'

const H = 110, X = ST.l6, Y0 = TOP + H * U
const DEFS: Record<Wind, RigDef> = {
  n2: { fixed: [{ o: [-31, -1], wheels: [[0, -7]] }], mov: { o: [-37, -75], wheels: [[0, 5]] }, start: { on: 'frame', p: [-40, -1] }, wraps: [{ b: 'm', k: 0, w: 0, s: 1 }, { b: 'f', k: 0, w: 0, s: -1 }], out: [0, -1], free0: 14, hooks: 6, hang: 'mov' },
  n3: { fixed: [{ o: [-5, -1], wheels: [[0, -7]] }], mov: { o: [-2, -75], wheels: [[3, 5]], eyes: [[-6, 5]] }, start: { on: 'mov', p: [-6, 5] }, wraps: [{ b: 'f', k: 0, w: 0, s: -1 }, { b: 'm', k: 0, w: 0, s: 1 }], out: [0, 1], free0: 6, hooks: 6, hang: 'mov' },
  n4: { fixed: [{ o: [29, -1], wheels: [[-6, -7], [6, -7]] }], mov: { o: [23, -75], wheels: [[-6, 5], [6, 5]] }, start: { on: 'frame', p: [14, -1] }, wraps: [{ b: 'm', k: 0, w: 0, s: 1 }, { b: 'f', k: 0, w: 0, s: -1 }, { b: 'm', k: 0, w: 1, s: 1 }, { b: 'f', k: 0, w: 1, s: -1 }], out: [0, -1], free0: 12, hooks: 6, hang: 'mov' },
}
/** 吊着动滑轮的那几段绳子在哪（x，cm）、从多高到多高 */
const STRANDS: Record<Wind, { x: number[]; top: number }> = { n2: { x: [-40, -34], top: -8 }, n3: { x: [-8, -2, 4], top: -8 }, n4: { x: [14, 20, 26, 32], top: -8 } }
const KEYS: Wind[] = ['n2', 'n3', 'n4']
const cm = (x: number) => round(x * 100, 1)
const TASKS: Task[] = KEYS.map(k => { const r = rig6(k); return { id: k, text: `${WINDS[k].name}：匀速提升 10 cm`, note: `${r.n} 段绳子吊着动滑轮：拉力 ${round(r.F, 2)} N，是物重的 1/${r.n}；绳端移动 ${cm(r.s)} cm，是 ${r.n} 倍` } })
const world = (p: [number, number]): V3 => [X + p[0] * U, Y0 + p[1] * U, BZ]

export default function Lesson6() {
  const [w, setW] = useState<Wind>('n2')
  const [up, setUp] = useState(false)
  const [rows, setRows] = useState<Wind[]>([])
  const T = useTasks('gewu:machine:6', TASKS)
  const rise = useSlide(up ? 10 : 0, 4)
  const r = rig6(w), top = up && rise >= 10
  useEffect(() => { if (!top || rows.includes(w)) return; const next = [...rows, w]; setRows(next); T.check(id => next.includes(id as Wind)) })   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: Wind) => { if (up || rise > 0) return; setW(k) }
  const resetAll = () => { setW('n2'); setUp(false); setRows([]); T.reset() }
  const task = T.current, ready = true
  const { hint, next }: { hint: string; next: 'wind' | 'lift' | 'lower' | null } = !task ? { hint: '吊着动滑轮的绳子有几段，拉力就是物重的几分之一，绳端就要走几倍的距离。', next: null }
    : up && !top ? { hint: '匀速往上提，看绳端走了多远…', next: null }
    : top ? { hint: `数一数：${r.n} 段绳子吊着动滑轮。记下了，按“放下”`, next: 'lower' }
    : rise > 0 ? { hint: '钩码慢慢放回去…', next: null }
    : task.id !== w ? { hint: `换成“${WINDS[task.id as Wind].name}”`, next: 'wind' }
    : { hint: `测力计的示数是 ${round(r.F, 2)} N。按“匀速提升 10 cm”`, next: 'lift' }
  const S = STRANDS[w], my = -70 + rise
  const labels: Label[] = [
    ...S.x.map((x, i) => ({ id: `s${i}`, at: world([x, (S.top + my) / 2 + (i % 2 ? 6 : -2)]), ax: 0.5, className: 'scene-tag key -translate-y-1/2', children: String(i + 1) })),
    { id: 'F', at: world(w === 'n3' ? [8, -64 + 3 * rise + 14] : w === 'n2' ? [-24, -22 - 2 * rise - 16] : [42, -20 - 4 * rise - 16]), className: 'scene-tag -translate-y-1/2', children: <><small>F</small>{round(r.F, 2)} N</> },
    { id: 'G', at: world([(w === 'n2' ? -37 : w === 'n3' ? -2 : 23) - 3, -92 + rise]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>G</small>{r.G} N</> },
    ...(top ? [{ id: 'hs', at: world([w === 'n4' ? 0 : 26, -102]), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>钩码升高</small>{cm(r.h)} cm<small className="ml-2">绳端移动</small>{cm(r.s)} cm</> }] : []),
    { id: 'n1', at: world([-31, 4]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '定滑轮' },
    { id: 'n2', at: world([-46, -70]), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '动滑轮' },
  ]
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="滑轮组"
      stage={<Place at="l6" labels={labels}>
        <group position={[X, TOP, BZ]}><Frame w={100} h={H}>
          <group position={[-14 * U, 0, 4 * U]}><MeterStick len={100} /></group>
        </Frame></group>
        <group position={[X, Y0, BZ]}>
          {KEYS.map(k => <PulleyRig key={k} def={DEFS[k]} rise={k === w ? rise : 0} F={rig6(k).F} light />)}
        </group>
      </Place>}
      lesson={<LessonBlock no="6" title="滑轮组" concept="几段绳子吊着动滑轮，就省几分之几的力" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>定滑轮和动滑轮组合起来就是<b className="text-white">滑轮组</b>：既能省力，又能改变力的方向。</p>
          <p className="mt-3">数一数有几段绳子吊着动滑轮（和动滑轮一起移动的那几段），记作 n。不计动滑轮重、绳重和摩擦时：</p>
          <p className="mt-2 text-center font-formula text-[18px] italic">F = G ÷ n，s = n h</p>
          <p className="mt-3">同样是一只定滑轮、一只动滑轮：绳头拴在定滑轮上，n = 2，绳端向下拉；绳头拴在动滑轮上，n = 3，绳端向上拉。n 是奇数时绳头拴在动滑轮上，偶数时拴在定滑轮（或横梁）上——“奇动偶定”。</p>
          <p className="mt-3 text-[13.5px] text-white/65">省了力就要多移动距离，不能既省力又省距离。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种绕法都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">n 段绳子吊着动滑轮：F = G ÷ n，s = n h</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">提同样 {r.G} N 的钩码，n = 2、3、4 时拉力是 {KEYS.map(k => round(rig6(k).F, 2)).join('、')} N，绳端分别走了 {KEYS.map(k => cm(rig6(k).s)).join('、')} cm。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">测力计的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{r.F.toFixed(2)}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <ScaleView F={r.F} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="n" value={String(r.n)} unit="吊着动滑轮的绳子段数" />
            <ParamTile symbol="G" value={`${r.G} N`} unit="6 只钩码" />
            <ParamTile symbol="h" value={`${round(rise, 1)} cm`} unit="钩码升高" />
            <ParamTile symbol="s" value={`${round(rise * r.n, 1)} cm`} unit="绳端移动" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">实验数据</h2>
          <Table head={['n', 'G/N', 'F/N', 'h/cm', 's/cm']} total={KEYS.length} hi={rows.length - 1}
            rows={rows.map(k => { const x = rig6(k); return [x.n, x.G, round(x.F, 2), cm(x.h), cm(x.s)] })} />
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'lift'} onClick={() => setUp(true)} disabled={up}>匀速提升 10 cm</LabButton>
        <LabButton pulse={next === 'lower'} onClick={() => setUp(false)} disabled={!up}>放下</LabButton>
      </>}
      extras={
        <Control label="绕法">
          <Segmented label="绕法" pulse={next === 'wind'} want={next === 'wind' ? task!.id as Wind : null} disabled={up || rise > 0} value={w} onChange={pick} options={KEYS.map(k => ({ value: k, label: WINDS[k].name }))} />
        </Control>
      }
    />
  )
}
