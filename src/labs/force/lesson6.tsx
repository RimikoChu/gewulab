// 力和运动 · 第 6 课 二力平衡：一张很轻的小卡片，两边的细线各绕过一只滑轮、挂着钩码。改变两边钩码的个数、把卡片扭转一个角度、把卡片剪成两半，
// 松手看它还能不能静止：二力平衡要同时满足等大、反向、同一直线、作用在同一物体上。卡片怎样动由计算核心给出。
import { useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { CARD, Cord, Force, HalfCard, Hooks, PULLEY, Place, Post, Wood, setRod, useRun, type V3 } from './gear'
import { LESSONS, goLesson } from './lessons'
import { CARD_RUN, CONDS, G, TWIST, balanced, cardAccel, pull, runTime, twistAt, type Cond } from './physics'
import { Diagram } from './views'
import { BENCH_Z, ST, TOP, U } from './world'

const KEYS: Cond[] = ['unequal', 'equal', 'twist', 'cut']
const TASKS: Task[] = [
  { id: 'unequal', text: '左边 2 只、右边 1 只钩码，松手', note: `左边 ${pull(2).toFixed(2)} N，右边 ${pull(1).toFixed(2)} N，卡片向左加速：两个力大小不等，不能平衡` },
  { id: 'equal', text: '右边也挂 2 只，再松手', note: `两边都是 ${pull(2).toFixed(2)} N，卡片静止不动：这两个力平衡` },
  { id: 'twist', text: '把卡片扭转一个角度，松手', note: '卡片转了回去：两个力不在同一直线上，不能平衡' },
  { id: 'cut', text: '把卡片从中间剪开', note: '两半各自被拉走：两个力不作用在同一物体上，不能平衡' },
]
const X = ST.l6, POST = 24, LINE = PULLEY.y + PULLEY.r, DROP = POST + PULLEY.r, HANG = 20      // 立柱离中间多远、细线的高度、钩码那一段线的位置、松手前挂点的高度（厘米）
const HOLE = CARD.w / 2 - 0.45
const P = (x: number, y: number, z = 0): V3 => [X + x * U, TOP + (y + 1.2) * U, BENCH_Z + z * U]
/** 每种情况松手以后演多久（s） */
const END: Record<Cond, number> = { unequal: runTime(CARD_RUN, cardAccel(2, 1)) + 0.5, equal: 1.4, twist: TWIST.t, cut: runTime(CARD_RUN, G) + 0.6 }
/** 拉力的箭头：每 1 N 画多长 */
const PER = 1.0

function Rig({ cond, run, onEnd }: { cond: Cond; run: number; onEnd: () => void }) {
  const c = CONDS[cond]
  const card = useRef<THREE.Group>(null), hl = useRef<THREE.Group>(null), hr = useRef<THREE.Group>(null), wl = useRef<THREE.Group>(null), wr = useRef<THREE.Group>(null), fl = useRef<THREE.Group>(null), fr = useRef<THREE.Group>(null)
  const cords = useRef<(THREE.Mesh | null)[]>([]), cur = useRef({ d: 0, th: 0 }), a = useRef(new THREE.Vector3()), b = useRef(new THREE.Vector3())
  useRun(run, END[cond], (t, dt) => {
    const q = cur.current
    if (run === 0) { const e = 1 - Math.exp(-dt / 0.2); q.d += (0 - q.d) * e; q.th += (c.twist - q.th) * e }      // 没松手：扶在中间；要扭转的那一种先转过去
    else if (cond === 'unequal') q.d = Math.min(CARD_RUN, 0.5 * cardAccel(c.left, c.right) * t * t) * 100
    else if (cond === 'cut') q.d = Math.min(CARD_RUN, 0.5 * G * t * t) * 100
    else if (cond === 'twist') q.th = twistAt(c.twist, t)
    const th = q.th * Math.PI / 180, split = cond === 'cut' ? q.d : 0, shift = cond === 'unequal' ? -q.d : 0
    card.current?.position.set(shift * U, LINE * U, 0); if (card.current) card.current.rotation.z = th
    hl.current?.position.set(-split * U, 0, 0); hr.current?.position.set(split * U, 0, 0)
    // 两个穿线孔的位置，和两边钩码挂点的高度
    const lx = shift - (HOLE + split) * Math.cos(th), ly = LINE - (HOLE + split) * Math.sin(th), rx = shift + (HOLE + split) * Math.cos(th), ry = LINE + (HOLE + split) * Math.sin(th)
    const yl = HANG - (cond === 'unequal' || cond === 'cut' ? q.d : 0), yr = HANG + (cond === 'unequal' ? q.d : cond === 'cut' ? -q.d : 0)
    setRod(cords.current[0], a.current.set(lx * U, ly * U, 0), b.current.set(-POST * U, LINE * U, 0)); setRod(cords.current[1], a.current.set(rx * U, ry * U, 0), b.current.set(POST * U, LINE * U, 0))
    setRod(cords.current[2], a.current.set(-DROP * U, PULLEY.y * U, 0), b.current.set(-DROP * U, yl * U, 0)); setRod(cords.current[3], a.current.set(DROP * U, PULLEY.y * U, 0), b.current.set(DROP * U, yr * U, 0))
    wl.current?.position.set(-DROP * U, yl * U, 0); wr.current?.position.set(DROP * U, yr * U, 0)
    fl.current?.position.set(lx * U, ly * U, 0.12); fr.current?.position.set(rx * U, ry * U, 0.12)
  }, onEnd)
  return <>
    <group ref={card} position={[0, LINE * U, 0]}>
      <group ref={hl}><HalfCard side={-1} /></group><group ref={hr}><HalfCard side={1} /></group>
      {/* 要剪的地方：中间一道虚线 */}
      {cond === 'cut' && run === 0 && [-1.5, -0.5, 0.5, 1.5].map(y => <mesh key={y} position={[0, y * U, 0.008]}><planeGeometry args={[0.12 * U, 0.6 * U]} /><meshBasicMaterial color="#d2362f" /></mesh>)}
    </group>
    {[0, 1, 2, 3].map(i => <Cord key={i} ref={(e: THREE.Mesh | null) => { cords.current[i] = e }} r={0.006} />)}
    <group ref={wl}><Hooks n={c.left} /></group><group ref={wr}><Hooks n={c.right} /></group>
    <group ref={fl}><Force from={[0, 0, 0]} dir={[-1, 0, 0]} len={pull(c.left) * PER} color="#ffd24a" thick={0.45} /></group>
    <group ref={fr}><Force from={[0, 0, 0]} dir={[1, 0, 0]} len={pull(c.right) * PER} color="#7fd0ff" thick={0.45} /></group>
  </>
}

export default function Lesson6() {
  const [cond, setCond] = useState<Cond>('unequal')
  const [run, setRun] = useState(0), n = useRef(0)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<Cond[]>([])
  const T = useTasks('gewu:force:6', TASKS)
  const c = CONDS[cond], B = balanced(c), seen = run !== 0 && !busy
  const go = () => { if (busy || run !== 0) return; setBusy(true); setRun(++n.current) }
  const ended = () => { setBusy(false); const next = rows.includes(cond) ? rows : [...rows, cond]; setRows(next); T.check(id => next.includes(id as Cond)) }
  const hold = () => { if (!busy) setRun(0) }
  const pick = (k: Cond) => { if (busy) return; setCond(k); setRun(0) }
  const resetAll = () => { setCond('unequal'); setRun(0); setBusy(false); setRows([]); T.reset() }
  const task = T.current, verb = cond === 'cut' ? '剪开' : '松手'
  const { hint, next }: { hint: string; next: 'cond' | 'go' | 'hold' | null } = !task ? { hint: '二力平衡的条件：作用在同一物体上，大小相等，方向相反，在同一直线上。', next: null }
    : busy ? { hint: '看卡片怎样动…', next: null }
    : cond !== task.id ? { hint: `把情况换成“${CONDS[task.id as Cond].name}”`, next: 'cond' }
    : run !== 0 ? { hint: cond === 'cut' ? '按“换一张卡片”' : '按“扶回中间”', next: 'hold' }
    : { hint: `卡片现在被扶着。按“${verb}”`, next: 'go' }
  const labels: Label[] = [
    { id: 'L', at: P(-12, LINE + 5), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>向左的拉力</small>{pull(c.left).toFixed(2)} N</> },
    { id: 'R', at: P(12, LINE + 5), ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>向右的拉力</small>{pull(c.right).toFixed(2)} N</> },
    { id: 'res', at: P(0, LINE - 6), ax: 0.5, className: `scene-tag ${B.ok ? 'key' : ''} transition-opacity`, style: { opacity: seen ? 1 : 0 }, children: B.ok ? '静止：二力平衡' : `不平衡：不满足“${B.lack}”` },
    { id: 'n1', at: P(-POST - 3, PULLEY.y + 4), ax: 1, name: true, className: 'scene-name -translate-y-full', children: '定滑轮' },
    { id: 'n2', at: P(0, LINE - 3), ax: 0.5, name: true, className: 'scene-name', children: '小卡片（很轻）' },
    { id: 'n3', at: P(DROP + 3, HANG - 5), name: true, className: 'scene-name -translate-y-1/2', children: '钩码 · 每只 50 g' },
  ]
  return (
    <LabShell title="力和运动" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="小卡片"
      stage={<Place at="l6" labels={labels}>
        <group position={[X, TOP, BENCH_Z]}>
          {/* 底板、两根带滑轮的立柱、两块接钩码的软垫 */}
          <RoundedBox args={[66 * U, 1.2 * U, 14 * U]} radius={0.012} smoothness={2} position={[0, 0.6 * U, 0]} castShadow receiveShadow><Wood kind="dark" rep={[2, 1]} /></RoundedBox>
          {[-1, 1].map(k => <group key={k} position={[k * POST * U, 1.2 * U, 0]}><Post /></group>)}
          {[-1, 1].map(k => <RoundedBox key={k} args={[5 * U, 2.5 * U, 5 * U]} radius={0.02} smoothness={2} position={[k * DROP * U, 2.45 * U, 0]} receiveShadow><meshStandardMaterial color="#39424a" roughness={1} /></RoundedBox>)}
          <group position={[0, 1.2 * U, 0]}><Rig cond={cond} run={run} onEnd={ended} /></group>
        </group>
      </Place>}
      lesson={<LessonBlock no="6" title="二力平衡" concept="同体、等大、反向、共线" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物体受到几个力作用时，如果保持静止或匀速直线运动状态，就说这几个力<b className="text-white">平衡</b>。</p>
          <p className="mt-3"><b className="text-white">二力平衡的条件</b>：作用在同一物体上的两个力，大小相等、方向相反，并且在同一条直线上。四条缺一条都不行。</p>
          <p className="mt-3">用小卡片做，是因为它很轻，自己受到的重力可以不计，只剩下两边细线的拉力。每边的拉力等于那一边钩码受到的重力。</p>
          <p className="mt-3 text-[13.5px] text-white/65">反过来也常用：知道物体静止或做匀速直线运动，就知道它受的力是平衡的。下一课用测力计测摩擦力，靠的就是这一点。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四种情况都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">二力平衡：同一物体、大小相等、方向相反、同一直线</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">只有两边都是 {pull(2).toFixed(2)} N、卡片摆正、没有剪开的那一次，卡片才静止不动。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">松手以后</div>
            <div className="mt-1 text-[30px] leading-tight font-bold tracking-tight">{!seen ? '—' : B.ok ? '静止，平衡' : '不平衡'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="F₁" value={`${pull(c.left).toFixed(2)} N`} unit={`向左 · ${c.left} 只钩码`} />
            <ParamTile symbol="F₂" value={`${pull(c.right).toFixed(2)} N`} unit={`向右 · ${c.right} 只钩码`} />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">卡片受力的示意图</h2>
          <Diagram label="卡片受到的两个拉力" max={1.2} forces={[{ at: [-1, c.twist ? -0.5 : 0], dir: [-1, 0], F: pull(c.left), name: 'F₁', color: '#ffd24a' }, { at: [1, c.twist ? 0.5 : 0], dir: [1, 0], F: pull(c.right), name: 'F₂', color: '#7fd0ff' }]} />
          <h2 className="mt-4 text-[12.5px] text-white/55">四个条件</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">
            {([['同一物体', !c.cut], ['大小相等', c.left === c.right], ['方向相反', true], ['同一直线', !c.twist]] as [string, boolean][]).map(([name, ok]) => <li key={name} className="flex items-center justify-between rounded-lg bg-white/6 px-3 py-1.5"><span className="text-white/80">{name}</span><span className={ok ? 'font-semibold text-[#7fe3d4]' : 'font-semibold text-[#ff9f84]'}>{ok ? '满足' : '不满足'}</span></li>)}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={busy || run !== 0}>{verb}</LabButton>
        <LabButton pulse={next === 'hold'} onClick={hold} disabled={busy || run === 0}>{cond === 'cut' ? '换一张卡片' : '扶回中间'}</LabButton>
      </>}
      extras={<Control label="情况"><Segmented label="情况" pulse={next === 'cond'} want={next === 'cond' ? task!.id as Cond : null} value={cond} disabled={busy} onChange={pick} options={KEYS.map(k => ({ value: k, label: CONDS[k].name }))} /></Control>}
    />
  )
}
