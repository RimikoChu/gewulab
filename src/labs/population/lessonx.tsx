// 种群和生态系统 · 拓展课：两个小实验。
// 碳循环：从高处看整座岛，逐条点亮碳的五条途径（光合作用、捕食、呼吸作用、分解作用、化石燃料的燃烧）。
// 渔场该捕多少：岛西南的栈桥边，换三种捕捞后的剩余量，各观察一年，比一比每年能持续捕多少。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { BoardFace, C, axes, dash, head, line, note, type Draw } from './board'
import { useYears, upto } from './hooks'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { fuse, place, tint, type V3 } from './parts'
import { CARBON, FISH, LEFT, fishYield, logisticRate, type Left } from './physics'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { Room, SITE, ground, onGround } from './world'

const LEFTS: Left[] = ['quarter', 'half', 'most']
const TASKS: Task[] = [
  { id: 'carbon', text: '逐条看完碳循环的五条途径', note: '碳在生物群落和非生物环境之间，主要以二氧化碳的形式循环' },
  { id: 'quarter', text: '渔场：捕到剩 K/4，观察一年', note: `一年长回 ${fishYield('quarter')} 尾` },
  { id: 'half', text: '捕到剩 K/2，观察一年', note: `一年长回 ${fishYield('half')} 尾：最多` },
  { id: 'most', text: '捕到剩 3K/4，观察一年', note: `一年只长回 ${fishYield('most')} 尾：鱼太多，增长反而慢` },
]

// ---------- 碳循环：岛上空的大箭头 ----------
const SKY: V3 = [0, 92, -10]
const ARROWS: { id: string; from: V3; mid: V3; to: V3; color: string; tag: V3 }[] = [
  { id: 'photo', from: [-34, 86, -22], mid: [-92, 70, -40], to: [-88, 22, -34], color: '#7fe08a', tag: [-96, 62, -40] },
  { id: 'feed', from: [-62, 12, 4], mid: [-20, 26, 26], to: [26, 11, 22], color: '#ffd84a', tag: [-18, 24, 28] },
  { id: 'resp', from: [30, 12, 6], mid: [52, 56, -2], to: [26, 84, -8], color: '#ff9a52', tag: [54, 54, 0] },
  { id: 'decomp', from: [-8, 8, 86], mid: [-30, 50, 70], to: [-12, 84, 14], color: '#d0a468', tag: [-34, 44, 74] },
  { id: 'burn', from: [86, 12, 4], mid: [112, 60, -24], to: [36, 90, -22], color: '#e86a5c', tag: [108, 60, -26] },
]
function Arrow({ a, on }: { a: (typeof ARROWS)[number]; on: boolean }) {
  const k = useSlide(on ? 1 : 0, 1.1)
  const { curve, geo } = useMemo(() => { const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a.from), new THREE.Vector3(...a.mid), new THREE.Vector3(...a.to)); return { curve, geo: new THREE.TubeGeometry(curve, 48, 2.1, 12) } }, [a])
  const dots = useRef<THREE.InstancedMesh>(null), headRef = useRef<THREE.Mesh>(null), M = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), [])
  useEffect(() => { geo.setDrawRange(0, Math.floor(48 * k) * 12 * 6) }, [geo, k])
  useFrame(({ clock }) => {
    const im = dots.current; if (im) { for (let i = 0; i < 6; i++) { const u = ((clock.elapsedTime * 0.16 + i / 6) % 1) * k; curve.getPoint(u, M.p); im.setMatrixAt(i, M.m.compose(M.p, M.q, M.s.setScalar(k > 0.05 ? 1 : 0))) } im.instanceMatrix.needsUpdate = true }
    const h = headRef.current; if (h) { const u = Math.max(0.02, k * 0.985); curve.getPoint(u, h.position); h.quaternion.setFromUnitVectors(M.up, curve.getTangent(u, M.p)); h.scale.setScalar(k > 0.05 ? 1 : 0) }
  })
  return <>
    <mesh geometry={geo}><meshBasicMaterial color={a.color} toneMapped={false} transparent opacity={0.82} /></mesh>
    <mesh ref={headRef}><coneGeometry args={[5.4, 12, 20]} /><meshBasicMaterial color={a.color} toneMapped={false} /></mesh>
    <instancedMesh ref={dots} args={[undefined, undefined, 6]} frustumCulled={false}><sphereGeometry args={[2.3, 12, 8]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></instancedMesh>
  </>
}
/** 大气中的二氧化碳库：岛上空一团淡淡的云 */
function Air() {
  const g = useMemo(() => fuse([[0, 0, 0, 30, 9, 20], [-22, -2, 6, 20, 7, 14], [24, 1, -4, 22, 8, 15], [4, 4, 8, 16, 7, 12]].map(([x, y, z, a, b, c]) => { const s = new THREE.SphereGeometry(1, 24, 16); s.scale(a, b, c); s.translate(x, y, z); return s })), [])
  return <mesh geometry={g} position={SKY}><meshStandardMaterial color="#ffffff" transparent opacity={0.42} roughness={1} depthWrite={false} /></mesh>
}

// ---------- 渔场：屏前的鱼筐 ----------
const F = SITE.fish
/** 一筐鱼：蓝色塑料周转筐，里面码着几条银色的鱼 */
function Crate({ at, yaw, show, empty = false }: { at: V3; yaw: number; show: boolean; empty?: boolean }) {
  const s = useSlide(show ? 1 : 0, 2.5)
  const fish = useMemo(() => fuse(Array.from({ length: 7 }, (_, i) => {
    const body = new THREE.SphereGeometry(1, 16, 10); body.scale(0.21, 0.045, 0.062)
    const tail = new THREE.ConeGeometry(0.05, 0.09, 4); tail.rotateZ(-Math.PI / 2); tail.scale(1, 1, 0.25); tail.translate(-0.23, 0, 0)
    return place(fuse([tint(body, '#8fa2ad', '#e6eef2'), tint(tail, '#6f8089')]), [(i % 2 ? 0.05 : -0.05), 0.2 + Math.floor(i / 3) * 0.035, -0.12 + (i % 3) * 0.12], (i % 2 ? 0.2 : Math.PI - 0.15), 0, 1, (i - 3) * 0.12)
  })), [])
  if (s < 0.02) return null
  return (
    <group position={at} rotation-y={yaw} scale={s}>
      <RoundedBox args={[0.66, 0.26, 0.46]} radius={0.025} position={[0, 0.13, 0]} castShadow receiveShadow><meshStandardMaterial color="#2f6fb0" roughness={0.45} /></RoundedBox>
      <mesh position={[0, 0.255, 0]}><boxGeometry args={[0.6, 0.02, 0.4]} /><meshStandardMaterial color={empty ? '#1d4a78' : '#b9d3e2'} roughness={0.3} /></mesh>
      {[-0.335, 0.335].map(x => <mesh key={x} position={[x, 0.2, 0]}><boxGeometry args={[0.012, 0.05, 0.16]} /><meshStandardMaterial color="#163a5e" /></mesh>)}
      {!empty && <mesh geometry={fish} castShadow><meshStandardMaterial vertexColors metalness={0.75} roughness={0.28} envMapIntensity={1.4} /></mesh>}
    </group>
  )
}
const CRATES: V3[] = [[-1.3, 2.3, 0.2], [-0.45, 2.6, -0.1], [0.4, 2.2, 0.3], [1.25, 2.5, 0]].map(([a, b, yaw]) => { const [x, z] = F.front(a, b); return [x, z, yaw] as V3 })

export default function LessonX() {
  const [step, setStep] = useState(0)                          // 碳循环已经点亮了几条途径
  const [where, setWhere] = useState<'island' | 'fish'>('island')
  const [left, setLeft] = useState<Left>('quarter'), [ran, setRan] = useState<Record<string, boolean>>({})
  const Y = useYears(1, 2.6), T = useTasks('gewu:population:x', TASKS)
  useEffect(() => { if (Y.done) { setRan(r => ({ ...r, [left]: true })); T.check(id => id === left) } }, [Y.done])   // eslint-disable-line react-hooks/exhaustive-deps
  const nextPath = () => { if (where !== 'island' || step >= CARBON.length) return; const n = step + 1; setStep(n); if (n === CARBON.length) T.check(id => id === 'carbon') }
  const go = () => { if (Y.running) return; setWhere(w => (w === 'island' ? 'fish' : 'island')) }
  const choose = (l: Left) => { if (Y.running) return; setLeft(l); Y.clear() }
  const resetAll = () => { setStep(0); setWhere('island'); setLeft('quarter'); setRan({}); Y.clear(); T.reset() }
  const N0 = LEFT[left].N, grown = fishYield(left) * Y.t, crates = Y.done || ran[left] && Y.t === 0 ? Math.round(fishYield(left) / FISH.crate) : 0

  const draw = useCallback<Draw>((g, W, Hh) => {
    const M = axes(g, { x: W * 0.01, y: Hh * 0.02, w: W * 0.98, h: Hh * 0.96, xr: [0, FISH.K], yr: [0, 1200], xStep: 2000, yStep: 300, xName: '鱼的数量/尾', yName: '增长速率/(尾/年)', fs: 22 })
    line(g, M, upto(FISH.K, 100).map(n => [n, logisticRate(n, FISH.K, FISH.r)]), C.rate, { width: 4 })
    for (const l of LEFTS) if (ran[l] && l !== left) { head(g, M, LEFT[l].N, fishYield(l), C.idle, 8); note(g, M, [LEFT[l].N, fishYield(l)], `${fishYield(l)}`, { color: '#b8c2c9', align: 'center', fs: 22 }) }
    dash(g, M, [N0, 0], [N0, fishYield(left)]); head(g, M, N0, fishYield(left), C.rabbit, 10)
    note(g, M, [N0, fishYield(left)], ran[left] || Y.t >= 1 ? `剩 ${LEFT[left].name}：一年长回 ${fishYield(left)} 尾` : `剩 ${LEFT[left].name} = ${N0} 尾`, { color: C.rabbit, align: left === 'most' ? 'right' : left === 'half' ? 'center' : 'left', fs: 23 })
  }, [left, ran, N0, Y.t >= 1])   // eslint-disable-line react-hooks/exhaustive-deps

  const task = T.current
  const { hint, nx }: { hint: string; nx: 'path' | 'go' | 'run' | 'left' | null } = (() => {
    if (!task) return { hint: '物质可以循环，能量不能；捕鱼捕到剩 K/2 左右，才能年年多捕。', nx: null }
    if (task.id === 'carbon') {
      if (where !== 'island') return { hint: '先回岛上，把碳循环看完', nx: 'go' }
      return { hint: ['从高处看整座岛：岛上空是大气中的二氧化碳库。按“下一条途径”，看碳怎样进入生物群落', '光合作用：生产者把大气中的二氧化碳合成含碳有机物。按“下一条途径”', '捕食：含碳有机物沿着食物链，从草传到兔，再传到狐。按“下一条途径”', '呼吸作用：生产者和消费者分解有机物，碳又以二氧化碳的形式回到大气。按“下一条途径”', '分解作用：分解者把遗体和粪便里的有机物分解成二氧化碳。按“下一条途径”'][step], nx: 'path' }
    }
    if (where !== 'fish') return { hint: '化石燃料的燃烧，也把碳送回大气。碳循环看完了，按“去渔场”', nx: 'go' }
    if (Y.running) return { hint: '鱼群正在长…', nx: null }
    if (left !== task.id) return { hint: `把捕捞后的剩余量换成“${LEFT[task.id as Left].name}”`, nx: 'left' }
    if (left === 'quarter') return { hint: `渔场的鱼群按 S 形增长，K 是 ${FISH.K} 尾。先捕到只剩 K/4，按“观察一年”，看能长回多少`, nx: 'run' }
    if (left === 'half') return { hint: '这次捕到剩 K/2。按“观察一年”', nx: 'run' }
    return { hint: '这次少捕一些，剩 3K/4。按“观察一年”', nx: 'run' }
  })()
  const lit = (id: string) => step > CARBON.findIndex(c => c.id === id)
  const labels: Label[] = where === 'island' ? [
    { id: 'air', at: [SKY[0], SKY[1] + 12, SKY[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: '大气中的二氧化碳库' },
    ...ARROWS.map((a, i): Label => ({ id: a.id, at: a.tag, ax: 0.5, className: 'scene-tag -translate-y-1/2 transition-opacity', style: { opacity: lit(a.id) ? 1 : 0 }, children: <><small>{i + 1}</small>{CARBON[i].name}</> })),
    { id: 'prod', at: [-86, 30, -30], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: lit('photo') ? 1 : 0 }, children: '生产者' },
    { id: 'cons', at: [28, 16, 24], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: lit('feed') ? 1 : 0 }, children: '消费者' },
    { id: 'deco', at: [-6, 9, 92], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: lit('decomp') ? 1 : 0 }, children: '分解者（土壤里的细菌和真菌）' },
    { id: 'fuel', at: [88, 14, 8], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: lit('burn') ? 1 : 0 }, children: '观测站的柴油发电机' },
  ] : [
    { id: 'fish', at: onGround(...F.front(0, 2.4), 0.9), ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: Y.t > 0 || ran[left] ? 1 : 0 }, children: <><small>一年长回</small>{Math.round(ran[left] && Y.t === 0 ? fishYield(left) : grown)} 尾</> },
    { id: 'nCr', at: onGround(...F.front(2.3, 2.6), 0.6), name: true, className: 'scene-name -translate-y-full', children: `一筐鱼代表 ${FISH.crate} 尾` },
  ]
  return (
    <LabShell title="种群和生态系统" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={where === 'island' ? '碳循环' : '渔场该捕多少'}
      stage={<Room at={where === 'island' ? 'xCarbon' : 'xFish'} labels={labels} far={where === 'island'} bloom={0.35}>
        <group visible={where === 'island'}><Air />{ARROWS.map(a => <Arrow key={a.id} a={a} on={where === 'island' && lit(a.id)} />)}</group>
        <group position={onGround(F.x, F.z)} rotation-y={F.az}><BoardFace w={F.w} h={F.h} lift={F.lift} draw={draw} dep={draw} /></group>
        {CRATES.map(([x, z, yaw], i) => <Crate key={i} at={[x, ground(x, z), z]} yaw={F.az + yaw} show={where === 'fish' && i < crates} />)}
        {/* 屏边摞着的空筐 */}
        {[0, 1, 2].map(i => { const [x, z] = F.front(-2.9 + (i === 2 ? 0.75 : 0), 1.7 + (i === 2 ? 0.2 : 0)); return <Crate key={`e${i}`} empty at={[x, ground(x, z) + (i === 1 ? 0.27 : 0), z]} yaw={F.az + i * 0.25} show /> })}
      </Room>}
      lesson={<LessonBlock no="拓展" title="碳循环和渔场" concept="物质循环往复；捕鱼要留下 K/2" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">碳循环</b>：碳在非生物环境和生物群落之间主要以二氧化碳的形式循环，在生物群落内部以含碳有机物的形式传递。物质循环具有全球性，循环往复；能量流动则是单向的、逐级递减的。物质是能量的载体，能量是物质循环的动力。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>大量燃烧化石燃料，打破了碳循环的平衡，大气中的二氧化碳浓度升高，温室效应加剧。</li>
            <li><b className="text-white">渔场</b>：鱼群按 S 形增长，数量在 K/2 左右时增长速率最大。中等强度的捕捞（捕捞后剩余量在 K/2 左右），鱼群恢复最快，有利于持续获得较大的鱼产量。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两个小实验都做完了" title="物质循环往复；捕捞后留下 K/2 左右" text={`碳通过光合作用进入生物群落，通过呼吸作用、分解作用和燃烧回到大气。渔场剩 K/4、K/2、3K/4 时，一年分别长回 ${fishYield('quarter')}、${fishYield('half')}、${fishYield('most')} 尾：剩 K/2 时每年能持续捕得最多。`} notes="渔场的数值是示意。碳循环的箭头为了看清画得很大。" onClose={() => T.setFinale(false)} />}
      panel={where === 'island' ? (
        <Glass className="px-4 py-4">
          <H>碳循环的途径</H>
          <div className="flex flex-col gap-1.5">
            {CARBON.map((c, i) => <div key={c.id} className={`rounded-xl px-3 py-2 text-[13.5px] leading-snug ${i === step - 1 ? 'bg-[#35c7b3]/20' : 'bg-white/6'}`}>
              <div className={`flex items-center gap-2 font-semibold ${i < step ? 'text-white' : 'text-white/35'}`}><i className="inline-block size-2.5 rounded-full" style={{ background: ARROWS[i].color, opacity: i < step ? 1 : 0.3 }} />{c.name}</div>
              {i < step && <div className="mt-0.5 text-white/65">{c.from} → {c.to}</div>}
            </div>)}
          </div>
        </Glass>
      ) : (
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <ParamTile symbol="K" value={String(FISH.K)} unit="尾" />
            <ParamTile symbol="剩余" value={String(N0)} unit={`尾 · ${LEFT[left].name}`} />
            <ParamTile symbol="现在" value={String(Math.round(N0 + (ran[left] && Y.t === 0 ? fishYield(left) : grown)))} unit="尾" />
          </div>
          <H>一年长回多少（每年可以持续捕这么多 · 示意）</H>
          <div className="flex flex-col gap-1.5">
            {LEFTS.map(l => <Row key={l} name={`剩 ${LEFT[l].name}（${LEFT[l].N} 尾）`} value={ran[l] ? `${fishYield(l)} 尾/年` : '—'} dim={!ran[l]} on={l === left} />)}
          </div>
        </Glass>
      )}
      actions={<>
        <LabButton pulse={nx === 'path'} onClick={nextPath} disabled={where !== 'island' || step >= CARBON.length}>下一条途径</LabButton>
        <LabButton pulse={nx === 'go'} onClick={go} disabled={Y.running}>{where === 'island' ? '去渔场' : '回岛上'}</LabButton>
        <LabButton primary pulse={nx === 'run'} onClick={Y.start} disabled={where !== 'fish' || Y.running || Y.t > 0}>观察一年</LabButton>
      </>}
      extras={<Control label="捕捞后剩余"><Segmented label="捕捞后剩余" pulse={nx === 'left'} want={nx === 'left' ? (task?.id as Left) : null} value={left} disabled={where !== 'fish' || Y.running} onChange={choose} options={LEFTS.map(l => ({ value: l, label: LEFT[l].name }))} /></Control>}
    />
  )
}
