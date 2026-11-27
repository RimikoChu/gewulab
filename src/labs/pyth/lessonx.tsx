// 勾股定理 · 拓展课 三道古题：园子里的竹子、池塘里的芦苇、广场中央的旗杆。三道题都设一个未知数 x，用勾股定理列出 x² + d² = (x + k)²。
// 折断的竹子：竹高 10 尺，折断后竹梢着地，离竹根 3 尺；池中的芦苇：池塘 10 尺见方，芦苇在正中、露出水面 1 尺，拉到岸边中点正好齐岸；
// 旗杆的绳子：绳子比旗杆长 1 m，拉直后绳端着地，离旗杆底部 5 m。池塘那一题朝镜头剖开，看得见水下。
import { useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { COL, Glove, Place, Rope, ease, sideStyle, useRun } from './parts'
import { CLASSIC, bamboo, flag, reed, round, type ClassicKey } from './physics'
import { CHI, FLAG, POND, ST } from './world'

const KEYS = Object.keys(CLASSIC) as ClassicKey[]
const BB = bamboo(), RD = reed(), FG = flag()
const TASKS: Task[] = [
  { id: 'bamboo', text: '折断的竹子：求折断处离地多高', note: `x² + 3² = (10 − x)²，x = ${round(BB.x)} 尺` },
  { id: 'reed', text: '池中的芦苇：求水深和芦苇长', note: `x² + 5² = (x + 1)²，水深 ${RD.depth} 尺，芦苇长 ${RD.len} 尺` },
  { id: 'flag', text: '旗杆的绳子：求旗杆高', note: `x² + 5² = (x + 1)²，旗杆高 ${FG.h} m` },
]
const ACT: Record<ClassicKey, string> = { bamboo: '折下来', reed: '拉向岸边', flag: '拉直绳子' }
const ASK: Record<ClassicKey, string> = {
  bamboo: '竹高 10 尺，被风折断，竹梢着地处离竹根 3 尺。让它折下来',
  reed: '池塘 10 尺见方，芦苇长在正中，露出水面 1 尺。把芦苇拉向岸边',
  flag: '旗杆顶上的绳子比旗杆长 1 m。把绳子拉直，让绳端着地',
}
const SET: Record<ClassicKey, string> = {
  bamboo: '设折断处离地 x 尺，列方程求 x',
  reed: '设水深 x 尺，芦苇长 x + 1 尺，列方程求 x',
  flag: '设旗杆高 x m，绳长 x + 1 m，列方程求 x',
}
/** 每道题的方程和解，一步一步 */
const STEPS: Record<ClassicKey, string[]> = {
  bamboo: ['x² + 3² = (10 − x)²', 'x² + 9 = 100 − 20x + x²', '20x = 91', `x = ${round(BB.x)}（尺）`],
  reed: ['x² + 5² = (x + 1)²', 'x² + 25 = x² + 2x + 1', '2x = 24', `x = ${RD.depth}，芦苇长 ${RD.len}（尺）`],
  flag: ['x² + 5² = (x + 1)²', 'x² + 25 = x² + 2x + 1', '2x = 24', `x = ${FG.h}（m）`],
}

export default function LessonX() {
  const [topic, setTopic] = useState<ClassicKey>('bamboo')
  const [acted, setActed] = useState<ClassicKey[]>([])
  const [solved, setSolved] = useState<ClassicKey[]>([])
  const Tk = useTasks('gewu:pyth:x', TASKS)
  const act = useRun(topic === 'flag' ? 3.2 : 2.6, () => setActed(a => [...a, topic]))
  const solve = useRun(2.0, () => { const n = [...solved, topic]; setSolved(n); Tk.check(id => n.includes(id as ClassicKey)) })
  const busy = act.busy || solve.busy
  const did = acted.includes(topic), sol = solved.includes(topic)
  const k = did ? 1 : act.k
  const pick = (t: ClassicKey) => { if (busy) return; setTopic(t); act.snap(0); solve.snap(0) }
  const resetAll = () => { setTopic('bamboo'); setActed([]); setSolved([]); act.snap(0); solve.snap(0); Tk.reset() }

  const task = Tk.current
  const { hint, next }: { hint: string; next: 'topic' | 'act' | 'solve' | null } = (() => {
    if (!task) return { hint: '三道古题都是：设未知数，找直角三角形，用勾股定理列方程。', next: null }
    if (act.busy) return { hint: '看它怎么变…', next: null }
    if (solve.busy) return { hint: '解方程…', next: null }
    if (topic !== task.id && (sol || !did)) return { hint: `换到“${CLASSIC[task.id as ClassicKey].name}”`, next: 'topic' }
    if (!did) return { hint: ASK[topic], next: 'act' }
    if (!sol) return { hint: SET[topic], next: 'solve' }
    return { hint: `换到“${CLASSIC[task.id as ClassicKey].name}”`, next: 'topic' }
  })()

  const show = did && !act.busy
  let labels: Label[] = [], scene = null
  if (topic === 'bamboo') {
    const R = ST.bamboo, xh = BB.x * CHI
    labels = [
      { id: 'x', at: [R.x + 0.1, xh / 2, R.z], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('b', { opacity: show ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>x</small>{sol ? `${round(BB.x)} 尺` : '?'}</> },
      { id: 'd', at: [R.x - BB.d * CHI / 2, 0.02, R.z + 0.25], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('a', { opacity: show ? 1 : 0 }), children: <>{BB.d} 尺</> },
      { id: 't', at: [R.x - BB.d * CHI / 2 - 0.22, xh / 2 + 0.15, R.z], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('c', { opacity: show ? 1 : 0 }), children: <><small style={{ color: '#fff' }}>折下的一截</small>10 − x</> },
      { id: 'n', at: [R.x + 0.15, BB.H * CHI * 0.9, R.z], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '竹高 1 丈（10 尺）' },
    ]
    scene = <Bamboo k={k} />
  } else if (topic === 'reed') {
    const P = ST.pond, bot = POND.water - POND.depth, half = RD.half * CHI
    labels = [
      { id: 'x', at: [P.x - 0.12, (POND.water + bot) / 2, P.z + POND.half], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('b', { opacity: show ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>水深 x</small>{sol ? `${RD.depth} 尺` : '?'}</> },
      { id: 'h', at: [P.x + half / 2, POND.water + 0.25, P.z + POND.half], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: sideStyle('a', { opacity: show ? 1 : 0 }), children: <>{RD.half} 尺</> },
      { id: 'l', at: [P.x + half / 2 + 0.25, (POND.water + bot) / 2, P.z + POND.half], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('c', { opacity: show ? 1 : 0 }), children: <><small style={{ color: '#fff' }}>芦苇</small>{sol ? `${RD.len} 尺` : 'x + 1'}</> },
      { id: 'u', at: [P.x + 0.12, POND.water + RD.above * CHI + 0.1, P.z + POND.half], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: show ? 0 : 1 }, children: <><small>露出水面</small>1 尺</> },
      { id: 'n', at: [P.x - POND.half - 0.4, 0.3, P.z + POND.half], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '池塘 1 丈见方（剖开）' },
    ]
    scene = <Reed k={k} />
  } else {
    const F = ST.flag
    labels = [
      { id: 'x', at: [F.x - 0.2, FLAG.h / 2, F.z], ax: 1, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('b', { opacity: show ? 1 : 0 }), children: <><small style={{ color: '#3a2600' }}>旗杆 x</small>{sol ? `${FG.h} m` : '?'}</> },
      { id: 'd', at: [F.x + FG.d / 2, 0.05, F.z + 0.3], ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('a', { opacity: show ? 1 : 0 }), children: <>{FG.d} m</> },
      { id: 'r', at: [F.x + FG.d / 2 + 0.3, FLAG.h / 2, F.z], ax: 0, className: 'scene-tag -translate-y-1/2 transition-opacity', style: sideStyle('c', { opacity: show ? 1 : 0 }), children: <><small style={{ color: '#fff' }}>绳长</small>{sol ? `${FG.rope} m` : 'x + 1'}</> },
    ]
    scene = <FlagRope k={k} />
  }
  return (
    <LabShell title="勾股定理" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={Tk.banner} onReset={resetAll} hint={hint} actionsLabel={CLASSIC[topic].name}
      stage={<Place at={topic} labels={labels} want={{ cut: topic === 'reed', ownRope: topic === 'flag' }}>{scene}</Place>}
      lesson={<LessonBlock no="拓展" title="三道古题" concept="设未知数，用勾股定理列方程" tasks={TASKS} done={Tk.done} current={task?.id}
        theory={<>
          <p>这三道题都给了直角三角形的一条直角边，另外两条边只知道相差多少。设其中一条为 x，用勾股定理列方程，两边的 x² 正好消掉，就成了一次方程。</p>
          <p className="mt-3">竹子和芦苇两题是我国古代数学书里的题，用的是古时的长度单位：1 丈 = 10 尺。</p>
          <p className="mt-3 text-[13.5px] text-white/65">画面里竹子的粗细、芦苇的形状是示意的，长度按题目画。</p>
        </>} />}
      finale={Tk.finale && <>
        <p className="text-[17px] leading-snug font-bold">竹子折在 {round(BB.x)} 尺处；水深 {RD.depth} 尺、芦苇 {RD.len} 尺；旗杆高 {FG.h} m</p>
        <p className="mt-1 text-[14px] text-white/70">都是设一条边为 x，另一条边用 x 表示，再用 a² + b² = c² 列方程。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{CLASSIC[topic].name}</div>
            <div className="mt-1 text-[38px] leading-none font-bold tracking-tight tabular-nums">{sol ? (topic === 'bamboo' ? `${round(BB.x)} 尺` : topic === 'reed' ? `${RD.depth} 尺` : `${FG.h} m`) : 'x = ?'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {topic === 'bamboo' && <><ParamTile symbol="竹高" value="10" unit="尺" /><ParamTile symbol="离根" value={`${BB.d}`} unit="尺" /><ParamTile symbol="x" value={sol ? `${round(BB.x)}` : '?'} unit="尺 · 折断处" /></>}
            {topic === 'reed' && <><ParamTile symbol="池宽" value="10" unit="尺 · 1 丈" /><ParamTile symbol="露出" value={`${RD.above}`} unit="尺" /><ParamTile symbol="x" value={sol ? `${RD.depth}` : '?'} unit="尺 · 水深" /></>}
            {topic === 'flag' && <><ParamTile symbol="多出" value={`${FG.extra}`} unit="m · 绳比杆长" /><ParamTile symbol="离底" value={`${FG.d}`} unit="m" /><ParamTile symbol="x" value={sol ? `${FG.h}` : '?'} unit="m · 旗杆" /></>}
          </div>
          <div className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[16px] leading-relaxed tabular-nums">
            <div className="text-[12.5px] text-white/55">列方程</div>
            {STEPS[topic].map((s, i) => <div key={i} className="transition-opacity" style={{ opacity: sol || solve.k * 4 > i ? 1 : i === 0 && did ? 1 : 0.15 }}>{s}</div>)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'act'} onClick={() => { if (!did && !busy) act.run() }} disabled={busy || did}>{ACT[topic]}</LabButton>
        <LabButton primary pulse={next === 'solve'} onClick={() => { if (did && !sol && !busy) solve.run() }} disabled={busy || !did || sol}>列方程求解</LabButton>
      </>}
      extras={<Control label="哪一道题"><Segmented label="哪一道题" pulse={next === 'topic'} want={next === 'topic' ? task!.id as ClassicKey : null} disabled={busy} value={topic} onChange={pick} options={KEYS.map(t => ({ value: t, label: CLASSIC[t].name }))} /></Control>}
    />
  )
}

// ---------- 竹子 ----------
/** 一根竹秆：一节一节的，节上一道鼓起的竹节；顶上一丛竹叶 */
function Culm({ len, r, leaves = false, seed = 3 }: { len: number; r: number; leaves?: boolean; seed?: number }) {
  const nodes = useMemo(() => { const out: number[] = []; for (let y = 0.25; y < len - 0.05; y += 0.3) out.push(y); return out }, [len])
  const lv = useMemo(() => {
    let s = seed; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
    return leaves ? Array.from({ length: 34 }, () => ({ y: len * (0.55 + rnd() * 0.45), a: rnd() * Math.PI * 2, t: 0.3 + rnd() * 0.9, l: 0.16 + rnd() * 0.14 })) : []
  }, [len, leaves, seed])
  return <group>
    <mesh position={[0, len / 2, 0]} castShadow><cylinderGeometry args={[r * 0.85, r, len, 14]} /><meshStandardMaterial color="#7f9a45" roughness={0.45} /></mesh>
    {nodes.map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[r * 1.02, r * 0.14, 6, 16]} /><meshStandardMaterial color="#5f7a32" roughness={0.6} /></mesh>)}
    {lv.map((q, i) => <group key={i} position={[0, q.y, 0]} rotation-y={q.a}><mesh position={[q.l / 2 + r, 0, 0]} rotation={[q.t, 0, -0.5]} castShadow><planeGeometry args={[q.l, 0.035]} /><meshStandardMaterial color="#5c8a35" roughness={0.7} side={2} /></mesh></group>)}
  </group>
}
/** 折断的竹子：下面一截立着，上面一截绕折断处倒下来，竹梢落在离竹根 3 尺的地上 */
function Bamboo({ k }: { k: number }) {
  const R = ST.bamboo, xh = BB.x * CHI, top = BB.top * CHI, d = BB.d * CHI
  // 倒下来以后，上面一截从折断处指向竹梢 (−d, −xh)：绕 z 轴转 φ，使 +y 转到这个方向
  const final = Math.atan2(d, -xh)          // (−sin φ, cos φ) = (−d, −xh) / top
  const f = final * ease(k)
  return <group position={[R.x, 0, R.z]}>
    <mesh position={[0, 0.006, 0]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[0.45, 32]} /><meshStandardMaterial color="#5a4a36" roughness={1} /></mesh>
    <Culm len={xh} r={0.05} />
    {/* 折断处：劈开的竹篾 */}
    <mesh position={[0, xh + 0.03, 0]} rotation-z={0.3}><coneGeometry args={[0.03, 0.08, 6]} /><meshStandardMaterial color="#cbbf86" roughness={0.8} /></mesh>
    <group position={[0, xh, 0]} rotation-z={f}><Culm len={top} r={0.043} leaves seed={9} /></group>
    {k > 0.99 && <>
      <mesh position={[-d / 2, 0.006, 0.12]}><boxGeometry args={[d, 0.01, 0.03]} /><meshBasicMaterial color={COL.a} toneMapped={false} /></mesh>
      <mesh position={[0.08, xh / 2, 0]}><boxGeometry args={[0.025, xh, 0.025]} /><meshBasicMaterial color={COL.b} toneMapped={false} /></mesh>
    </>}
  </group>
}

// ---------- 芦苇 ----------
/** 芦苇：细秆、几片长叶、顶上一穗。根在池底正中，绕根转向岸边，顶端正好到岸边的水面 */
function Reed({ k }: { k: number }) {
  const P = ST.pond, bot = POND.water - POND.depth, len = RD.len * CHI, half = RD.half * CHI
  const final = -Math.atan2(half, POND.depth)      // 向 +x 倒
  const f = final * ease(k)
  const tip: [number, number, number] = [P.x - Math.sin(f) * len, bot + Math.cos(f) * len, P.z]
  return <group>
    <group position={[P.x, bot, P.z]} rotation-z={f}>
      <mesh position={[0, len / 2, 0]} castShadow><cylinderGeometry args={[0.008, 0.016, len, 8]} /><meshStandardMaterial color="#8a9a52" roughness={0.6} /></mesh>
      {[0.25, 0.4, 0.55, 0.7, 0.82].map((y, i) => <group key={y} position={[0, len * y, 0]} rotation-y={i * 2.3}><mesh position={[0.16, 0.12, 0]} rotation-z={-0.9}><planeGeometry args={[0.42, 0.03]} /><meshStandardMaterial color="#6f8d3e" roughness={0.7} side={2} /></mesh></group>)}
      <mesh position={[0, len - 0.06, 0]} castShadow><capsuleGeometry args={[0.025, 0.12, 4, 10]} /><meshStandardMaterial color="#b49a72" roughness={0.9} /></mesh>
      {/* 根 */}
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * 1.3) * 0.05, 0.01, Math.sin(i * 1.3) * 0.05]} rotation-z={Math.cos(i) * 0.8}><cylinderGeometry args={[0.004, 0.006, 0.16, 5]} /><meshStandardMaterial color="#6a5a3c" roughness={1} /></mesh>)}
    </group>
    {/* 剖面上的三条量线：水深（橙，原来芦苇的位置）、水面上的半边（蓝） */}
    {k > 0.99 && <group position={[0, 0, POND.half - 0.01]}>
      <mesh position={[P.x, (POND.water + bot) / 2, P.z]}><boxGeometry args={[0.025, POND.water - bot, 0.01]} /><meshBasicMaterial color={COL.b} toneMapped={false} /></mesh>
      <mesh position={[P.x + half / 2, POND.water, P.z]}><boxGeometry args={[half, 0.025, 0.01]} /><meshBasicMaterial color={COL.a} toneMapped={false} /></mesh>
    </group>}
    {k > 0 && k < 1 && <group position={tip} rotation-y={Math.PI / 2}><Glove /></group>}
  </group>
}

// ---------- 旗杆的绳子 ----------
/** 绳子从旗杆顶垂下来，多出的 1 m 盘在地上；拉直以后绳端着地，离旗杆底部 5 m */
function FlagRope({ k }: { k: number }) {
  const F = ST.flag, H = FLAG.h, L = FG.rope
  const e = 0.12 + (FG.d - 0.12) * ease(k)                          // 绳端离旗杆多远
  // 绳子：顶 → 落地点 K → 绳端。还没拉直时，落地点在旗杆脚下，余下的绳子平铺在地上
  const m = L - e, xk = Math.max(0.1, (H * H - m * m) / (2 * m))
  const pts: [number, number, number][] = xk >= e - 1e-6 || k >= 1
    ? [[F.x + 0.1, H, F.z], [F.x + e, 0.02, F.z]]
    : [[F.x + 0.1, H, F.z], [F.x + Math.min(xk, e), 0.02, F.z], [F.x + e, 0.02, F.z]]
  return <group>
    <Rope pts={pts} r={0.03} color={k >= 1 ? COL.c : '#e8e2d0'} />
    {k > 0 && k < 1 && <group position={[F.x + e + 0.05, 0.04, F.z]} rotation-y={Math.PI / 2}><Glove /></group>}
    {k >= 1 && <>
      <mesh position={[F.x + FG.d / 2, 0.012, F.z + 0.15]}><boxGeometry args={[FG.d, 0.02, 0.05]} /><meshBasicMaterial color={COL.a} toneMapped={false} /></mesh>
      <mesh position={[F.x - 0.14, H / 2, F.z]}><boxGeometry args={[0.04, H, 0.04]} /><meshBasicMaterial color={COL.b} toneMapped={false} /></mesh>
    </>}
  </group>
}
