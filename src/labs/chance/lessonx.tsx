// 概率 · 拓展 投针和图钉：培训桌上一张画着平行线的纸（间距 6 cm）和一盒 3 cm 的针；旁边一只盘子和一把图钉。
// 投针：针长是间距的一半时，针和线相交的概率是 1/π，所以 π ≈ 投的次数 ÷ 相交的次数。抛图钉：钉尖朝上和着地不是等可能的，只能做很多次，用频率估计。
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, disc, lathe, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { FreqChart, Place, freqLine, useTally, type V3 } from './parts'
import { NEEDLE, count, f3, needles, piEstimate, running, tacks } from './physics'
import { makeLinedPaper } from './mats'
import { ST, TABLE_H } from './world'

type Exp = 'needle' | 'tack'
const X = ST.x.x, Z = ST.x.z
const PW = 0.54, PH = 0.36, PAPER: V3 = [X - 0.24, TABLE_H, Z]
const PLATE: V3 = [X + 0.42, TABLE_H, Z + 0.0]
const D = needles(), HITS = D.map(d => d.hit), RUNN = running(HITS)
const TK = tacks(), RUNT = running(TK)
const hitsAt = (n: number) => count(HITS, n)
const pi2 = (n: number) => piEstimate(n, hitsAt(n)).toFixed(2)
const TASKS: Task[] = [
  { id: 'n100', text: '投针 100 次', note: `相交 ${hitsAt(100)} 根：π ≈ 100 ÷ ${hitsAt(100)} ≈ ${pi2(100)}` },
  { id: 'n1000', text: '投到 1000 次', note: `相交 ${hitsAt(1000)} 根：π ≈ 1000 ÷ ${hitsAt(1000)} ≈ ${pi2(1000)}` },
  { id: 't100', text: '换图钉：抛 100 次', note: `钉尖朝上 ${count(TK, 100)} 次，频率 ${f3(count(TK, 100) / 100)}` },
  { id: 't1000', text: '抛到 1000 次', note: `频率 ${f3(count(TK, 1000) / 1000)}：这枚图钉钉尖朝上的概率约 0.6` },
]
const SHOW = 120   // 纸上只留最近投的 120 根

export default function LessonX() {
  const [exp, setExp] = useState<Exp>('needle')
  const [best, setBest] = useState<Record<Exp, number>>({ needle: 0, tack: 0 })
  const T = useTasks('gewu:chance:x', TASKS)
  const tally = useTally(4, 0.7, 2.4, n => { const b = { ...best, [exp]: Math.max(best[exp], n) }; setBest(b); T.check(id => (id === 'n100' && b.needle >= 100) || (id === 'n1000' && b.needle >= 1000) || (id === 't100' && b.tack >= 100) || (id === 't1000' && b.tack >= 1000)) })
  const n = tally.n, busy = tally.busy
  const pick = (e: Exp) => { if (busy) return; setExp(e); tally.jump(best[e]) }
  const resetAll = () => { setExp('needle'); setBest({ needle: 0, tack: 0 }); tally.reset(); T.reset() }
  const nN = exp === 'needle' ? n : best.needle, nT = exp === 'tack' ? n : best.tack
  const m = exp === 'needle' ? hitsAt(n) : count(TK, n)

  const task = T.current
  const { hint, next }: { hint: string; next: 100 | 1000 | 'exp' | null } = (() => {
    if (!task) return { hint: '投针算出 π 约 3.13；图钉不是等可能的，只能靠做很多次、用频率估计。', next: null }
    if (busy) return { hint: '快进…', next: null }
    const want: Exp = task.id.startsWith('n') ? 'needle' : 'tack'
    if (exp !== want) return { hint: '换成抛图钉', next: 'exp' }
    if (want === 'needle') return n < 100 ? { hint: '针长是线距的一半。投 100 次，数一数有几根和线相交', next: 100 } : { hint: `100 次 π ≈ ${pi2(100)}，还不准。投到 1000 次`, next: 1000 }
    return n < 100 ? { hint: '图钉落下来，钉尖朝上还是着地？抛 100 次', next: 100 } : { hint: `100 次的频率是 ${f3(count(TK, 100) / 100)}。抛到 1000 次`, next: 1000 }
  })()

  const labels: Label[] = exp === 'needle' ? [
    { id: 'm', at: [PAPER[0], TABLE_H + 0.01, PAPER[2] - PH / 2 - 0.02], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>相交</small>{hitsAt(nN)} / {nN} 根</> },
    { id: 'd', at: [PAPER[0] - PW / 2 - 0.02, TABLE_H + 0.01, PAPER[2] - PH / 2 + NEEDLE.d * 1.5], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>线距</small>6 cm</> },
    { id: 'l', at: [PAPER[0] - PW / 2 - 0.02, TABLE_H + 0.01, PAPER[2] + PH / 2 - 0.03], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>针长</small>3 cm</> },
  ] : [
    { id: 'up', at: [PLATE[0], TABLE_H + 0.05, PLATE[2] - 0.15], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>钉尖朝上</small>{count(TK, nT)} / {nT} 次</> },
    { id: 'n2', at: [PLATE[0], TABLE_H + 0.01, PLATE[2] + 0.17], ax: 0.5, name: true, className: 'scene-name', children: '图钉' },
  ]
  return (
    <LabShell title="概率" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={exp === 'needle' ? '投针' : '抛图钉'}
      stage={<Place at={exp === 'needle' ? 'x' : 'xt'} labels={labels}>
        <Paper />
        <Needles n={nN} />
        <NeedleCase spill={nN === 0} />
        <Plate />
        <TackBox />
        <Tacks n={nT} />
      </Place>}
      lesson={<LessonBlock no="拓展" title="投针和图钉" concept="算不出来的概率，用频率估计" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">投针</b>：纸上画等距的平行线，间距 d；把长 l 的针（l ≤ d）随手投到纸上，针和线相交的概率是 2l/(πd)。这里 l = d/2，概率就是 1/π。投 n 次、相交 m 次，m/n ≈ 1/π，所以 π ≈ n/m。这个公式超出了课本，这里只用它的结论。</p>
          <p className="mt-3"><b className="text-white">图钉</b>：钉尖朝上和钉尖着地，可能性不相等，不能用 m/n 列举出来，只能做大量重复试验，用频率估计概率。不同的图钉，结果也不一样。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">投 1000 次针，π ≈ {pi2(1000)}；这枚图钉钉尖朝上的频率稳定在 0.6 附近</p>
        <p className="mt-1 text-[14px] text-white/70">列举不出等可能结果的事件，靠大量重复试验的频率来估计概率。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{exp === 'needle' ? 'π 的估计 = 投的次数 ÷ 相交的次数' : '钉尖朝上的频率'}</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight tabular-nums">{n ? (exp === 'needle' ? (m ? pi2(n) : '—') : f3(m / n)) : '—'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="n" value={String(n)} unit={exp === 'needle' ? '根 · 投的' : '次 · 抛的'} />
            <ParamTile symbol="m" value={String(m)} unit={exp === 'needle' ? '根 · 和线相交' : '次 · 钉尖朝上'} />
          </div>
          <div className="mt-3 rounded-xl bg-white/6 px-2 pt-2 pb-1">
            <FreqChart series={exp === 'needle' ? RUNN : RUNT} n={n} max={n > 100 ? 1000 : 100} p={exp === 'needle' ? 1 / Math.PI : undefined} pLabel="1/π" color={exp === 'needle' ? '#7fb3ff' : '#ffc46b'} />
          </div>
          <p className="mt-1 text-[12.5px] text-white/50">{exp === 'needle' ? '相交' : '朝上'}的频率 = {freqLine(m, n)}</p>
        </Glass>
      }
      actions={<>
        {([100, 1000] as const).map(s => <LabButton key={s} primary={s === 1000} pulse={next === s} onClick={() => { if (!busy && n < s) tally.go(s) }} disabled={busy || n >= s}>{s === 100 ? '做 100 次' : '做到 1000 次'}</LabButton>)}
      </>}
      extras={<Control label="实验"><Segmented label="实验" pulse={next === 'exp'} want={next === 'exp' ? 'tack' : null} disabled={busy} value={exp} onChange={pick} options={[{ value: 'needle', label: '投针' }, { value: 'tack', label: '抛图钉' }]} /></Control>}
    />
  )
}

/** 画着平行线的纸：贴在一块薄木板上 */
function Paper() {
  const t = makeLinedPaper()
  return <group position={PAPER}>
    <mesh position={[0, 0.004, 0]} castShadow receiveShadow><boxGeometry args={[PW + 0.03, 0.008, PH + 0.03]} /><meshStandardMaterial color="#b58a5c" roughness={0.6} /></mesh>
    <mesh position={[0, 0.0085, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[PW, PH]} /><meshStandardMaterial map={t} roughness={0.85} /></mesh>
  </group>
}

/** 纸上的针：最近投的 SHOW 根；和线相交的是红色的 */
function Needles({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), geo = useMemo(() => { const g = new THREE.CylinderGeometry(0.0007, 0.0007, NEEDLE.l, 6); g.rotateZ(Math.PI / 2); return g }, [])
  const head = useMemo(() => new THREE.SphereGeometry(0.0018, 10, 8), [])
  const hRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const im = ref.current, hm = hRef.current; if (!im || !hm) return
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), from = Math.max(0, n - SHOW)
    for (let i = 0; i < SHOW; i++) {
      const d = D[from + i]
      if (!d || from + i >= n) { m.makeScale(0, 0, 0); im.setMatrixAt(i, m); hm.setMatrixAt(i, m); continue }
      const px = PAPER[0] - PW / 2 + d.x, pz = PAPER[2] + PH / 2 - d.y, y = TABLE_H + 0.0095 + (i % 7) * 0.0002
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.th)
      m.compose(new THREE.Vector3(px, y, pz), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m)
      im.setColorAt(i, c.set(d.hit ? '#d6332a' : '#4a4f55'))
      m.compose(new THREE.Vector3(px + Math.cos(d.th) * NEEDLE.l / 2, y, pz - Math.sin(d.th) * NEEDLE.l / 2), q, new THREE.Vector3(1, 1, 1)); hm.setMatrixAt(i, m)
      hm.setColorAt(i, c.set(d.hit ? '#d6332a' : '#2f3337'))
    }
    im.instanceMatrix.needsUpdate = true; hm.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    if (hm.instanceColor) hm.instanceColor.needsUpdate = true
  }, [n])
  return <>
    <instancedMesh ref={ref} args={[geo, undefined, SHOW]} castShadow frustumCulled={false}><meshStandardMaterial metalness={0.8} roughness={0.3} /></instancedMesh>
    <instancedMesh ref={hRef} args={[head, undefined, SHOW]} frustumCulled={false}><meshStandardMaterial roughness={0.4} /></instancedMesh>
  </>
}

/** 搪瓷盘：白色，蓝边 */
function Plate() {
  const geo = useMemo(() => lathe([[0, 0], [0.15, 0], [0.165, 0.02], [0.17, 0.022], [0.166, 0.024], [0.15, 0.006], [0, 0.006]], { segs: 64 }), [])
  return <group position={PLATE}>
    <mesh geometry={geo} castShadow receiveShadow><meshPhysicalMaterial color="#f4f4f0" roughness={0.2} clearcoat={0.8} /></mesh>
    <mesh position={[0, 0.0225, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.164, 0.171, 64]} /><meshStandardMaterial color="#2a4f8a" /></mesh>
  </group>
}

/** 盘子里的图钉：最近抛的 30 枚。钉尖朝上的平躺着，钉尖着地的侧倒着（钉帽边和钉尖着地） */
function Tacks({ n }: { n: number }) {
  const cap = useMemo(() => disc(0.0055, 0.0012), [])
  const dome = useMemo(() => lathe([[0, 0], [0.0035, 0], [0.0028, 0.0018], [0, 0.0024]], { segs: 24 }), [])
  const show = Math.min(30, n), from = n - show
  return <group position={[PLATE[0], PLATE[1] + 0.006, PLATE[2]]}>
    {Array.from({ length: show }, (_, i) => {
      const k = from + i, up = TK[k], a = (k * 2.399) % (Math.PI * 2), r = 0.02 + ((k * 0.618) % 1) * 0.11
      return <group key={k} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation-y={k}>
        <group rotation-z={up ? 0 : 1.15} position={[0, up ? 0 : 0.005, 0]}>
          <mesh geometry={cap} castShadow><Metal kind="brass" /></mesh>
          <mesh geometry={dome} position={[0, 0.0012, 0]}><Metal kind="brass" /></mesh>
          <mesh position={[0, 0.0055, 0]} castShadow><coneGeometry args={[0.0005, 0.008, 8]} /><Metal kind="steel" /></mesh>
        </group>
      </group>
    })}
  </group>
}

/** 一盒针：小纸盒，盖子打开，盒里一排针，盒外撒了几根（还没投的） */
function NeedleCase({ spill: show }: { spill: boolean }) {
  const at: V3 = [PAPER[0] + PW / 2 + 0.09, TABLE_H, PAPER[2] + 0.08]
  // 盒里倒出来、散在纸上的几根（开始投以后收走）：位置相对盒子
  const spill: [number, number, number][] = [[-0.16, 0.02, 0.3], [-0.12, 0.07, 1.9], [-0.21, 0.09, 2.6], [-0.09, -0.04, 1.2], [-0.25, -0.02, 0.8]]
  const needle = (k: number, x: number, z: number, th: number, y = 0.0008) => <group key={k} position={[x, y, z]} rotation-y={th}>
    <mesh rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.0007, 0.0007, NEEDLE.l, 6]} /><Metal kind="steel" /></mesh>
    <mesh position={[NEEDLE.l / 2, 0, 0]}><sphereGeometry args={[0.0018, 10, 8]} /><meshStandardMaterial color="#2f3337" roughness={0.4} /></mesh>
  </group>
  return <group position={at}>
    <mesh position={[0, 0.006, 0]} castShadow receiveShadow><boxGeometry args={[0.05, 0.012, 0.08]} /><meshStandardMaterial color="#c9433a" roughness={0.7} /></mesh>
    <mesh position={[0, 0.0122, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.042, 0.072]} /><meshStandardMaterial color="#f1ede2" roughness={0.9} /></mesh>
    <mesh position={[0, 0.03, -0.042]} rotation-x={-0.35} castShadow><boxGeometry args={[0.05, 0.05, 0.002]} /><meshStandardMaterial color="#c9433a" roughness={0.7} /></mesh>
    {[-0.012, -0.004, 0.004, 0.012].map((x, i) => needle(i, x, 0, Math.PI / 2, 0.0135))}
    {show && spill.map(([x, z, th], i) => needle(10 + i, x, z, th, 0.0095))}
  </group>
}

/** 一小盒图钉：还没抛的，钉帽朝上挤在盒里 */
function TackBox() {
  const cap = useMemo(() => disc(0.0055, 0.0012), [])
  const at: V3 = [PLATE[0] - 0.23, TABLE_H, PLATE[2] + 0.1]
  return <group position={at}>
    <mesh position={[0, 0.009, 0]} castShadow receiveShadow><boxGeometry args={[0.07, 0.018, 0.05]} /><meshPhysicalMaterial color="#dfe8ea" transparent opacity={0.45} roughness={0.1} depthWrite={false} /></mesh>
    {Array.from({ length: 12 }, (_, i) => <group key={i} position={[-0.026 + (i % 6) * 0.0105, 0.004 + Math.floor(i / 6) * 0.002, -0.01 + Math.floor(i / 6) * 0.02]} rotation={[0.3 * Math.sin(i), i, 0.2 * Math.cos(i)]}>
      <mesh geometry={cap} castShadow><Metal kind="brass" /></mesh>
    </group>)}
  </group>
}
