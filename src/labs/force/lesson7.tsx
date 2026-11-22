// 力和运动 · 第 7 课 滑动摩擦力：卷线器通过测力计匀速拉动长木板上的木块，这时拉力和摩擦力二力平衡，测力计的示数就是摩擦力的大小。
// 依次加砝码（改压力）、铺毛巾（改粗糙程度）、把木块侧放（改接触面积），看摩擦力跟什么有关。示数、木块的位置都由计算核心给出。
import { useRef, useState, type ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { BLOCK_CM, CLOTH_T, Cloth, Cord, Force, Place, SCALE_REACH, SCALE_RING, SpringScale, WINCH_Y, Winch, Wood, WoodBlock, blockEye, setRod, useRun, type V3 } from './gear'
import { LESSONS, goLesson } from './lessons'
import { CASES, DRAG, MU, SPRING_K, dragAt, dragEnd, friction, pressure, type Case7 } from './physics'
import { Diagram, ScaleView } from './views'
import { BENCH_Z, ST, TOP, U, type SpotKey } from './world'

const KEYS: Case7[] = ['base', 'load', 'towel', 'side']
const f2 = (k: Case7) => friction(k).toFixed(2)
const TASKS: Task[] = [
  { id: 'base', text: '匀速拉动平放在木板上的木块，读示数', note: `木块匀速运动时，拉力和摩擦力平衡：摩擦力等于示数 ${f2('base')} N` },
  { id: 'load', text: '在木块上加一只砝码，再拉', note: `压力从 ${pressure('base').toFixed(2)} N 变成 ${pressure('load').toFixed(2)} N，摩擦力变成 ${f2('load')} N：压力越大，滑动摩擦力越大` },
  { id: 'towel', text: '取下砝码，在木板上铺毛巾，再拉', note: `${f2('towel')} N：接触面越粗糙，滑动摩擦力越大` },
  { id: 'side', text: '撤掉毛巾，把木块侧放，再拉', note: `还是 ${f2('side')} N：滑动摩擦力的大小跟接触面积无关` },
]
const X = ST.l7, TOP_Y = 1.6, START = -34, WX = 36, ROLL_R = 0.4     // 木板厚、木块起点、卷线器的位置、圆铅笔的半径（厘米）
const P = (x: number, y: number, z = 0): V3 => [X + x * U, TOP + y * U, BENCH_Z + z * U]
/** 力的箭头：每 1 N 画多长 */
const PER = 1.0

/**
 * 拉木块的整套器材：长木板（可以铺毛巾）、木块、横着的测力计、细线、卷线器。face 接触面，load 加不加砝码，side 侧不侧放，
 * rollers 木块下面垫不垫圆铅笔，f 是这种情况下要用多大的力才拉得动（N）。木块挂在测力计的钩子上，跟着钩子走
 */
export function DragRig({ face, load = false, side = false, rollers = false, f, run, onEnd }: { face: 'wood' | 'towel'; load?: boolean; side?: boolean; rollers?: boolean; f: number; run: number; onEnd: () => void }) {
  const scale = useRef<THREE.Group>(null), cord = useRef<THREE.Mesh>(null), arrows = useRef<THREE.Group>(null), pens = useRef<THREE.Group>(null)
  const drive = useRef(0), turn = useRef(0), cur = useRef(0), a = useRef(new THREE.Vector3()), b = useRef(new THREE.Vector3())
  const eye = blockEye(side), lift = (face === 'towel' ? CLOTH_T.towel : 0) + (rollers ? ROLL_R * 2 : 0), axis = (TOP_Y + lift) * U + eye.y
  /** 没拉的时候提环顶在哪（画面单位，从这一处的原点算） */
  const ring0 = START * U + eye.x + SCALE_REACH + SCALE_RING
  useRun(run, dragEnd() + 0.8, (t, dt) => {
    const k = dragAt(f, t)
    cur.current = run === 0 ? cur.current + (0 - cur.current) * (1 - Math.exp(-dt / 0.25)) : k.ring     // 没在拉：把木块和测力计慢慢摆回起点
    drive.current = run === 0 ? 0 : k.F
    const ring = ring0 + cur.current * 100 * U
    scale.current?.position.set(ring - SCALE_RING, axis, 0)
    setRod(cord.current, a.current.set(ring, axis, 0), b.current.set((WX - 0.2) * U, TOP_Y * U + WINCH_Y, 0))
    turn.current = cur.current * 100 / 1.2
    if (arrows.current) arrows.current.visible = run > 0 && k.block > 0
    pens.current?.children.forEach(c => { c.rotation.y = Math.max(0, cur.current - f / SPRING_K) * 100 / 2 / ROLL_R })
  }, onEnd)
  return <>
    <RoundedBox args={[88 * U, TOP_Y * U, 15 * U]} radius={0.014} smoothness={2} position={[0, TOP_Y / 2 * U, 0]} castShadow receiveShadow><Wood kind="pine" rep={[3, 1]} /></RoundedBox>
    {face === 'towel' && <Towel />}
    <group position={[WX * U, TOP_Y * U, 0]}><Winch turn={turn} /></group>
    <Cord ref={cord} r={0.006} />
    <group ref={scale} rotation-z={-Math.PI / 2}>
      <SpringScale drive={drive}>
        <group rotation-z={Math.PI / 2} position={[0, 0, -0.1 * U]}>
          <group position={[-eye.x, -eye.y, 0]}>
            <WoodBlock side={side} load={load} />
            {rollers && <group ref={pens}>{[-3.4, 0, 3.4].map(x => <mesh key={x} position={[x * U, -ROLL_R * U, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[ROLL_R * U, ROLL_R * U, 13 * U, 6]} /><meshStandardMaterial color="#d9a531" roughness={0.5} /></mesh>)}</group>}
            <group ref={arrows} visible={false}>
              <Force from={[eye.x, eye.y, 0.4]} dir={[1, 0, 0]} len={f * PER} color="#ffd24a" thick={0.45} />
              <Force from={[0, 0.03, 0.4]} dir={[-1, 0, 0]} len={f * PER} color="#ff7a59" thick={0.45} />
            </group>
          </group>
        </group>
      </SpringScale>
    </group>
    {/* 木块的起点：木板前沿一道白线 */}
    <mesh position={[(START - BLOCK_CM.l / 2) * U, TOP_Y * U + 0.002, 6.6 * U]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.3 * U, 1.6 * U]} /><meshBasicMaterial color="#f1ede2" /></mesh>
  </>
}
/** 铺在长木板上的毛巾 */
function Towel() {
  return <RoundedBox args={[66 * U, CLOTH_T.towel * U, 12.4 * U]} radius={0.012} smoothness={2} position={[-8 * U, (TOP_Y + CLOTH_T.towel / 2) * U, 0]} receiveShadow castShadow><Cloth kind="towel" rep={[6, 1]} /></RoundedBox>
}

/** 一处拉木块的舞台：器材摆在第 7 处工作台上 */
export function DragStage({ at, labels, children }: { at: SpotKey; labels: Label[]; children: ReactNode }) {
  return <Place at={at} labels={labels}><group position={[X, TOP, BENCH_Z]}>{children}
    {/* 台面上备用的砝码和一卷毛巾 */}
    <group position={[14 * U, 0, -11 * U]}><mesh position={[0, 1.5 * U, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[1.5 * U, 1.5 * U, 11 * U, 20]} /><Cloth kind="towel" rep={[1, 2]} /></mesh></group>
    <mesh position={[28 * U, 0.4 * U, -11 * U]} castShadow><cylinderGeometry args={[1.9 * U, 1.9 * U, 0.8 * U, 24]} /><Metal kind="brass" grain="turned" /></mesh>
  </group></Place>
}
export const dragP = P

export default function Lesson7() {
  const [kase, setKase] = useState<Case7>('base')
  const [run, setRun] = useState(0), n = useRef(0)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<Case7[]>([])
  const T = useTasks('gewu:force:7', TASKS)
  const c = CASES[kase], f = friction(kase), seen = run !== 0 && !busy
  const go = () => { if (busy || run !== 0) return; setBusy(true); setRun(++n.current) }
  const ended = () => { setBusy(false); const next = rows.includes(kase) ? rows : [...rows, kase]; setRows(next); T.check(id => next.includes(id as Case7)) }
  const home = () => { if (!busy) setRun(0) }
  const pick = (k: Case7) => { if (busy) return; setKase(k); setRun(0) }
  const resetAll = () => { setKase('base'); setRun(0); setBusy(false); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'case' | 'go' | 'home' | null } = !task ? { hint: '滑动摩擦力的大小跟压力和接触面的粗糙程度有关，跟接触面积无关。', next: null }
    : busy ? { hint: `卷线器以 ${DRAG.v * 100} cm/s 匀速收线，等示数稳定…`, next: null }
    : kase !== task.id ? { hint: `把情况换成“${CASES[task.id as Case7].name}”`, next: 'case' }
    : run !== 0 ? { hint: '按“放回起点”', next: 'home' }
    : { hint: '按“匀速拉动”', next: 'go' }
  const area = c.side ? BLOCK_CM.l * BLOCK_CM.h : BLOCK_CM.l * BLOCK_CM.w
  const labels: Label[] = [
    { id: 'F', at: P(4, 15), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: seen ? 1 : 0 }, children: <><small>示数 = 摩擦力</small>{f.toFixed(2)} N</> },
    { id: 'n1', at: P(START, 12 + (c.load ? 4 : 0)), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '带挂钩的木块' },
    { id: 'n2', at: P(WX + 2, 9), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '卷线器' },
    { id: 'n3', at: P(-8, -2.5, 9), ax: 0.5, name: true, className: 'scene-name', children: c.face === 'towel' ? '长木板上铺着毛巾' : '长木板' },
  ]
  return (
    <LabShell title="力和运动" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="卷线器"
      stage={<DragStage at="l7" labels={labels}><DragRig face={c.face} load={c.load} side={c.side} f={f} run={run} onEnd={ended} /></DragStage>}
      lesson={<LessonBlock no="7" title="滑动摩擦力" concept="跟压力和粗糙程度有关" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>两个互相接触的物体，当它们相对滑动时，在接触面上会产生一种阻碍相对运动的力，叫<b className="text-white">滑动摩擦力</b>。</p>
          <p className="mt-3">摩擦力没法直接测。让木块做<b className="text-white">匀速直线运动</b>，这时水平方向上的拉力和摩擦力二力平衡，测力计的示数就等于摩擦力的大小。</p>
          <p className="mt-3">接触面的粗糙程度一定时，压力越大，滑动摩擦力越大；压力一定时，接触面越粗糙，滑动摩擦力越大。它的大小跟接触面积无关。</p>
          <p className="mt-3">增大有益摩擦：增大压力、让接触面更粗糙（鞋底的花纹）。减小有害摩擦：减小压力、让接触面更光滑、用滚动代替滑动、让接触面分开（加润滑油、气垫）。</p>
          <p className="mt-3 text-[13.5px] text-white/65">每次只改一个条件，别的保持不变，这种做法叫控制变量法。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种情况都拉过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">压力越大、接触面越粗糙，滑动摩擦力越大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">平放 {f2('base')} N，加砝码 {f2('load')} N，铺毛巾 {f2('towel')} N，侧放还是 {f2('side')} N：跟接触面积无关。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再拉几次</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">匀速拉动时测力计的示数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{seen ? f.toFixed(2) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">N</span></div>
          </div>
          <ScaleView F={seen ? f : 0} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="F压" value={`${pressure(kase).toFixed(2)} N`} unit="压力" />
            <ParamTile symbol="面" value={c.face === 'towel' ? '毛巾' : '木板'} unit="接触面" />
            <ParamTile symbol="S" value={`${area} cm²`} unit="接触面积" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">木块水平方向受力的示意图</h2>
          <Diagram label="木块受到的拉力和摩擦力" max={1.6} forces={[{ at: [1, 0], dir: [1, 0], F: f, name: 'F拉', color: '#ffd24a' }, { at: [0, -1], dir: [-1, 0], F: f, name: 'f', color: '#ff7a59' }]} />
          {rows.length > 0 && <table className="mt-3 w-full text-[13px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">情况</th><th className="text-right font-normal">压力 / N</th><th className="text-right font-normal">摩擦力 / N</th></tr></thead>
            <tbody>{rows.map(k => <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{CASES[k].name}</td><td className="text-right tabular-nums">{pressure(k).toFixed(2)}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{f2(k)}</td></tr>)}</tbody>
          </table>}
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">木块在木板上的动摩擦因数取 {MU.wood}，在毛巾上取 {MU.towel}。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={busy || run !== 0}>匀速拉动</LabButton>
        <LabButton pulse={next === 'home'} onClick={home} disabled={busy || run === 0}>放回起点</LabButton>
      </>}
      extras={<Control label="情况"><Segmented label="情况" pulse={next === 'case'} want={next === 'case' ? task!.id as Case7 : null} value={kase} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: CASES[k].name }))} /></Control>}
    />
  )
}
