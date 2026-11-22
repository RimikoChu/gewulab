// 植物的一生 · 拓展课：三个小实验。测定种子的发芽率（工作台上的培养盘）、无土栽培（清水和营养液里各养一棵苗）、人工辅助授粉（用毛笔把花粉涂到柱头上）。
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, shell, useTasks, type Label } from '@/lab-kit'
import { F, Flower } from './flower'
import { MA, MB, POSE_A, POSE_B, worldA } from './lesson6'
import { LESSONS, goLesson } from './lessons'
import { Flesh, Glass, blob, ease, fuse, lerp, mixHex, place, rng, seg, tube, useRun, veinTex, type V3 } from './parts'
import { GROUPS, SALTS, SAMPLE, germRate, growsWell, meanRate, setsFruit, type Liquid } from './physics'
import { Finale, H } from './ui'
import { AT, BENCH, FLOWER_A, FLOWER_B, Room, beanPlant } from './world'

type Sub = 'rate' | 'hydro' | 'hand'
const SUBS: { key: Sub; name: string }[] = [{ key: 'rate', name: '发芽率' }, { key: 'hydro', name: '无土栽培' }, { key: 'hand', name: '人工授粉' }]
const TASKS: Task[] = [
  { id: 'rate', text: '抽 100 粒种子测发芽率，重复三组，取平均值', note: `三组的平均发芽率是 ${meanRate(GROUPS).toFixed(0)}%` },
  { id: 'hydro', text: '一棵苗养在清水里，一棵养在营养液里，比一比', note: '营养液里有植物需要的无机盐，苗长得健壮' },
  { id: 'hand', text: '用毛笔蘸花粉，涂到另一朵花的柱头上', note: '人工辅助授粉能弥补自然状态下传粉的不足' },
]
const ACT: Record<Sub, [string, string]> = { rate: ['培养几天', '数一数，记下'], hydro: ['培养一段时间', '比一比，记下'], hand: ['蘸取花粉', '涂到柱头上'] }

// ---------- 发芽率 ----------
const R0: V3 = [AT.rate.x, BENCH.h, AT.rate.z]
/** 培养盘：白瓷盘里铺着湿滤纸，摆 100 粒种子；group 决定这一组里哪些没发芽 */
function RateTray({ group, k }: { group: number; k: number }) {
  const g = useMemo(() => {
    const r = rng(100 + group * 7), bad = new Set<number>()
    while (bad.size < SAMPLE - GROUPS[group]) bad.add(Math.floor(r() * SAMPLE))
    const seeds: THREE.BufferGeometry[] = [], sprouts: THREE.BufferGeometry[] = []
    for (let i = 0; i < SAMPLE; i++) {
      const x = -2.07 + (i % 10) * 0.46 + (r() - 0.5) * 0.08, z = -1.53 + Math.floor(i / 10) * 0.34 + (r() - 0.5) * 0.06, yaw = r() * 6.28, ok = !bad.has(i)
      seeds.push(place(blob(0.115, 0.075, 0.08, ok ? '#7c8f3e' : '#5d5a36', ok ? '#9aa850' : '#6f6a42', 10, 7), [x, 0.075, z], yaw))
      if (ok) { const a = yaw + 1, L = 0.16 + r() * 0.1; sprouts.push(place(tube([[0, 0.04, 0], [Math.cos(a) * L * 0.6, 0.16, Math.sin(a) * L * 0.6], [Math.cos(a) * L, 0.34 + r() * 0.12, Math.sin(a) * L]], 0.028, 0.014, '#f6f1df', '#e4eeb0', 5, 6), [x, 0.03, z])) }
    }
    return { seeds: fuse(seeds), sprouts: fuse(sprouts) }
  }, [group])
  useEffect(() => () => { g.seeds.dispose(); g.sprouts.dispose() }, [g])
  return (
    <group position={R0}>
      <RoundedBox args={[5.5, 0.34, 4.2]} radius={0.12} position={[0, 0.17, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e9e7df" roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.3} /></RoundedBox>
      <mesh position={[0, 0.345, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[5.0, 3.7]} /><meshStandardMaterial color="#c9cfc6" roughness={0.9} /></mesh>
      <group position={[0, 0.35, 0]}>
        <mesh geometry={g.seeds} castShadow><Flesh rough={0.5} /></mesh>
        <mesh geometry={g.sprouts} scale={[1, ease(k) + 0.001, 1]} visible={k > 0.01}><Flesh rough={0.6} /></mesh>
      </group>
    </group>
  )
}
// ---------- 无土栽培 ----------
const H0: V3 = [AT.hydro.x, BENCH.h, AT.hydro.z + 0.3]
const TANK = shell([[0, 0], [1.3, 0], [1.38, 0.08], [1.38, 2.7], [1.44, 2.76]], 0.06, { segs: 48 })
function HydroPlant({ liquid, x, k }: { liquid: Liquid; x: number; k: number }) {
  const well = growsWell(liquid)
  const g = useMemo(() => {
    const r = rng(well ? 41 : 43), p = beanPlant(r, well ? 2 : 1), roots: THREE.BufferGeometry[] = []
    for (let i = 0; i < (well ? 13 : 6); i++) { const a = r() * 6.28, L = (well ? 1.6 : 0.8) + r() * 0.7, d = 0.15 + r() * 0.5; roots.push(tube([[0, 0, 0], [Math.cos(a) * d * 0.5, -L * 0.5, Math.sin(a) * d * 0.5], [Math.cos(a) * d, -L, Math.sin(a) * d]], 0.035, 0.01, '#efe7cf', '#f8f4e6', 5, 8)) }
    return { leaf: fuse(p.leaf), body: fuse(p.body), roots: fuse(roots) }
  }, [well])
  const s = lerp(0.3, well ? 0.92 : 0.5, ease(k)), tintc = well ? '#ffffff' : mixHex('#ffffff', '#e9dc7a', ease(k) * 0.9)
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.12, 0]} renderOrder={2}><cylinderGeometry args={[1.3, 1.26, 2.1, 48]} /><meshPhysicalMaterial color={well ? '#6fae8c' : '#7fb4c6'} transparent opacity={well ? 0.42 : 0.3} roughness={0.05} depthWrite={false} /></mesh>
      <mesh geometry={TANK} renderOrder={4}><Glass opacity={0.1} color="#7fa4ab" env={0.45} /></mesh>
      {/* 定植板：泡沫板中间开个孔，苗卡在里面 */}
      <mesh position={[0, 2.78, 0]} castShadow><cylinderGeometry args={[1.5, 1.5, 0.2, 40]} /><meshStandardMaterial color="#23272a" roughness={0.8} /></mesh>
      <mesh position={[0, 2.9, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.14, 20]} /><meshStandardMaterial color="#c7b299" roughness={0.95} /></mesh>
      <group position={[0, 2.9, 0]} scale={s}>
        <mesh geometry={g.leaf} castShadow><meshStandardMaterial vertexColors map={veinTex()} roughness={0.6} color={tintc} /></mesh>
        <mesh geometry={g.body} castShadow><Flesh rough={0.6} color={tintc} /></mesh>
      </group>
      <mesh geometry={g.roots} position={[0, 2.7, 0]} scale={[1, lerp(0.3, 1, ease(k)), 1]}><Flesh rough={0.7} /></mesh>
    </group>
  )
}
// ---------- 人工辅助授粉 ----------
const B_AN = new THREE.Vector3(...F.anther).applyMatrix4(MB).applyMatrix4(MA.clone().invert())
/** 毛笔：笔尖在原点，笔杆朝 +y 斜上去 */
function Brush({ loaded }: { loaded: boolean }) {
  return <group rotation={[0.5, 0, -0.75]}>
    <mesh position={[0, 0.2, 0]}><coneGeometry args={[0.075, 0.4, 14]} /><meshStandardMaterial color={loaded ? '#e9c23a' : '#e9e2cf'} roughness={0.9} /></mesh>
    <mesh position={[0, 0.2, 0]} rotation-x={Math.PI}><coneGeometry args={[0.075, 0.4, 14]} /><meshStandardMaterial color={loaded ? '#e9c23a' : '#e9e2cf'} roughness={0.9} /></mesh>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.07, 0.075, 0.24, 14]} /><Metal kind="brass" grain="turned" /></mesh>
    <mesh position={[0, 1.9, 0]} castShadow><cylinderGeometry args={[0.055, 0.065, 2.6, 12]} /><meshPhysicalMaterial color="#7a3a26" roughness={0.35} clearcoat={0.6} /></mesh>
  </group>
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('rate')
  const [grp, setGrp] = useState(0), [cult, setCult] = useState(false), [rows, setRows] = useState<number[]>([])
  const [fed, setFed] = useState(false), [cmp, setCmp] = useState(false)
  const [dip, setDip] = useState(false), [dab, setDab] = useState(false)
  const T = useTasks('gewu:plant:x', TASKS)
  const k = useRun(cult ? 1 : 0, cult ? 3.6 : 0.01), hk = useRun(fed ? 1 : 0, 7), d1 = useRun(dip ? 1 : 0, 2.6), d2 = useRun(dab ? 1 : 0, 2.8)
  useEffect(() => { T.check(id => id === 'rate' ? rows.length >= GROUPS.length : id === 'hydro' ? cmp : d2 >= 1) }, [rows.length, cmp, d2 >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSub('rate'); setGrp(0); setCult(false); setRows([]); setFed(false); setCmp(false); setDip(false); setDab(false); T.reset() }
  const task = T.current
  const st = sub === 'rate' ? { busy: cult && k < 1, can1: !cult && rows.length < GROUPS.length, can2: cult && k >= 1 }
    : sub === 'hydro' ? { busy: fed && hk < 1, can1: !fed, can2: fed && hk >= 1 && !cmp }
    : { busy: (dip && d1 < 1) || (dab && d2 < 1), can1: !dip, can2: dip && d1 >= 1 && !dab }
  const act1 = () => { if (sub === 'rate') setCult(true); else if (sub === 'hydro') setFed(true); else setDip(true) }
  const act2 = () => {
    if (sub === 'rate') { setRows(r => [...r, GROUPS[grp]]); setCult(false); if (grp < GROUPS.length - 1) setTimeout(() => setGrp(g => Math.min(GROUPS.length - 1, g + 1)), 60) }
    else if (sub === 'hydro') setCmp(true); else setDab(true)
  }
  const { hint, next }: { hint: string; next: 'sub' | 1 | 2 | null } = (() => {
    if (!task) return { hint: '三个小实验都做完了。', next: null }
    if (sub !== task.id) return { hint: `换到“${SUBS.find(s => s.key === task.id)!.name}”`, next: 'sub' }
    if (st.busy) return { hint: sub === 'rate' ? '保持湿润，放在温暖的地方…' : sub === 'hydro' ? '一天天过去，看两棵苗的差别…' : dab ? '把花粉轻轻涂在柱头上…' : '在另一朵花的花药上轻轻蘸一下…', next: null }
    if (sub === 'rate') return st.can2 ? { hint: `第 ${grp + 1} 组：数一数 100 粒里发芽了多少。按“${ACT.rate[1]}”`, next: 2 } : { hint: `第 ${rows.length + 1} 组：盘里随机抽了 ${SAMPLE} 粒种子。按“${ACT.rate[0]}”`, next: 1 }
    if (sub === 'hydro') return st.can2 ? { hint: `按“${ACT.hydro[1]}”`, next: 2 } : { hint: `两棵苗一样大，左边清水，右边营养液。按“${ACT.hydro[0]}”`, next: 1 }
    return st.can2 ? { hint: `笔尖上沾了黄色的花粉。按“${ACT.hand[1]}”`, next: 2 } : { hint: `按“${ACT.hand[0]}”`, next: 1 }
  })()
  // 毛笔的位置（在花 A 自己的坐标里）：先停在一边，蘸另一朵花的花药，再回来涂柱头
  const rest = new THREE.Vector3(1.5, 2.4, 0.9), an = B_AN.clone().add(new THREE.Vector3(0, 0.06, 0.05)), sg = new THREE.Vector3(...F.stigma).add(new THREE.Vector3(0, 0.07, 0.04))
  const b1 = seg(d1, 0, 0.55), b1b = seg(d1, 0.7, 1), b2 = seg(d2, 0, 0.6), b2b = seg(d2, 0.8, 1)
  const brush = rest.clone().lerp(an, b1 - b1b).lerp(sg, b2).lerp(rest.clone().lerp(sg, 0.55), b2b)
  const shown = rows.length > 0 ? rows : []
  const labels: Label[] = sub === 'rate' ? [
    { id: 'tray', at: [R0[0], R0[1] + 0.5, R0[2] - 2.5], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `培养盘 · ${SAMPLE} 粒种子` },
    ...(cult && k >= 1 ? [{ id: 'n', at: [R0[0], R0[1] + 0.4, R0[2] + 2.4] as V3, ax: 0.5, className: 'scene-tag key', children: <><small>第 {grp + 1} 组发芽</small>{GROUPS[grp]} 粒</> }] : []),
  ] : sub === 'hydro' ? [
    { id: 'w', at: [H0[0] - 1.9, H0[1] + 1.2, H0[2] + 1.5], ax: 0.5, className: 'scene-tag', children: '清水' },
    { id: 'n', at: [H0[0] + 1.9, H0[1] + 1.2, H0[2] + 1.5], ax: 0.5, className: 'scene-tag key', children: '营养液' },
  ] : [
    ...(d2 >= 1 ? [{ id: 's', at: worldA(F.stigma), ax: 1, className: 'scene-tag key -translate-x-3 -translate-y-1/2', children: <><small>柱头上有了</small>花粉</> }] : []),
    { id: 'b', at: [FLOWER_B[0] + 0.2, FLOWER_B[1] + 2.5, FLOWER_B[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '另一朵花' },
  ]
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS.find(s => s.key === sub)!.name}
      stage={<Room at={sub === 'rate' ? 'rate' : sub === 'hydro' ? 'hydro' : 's6b'} labels={labels}>
        <RateTray group={grp} k={cult ? k : 0} />
        <group position={H0}><HydroPlant liquid="water" x={-1.9} k={hk} /><HydroPlant liquid="nutrient" x={1.9} k={hk} /></group>
        <group position={FLOWER_A} rotation={POSE_A}>
          <Flower />
          {sub === 'hand' && <group position={brush}><Brush loaded={d1 > 0.55} /></group>}
          {d2 > 0.6 && [0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[F.stigma[0] + Math.cos(i * 1.05) * 0.05, F.stigma[1] + 0.03, F.stigma[2] + Math.sin(i * 1.05) * 0.05]}><sphereGeometry args={[0.03, 10, 8]} /><meshStandardMaterial color="#f2c230" roughness={0.7} /></mesh>)}
        </group>
        <group position={FLOWER_B} rotation={POSE_B} scale={0.86}><Flower /></group>
      </Room>}
      lesson={<LessonBlock no="拓展" title="三个小实验" concept="种地的人常做的三件事" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-2 text-[14px] text-white/85">
            <li><b className="text-white">发芽率</b> = 发芽的种子数 ÷ 供检测的种子数 × 100%。不能把种子全测一遍，所以随机抽取一部分做样本（抽样检测），重复几次，取平均值。</li>
            <li><b className="text-white">无土栽培</b>：植株生长需要水和无机盐，其中需要量最多的是{SALTS.join('、')}无机盐。按植物的需要把无机盐配成营养液，不用土也能种。</li>
            <li><b className="text-white">人工辅助授粉</b>：传粉不足时，果实和种子会减少。人工把花粉涂到柱头上，可以弥补。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="三个小实验都做完了" title="选种、施肥、授粉，都用得上这一章的知识" text={`抽样测出平均发芽率 ${meanRate(GROUPS).toFixed(0)}%；营养液里的苗比清水里的健壮；柱头上涂了花粉，才可能受精结果。`} notes="每组的发芽粒数是示意的数。两棵苗的差别画得比较明显，实际要培养较长时间才看得出。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          {sub === 'rate' && <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">平均发芽率</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{rows.length >= GROUPS.length ? meanRate(rows).toFixed(0) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
              <div className="mt-2 font-formula text-[15px] italic text-white/65">发芽率 = 发芽的种子数 ÷ 供检测的种子数 × 100%</div>
            </div>
            <H>三组的记录</H>
            {shown.length === 0 ? <p className="rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每组 {SAMPLE} 粒，培养几天后数一数。</p>
              : <table className="w-full text-[13.5px]"><thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">组</th><th className="text-right font-normal">供检测</th><th className="text-right font-normal">发芽</th><th className="text-right font-normal">发芽率</th></tr></thead>
                <tbody>{shown.map((n, i) => <tr key={i} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">第 {i + 1} 组</td><td className="text-right tabular-nums">{SAMPLE} 粒</td><td className="text-right tabular-nums">{n} 粒</td><td className="text-right font-semibold tabular-nums text-[#7fe3d4]">{germRate(n, SAMPLE).toFixed(0)}%</td></tr>)}</tbody></table>}
          </>}
          {sub === 'hydro' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">两棵一样大的苗</div><div className="mt-1 text-[26px] leading-tight font-bold">{cmp ? '营养液里的长得健壮' : hk >= 1 ? '比一比' : '只有培养液不同'}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ParamTile symbol="清水" value={cmp ? (growsWell('water') ? '健壮' : '矮小发黄') : '—'} unit="没有无机盐" />
              <ParamTile symbol="营养液" value={cmp ? (growsWell('nutrient') ? '健壮，叶色绿' : '矮小发黄') : '—'} unit="有植物需要的无机盐" />
            </div>
            <H>需要量最多的无机盐</H>
            <div className="grid grid-cols-3 gap-2 text-center text-[13.5px]">{SALTS.map(s => <div key={s} className="rounded-xl bg-white/8 px-2 py-2.5">{s}无机盐</div>)}</div>
          </>}
          {sub === 'hand' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">这朵花的柱头上</div><div className="mt-1 text-[26px] leading-tight font-bold">{d2 >= 1 ? '有花粉了' : '还没有花粉'}</div>
              <div className="mt-2 text-[13.5px] leading-snug text-white/70">{setsFruit(d2 >= 1) ? '有了花粉，才可能长出花粉管、完成受精，子房才会发育成果实。' : '柱头上没有花粉，就不能受精，子房不会发育成果实。'}</div></div>
            <H>什么时候要人工辅助授粉</H>
            <p className="rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">花期遇到阴雨、大风，或者传粉的昆虫少，传粉不足，结的果实和种子就少。</p>
          </>}
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 1} onClick={act1} disabled={st.busy || !st.can1}>{ACT[sub][0]}</LabButton>
        <LabButton primary pulse={next === 2} onClick={act2} disabled={st.busy || !st.can2}>{ACT[sub][1]}</LabButton>
      </>}
      extras={<Control label="小实验"><Segmented label="小实验" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={v => { if (!st.busy) setSub(v) }} options={SUBS.map(s => ({ value: s.key, label: s.name }))} /></Control>}
    />
  )
}
