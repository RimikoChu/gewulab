// 接触法制硫酸 · 第 7 课 浓硫酸的性质。回到厂里的化验室，在化验台上做三个小实验：
// 往胆矾上滴浓硫酸（吸水性）、往蔗糖里加浓硫酸（脱水性）、铜片和浓硫酸共热（强氧化性）。换实验时镜头沿着化验台移过去。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { Flow, GAS, Mist } from './flow'
import { Beaker, Bubbles, Crystals, DropBottle, Dropper, GlassTube, Lamp, Rack, Reagent, Stand, Sugar, TestTube, TubeLiquid, WashBottle, WatchGlass } from './lab'
import { LESSONS, goLesson } from './lessons'
import { ease, lerp, seg, useRun, type V3 } from './parts'
import { SAMPLE, carbonFromSucrose, fmt1, fmt2, so2FromCu, waterFromBluestone } from './physics'
import { BZ, Place, ST, TOP } from './world'

type Exp = 'a' | 'b' | 'c'
const NAME: Record<Exp, string> = { a: '胆矾', b: '蔗糖', c: '铜片' }
const TASKS: Task[] = [
  { id: 'a', text: '往胆矾上滴几滴浓硫酸', note: '蓝色的胆矾变白了：浓硫酸吸走了结晶水，这是吸水性' },
  { id: 'b', text: '往蔗糖里加浓硫酸', note: '蔗糖变黑、膨胀：浓硫酸把蔗糖里的氢和氧按水的组成脱去，这是脱水性' },
  { id: 'c', text: '加热铜片和浓硫酸', note: '铜片溶解，品红溶液褪色：生成了 SO₂，这是浓硫酸的强氧化性' },
]
/** 沿几个关键点走：ts 是各点的时刻（0–1），k 现在的时刻 */
function along(ts: number[], ps: V3[], k: number): V3 {
  let i = 0; while (i < ts.length - 2 && k > ts[i + 1]) i++
  const u = ease(seg(k, ts[i], ts[i + 1])), a = ps[i], b = ps[i + 1]
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]
}

/** 吸水性：表面皿里一小堆胆矾，旁边一只浓硫酸滴瓶；滴管从瓶里提起来，移到晶体上方滴下几滴，再放回去 */
function ExpA({ k }: { k: number }) {
  const BOT: V3 = [-0.16, 0, -0.01], DISH: V3 = [0, 0.006, 0.03]
  const tip = along([0, 0.14, 0.28, 0.44, 0.72, 0.86, 1], [[BOT[0], 0.014, BOT[2]], [BOT[0], 0.014, BOT[2]], [BOT[0], 0.13, BOT[2]], [DISH[0], 0.07, DISH[2]], [DISH[0], 0.07, DISH[2]], [BOT[0], 0.13, BOT[2]], [BOT[0], 0.014, BOT[2]]], k)
  const drops = [0.48, 0.56, 0.64].map(t0 => seg(k, t0, t0 + 0.05)).filter(u => u > 0 && u < 1)
  return <group position={[ST.a, TOP, BZ]}>
    <group position={BOT}><DropBottle name="浓硫酸" /></group>
    {/* 表面皿下面垫一块白瓷板；后排是试剂瓶和洗瓶 */}
    <mesh position={[DISH[0], 0.003, DISH[2]]} castShadow receiveShadow><boxGeometry args={[0.15, 0.006, 0.13]} /><meshPhysicalMaterial color="#f1f0ea" roughness={0.25} clearcoat={0.6} /></mesh>
    <group position={[-0.07, 0, -0.12]}><Reagent name="胆矾" liquid="#1c63d0" solid /></group>
    <group position={[0.04, 0, -0.14]}><Reagent name="浓硫酸" brown band="#b5372b" /></group>
    <group position={[0.17, 0, -0.12]} rotation-y={-0.5}><WashBottle /></group>
    <group position={DISH}><WatchGlass /><Crystals k={seg(k, 0.5, 0.95)} /></group>
    <group position={tip}><Dropper full={k > 0.2 && k < 0.7 ? 0.7 : 0.25} /></group>
    {drops.map((u, i) => <mesh key={i} position={[DISH[0], 0.068 - u * 0.055, DISH[2]]}><sphereGeometry args={[0.0028, 10, 8]} /><meshPhysicalMaterial color="#e6dfc4" transparent opacity={0.85} roughness={0.05} /></mesh>)}
  </group>
}
/** 脱水性：烧杯里的蔗糖，旁边的小烧杯抬起来把浓硫酸倒进去；蔗糖变黄、变黑，黑色的炭柱鼓出杯口，冒白雾 */
function ExpB({ k }: { k: number }) {
  const REST: V3 = [0.13, 0, 0], POUR: V3 = [0.062, 0.088, 0.02]
  const at = along([0, 0.1, 0.24, 0.5, 0.64, 1], [REST, REST, POUR, POUR, REST, REST], k)
  const tilt = ease(seg(k, 0.24, 0.31)) * (1 - ease(seg(k, 0.44, 0.5))) * 1.25
  const left = 1 - seg(k, 0.3, 0.44), pouring = k > 0.3 && k < 0.44
  return <group position={[ST.b, TOP, BZ]}>
    <group position={[-0.1, 0, -0.12]}><Reagent name="蔗糖" liquid="#f4f2ea" solid /></group>
    <group position={[0.02, 0, -0.14]}><Reagent name="浓硫酸" brown band="#b5372b" /></group>
    <group position={[0.16, 0, -0.12]}><Beaker r={0.034} h={0.09} /></group>
    <group position={[0, 0, 0.02]}>
      <Sugar dark={seg(k, 0.34, 0.66)} rise={ease(seg(k, 0.58, 0.98))} />
      <Beaker />
      {/* 玻璃棒 */}
      <mesh position={[-0.012, 0.048, -0.004]} rotation-z={0.3} renderOrder={9}><cylinderGeometry args={[0.0025, 0.0025, 0.13, 10]} /><meshPhysicalMaterial color="#e8f2f2" transparent opacity={0.4} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
    </group>
    {/* 装浓硫酸的小烧杯：绕杯口靠里的一点倾过去 */}
    <group position={[at[0], at[1] + 0.022, at[2]]} rotation-z={tilt}>
      <group position-y={-0.022}>
        <Beaker r={0.018} h={0.044} />
        {left > 0.03 && <mesh position-y={0.003 + 0.011 * left}><cylinderGeometry args={[0.0162, 0.0162, 0.022 * left, 24]} /><meshPhysicalMaterial color="#d9cf9e" transparent opacity={0.7} roughness={0.05} depthWrite={false} /></mesh>}
      </group>
    </group>
    {pouring && <mesh position={[0.012, 0.06, 0.02]} rotation-z={0.25}><cylinderGeometry args={[0.0016, 0.0022, 0.085, 8]} /><meshPhysicalMaterial color="#d9cf9e" transparent opacity={0.8} roughness={0.05} /></mesh>}
    <Mist at={[0, 0.25, 0.01]} size={[0.06, 0.14, 0.04]} n={16} r={0.014} on={k > 0.55 ? 1 : 0} rise={0.04} opacity={0.06} />
  </group>
}
/** 强氧化性：铁架台上夹一支试管，里面是铜片和浓硫酸，底下酒精灯加热；导管把气体通进试管架上的品红溶液，管口塞一团浸了 NaOH 溶液的棉花 */
function ExpC({ k, lit }: { k: number; lit: boolean }) {
  const Y1 = 0.142, X2 = 0.16
  const tube = useMemo<V3[]>(() => [[0, Y1 + 0.13, 0], [0, 0.345, 0], [X2, 0.345, 0], [X2, 0.045, 0]], [])
  const gas = useMemo<V3[][]>(() => [[[0, Y1 + 0.06, 0], ...tube]], [tube])
  const magenta = `#${new THREE.Color('#d81b60').lerp(new THREE.Color('#f1e9ec'), seg(k, 0.4, 0.9)).getHexString()}`, sour = `#${new THREE.Color('#ddd6b4').lerp(new THREE.Color('#7f8a80'), seg(k, 0.3, 1)).getHexString()}`
  const world = useMemo<V3[][]>(() => gas.map(p => p.map(q => [q[0] + ST.c, q[1] + TOP, q[2] + BZ] as V3)), [gas])
  return <>
    <group position={[ST.c, TOP, BZ]}>
      <group position={[-0.1, 0, 0]}><Stand y={Y1 + 0.135} reach={0.086} /></group>
      <group position={[-0.2, 0, -0.12]}><Reagent name="浓硫酸" brown band="#b5372b" /></group>
      <group position={[0.06, 0, -0.14]}><Reagent name="品红溶液" liquid="#d81b60" /></group>
      <group position={[0.28, 0, -0.12]}><Reagent name="NaOH 溶液" /></group>
      <Lamp lit={lit} />
      <group position-y={Y1}>
        <TestTube>
          <TubeLiquid h={0.05} color={sour} opacity={0.7} />
          <mesh position={[0.002, 0.028, 0]} rotation-z={0.25} scale={[1, 1 - 0.45 * seg(k, 0.3, 1), 1]}><boxGeometry args={[0.009, 0.036, 0.0012]} /><Metal kind="copper" /></mesh>
          <group position={[0, 0.012, 0]}><Bubbles h={0.036} on={seg(k, 0.12, 0.25)} /></group>
        </TestTube>
        {/* 橡胶塞 */}
        <mesh position-y={0.168}><cylinderGeometry args={[0.0128, 0.0108, 0.018, 20]} /><meshStandardMaterial color="#2b2422" roughness={0.8} /></mesh>
      </group>
      <GlassTube pts={tube} />
      <group position={[X2 + 0.03, 0, 0]}><Rack /></group>
      <group position={[X2, 0.012, 0]}>
        <TestTube len={0.15}><TubeLiquid h={0.06} color={magenta} opacity={0.82} /><group position={[0, 0.034, 0]}><Bubbles h={0.024} on={seg(k, 0.25, 0.4)} n={8} spread={0.003} /></group></TestTube>
        {/* 管口的棉团 */}
        <mesh position-y={0.152} scale={[1, 0.75, 1]}><icosahedronGeometry args={[0.0135, 2]} /><meshStandardMaterial color="#f4f3ee" roughness={1} /></mesh>
      </group>
    </group>
    <Flow paths={world} density={60} speed={0.12} size={0.0017} color={() => GAS.so2} on={k > 0.2 ? 1 : 0} max={60} />
  </>
}

export default function Lesson7() {
  const T = useTasks('gewu:sulfuric:7', TASKS)
  const [exp, setExp] = useState<Exp>('a')
  const [seen, setSeen] = useState<Partial<Record<Exp, boolean>>>({})
  const end = (e: Exp) => () => { setSeen(s => ({ ...s, [e]: true })); T.check(id => id === e) }
  const ra = useRun(8, end('a')), rb = useRun(10, end('b')), rc = useRun(9, end('c'))
  const run = { a: ra, b: rb, c: rc }, busy = ra.busy || rb.busy || rc.busy
  const resetAll = () => { setExp('a'); setSeen({}); ra.snap(0); rb.snap(0); rc.snap(0); T.reset() }
  const task = T.current?.id as Exp | undefined
  const started = run[exp].k > 0
  const next: 'seg' | 'go' | null = !task || busy ? null : exp !== task ? 'seg' : 'go'
  const hint = !task ? '浓硫酸有吸水性、脱水性和强氧化性。'
    : ra.busy ? '滴管吸了浓硫酸，滴在胆矾上：蓝色的晶体从中间开始变白…'
    : rb.busy ? '蔗糖先变黄，再变黑，接着黑色的炭鼓了起来…'
    : rc.busy ? '铜片表面冒出气泡，导管另一头的品红溶液颜色越来越浅…'
    : exp !== task ? `换到“${NAME[task]}”那个实验`
    : exp === 'a' ? '表面皿里是蓝色的胆矾。往上面滴几滴浓硫酸' : exp === 'b' ? '烧杯里是白色的蔗糖。把浓硫酸倒进去' : '试管里是铜片和浓硫酸。点燃酒精灯加热'

  const w = waterFromBluestone(SAMPLE.bluestone), c = carbonFromSucrose(SAMPLE.sucrose), v = so2FromCu(SAMPLE.cu)
  const tag = (id: string, at: V3, ax: number, cls: string, children: React.ReactNode, name = false): Label => ({ id, at, ax, name, className: cls, children })
  const labels: Label[] = exp === 'a' ? [
    tag('a1', [ST.a - 0.19, TOP + 0.04, BZ], 1, 'scene-name -translate-y-1/2', '浓硫酸（滴瓶）', true),
    tag('a2', [ST.a + 0.06, TOP + 0.02, BZ + 0.05], 0, `scene-tag ${seen.a ? 'key' : ''} -translate-y-1/2`, <><small>胆矾 CuSO₄·5H₂O</small>{ra.k > 0.9 ? '变白' : ra.k > 0.5 ? '正在变白' : '蓝色'}</>),
  ] : exp === 'b' ? [
    tag('b1', [ST.b - 0.04, TOP + 0.03, BZ + 0.05], 1, `scene-tag ${seen.b ? 'key' : ''} -translate-y-1/2`, <><small>蔗糖 C₁₂H₂₂O₁₁</small>{rb.k > 0.62 ? '变黑、膨胀' : rb.k > 0.4 ? '变黄、变褐' : '白色'}</>),
    tag('b2', [ST.b + 0.13, TOP + 0.07, BZ], 0.5, 'scene-name -translate-y-full', '浓硫酸', true),
  ] : [
    tag('c1', [ST.c - 0.03, TOP + 0.17, BZ + 0.02], 1, 'scene-tag -translate-y-1/2', <><small>铜片和浓硫酸</small>{rc.k > 0.25 ? '铜片溶解，有气泡' : '没有变化'}</>),
    tag('c2', [ST.c + 0.185, TOP + 0.05, BZ + 0.02], 0, `scene-tag ${seen.c ? 'key' : ''} -translate-y-1/2`, <><small>品红溶液</small>{rc.k > 0.85 ? '褪色' : rc.k > 0.4 ? '颜色变浅' : '红色'}</>),
    tag('c3', [ST.c + 0.185, TOP + 0.17, BZ + 0.02], 0, 'scene-name -translate-y-1/2', '浸有 NaOH 溶液的棉团', true),
    tag('c4', [ST.c + 0.08, TOP + 0.335, BZ], 0.5, 'scene-name', '导管', true),
  ]
  const btn = exp === 'a' ? '滴加浓硫酸' : exp === 'b' ? '倒入浓硫酸' : '点燃酒精灯加热'
  const rows: [Exp, string, string, string][] = [
    ['a', '吸水性', `${SAMPLE.bluestone} g 胆矾`, `失去 ${fmt1(w)} g 水`],
    ['b', '脱水性', `${SAMPLE.sucrose} g 蔗糖`, `留下 ${fmt1(c)} g 碳`],
    ['c', '强氧化性', `${SAMPLE.cu} g 铜`, `生成 ${fmt2(v)} L SO₂`],
  ]
  return (
    <LabShell title="接触法制硫酸" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="化验台"
      stage={<Place at={exp} labels={labels}>
        <ExpA k={ra.k} /><ExpB k={rb.k} /><ExpC k={rc.k} lit={rc.busy || rc.k >= 1} />
      </Place>}
      lesson={<LessonBlock no="7" title="浓硫酸的性质" concept="浓硫酸能吸水、脱水、强氧化" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p><b className="text-white">吸水性</b>：浓硫酸能吸收气体里的水蒸气、晶体里的结晶水。所以它可以作干燥剂，硫酸厂的干燥塔里淋的就是浓硫酸。</p>
          <p className="mt-3"><b className="text-white">脱水性</b>：浓硫酸能把蔗糖、纸张、棉布等有机物里的氢和氧按水的组成比脱去，留下黑色的炭。吸水是吸走现成的水，脱水是把原来不是水的氢、氧元素夺走。</p>
          <p className="mt-3"><b className="text-white">强氧化性</b>：加热时浓硫酸能氧化铜这样不活泼的金属，自己被还原成 SO₂：</p>
          <p className="mt-2 font-formula text-[14.5px] text-white/90">Cu + 2H₂SO₄(浓) <span className="text-[12px]">△</span>＝ CuSO₄ + SO₂↑ + 2H₂O</p>
          <p className="mt-3">SO₂ 能使品红溶液褪色。SO₂ 有毒，管口的棉团浸了 NaOH 溶液，用来吸收多余的 SO₂。浓硫酸有强腐蚀性，做实验要戴防护手套和护目镜。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">浓硫酸有吸水性、脱水性和强氧化性</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{SAMPLE.bluestone} g 胆矾失去 {fmt1(w)} g 结晶水；{SAMPLE.sucrose} g 蔗糖脱水后留下 {fmt1(c)} g 碳；{SAMPLE.cu} g 铜和浓硫酸共热，生成 {fmt2(v)} L SO₂（标准状况）。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-[13px] text-white/60">正在做：{NAME[exp]}和浓硫酸</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {exp === 'a' && <><ParamTile symbol="m" value={`${SAMPLE.bluestone}`} unit="g · 胆矾" /><ParamTile symbol="失水" value={seen.a ? fmt1(w) : '—'} unit="g · 结晶水" /></>}
          {exp === 'b' && <><ParamTile symbol="m" value={`${SAMPLE.sucrose}`} unit="g · 蔗糖" /><ParamTile symbol="C" value={seen.b ? fmt1(c) : '—'} unit="g · 留下的碳" /></>}
          {exp === 'c' && <><ParamTile symbol="m" value={`${SAMPLE.cu}`} unit="g · 铜" /><ParamTile symbol="V" value={seen.c ? fmt2(v) : '—'} unit="L · SO₂（标准状况）" /></>}
        </div>
        <p className="mt-3 font-formula text-[14px] leading-relaxed text-white/85">{exp === 'a' ? 'CuSO₄·5H₂O（蓝）→ CuSO₄（白）+ 5H₂O' : exp === 'b' ? 'C₁₂H₂₂O₁₁ → 12C + 11H₂O（浓硫酸）' : 'Cu + 2H₂SO₄(浓) ＝ CuSO₄ + SO₂↑ + 2H₂O（加热）'}</p>
        <h2 className="mt-4 text-[12.5px] text-white/55">三个实验</h2>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13px]">
          <tbody>{rows.map(([k, p, a, b]) => <tr key={k} className={k === exp ? 'bg-[#35c7b3]/20' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2.5 py-1.5 font-medium">{seen[k] ? p : '—'}</td><td>{a}</td><td className="rounded-r-lg pr-2 text-right">{seen[k] ? b : '—'}</td></tr>)}</tbody>
        </table>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={busy || started} onClick={() => run[exp].run()}>{btn}</LabButton>
      </>}
      extras={
        <Control label="实验">
          <Segmented label="实验" pulse={next === 'seg'} want={task ?? null} disabled={busy} value={exp} onChange={k => setExp(k as Exp)} options={(['a', 'b', 'c'] as Exp[]).map(k => ({ value: k, label: NAME[k] }))} />
        </Control>
      }
    />
  )
}
