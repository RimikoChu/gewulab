// 力和运动 · 第 5 课 惯性：冰面上两只雪橇。前面一只上放着一只没绑住的木箱：猛拉雪橇，木箱留在后面；雪橇撞上挡板停住，木箱继续向前滑。
// 再用同样大的力同时推轻、重两只雪橇：质量大的运动状态难改变。雪橇和木箱每个时刻的位置都由计算核心给出。
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BOX_CM, Bumper, Cord, Crate, DECK_Y, Force, Place, Sled, setRod, useRun, type V3 } from './gear'
import { LESSONS, goLesson } from './lessons'
import { CRASH, CRATE, SAME, SLED, crashAt, crashEnd, crashSlide, crashSpeed, jerkAt, jerkEnd, sameShove, shoveAt } from './physics'
import { LANE, M, RINK, U } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Mode = 'jerk' | 'crash' | 'same'
const J = jerkEnd(), L = sameShove('light'), H = sameShove('heavy')
const TASKS: Task[] = [
  { id: 'jerk', text: '猛拉一下雪橇，看没绑住的木箱', note: `雪橇向前走了 ${J.sled.toFixed(2)} m，木箱只走了 ${J.box.toFixed(2)} m，在板面上落后了 ${J.lag.toFixed(2)} m：木箱要保持原来的静止状态` },
  { id: 'crash', text: '把雪橇慢慢推快，让它撞上挡板', note: `雪橇停住了，木箱又向前滑了 ${crashSlide().toFixed(2)} m：木箱要保持原来的运动状态` },
  { id: 'same', text: `用同样的 ${SAME.F} N 同时推两只雪橇 ${SAME.t} s`, note: `${SAME.light} kg 的到了 ${L.v.toFixed(2)} m/s，${SAME.heavy} kg 的只到 ${H.v.toFixed(2)} m/s：质量越大，惯性越大，运动状态越难改变` },
]
const X = RINK.sled, Z1 = LANE + 2.4, Z2 = LANE - 4.4, DECK = DECK_Y * U
/** 挡板迎着雪橇的那个面：雪橇走 CRASH.d 以后，翘起来的滑板头正好碰上 */
const WALL = X + CRASH.d * M + 68 * U
const END: Record<Mode, number> = { jerk: J.t, crash: crashEnd(), same: Math.max(L.tEnd, H.tEnd) }
/** 木箱在板面上的起始位置（m，板面正中是 0）：撞挡板那一次从猛拉以后落下的地方开始 */
const BOX0: Record<Mode, number> = { jerk: 0, crash: -J.lag, same: 0 }
/** 推力的箭头：每 10 N 画多长 */
const PER = 0.6

function Rig({ mode, run, onEnd }: { mode: Mode; run: number; onEnd: () => void }) {
  const s1 = useRef<THREE.Group>(null), s2 = useRef<THREE.Group>(null), box = useRef<THREE.Group>(null), rope = useRef<THREE.Mesh>(null), grip = useRef<THREE.Group>(null), push = useRef<THREE.Group>(null), tow = useRef<THREE.Group>(null)
  const cur = useRef({ a: 0, b: 0, c: 0 }), va = useRef(new THREE.Vector3()), vb = useRef(new THREE.Vector3())
  useRun(run, END[mode], (t, dt) => {
    const q = cur.current
    // 目标位置（m）：a 前面那只雪橇，b 后面那只，c 木箱在板面上的位置
    let a = 0, b = 0, c = BOX0[mode], pushing = false
    if (run > 0) {
      if (mode === 'jerk') { const k = jerkAt(t); a = k.sled; c = k.box - k.sled }
      else if (mode === 'crash') { const k = crashAt(t); a = k.sled; c = BOX0.crash + k.slide; pushing = k.sled < CRASH.d }
      else { const k = shoveAt(L, t); a = k.x; b = shoveAt(H, t).x; pushing = k.pushing }
      q.a = a; q.b = b; q.c = c
    } else { const e = 1 - Math.exp(-dt / 0.22); q.a += (a - q.a) * e; q.b += (b - q.b) * e; q.c += (c - q.c) * e }   // 没在跑：把雪橇和木箱慢慢摆回起点
    s1.current?.position.set(X + q.a * M, 0, Z1); s2.current?.position.set(X + q.b * M, 0, Z2); box.current?.position.set(q.c * M, DECK, 0)
    // 拉绳：从雪橇前头的环到前面的握把，绷直
    const gx = X + q.a * M + 61.5 * U + 1.1 * M
    setRod(rope.current, va.current.set(X + q.a * M + 63 * U, (DECK_Y - 1) * U, Z1), vb.current.set(gx, (DECK_Y + 4) * U, Z1))
    grip.current?.position.set(gx, (DECK_Y + 4) * U, Z1)
    const towing = mode === 'jerk'; if (rope.current) rope.current.visible = towing; if (grip.current) grip.current.visible = towing
    if (tow.current) tow.current.visible = towing && (run === 0 || t < 0.25)
    if (push.current) push.current.visible = mode !== 'jerk' && (run === 0 ? Math.abs(q.a) < 0.02 : pushing)
  }, onEnd)
  const same = mode === 'same', F = same ? SAME.F : SAME.F / 4, back: V3 = [-64 * U, (DECK_Y - 4) * U, 0]
  return <>
    <group ref={s1} position={[X, 0, Z1]}>
      <Sled />
      <group ref={box} position={[0, DECK, 0]}><Crate strap={same} /></group>
      <group ref={push}><Force from={back} dir={[1, 0, 0]} len={F / 10 * PER} color="#ffd24a" thick={1.2} /></group>
    </group>
    <group ref={s2} position={[X, 0, Z2]}>
      <Sled />
      {[-35, 0, 35].map(x => <group key={x} position={[x * U, DECK, 0]}><Crate strap /></group>)}
      {[-17.5, 17.5].map(x => <group key={x} position={[x * U, DECK + BOX_CM * U, 0]}><Crate strap /></group>)}
      {same && run === 0 && <Force from={back} dir={[1, 0, 0]} len={SAME.F / 10 * PER} color="#ffd24a" thick={1.2} />}
    </group>
    <Cord ref={rope} r={0.035} color="#c9b58a" />
    <group ref={grip}>
      <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.14, 0.14, 1.5, 12]} /><meshStandardMaterial color="#8c623c" roughness={0.7} /></mesh>
      <group ref={tow}><Force from={[0.3, 0, 0]} dir={[1, 0, 0]} len={3} color="#ffd24a" thick={1.2} /></group>
    </group>
    <group position={[WALL, 0, Z1]}><Bumper /></group>
  </>
}

export default function Lesson5() {
  const [mode, setMode] = useState<Mode>('jerk')
  const [run, setRun] = useState(0), n = useRef(0), timer = useRef(0)
  const [busy, setBusy] = useState(false), [seen, setSeen] = useState<Mode | null>(null)
  const [rows, setRows] = useState<Mode[]>([])
  const T = useTasks('gewu:force:5', TASKS)
  useEffect(() => () => clearTimeout(timer.current), [])
  // 每次先把雪橇摆回起点，再开始
  const start = (m: Mode) => { if (busy) return; const moved = run !== 0; setBusy(true); setSeen(null); setMode(m); setRun(0); timer.current = window.setTimeout(() => setRun(++n.current), moved || m !== mode ? 1100 : 60) }
  const ended = () => { setBusy(false); setSeen(mode); const next = rows.includes(mode) ? rows : [...rows, mode]; setRows(next); T.check(id => next.includes(id as Mode)) }
  const resetAll = () => { clearTimeout(timer.current); setMode('jerk'); setRun(0); setBusy(false); setSeen(null); setRows([]); T.reset() }
  const task = T.current
  const hint = !task ? '一切物体都有保持原来运动状态不变的性质，叫惯性；惯性的大小只跟质量有关。'
    : busy ? (mode === 'jerk' ? '盯住木箱…' : mode === 'crash' ? `慢慢推到 ${crashSpeed().toFixed(1)} m/s，前面就是挡板…` : '两只雪橇受到的推力一样大…')
    : task.id === 'jerk' ? '按“猛拉雪橇”' : task.id === 'crash' ? '按“推向挡板”' : '按“同力推两只”'
  const next = busy ? null : task?.id
  const at = (m: number, y: number, z: number): V3 => [X + m * M, y, z]
  const labels: Label[] = [
    { id: 'j', at: at(J.sled + J.box - J.sled, 5.2, Z1), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seen === 'jerk' ? 1 : 0 }, children: <><small>木箱在板面上落后</small>{J.lag.toFixed(2)} m</> },
    { id: 'c', at: at(CRASH.d + BOX0.crash + crashSlide(), 5.2, Z1), ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: seen === 'crash' ? 1 : 0 }, children: <><small>木箱又向前滑了</small>{crashSlide().toFixed(2)} m</> },
    { id: 's1', at: at(L.total, 5.2, Z1), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: seen === 'same' ? 1 : 0 }, children: <><small>{SAME.light} kg</small>{L.v.toFixed(2)} m/s</> },
    { id: 's2', at: at(H.total, 7.6, Z2), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: seen === 'same' ? 1 : 0 }, children: <><small>{SAME.heavy} kg</small>{H.v.toFixed(2)} m/s</> },
    { id: 'n1', at: at(0, 5.4, Z1), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `雪橇 ${SLED.m} kg + 木箱 ${CRATE.m} kg` },
    { id: 'n2', at: at(0, 7.8, Z2), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `雪橇 + 五只木箱 · ${SAME.heavy} kg` },
    { id: 'n3', at: [WALL + 1, 6.4, Z1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '挡板' },
  ]
  return (
    <LabShell title="力和运动" lessons={LESSONS} current="5" narration={voiced(NARRATION['5'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="雪橇"
      stage={<Place at="l5" labels={labels}><Rig mode={mode} run={run} onEnd={ended} /></Place>}
      lesson={<LessonBlock no="5" title="惯性" concept="物体总要保持原来的运动状态" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一切物体都有保持原来运动状态不变的性质，这种性质叫<b className="text-white">惯性</b>。牛顿第一定律也叫惯性定律。</p>
          <p className="mt-3">猛拉雪橇：木箱原来是静止的，板面给它的摩擦力很小，来不及把它带快，它就落在了后面。雪橇撞停：木箱原来在运动，雪橇停了它还要向前。汽车起动时人向后仰、急刹车时人向前倾，是一个道理。</p>
          <p className="mt-3">惯性是物体本身的属性，不是一种力，不能说“受到惯性”。<b className="text-white">惯性的大小只跟质量有关</b>：质量越大，运动状态越难改变。</p>
          <p className="mt-3 text-[13.5px] text-white/65">第三步里两只雪橇上的木箱都用绑带绑住了，免得它们在板面上滑动。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件事都做过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">一切物体都有惯性；质量越大，惯性越大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">静止的木箱要保持静止，运动的木箱要保持运动。同样 {SAME.F} N 的力推 {SAME.t} s，{SAME.light} kg 的雪橇到 {L.v.toFixed(2)} m/s，{SAME.heavy} kg 的只到 {H.v.toFixed(2)} m/s。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一遍</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">猛拉雪橇</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="s" value={rows.includes('jerk') ? `${J.sled.toFixed(2)} m` : '—'} unit="雪橇走了" />
            <ParamTile symbol="s′" value={rows.includes('jerk') ? `${J.box.toFixed(2)} m` : '—'} unit="木箱走了" />
            <ParamTile symbol="Δs" value={rows.includes('jerk') ? `${J.lag.toFixed(2)} m` : '—'} unit="木箱落后" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">撞上挡板</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="v" value={rows.includes('crash') ? `${crashSpeed().toFixed(1)} m/s` : '—'} unit="撞之前的速度" />
            <ParamTile symbol="s" value={rows.includes('crash') ? `${crashSlide().toFixed(2)} m` : '—'} unit="木箱又向前滑" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">同样的力推 {SAME.t} s</h2>
          {rows.includes('same')
            ? <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">质量</th><th className="text-right font-normal">推力</th><th className="text-right font-normal">速度</th><th className="text-right font-normal">一共滑了</th></tr></thead>
                <tbody>{([['light', L], ['heavy', H]] as const).map(([k, s]) => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5">{SAME[k]} kg</td><td className="text-right tabular-nums">{SAME.F} N</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{s.v.toFixed(2)} m/s</td><td className="text-right tabular-nums">{s.total.toFixed(2)} m</td></tr>)}</tbody>
              </table>
            : <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">一只 {SAME.light} kg，一只 {SAME.heavy} kg，推力都是 {SAME.F} N。</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'jerk'} pulse={next === 'jerk'} onClick={() => start('jerk')} disabled={busy}>猛拉雪橇</LabButton>
        <LabButton primary={next === 'crash'} pulse={next === 'crash'} onClick={() => start('crash')} disabled={busy}>推向挡板</LabButton>
        <LabButton primary={next === 'same'} pulse={next === 'same'} onClick={() => start('same')} disabled={busy}>同力推两只</LabButton>
      </>}
      extras={null}
    />
  )
}
