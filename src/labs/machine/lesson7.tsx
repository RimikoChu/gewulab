// 简单机械 · 第 7 课 机械效率：测滑轮组的机械效率。一套钢滑轮组（一定一动，绳端向上拉，3 段绳子吊着动滑轮），
// 分别挂 2、4、6 只钩码，各匀速提升 10 cm，读拉力、量绳端移动的距离，算有用功、总功和机械效率：提的东西越重，机械效率越高。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { Frame, HOOK_PITCH, HookBox, MeterStick } from './gear'
import { HangChain } from './hang'
import { LESSONS, goLesson } from './lessons'
import { Place } from './parts'
import { EFF, holdPull, hooksN, lift, pct, round } from './physics'
import { PulleyRig, type RigDef } from './pulley'
import { ScaleView, Table, WorkBar } from './views'
import { BZ, ST, TOP, U, type V3 } from './world'

const H = 125, X = ST.l7, Y0 = TOP + H * U, BOX: V3 = [X + 3.0, TOP, BZ + 1.2]
const def = (k: number): RigDef => ({ fixed: [{ o: [-3, -1], wheels: [[0, -7]] }], mov: { o: [0, -86], wheels: [[3, 5]], eyes: [[-6, 5]] }, start: { on: 'mov', p: [-6, 5] }, wraps: [{ b: 'f', k: 0, w: 0, s: -1 }, { b: 'm', k: 0, w: 0, s: 1 }], out: [0, 1], free0: 6, hooks: k, hang: 'mov' })
const DEFS = Object.fromEntries([2, 4, 6].map(k => [k, def(k)])) as Record<number, RigDef>
type K = (typeof EFF.loads)[number]
const cm = (x: number) => round(x * 100, 1)
const TASKS: Task[] = EFF.loads.map(k => { const r = lift(k); return { id: `k${k}`, text: `挂 ${k} 只钩码（${r.G} N），匀速提升 10 cm，记下数据`, note: `有用功 ${round(r.Wu, 2)} J，总功 ${round(r.Wt, 2)} J，机械效率 ${pct(r.eta)}` } })

export default function Lesson7() {
  const [k, setK] = useState<K>(2)
  const [shown, setShown] = useState(2)                       // 已经挂在动滑轮下面的钩码
  const [extra, setExtra] = useState<{ n: number; on: boolean; add: boolean }>({ n: 0, on: false, add: true })
  const [carrying, setCarrying] = useState(false)
  const [up, setUp] = useState(false)
  const [rows, setRows] = useState<K[]>([])
  const T = useTasks('gewu:machine:7', TASKS)
  const rise = useSlide(up ? 10 : 0, 4), top = up && rise >= 10, moving = up && !top
  const r = lift(shown)
  const F = up ? r.F : holdPull(shown)                         // 拉动起来才有摩擦那一份；提到顶以后手还拉着，读数照旧
  // 换钩码：多了就从盒里拿过来挂在最下面，少了就从最下面取走放回盒里
  useEffect(() => {
    if (carrying || up || rise > 0 || k === shown) return
    // 先在出发的地方放好（拿来的在盒里，取走的在最下面），下一刻再动身
    if (k > shown) setExtra({ n: k - shown, on: false, add: true }); else { setExtra({ n: shown - k, on: true, add: false }); setShown(k) }
    setCarrying(true)
  }, [k, shown, carrying, up, rise])
  useEffect(() => { if (!carrying || extra.n === 0) return; const t = setTimeout(() => setExtra(e => ({ ...e, on: e.add })), 60); return () => clearTimeout(t) }, [carrying, extra.n])
  const landed = (m: boolean) => { if (m) return; if (extra.add) setShown(s => s + extra.n); setExtra({ n: 0, on: false, add: true }); setCarrying(false) }
  const done = rows.includes(shown as K)
  const record = () => { if (!top || done) return; const next = [...rows, shown as K]; setRows(next); T.check(id => next.includes(+id.slice(1) as K)) }
  const resetAll = () => { setK(2); setShown(2); setExtra({ n: 0, on: false, add: true }); setCarrying(false); setUp(false); setRows([]); T.reset() }
  const task = T.current, want = task ? +task.id.slice(1) as K : null
  const { hint, next }: { hint: string; next: 'k' | 'lift' | 'record' | 'lower' | null } = !task ? { hint: '额外功差不多不变，提的东西越重，有用功占的比例越大，机械效率越高。', next: null }
    : carrying || k !== shown ? { hint: '换钩码…', next: null }
    : moving ? { hint: `匀速拉动时读数：${F.toFixed(2)} N`, next: null }
    : top && !done ? { hint: `钩码升高 ${cm(r.h)} cm，绳端移动 ${cm(r.s)} cm，拉力 ${r.F.toFixed(2)} N。按“记录数据”`, next: 'record' }
    : top ? { hint: '记下了。按“放下”', next: 'lower' }
    : rise > 0 ? { hint: '钩码慢慢放回去…', next: null }
    : want !== shown ? { hint: `换成挂 ${want} 只钩码`, next: 'k' }
    : { hint: `拉着不动时读数是 ${F.toFixed(2)} N，不准：要在匀速拉动时读。按“匀速提升 10 cm”`, next: 'lift' }
  const bottom: V3 = [X, Y0 + (-86 + rise) * U - shown * HOOK_PITCH, BZ]
  const labels: Label[] = [
    { id: 'F', at: [X + 10 * U, Y0 + (-75 + 3 * rise + 14) * U, BZ], className: 'scene-tag -translate-y-1/2', children: <><small>F</small>{F.toFixed(2)} N</> },
    { id: 'G', at: [X - 3 * U, Y0 + (-95 + rise) * U, BZ], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>G</small>{hooksN(shown)} N</> },
    ...(top ? [{ id: 'hs', at: [X + 14 * U, Y0 - 112 * U, BZ] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>h</small>{cm(r.h)} cm<small className="ml-2">s</small>{cm(r.s)} cm</> }] : []),
    { id: 'n1', at: [X - 9 * U, Y0 - 81 * U, BZ], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '动滑轮和挂钩重 0.5 N' },
    { id: 'n2', at: [BOX[0], TOP + 0.55, BOX[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '钩码 · 每只 0.5 N' },
  ]
  return (
    <LabShell title="简单机械" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="滑轮组"
      stage={<Place at="l7" labels={labels}>
        <group position={[X, TOP, BZ]}><Frame w={56} h={H}>
          <group position={[16 * U, 0, 4 * U]}><MeterStick len={100} /></group>
        </Frame></group>
        <group position={[X, Y0, BZ]}><PulleyRig def={DEFS[shown] ?? def(shown)} rise={rise} F={F} /></group>
        {extra.n > 0 && <HangChain n={extra.n} at={extra.on ? bottom : null} box={BOX} onMove={landed} />}
        <group position={BOX}><HookBox n={8} /></group>
      </Place>}
      lesson={<LessonBlock no="7" title="机械效率" concept="提得越重，滑轮组的机械效率越高" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>用滑轮组提钩码：对钩码做的功是我们需要的，叫<b className="text-white">有用功</b> W有 = G h；同时还不得不把动滑轮提上去、克服摩擦，这些功叫<b className="text-white">额外功</b> W额；拉力做的功是<b className="text-white">总功</b> W总 = F s = W有 + W额。</p>
          <p className="mt-3">有用功跟总功的比值叫<b className="text-white">机械效率</b>：</p>
          <p className="mt-2 text-center font-formula text-[18px] italic">η = W有 ÷ W总</p>
          <p className="mt-3">额外功总是存在，机械效率总小于 1。同一个滑轮组，额外功差不多不变，提的东西越重，有用功占的比例越大，机械效率越高。</p>
          <p className="mt-3 text-[13.5px] text-white/65">测拉力要竖直向上、匀速拉动时读：拉着不动时没有摩擦，读数偏小，算出的机械效率偏大。这套滑轮组的摩擦折合到绳端约 {EFF.f} N。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记下了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">同一个滑轮组，提的物体越重，机械效率越高</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">挂 2、4、6 只钩码，机械效率依次是 {EFF.loads.map(x => pct(lift(x).eta)).join('、')}；额外功每次都是 {round(lift(2).Wx, 2)} J。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">机械效率</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{done || top ? pct(r.eta) : '—'}</div>
          </div>
          <ScaleView F={F} max={3} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="W有" value={top ? `${round(r.Wu, 2)} J` : '—'} unit={`G h = ${r.G} N × ${r.h} m`} />
            <ParamTile symbol="W总" value={top ? `${round(r.Wt, 2)} J` : '—'} unit={`F s = ${r.F.toFixed(2)} N × ${round(r.s, 2)} m`} />
          </div>
          {top && <WorkBar useful={r.Wu} extra={r.Wx} max={lift(6).Wt} />}
          <h2 className="mt-4 text-[12.5px] text-white/55">实验数据</h2>
          <Table head={['G/N', 'h/m', 'F/N', 's/m', 'W有/J', 'W总/J', 'η']} total={EFF.loads.length} hi={rows.length - 1}
            rows={rows.map(x => { const q = lift(x); return [q.G, q.h, q.F.toFixed(2), round(q.s, 2), round(q.Wu, 2), round(q.Wt, 2), pct(q.eta)] })} />
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'lift'} pulse={next === 'lift'} onClick={() => !carrying && k === shown && setUp(true)} disabled={up || carrying || k !== shown}>匀速提升 10 cm</LabButton>
        <LabButton primary={next === 'record'} pulse={next === 'record'} onClick={record} disabled={!top || done}>记录数据</LabButton>
        <LabButton pulse={next === 'lower'} onClick={() => setUp(false)} disabled={!up || !top}>放下</LabButton>
      </>}
      extras={
        <Control label="钩码">
          <Segmented label="钩码" pulse={next === 'k'} want={next === 'k' && want ? String(want) : null} disabled={up || rise > 0 || carrying} value={String(k)} onChange={v => setK(+v as K)} options={EFF.loads.map(x => ({ value: String(x), label: `${x} 只` }))} />
        </Control>
      }
    />
  )
}
