// 图形的变换 · 第 4 课 风车叶片：后墙上挂着一块松木板，正中一颗黄铜轴钉 O，钉着一片三角形的叶片 OAB。
// 让叶片绕 O 逆时针转过去，量一量 OA 和 OA′、∠AOA′ 和 ∠BOB′；一片一片转下去，拼成风车。90° 拼四叶，120° 拼三叶；拼好后整架风车转一下，看出转多少度和自己重合。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Arc, BrassPin, Dot, Fig, GloveOn, TILE, PLine, Place, Plane, ease, pt, seg, tagStyle, toWorld, useRun } from './parts'
import { ANG4, BLADE, GRID4, blades4, cm, deg, rotate, type Ang4, type P } from './physics'
import { ST } from './world'
import { polyFace } from './crafts'

const KEYS = Object.keys(ANG4) as Ang4[]
const TASKS: Task[] = [
  { id: 't90', text: '绕 O 旋转 90°，量 OA、OA′ 和旋转角', note: 'OA = OA′ = 30.0 cm，∠AOA′ = ∠BOB′ = 90°' },
  { id: 'four', text: '再转两次，拼成四叶风车', note: '四片叶片一样大；整架风车转 90° 就和自己重合' },
  { id: 't120', text: '换 120°，拼一个三叶风车', note: '每片转 120°，三片正好转满一圈 360°' },
]
const K = GRID4 / 100, O: [number, number, number] = [ST.l4.x, ST.l4.y, ST.l4.z]
const W = toWorld(O, K, false)
const TRI: P[] = [BLADE.O, BLADE.A, BLADE.B]
const T = 0.005   // 叶片是 5 mm 厚的椴木胶合板，面上刷漆画花
const BOX: [number, number, number, number] = [0, 0, 6, 4]
const paint = (w: 'src' | 'img') => polyFace(TRI, TILE[w].base, TILE[w].ink, TILE[w].light)

export default function Lesson4() {
  const [ang, setAng] = useState<Ang4>('a90')
  const [n, setN] = useState(1)               // 板上有几片叶片（第一片是原图）
  const [measured, setMeasured] = useState(false)
  const [spun, setSpun] = useState(false)
  const Tk = useTasks('gewu:transform:4', TASKS)
  const r = blades4(ang)
  const spin = useRun(2.2, () => { setSpun(true); Tk.check(id => (id === 'four' && ang === 'a90') || (id === 't120' && ang === 'a120')) })
  const turn = useRun(1.9, () => { const m = n + 1; setN(m); if (m >= r.count) spin.run() })
  const meas = useRun(1.6, () => { setMeasured(true); Tk.check(id => id === 't90' && ang === 'a90') })
  const busy = turn.busy || meas.busy || spin.busy
  const full = n >= r.count
  const pick = (k: Ang4) => { if (busy) return; setAng(k); setN(1); setMeasured(false); setSpun(false); turn.snap(0); meas.snap(0); spin.snap(0) }
  const resetAll = () => { pick('a90'); Tk.reset() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'ang' | 'turn' | 'meas' | null } = (() => {
    if (!task) return { hint: '对应点到旋转中心的距离相等，对应点和中心连线的夹角都等于旋转角。', next: null }
    if (turn.busy) return { hint: '绕轴钉转过去…', next: null }
    if (meas.busy) return { hint: '量一量…', next: null }
    if (spin.busy) return { hint: '整架风车转一下…', next: null }
    const want: Ang4 = task.id === 't120' ? 'a120' : 'a90'
    if (ang !== want) return { hint: `换成转 ${ANG4[want].name}`, next: 'ang' }
    if (task.id === 't90') {
      if (n < 2) return { hint: '把叶片绕轴钉 O 逆时针旋转 90°', next: 'turn' }
      if (!measured) return { hint: '量一量：OA 和 OA′ 一样长吗？∠AOA′ 和 ∠BOB′ 是多少度？', next: 'meas' }
    }
    if (!full) return { hint: n < 2 ? `把叶片绕轴钉 O 逆时针旋转 ${ANG4[ang].name}` : `再转一片：还是绕 O 转 ${ANG4[ang].name}`, next: 'turn' }
    return { hint: '整架风车转一下…', next: null }
  })()

  const showM = measured ? 1 : meas.k, first = n >= 2 || turn.busy
  const A1 = r.A1, B1 = r.B1
  const labels: Label[] = [
    { id: 'o', at: W(-0.6, -0.6, 0.02), ax: 1, className: 'scene-tag -translate-y-1/2', style: { background: '#1d2327', color: '#fff', boxShadow: 'none' }, children: 'O' },
    { id: 'a', at: W(BLADE.A[0] + 0.5, BLADE.A[1] - 0.5, 0.01), ax: 0, className: 'scene-tag -translate-y-1/2', style: tagStyle('src'), children: pt('src', 0) },
    { id: 'b', at: W(BLADE.B[0] + 0.5, BLADE.B[1] + 0.3, 0.01), ax: 0, className: 'scene-tag -translate-y-1/2', style: tagStyle('src'), children: pt('src', 1) },
    { id: 'a1', at: W(A1[0] + (ang === 'a90' ? 0.5 : -0.4), A1[1] + 0.5, 0.01), ax: ang === 'a90' ? 0 : 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('img', { opacity: n >= 2 && !spin.busy ? 1 : 0 }), children: pt('img', 0) },
    { id: 'b1', at: W(B1[0] - 0.5, B1[1], 0.01), ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: tagStyle('img', { opacity: n >= 2 && !spin.busy ? 1 : 0 }), children: pt('img', 1) },
    { id: 'oa', at: W(BLADE.A[0] / 2, -0.8, 0.01), ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(showM, 0.3, 0.5) * (spin.busy ? 0 : 1), fontSize: 14 }, children: <><small>OA</small>{cm(r.OA)}</> },
    { id: 'oa1', at: W(A1[0] / 2 + (ang === 'a90' ? -0.6 : 0.4), A1[1] / 2, 0.01), ax: ang === 'a90' ? 1 : 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: seg(showM, 0.3, 0.5) * (spin.busy ? 0 : 1), fontSize: 14 }, children: <><small>OA′</small>{cm(r.OA1)}</> },
    { id: 'ang', at: W(2.6 * Math.cos(r.deg / 2 * Math.PI / 180) + 0.3, 2.6 * Math.sin(r.deg / 2 * Math.PI / 180) + 0.3, 0.01), ax: 0, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: seg(showM, 0.7, 0.9) * (spin.busy ? 0 : 1) }, children: <><small>∠AOA′</small>{deg(r.angA)}</> },
    { id: 'self', at: W(0, -7, 0.01), ax: 0.5, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: spun ? 1 : 0 }, children: `转 ${ANG4[ang].name} 和自己重合` },
    { id: 'n1', at: W(-8.4, 8.4, 0.02), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '风车板 · 一格 5 cm' },
  ]
  const spinA = spin.busy ? r.deg * ease(spin.k) : 0
  return (
    <LabShell title="图形的变换" lessons={LESSONS} current="4" narration={voiced(NARRATION['4'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel="叶片"
      stage={<Place at="l4" labels={labels}><BoardScene n={n} step={r.deg} turnK={turn.busy ? turn.k : 0} measure={showM} spinA={spinA} first={first} /></Place>}
      lesson={<LessonBlock no="4" title="风车叶片" concept="对应点到旋转中心距离相等" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>把一个平面图形绕着平面内某一点 O 转动一个角度，叫做图形的<b className="text-white">旋转</b>。点 O 叫做<b className="text-white">旋转中心</b>，转动的角叫做<b className="text-white">旋转角</b>。旋转还要说明方向：顺时针还是逆时针。</p>
          <p className="mt-3">旋转的性质：对应点到旋转中心的<b className="text-white">距离相等</b>；对应点与旋转中心所连线段的夹角<b className="text-white">等于旋转角</b>；旋转前后的图形全等。</p>
          <p className="mt-3">四叶风车每片转 90°，转四次回到原处；整架风车转 90° 就和原来重合。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">绕 O 旋转：对应点到 O 的距离相等，转过的角都等于旋转角</p>
        <p className="mt-1 text-[14px] text-white/70">OA = OA′ = 30.0 cm，OB = OB′ = 25.0 cm，∠AOA′ = ∠BOB′ = 90°。四叶风车转 90° 和自己重合，三叶风车转 120° 和自己重合；叶片的形状和大小一直没变。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">旋转角 ∠AOA′ · ∠BOB′</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{showM >= 1 ? `${deg(r.angA)} · ${deg(r.angB)}` : '—'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="OA" value={showM >= 1 ? r.OA.toFixed(1) : '—'} unit="cm" />
            <ParamTile symbol="OA′" value={showM >= 1 ? r.OA1.toFixed(1) : '—'} unit="cm" />
            <ParamTile symbol="OB" value={showM >= 1 ? r.OB.toFixed(1) : '—'} unit="cm" />
            <ParamTile symbol="OB′" value={showM >= 1 ? r.OB1.toFixed(1) : '—'} unit="cm" />
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5">
            <div className="text-[12.5px] text-white/55">板上的叶片</div>
            <div className="mt-0.5 text-[18px] font-bold tabular-nums">{n} / {r.count} 片<span className="ml-2 text-[13px] font-normal text-white/55">每片转 {ANG4[ang].name}</span></div>
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'turn'} onClick={turn.run} disabled={busy || full}>{n < 2 ? `旋转 ${ANG4[ang].name}` : '再转一片'}</LabButton>
        <LabButton primary pulse={next === 'meas'} onClick={meas.run} disabled={busy || n < 2 || measured}>量一量</LabButton>
      </>}
      extras={<Control label="旋转角"><Segmented label="旋转角" pulse={next === 'ang'} want={next === 'ang' ? (task?.id === 't120' ? 'a120' : 'a90') : null} disabled={busy} value={ang} onChange={pick} options={KEYS.map(k => ({ value: k, label: ANG4[k].name }))} /></Control>}
    />
  )
}

/** 风车板上的器材：蓝色的原叶片、一片片转出来的橙色叶片、黄铜轴钉；量的时候画出 OA、OA′、OB、OB′ 和两段角弧 */
function BoardScene({ n, step, turnK, measure, spinA, first }: { n: number; step: number; turnK: number; measure: number; spinA: number; first: boolean }) {
  const blades = Array.from({ length: n }, (_, i) => i)
  const moving = turnK > 0, a0 = (n - 1) * step, aNow = a0 + step * ease(turnK)
  const A1 = rotate(BLADE.A, BLADE.O, step), B1 = rotate(BLADE.B, BLADE.O, step)
  const mk1 = seg(measure, 0, 0.5), mk2 = seg(measure, 0.5, 1)
  const ba = Math.atan2(BLADE.B[1], BLADE.B[0]) * 180 / Math.PI
  return (
    <Plane o={O} flat={false}>
      {/* 板前一盏补光：风车板在廊下，正面亮一些 */}
      <pointLight position={[0.1, 0.3, 1.1]} intensity={1.6} distance={3} decay={1.2} color="#fff2e0" />
      <group rotation-z={spinA * Math.PI / 180}>
        {blades.map(i => <group key={i} rotation-z={i * step * Math.PI / 180} position={[0, 0, 0.0005 + i * 0.0002]}>
          <Fig pts={TRI} k={K} t={T} color="#ffffff" kind="wood" map={paint(i === 0 ? 'src' : 'img')} uvBox={BOX} side="#e2c493" />
        </group>)}
        {/* 正在转的那一片：从上一片的位置出发，绕 O 转过去 */}
        {moving && <group rotation-z={aNow * Math.PI / 180} position={[0, 0, T + 0.002]}>
          <Fig pts={TRI} k={K} t={T} color="#ffffff" kind="wood" map={paint('img')} uvBox={BOX} side="#e2c493" />
          <GloveOn x={4.6 * K} y={1.4 * K} yaw={-0.9} lift={T} arm={0.05} scale={0.72} />
        </group>}
      </group>
      {/* 点 */}
      {spinA === 0 && <>
        <Dot at={BLADE.A} k={K} z={T + 0.001} who="src" r={0.007} />
        <Dot at={BLADE.B} k={K} z={T + 0.001} who="src" r={0.007} />
        {first && !moving && <><Dot at={A1} k={K} z={T + 0.002} who="img" r={0.007} /><Dot at={B1} k={K} z={T + 0.002} who="img" r={0.007} /></>}
      </>}
      {/* 量一量：先画 OA、OA′ 和 ∠AOA′，再画 OB、OB′ 和 ∠BOB′ */}
      {measure > 0 && spinA === 0 && <>
        <PLine pts={[BLADE.O, BLADE.A]} k={K} z={T + 0.004} w={2.6} dash={0.012} opacity={mk1} />
        <PLine pts={[BLADE.O, A1]} k={K} z={T + 0.004} w={2.6} dash={0.012} opacity={mk1} />
        <Arc o={BLADE.O} r={2.6} a0={0} a1={step * ease(mk1)} k={K} z={T + 0.004} />
        <PLine pts={[BLADE.O, BLADE.B]} k={K} z={T + 0.004} w={2} dash={0.01} opacity={mk2} />
        <PLine pts={[BLADE.O, B1]} k={K} z={T + 0.004} w={2} dash={0.01} opacity={mk2} />
        {mk2 > 0 && <Arc o={BLADE.O} r={4.2} a0={ba} a1={ba + step * ease(mk2)} k={K} z={T + 0.004} color="#bfe8ff" w={2} />}
      </>}
      <group position={[0, 0, n * 0.0002 + T * 2 + 0.003]}><BrassPin r={0.016} /></group>
    </Plane>
  )
}
