// 从石油到塑料 · 拓展课 塑料的回收。回收车间里三个小实验：
// 分拣皮带把六种废塑料按回收标志送进各自的料箱；试验台上分别加热聚乙烯碎片和电木，看熔不熔化。
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { lathe, shell, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { clamp01, ease, lerp, rng, seg, useRun, type V3 } from './parts'
import { PLASTICS, RESINS } from './physics'
import { RC, binX } from './recycle'
import { VOICE } from './voice'
import { Place, spot } from './world'

type Mode = 'sort' | 'pe' | 'pf'
const TASKS: Task[] = [
  { id: 'sort', text: '开分拣线，把六种塑料分开', note: '回收标志 1 到 6 各是一种塑料，混在一起没法再用，要先分开' },
  { id: 'pe', text: '加热聚乙烯碎片', note: '熔化了，冷却后又变硬：聚乙烯是线型高分子，热塑性，可以重新造粒' },
  { id: 'pf', text: '加热电木', note: '不熔化：酚醛塑料是网状结构，热固性，不能熔了重做' },
]
const SPOT_S = spot((RC.x0 + RC.x1) / 2 + 0.1, 2.3, -3.2, 10.0, 3.9, [-0.14, 0.2], false, [140, 1000])
const SPOT_H = spot(RC.hot[0], RC.hot[1] + 0.13, RC.hot[2], 1.5, 0.74, [-0.2, 0.3], false, [140, 1000])
/** 六件废塑料上皮带的先后（数字是它在 RESINS 里的序号） */
const ORDER = [3, 0, 5, 2, 4, 1]

/** 一件废塑料：按回收标志的序号画成各自的样子，原点在它的底面中心 */
function Item({ i }: { i: number }) {
  const g = useMemo(() => ({
    pet: shell([[0, 0], [0.11, 0], [0.13, 0.03], [0.13, 0.42], [0.05, 0.56], [0.05, 0.64]], 0.006, { segs: 28 }),
    jug: lathe([[0, 0], [0.2, 0], [0.22, 0.03], [0.22, 0.42], [0.16, 0.52], [0.07, 0.56], [0.07, 0.64], [0, 0.64]], { segs: 28 }),
    pipe: shell([[0.14, 0], [0.14, 0.7]], 0.014, { segs: 28 }),
  }), [])
  if (i === 0) return <group rotation-z={Math.PI / 2} position-y={0.13}><mesh geometry={g.pet} castShadow><meshPhysicalMaterial color="#bfe3f0" transparent opacity={0.5} roughness={0.08} clearcoat={1} side={THREE.DoubleSide} /></mesh><mesh position-y={0.66}><cylinderGeometry args={[0.058, 0.058, 0.05, 20]} /><meshStandardMaterial color="#2f6fb8" roughness={0.5} /></mesh></group>
  if (i === 1) return <group><mesh geometry={g.jug} scale={[1, 1, 0.7]} castShadow><meshStandardMaterial color="#e9e7df" roughness={0.6} /></mesh><mesh position={[0.2, 0.36, 0]} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[0.1, 0.028, 10, 20, Math.PI]} /><meshStandardMaterial color="#e9e7df" roughness={0.6} /></mesh><mesh position-y={0.67}><cylinderGeometry args={[0.08, 0.08, 0.06, 20]} /><meshStandardMaterial color="#c9452f" roughness={0.5} /></mesh></group>
  if (i === 2) return <group rotation-z={Math.PI / 2} position={[0.35, 0.154, 0]}><mesh geometry={g.pipe} castShadow><meshStandardMaterial color="#9a9fa3" roughness={0.6} /></mesh></group>
  if (i === 3) return <mesh position-y={0.1} scale={[1.25, 0.42, 1]} castShadow><icosahedronGeometry args={[0.24, 1]} /><meshPhysicalMaterial color="#f4f4f0" transparent opacity={0.62} roughness={0.35} flatShading /></mesh>
  if (i === 4) return <group><RoundedBox args={[0.5, 0.16, 0.36]} radius={0.03} position-y={0.08} castShadow><meshPhysicalMaterial color="#f1efe8" transparent opacity={0.72} roughness={0.25} /></RoundedBox><RoundedBox args={[0.53, 0.03, 0.39]} radius={0.012} position-y={0.17} castShadow><meshPhysicalMaterial color="#f1efe8" transparent opacity={0.8} roughness={0.25} /></RoundedBox></group>
  return <RoundedBox args={[0.5, 0.26, 0.4]} radius={0.02} position-y={0.13} castShadow><meshStandardMaterial color="#f7f7f4" roughness={0.95} /></RoundedBox>
}

export default function LessonX() {
  const T = useTasks('gewu:petro:x', TASKS)
  const [mode, setMode] = useState<Mode>('sort')
  const sort = useRun(11, () => T.check(id => id === 'sort'))
  const pe = useRun(6, () => T.check(id => id === 'pe')), pf = useRun(6, () => T.check(id => id === 'pf'))
  const busy = sort.busy || pe.busy || pf.busy
  const cur = mode === 'sort' ? sort : mode === 'pe' ? pe : pf
  const go = () => { if (busy || cur.k >= 1) return; cur.run() }
  const resetAll = () => { setMode('sort'); sort.snap(0); pe.snap(0); pf.snap(0); T.reset() }

  const task = T.current?.id as Mode | undefined
  const next: 'seg' | 'go' | null = !task || busy ? null : mode !== task ? 'seg' : 'go'
  const hint = !task ? '塑料要分类回收：热塑性的可以熔了再用，热固性的不行。'
    : sort.busy ? '皮带上的每一件走到自己的料箱前面，就被推下去…'
    : pe.busy ? '电热板热起来了，看聚乙烯碎片…' : pf.busy ? '电热板热起来了，看电木…'
    : mode !== task ? `换到“${task === 'sort' ? '分拣线' : task === 'pe' ? '加热聚乙烯' : '加热电木'}”`
    : mode === 'sort' ? '开分拣线' : mode === 'pe' ? '打开电热板，加热聚乙烯碎片' : '打开电热板，加热电木'

  // 分拣：第 j 件从皮带西头出发，匀速走到自己的料箱前面，再被推进箱里
  const items = ORDER.map((r, j) => {
    const startX = RC.x0 + 0.5 + (j % 3) * 0.62, y0 = RC.top + (j < 3 ? 0.42 : 0), z0 = RC.z + (j % 2 ? 0.12 : -0.1), t0 = j * 0.1, t = clamp01((sort.k - t0) / 0.38), endX = binX(r)
    const x = lerp(startX, endX, ease(t)), push = ease(seg(sort.k, t0 + 0.38, t0 + 0.47))
    return { r, x, y: lerp(lerp(y0, RC.top, seg(t, 0, 0.15)), 0.3, push * push), z: lerp(lerp(z0, RC.z, seg(t, 0, 0.15)), RC.binZ, push), tilt: push * 0.5, done: sort.k >= t0 + 0.47 }
  })
  const heatK = mode === 'pe' ? pe.k : mode === 'pf' ? pf.k : 0, melt = ease(seg(pe.k, 0.25, 0.9))
  const flakes = useMemo(() => { const r = rng(9); return Array.from({ length: 16 }, () => ({ p: [(r() - 0.5) * 0.14, 0.008 + r() * 0.03, (r() - 0.5) * 0.1] as V3, s: 0.02 + r() * 0.02, a: r() * 3 })) }, [])
  const socket = useMemo(() => lathe([[0, 0], [0.05, 0], [0.055, 0.006], [0.055, 0.022], [0.035, 0.03], [0.035, 0.05], [0.028, 0.056], [0, 0.056]], { segs: 32 }), [])
  const [hx, hy, hz] = RC.hot, top = hy + 0.02
  const labels: Label[] = mode === 'sort' ? items.filter(it => it.done).map(it => ({ id: 'i' + it.r, at: [binX(it.r), 0.05, RC.binZ + 0.9] as V3, ax: 0.5, className: 'scene-tag', children: <><small>{RESINS[it.r].code}</small>{RESINS[it.r].abbr}</> }))
    : [
      { id: 'pe', at: [hx - 0.2, top + 0.09, hz], ax: 0.9, className: `scene-tag ${pe.k >= 1 ? 'key' : ''} -translate-y-full`, children: <><small>聚乙烯碎片</small>{pe.k >= 1 ? '熔化了 · 热塑性' : pe.busy ? '在变软…' : '线型高分子'}</> },
      { id: 'pf', at: [hx + 0.2, top + 0.11, hz], ax: 0.1, className: `scene-tag ${pf.k >= 1 ? 'key' : ''} -translate-y-full`, children: <><small>电木（酚醛塑料）</small>{pf.k >= 1 ? '不熔化 · 热固性' : pf.busy ? '没有变软…' : '网状高分子'}</> },
      { id: 'hp', at: [hx + 0.36, hy - 0.06, hz + 0.27], ax: 0, name: true, className: 'scene-name', children: '电热板' },
    ]
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={mode === 'sort' ? '分拣线' : '加热试验台'}
      stage={<Place at={mode === 'sort' ? SPOT_S : SPOT_H} labels={labels}>
        {items.map(it => <group key={it.r} position={[it.x, it.y, it.z]} rotation-x={it.tilt} scale={1.7}><Item i={it.r} /></group>)}
        {/* 电热板的热面、上面的两份样品 */}
        <mesh position={[hx, top + 0.0005, hz]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.78, 0.38]} /><meshBasicMaterial color="#ff4a1c" transparent opacity={0.2 * ease(seg(heatK, 0, 0.4))} toneMapped={false} /></mesh>
        <group position={[hx - 0.17, top, hz]}>
          {flakes.map((f, i) => <mesh key={i} position={[f.p[0] * (1 + melt * 0.25), f.p[1] * (1 - melt * 0.8), f.p[2] * (1 + melt * 0.25)]} rotation={[f.a, f.a * 2, f.a * 3].map(v => v * (1 - melt)) as V3} scale={[1 + melt * 1.2, 1 - melt * 0.75, 1 + melt * 1.2]} castShadow><boxGeometry args={[f.s, f.s * 0.5, f.s * 1.3]} /><meshPhysicalMaterial color="#f3f2ec" roughness={0.5 - 0.4 * melt} clearcoat={melt} transparent opacity={1 - melt * 0.25} /></mesh>)}
          <mesh position-y={0.004} scale={[1, 0.25 + melt * 0.75, 1]} visible={melt > 0.05}><cylinderGeometry args={[0.03 + 0.085 * melt, 0.04 + 0.085 * melt, 0.012, 32]} /><meshPhysicalMaterial color="#f1f0e8" roughness={0.1} clearcoat={1} transparent opacity={0.9} /></mesh>
        </group>
        <mesh geometry={socket} position={[hx + 0.2, top, hz]} castShadow><meshPhysicalMaterial color={new THREE.Color('#4a2c1a').lerp(new THREE.Color('#2a1a12'), ease(seg(pf.k, 0.3, 1)))} roughness={0.35} clearcoat={0.4} /></mesh>
      </Place>}
      lesson={<LessonBlock no="拓展" title="塑料的回收" concept="先分类，再看能不能熔了重用" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>塑料制品上三个箭头围成的三角形是<b className="text-white">回收标志</b>，中间的数字说明它是哪一种塑料：1 是 PET（饮料瓶），2 是 HDPE（高密度聚乙烯），3 是 PVC（聚氯乙烯），4 是 LDPE（低密度聚乙烯），5 是 PP（聚丙烯），6 是 PS（聚苯乙烯）。不同的塑料混在一起很难再利用，回收的第一步是分类。</p>
          <p className="mt-3"><b className="text-white">热塑性塑料</b>（如聚乙烯、聚丙烯）是线型高分子，链和链之间没有化学键连着，受热会软化、熔化，冷却后又变硬，可以反复加工。</p>
          <p className="mt-3"><b className="text-white">热固性塑料</b>（如酚醛塑料，俗称电木）加工成型时链和链之间连成了网状，再受热也不熔化。</p>
          <p className="mt-3">大多数塑料在自然界里很难降解，随意丢弃会造成“白色污染”。减少使用、重复使用、分类回收，是现在能做的事。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">先按标志分类；热塑性的可以熔了重新造粒</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">聚乙烯是线型的，受热熔化；电木是网状的，受热不熔化。高分子的结构决定了它能不能回炉重做。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <h2 className="text-[12.5px] text-white/55">塑料的回收标志</h2>
        <div className="mt-2 space-y-1">
          {RESINS.map((r, i) => <div key={r.code} className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-[14px] ${items.find(it => it.r === i)?.done ? 'bg-[#35c7b3]/18' : 'bg-white/[0.05]'}`}><span className="grid size-6 flex-none place-items-center rounded-full bg-white/12 text-[13px] font-bold">{r.code}</span><span className="w-12 font-semibold">{r.abbr}</span><span className="flex-1 text-white/70">{r.name}</span><span className="text-[12.5px] text-white/50">{r.item}</span></div>)}
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">加热以后</h2>
        <div className="mt-2 space-y-1.5 text-[14px]">
          {(['pe', 'pf'] as const).map(k => <div key={k} className="flex justify-between rounded-lg bg-white/[0.06] px-3 py-2"><span className="text-white/65">{PLASTICS[k].name}</span><span className={T.done[k] ? 'text-white' : 'text-white/30'}>{T.done[k] ? `${PLASTICS[k].melts ? '熔化' : '不熔化'} · ${PLASTICS[k].structure} · ${PLASTICS[k].kind}` : '—'}</span></div>)}
        </div>
      </Panel>}
      actions={<>
        <LabButton primary pulse={next === 'go'} disabled={busy || cur.k >= 1} onClick={go}>{mode === 'sort' ? '开分拣线' : '打开电热板'}</LabButton>
      </>}
      extras={
        <Control label="做哪一个">
          <Segmented label="做哪一个" pulse={next === 'seg'} want={task ?? null} disabled={busy} value={mode} onChange={v => setMode(v as Mode)} options={[{ value: 'sort', label: '分拣线' }, { value: 'pe', label: '加热聚乙烯' }, { value: 'pf', label: '加热电木' }]} />
        </Control>
      }
    />
  )
}
