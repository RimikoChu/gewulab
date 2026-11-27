// 种群和生态系统 · 第 7 课 能量流动：北坡下的一块草地，草、兔、狐三个营养级。给这块草地一年的能量记账：
// 按“追踪能量”，光点从太阳落到草上，再流向兔、流向狐；每一级都有光点升上天（呼吸作用散失）、沉进土里（流向分解者）、留在原处（未利用）。
// 屏上一层层画出能量金字塔和每一级四个去向的比例，再算出传递效率。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { FoxPack, RabbitHerd } from './animals'
import { BoardFace, C, FONT, bar, text, type Draw } from './board'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { bladeGeo, fuse, place, rng, tint, type V3 } from './parts'
import { ENERGY, efficiency, pct } from './physics'
import { Big, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room, SITE, ground, onGround } from './world'

const S = SITE.slope
const GRASS = S.front(-3.8, 4.8), RABBIT = S.front(0.2, 4.4), FOX = S.front(3.6, 4.2)
const AT: V3[] = [onGround(...GRASS, 0.5), onGround(...RABBIT, 0.6), onGround(...FOX, 0.9)]
const SUN: V3 = [AT[0][0] - 5, AT[0][1] + 10, AT[0][2] - 4]
const COL = { in: '#fff1a8', next: '#ffd84a', resp: '#ff9a52', decomp: '#c9a06a', unused: '#9be07a' }
const TASKS: Task[] = [
  { id: 'grass', text: '追踪草固定的能量', note: `草固定了 ${ENERGY[0].got} kJ，其中只有 ${ENERGY[0].next} kJ 流入兔` },
  { id: 'rabbit', text: '追踪流入兔的能量，算出传递效率', note: `${ENERGY[1].got} ÷ ${ENERGY[0].got} = ${pct(efficiency(0))}` },
  { id: 'fox', text: '追踪流入狐的能量，算出传递效率', note: `${ENERGY[2].got} ÷ ${ENERGY[1].got} = ${pct(efficiency(1))}` },
]

interface Orb { level: number; kind: 'in' | 'resp' | 'decomp' | 'unused'; a: V3; b: V3; d: number; c: THREE.Color }
/** 代表能量的光点：每一级的流入、呼吸散失、流向分解者、未利用各几颗 */
const ORBS: Orb[] = (() => {
  const r = rng(77), out: Orb[] = [], j = (s: number) => (r() - 0.5) * s
  ENERGY.forEach((_, L) => {
    const o = AT[L], from = L === 0 ? SUN : AT[L - 1], spread = L === 0 ? 2.3 : 1.1
    const near = (): V3 => [o[0] + j(spread), o[1] + j(0.3), o[2] + j(spread * 0.7)]
    for (let i = 0; i < (L === 0 ? 16 : 7); i++) out.push({ level: L, kind: 'in', a: [from[0] + j(L === 0 ? 2.5 : 0.8), from[1] + j(0.4), from[2] + j(0.8)], b: near(), d: r(), c: new THREE.Color(L === 0 ? COL.in : COL.next) })
    for (let i = 0; i < [11, 8, 5][L]; i++) { const a = near(); out.push({ level: L, kind: 'resp', a, b: [a[0] + j(1.6), a[1] + 5 + r() * 2, a[2] + j(1.2)], d: r(), c: new THREE.Color(COL.resp) }) }
    for (let i = 0; i < [5, 3, 2][L]; i++) { const a = near(); out.push({ level: L, kind: 'decomp', a, b: [a[0] + j(0.8), ground(a[0], a[2]) - 0.25, a[2] + j(0.8)], d: r(), c: new THREE.Color(COL.decomp) }) }
    for (let i = 0; i < [7, 3, 2][L]; i++) { const a = near(); out.push({ level: L, kind: 'unused', a, b: a, d: r(), c: new THREE.Color(COL.unused) }) }
  })
  return out
})()
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** 生产者的那片草：一圈带绿色反光头的标桩，里面的草又高又亮 */
function Producers() {
  const { stakes, caps, blades } = useMemo(() => {
    const r = rng(31), st: THREE.BufferGeometry[] = [], cp: THREE.BufferGeometry[] = [], bl: THREE.BufferGeometry[] = [], R = 1.75
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283, x = GRASS[0] + Math.cos(a) * R, z = GRASS[1] + Math.sin(a) * R, y = ground(x, z)
      st.push(place(tint(new THREE.CylinderGeometry(0.022, 0.028, 0.5, 8), '#6b5137', '#8a6c4a'), [x, y + 0.2, z]))
      cp.push(place(new THREE.SphereGeometry(0.045, 12, 8), [x, y + 0.47, z]))
    }
    for (let i = 0; i < 420; i++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * (R - 0.15), x = GRASS[0] + Math.cos(a) * d, z = GRASS[1] + Math.sin(a) * d, h = 0.32 + r() * 0.3
      bl.push(place(bladeGeo(0.25 + r() * 0.3, 0.05, '#3f7a26', r() < 0.5 ? '#a6e05a' : '#c9ef7a'), [x, ground(x, z) - 0.01, z], r() * 6.283, (r() - 0.5) * 0.3, [1, h, 1]))
    }
    return { stakes: fuse(st), caps: fuse(cp), blades: fuse(bl) }
  }, [])
  return <>
    <mesh geometry={stakes} castShadow><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
    <mesh geometry={caps}><meshStandardMaterial color="#7dff8a" emissive="#3bd65a" emissiveIntensity={1.6} roughness={0.4} /></mesh>
    <mesh geometry={blades} receiveShadow><meshStandardMaterial vertexColors roughness={0.7} side={THREE.DoubleSide} emissive="#3c6a14" emissiveIntensity={0.35} /></mesh>
  </>
}
function Orbs({ prog }: { prog: number[] }) {
  const ref = useRef<THREE.InstancedMesh>(null), live = useRef(prog); live.current = prog
  const M = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), [])
  const inited = useRef(false)
  useFrame(({ clock }) => {
    const im = ref.current; if (!im) return
    if (!inited.current) { ORBS.forEach((o, i) => im.setColorAt(i, o.c)); if (im.instanceColor) im.instanceColor.needsUpdate = true; inited.current = true }
    ORBS.forEach((o, i) => {
      const u = live.current[o.level]; let v = 0, s = 0
      if (o.kind === 'in') { v = clamp01((u - o.d * 0.2) / 0.3); s = v > 0 && v < 1 ? 1 : 0 }
      else if (o.kind === 'unused') { v = 0; s = clamp01((u - 0.5 - o.d * 0.2) / 0.1) * (0.8 + 0.2 * Math.sin(clock.elapsedTime * 2 + i)) }
      else { v = clamp01((u - 0.5 - o.d * 0.2) / 0.3); s = v > 0 && v < 1 ? Math.sin(Math.min(1, v * 6) * Math.PI / 2) * (1 - v * v) + 0.05 : 0 }
      const e = v * v * (3 - 2 * v)
      M.p.set(o.a[0] + (o.b[0] - o.a[0]) * e, o.a[1] + (o.b[1] - o.a[1]) * e + (o.kind === 'in' && o.level > 0 ? Math.sin(e * Math.PI) * 1.1 : 0) + (o.kind === 'unused' ? Math.sin(clock.elapsedTime * 1.3 + i) * 0.06 : 0), o.a[2] + (o.b[2] - o.a[2]) * e)
      im.setMatrixAt(i, M.m.compose(M.p, M.q, M.s.setScalar(s)))
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[undefined, undefined, ORBS.length]} frustumCulled={false} renderOrder={6}><sphereGeometry args={[0.1, 14, 10]} /><meshBasicMaterial toneMapped={false} transparent opacity={0.95} /></instancedMesh>
}

export default function Lesson7() {
  const [stage, setStage] = useState(0)                      // 已经追踪了几个营养级
  const [eff, setEff] = useState([false, false])
  const T = useTasks('gewu:population:7', TASKS)
  const p0 = useSlide(stage > 0 ? 1 : 0, 0.24), p1 = useSlide(stage > 1 ? 1 : 0, 0.24), p2 = useSlide(stage > 2 ? 1 : 0, 0.24)
  const prog = [p0, p1, p2], busy = stage > 0 && prog[stage - 1] < 1
  const shown = prog.map(p => p >= 1)                         // 这一级的账已经记到屏上
  useEffect(() => { if (p0 >= 1) T.check(id => id === 'grass') }, [p0 >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const needEff = stage >= 2 && !busy && !eff[stage - 2]
  const trace = () => { if (busy || stage >= 3 || needEff) return; setStage(s => s + 1) }
  const compute = () => { if (!needEff) return; const i = stage - 2; setEff(e => e.map((x, k) => (k === i ? true : x))); T.check(id => id === (i === 0 ? 'rabbit' : 'fox')) }
  const resetAll = () => { setStage(0); setEff([false, false]); T.reset() }

  const draw = useCallback<Draw>((g, W, H) => {
    text(g, '这块草地一年里的能量（kJ）', 30, 40, { fs: 28, weight: 700 })
    const legend: [string, string][] = [['呼吸作用散失', COL.resp], ['流向分解者', COL.decomp], ['未利用', COL.unused], ['流入下一营养级', COL.next]]
    g.font = `600 21px ${FONT}`; let lx = 32; legend.forEach(([n, c]) => { bar(g, lx, 70, 20, 20, c); text(g, n, lx + 27, 81, { fs: 21 }); lx += 46 + g.measureText(n).width })
    const rowH = (H - 122) / 3, pyrX = W * 0.19, full = W * 0.3, barX = W * 0.4, barW = W * 0.56
    ENERGY.forEach((l, i) => {
      const y = 106 + (2 - i) * rowH, on = shown[i], w = full * Math.pow(l.got / ENERGY[0].got, 0.3)
      bar(g, pyrX - w / 2, y + 26, w, rowH - 52, on ? [C.grass, C.rabbit, C.fox][i] : '#2b3d4d', 1)
      if (!on) { g.save(); g.strokeStyle = [C.grass, C.rabbit, C.fox][i]; g.globalAlpha = 0.75; g.lineWidth = 3; g.setLineDash([10, 7]); g.beginPath(); g.roundRect(pyrX - w / 2, y + 26, w, rowH - 52, 6); g.stroke(); g.restore() }
      text(g, l.name, pyrX, y + rowH / 2 - (on ? 16 : 0), { fs: 30, weight: 700, align: 'center', color: on ? '#0b1410' : '#dfe8ec' })
      if (on) text(g, String(l.got), pyrX, y + rowH / 2 + 20, { fs: 28, weight: 700, align: 'center', color: '#0b1410', num: true })
      text(g, l.level, barX, y + 20, { fs: 23, weight: 700, color: '#c5d3da' })
      if (!on) { bar(g, barX, y + 44, barW, rowH - 88, '#2b3d4d'); g.save(); g.strokeStyle = 'rgba(190,215,230,0.55)'; g.lineWidth = 2.5; g.setLineDash([10, 7]); g.beginPath(); g.roundRect(barX, y + 44, barW, rowH - 88, 6); g.stroke(); g.restore(); text(g, '同化的能量去了哪里', barX + barW / 2, y + rowH / 2, { fs: 22, align: 'center', color: '#9fb4c0' }); return }
      let x = barX
      ;([[l.resp, COL.resp], [l.decomp, COL.decomp], [l.unused, COL.unused], [l.next, COL.next]] as [number, string][]).forEach(([v, c]) => {
        const sw = (v / l.got) * barW; if (v <= 0) return
        bar(g, x + 2, y + 44, sw - 4, rowH - 88, c)
        text(g, String(v), x + sw / 2, y + rowH / 2, { fs: sw > 70 ? 28 : 22, weight: 700, align: 'center', color: '#141a10', num: true }); x += sw
      })
      if (i < 2 && eff[i]) text(g, `到下一营养级的传递效率 ${pct(efficiency(i))}`, barX + barW, y + 20, { fs: 23, weight: 700, align: 'right', color: C.guide })
    })
  }, [shown[0], shown[1], shown[2], eff])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'trace' | 'eff' | null } = (() => {
    if (!task) return { hint: '每一级的能量大部分在呼吸作用中散失了：能量流动是单向的，逐级递减。', nx: null }
    if (busy) return { hint: '能量正在流动…', nx: null }
    if (stage === 0) return { hint: '阳光照在草地上。按“追踪能量”，看草固定的太阳能去了哪里', nx: 'trace' }
    if (stage === 1) return { hint: '草的能量只有一小部分流进了兔。再按“追踪能量”，看兔这一级', nx: 'trace' }
    if (stage === 2 && !eff[0]) return { hint: `兔同化了 ${ENERGY[1].got} kJ。按“算传递效率”：用兔的同化量除以草的同化量`, nx: 'eff' }
    if (stage === 2) return { hint: '兔的能量又有一小部分流进了狐。按“追踪能量”，看狐这一级', nx: 'trace' }
    return { hint: `狐只得到 ${ENERGY[2].got} kJ。按“算传递效率”：用狐的同化量除以兔的同化量`, nx: 'eff' }
  })()
  const tag = (i: number, dy: number): Label => ({ id: `e${i}`, at: [AT[i][0], AT[i][1] + dy, AT[i][2]], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: shown[i] ? 1 : 0 }, children: <><small>{ENERGY[i].name}</small>{ENERGY[i].got} kJ</> })
  const cur = Math.max(0, stage - 1)
  const labels: Label[] = [
    tag(0, 0.9), tag(1, 1.1), tag(2, 1.5),
    { id: 'nProd', at: [AT[0][0], AT[0][1] + 0.55, AT[0][2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '草：生产者' },
    { id: 'resp', at: [AT[cur][0], AT[cur][1] + 4.6, AT[cur][2]], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: busy && prog[cur] > 0.55 ? 1 : 0 }, children: '呼吸作用散失的热能' },
    { id: 'sun', at: [SUN[0] + 2.2, SUN[1] - 3.4, SUN[2] + 1.6], ax: 0.5, className: 'scene-name -translate-y-full transition-opacity', style: { opacity: stage === 1 && p0 < 0.4 ? 1 : 0 }, children: '太阳能' },
  ]
  const L = ENERGY[cur]
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="草 → 兔 → 狐"
      stage={<Room at="s7" labels={labels} bloom={0.7}>
        <group position={onGround(S.x, S.z)} rotation-y={S.az}><BoardFace w={S.w} h={S.h} lift={S.lift} draw={draw} dep={draw} /></group>
        <RabbitHerd n={9} max={9} area={{ x: RABBIT[0], z: RABBIT[1], rx: 1.7, rz: 1.2, az: S.az }} ground={ground} scale={1.5} seed={7} />
        <FoxPack n={1} max={1} area={{ x: FOX[0], z: FOX[1], rx: 1.1, rz: 0.9, az: S.az }} ground={ground} scale={1.6} seed={7} />
        <Producers />
        <Orbs prog={prog} />
      </Room>}
      lesson={<LessonBlock no="7" title="能量流动" concept="能量单向流动，逐级递减" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>生态系统中能量的输入、传递、转化和散失的过程，称为生态系统的<b className="text-white">能量流动</b>。流经一个生态系统的总能量，是生产者固定的太阳能。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>一个营养级同化的能量有四个去向：通过<b className="text-white">呼吸作用</b>以热能形式散失；流入<b className="text-white">下一营养级</b>；随遗体、粪便流向<b className="text-white">分解者</b>；暂时<b className="text-white">未利用</b>。</li>
            <li><b className="text-white">单向流动</b>：能量只能沿食物链由低营养级流向高营养级，不可逆转，也不能循环；散失的热能不能再被生物利用。</li>
            <li><b className="text-white">逐级递减</b>：相邻两个营养级间的能量传递效率大约是 10%–20%。传递效率 = 下一营养级的同化量 ÷ 这一营养级的同化量 × 100%。</li>
            <li>把各营养级的能量由低到高画成图，就是能量金字塔，通常是上窄下宽。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="三个营养级的账都记完了" title="能量流动：单向流动，逐级递减" text={`草固定 ${ENERGY[0].got} kJ，流入兔 ${ENERGY[1].got} kJ（${pct(efficiency(0))}），再流入狐 ${ENERGY[2].got} kJ（${pct(efficiency(1))}）。每一级的能量大部分在呼吸作用中以热能散失，不能再回来。`} notes="这块草地的数值是为了算得清楚设定的。屏上金字塔各层的宽度没有按比例画，不然狐那一层窄得看不见。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Big formula="传递效率 = 下一营养级同化量 ÷ 这一营养级同化量" value={eff[1] && stage === 3 ? pct(efficiency(1)) : eff[0] ? pct(efficiency(0)) : '—'} unit={eff[1] && stage === 3 ? '兔 → 狐' : eff[0] ? '草 → 兔' : ''} />
          <H>{shown[cur] ? `${L.name}（${L.level}）同化的 ${L.got} kJ 去了哪里（示意）` : '同化量的四个去向'}</H>
          <div className="flex flex-col gap-1.5">
            <Row color={COL.resp} name="呼吸作用散失" value={shown[cur] ? `${L.resp} kJ` : '—'} dim={!shown[cur]} />
            <Row color={COL.decomp} name="流向分解者" value={shown[cur] ? `${L.decomp} kJ` : '—'} dim={!shown[cur]} />
            <Row color={COL.unused} name="未利用" value={shown[cur] ? `${L.unused} kJ` : '—'} dim={!shown[cur]} />
            <Row color={COL.next} name="流入下一营养级" value={shown[cur] ? (L.next ? `${L.next} kJ` : '没有下一营养级') : '—'} dim={!shown[cur]} />
          </div>
          <H>各营养级的同化量</H>
          <div className="grid grid-cols-3 gap-2">
            {ENERGY.map((l, i) => <ParamTile key={i} symbol={l.name} value={shown[i] ? String(l.got) : '—'} unit="kJ" />)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'trace'} onClick={trace} disabled={busy || stage >= 3 || needEff}>追踪能量</LabButton>
        <LabButton pulse={nx === 'eff'} onClick={compute} disabled={!needEff}>算传递效率</LabButton>
      </>}
      extras={null}
    />
  )
}
