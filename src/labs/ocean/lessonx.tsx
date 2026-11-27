// 洋流和厄尔尼诺 · 拓展 垃圾带和冰山：两个小实验。
// 一、在北太平洋撒下一片漂浮垃圾，几年下来它们跟着副热带环流打转，慢慢聚到环流中心，成了“垃圾带”；
// 二、格陵兰西南放出一座冰山，顺着拉布拉多寒流南下，到纽芬兰外海碰上墨西哥湾暖流，很快融化。这一带是北大西洋航线要提防冰山的地方。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { R, Track, alongTrack, azFor, sph } from './ocean'
import { Big, Fin, H2, OnSea, noteTag, useRun } from './parts'
import { GYRE_CENTER, ICEBERG_MELT_LAT, ICEBERG_TRACK, debrisStep, icebergSize, meanDistance, type LL } from './physics'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

type Mode = 'debris' | 'ice'
const TASKS: Task[] = [
  { id: 'debris', text: '在北太平洋撒下漂浮垃圾，看几年后它们在哪', note: '漂浮物跟着环流打转，聚到环流中心' },
  { id: 'ice', text: '在格陵兰西南放出一座冰山，看它漂到哪', note: '冰山顺着拉布拉多寒流南下，遇到暖流融化' },
]
const RAD = Math.PI / 180
const CAM: Record<Mode, { target: THREE.Vector3; view: [number, number]; span: [number, number] }> = {
  debris: { target: new THREE.Vector3(...sph(200, 30, R * 0.9)), view: [azFor(200), 32 * RAD], span: [15, 11] },
  ice: { target: new THREE.Vector3(...sph(-53, 53, R * 0.92)), view: [azFor(-53), 50 * RAD], span: [9.6, 7.2] },
}
const YEARS = 6
/** 撒下的漂浮垃圾的起点：散在北太平洋上 */
const SEED: LL[] = (() => { let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: 150 }, () => [145 + r() * 95, 14 + r() * 32] as LL) })()

/** 一群漂浮垃圾：塑料瓶、浮子、渔网碎片，按 days 天往前推 */
function Debris({ days, onMean }: { days: number; onMean: (d: number) => void }) {
  const pts = useRef<LL[]>(SEED.map(p => [...p] as LL)), at = useRef(0)
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.035, 0.07, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.5 }), SEED.length)
    const cs = ['#f2f2ec', '#7fb8e6', '#e6553d', '#f2c440', '#3e9f6b']
    for (let i = 0; i < SEED.length; i++) m.setColorAt(i, new THREE.Color(cs[i % cs.length]))
    m.frustumCulled = false; return m
  }, [])
  useEffect(() => { if (days < at.current) { pts.current = SEED.map(p => [...p] as LL); at.current = 0 } }, [days])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), up: new THREE.Vector3(0, 1, 0), e: new THREE.Euler() }), [])
  const last = useRef(-1)
  useFrame(() => {
    while (at.current < days) { const step = Math.min(10, days - at.current); pts.current = pts.current.map(p => debrisStep(p, step)); at.current += step }
    pts.current.forEach(([lo, la], i) => {
      tmp.p.set(...sph(lo, la, R * 1.004)); tmp.q.setFromUnitVectors(tmp.up, tmp.p.clone().normalize())
      tmp.q.multiply(new THREE.Quaternion().setFromEuler(tmp.e.set(Math.PI / 2, i * 1.3, 0)))
      tmp.m.compose(tmp.p, tmp.q, tmp.s); mesh.setMatrixAt(i, tmp.m)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (Math.abs(last.current - days) > 20) { last.current = days; onMean(meanDistance(pts.current)) }
  })
  return <primitive object={mesh} />
}

/** 冰山：水面上一截白色的冰，棱角分明，水下的部分更大（只露出一小截） */
function Iceberg() {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < p.count; i++) { const k = 0.8 + r() * 0.35; p.setXYZ(i, p.getX(i) * k * 1.3, Math.max(-0.4, p.getY(i)) * k * (p.getY(i) > 0 ? 0.9 : 1), p.getZ(i) * k) }
    const n = g.toNonIndexed(); n.computeVertexNormals(); return n
  }, [])
  return <group>
    <mesh geometry={geo} position={[0, 0.25, 0]}><meshPhysicalMaterial color="#f4fbff" roughness={0.35} transmission={0.1} thickness={1} clearcoat={0.4} /></mesh>
    <mesh geometry={geo} position={[0, -0.5, 0]} scale={[1.25, 1.2, 1.2]}><meshStandardMaterial color="#6fc4d8" transparent opacity={0.35} roughness={0.2} depthWrite={false} /></mesh>
  </group>
}

export default function LessonX() {
  const [mode, setMode] = useState<Mode>('debris')
  const [done, setDone] = useState<Mode[]>([])
  const [mean, setMean] = useState(meanDistance(SEED))
  const deb = useRun(1 / 9), ice = useRun(1 / 8)
  const T = useTasks('gewu:ocean:x', TASKS)
  const busy = deb.on || ice.on
  const go = () => {
    const m = mode, run = m === 'debris' ? deb : ice
    run.start(0, 1, () => { setDone(d => { const n = d.includes(m) ? d : [...d, m]; T.check(id => n.includes(id as Mode)); return n }) })
  }
  const pick = (m: Mode) => { setMode(m) }
  const resetAll = () => { setMode('debris'); setDone([]); deb.reset(); ice.reset(); T.reset() }

  const task = T.current
  const wantMode = (task?.id as Mode | undefined) ?? null
  const { hint, next }: { hint: string; next: 'mode' | 'go' | null } = (() => {
    if (!task) return { hint: '都做完了。漂浮物和冰山都跟着洋流走。', next: null }
    if (busy) return { hint: mode === 'debris' ? '时间在走，看漂浮垃圾往哪里聚…' : '冰山顺着寒流往南漂…', next: null }
    if (wantMode && mode !== wantMode) return { hint: '换到北大西洋', next: 'mode' }
    return { hint: mode === 'debris' ? '在北太平洋撒下一片漂浮垃圾' : '在格陵兰西南放出一座冰山', next: 'go' }
  })()

  const cam = CAM[mode]
  const dv = deb.on ? deb.v : done.includes('debris') ? 1 : 0
  const iv = ice.on ? ice.v : done.includes('ice') ? 1 : 0
  const ip = alongTrack(ICEBERG_TRACK, iv), size = icebergSize(ip.lat)
  const labels: Label[] = mode === 'debris' ? [
    noteTag('c', sph(GYRE_CENTER[0], GYRE_CENTER[1] + 4.5, R * 1.03), '环流中心', dv > 0.6, 0.5, '#ffe17a'),
    noteTag('k', sph(140, 33, R * 1.03), '日本暖流', true, 0.5, '#ffb4a3'),
    noteTag('ca', sph(238, 36, R * 1.03), '加利福尼亚寒流', true, 0.5, '#a9cbff'),
  ] : [
    noteTag('lab', sph(-60, 58, R * 1.03), '拉布拉多寒流', true, 1, '#a9cbff'),
    noteTag('gulf', sph(-58, 39.5, R * 1.03), '墨西哥湾暖流', true, 0.5, '#ffb4a3'),
    noteTag('nf', sph(-56, 49, R * 1.03), '纽芬兰岛', true, 1, '#ffffff'),
    noteTag('ice', sph(ip.lon + 2, ip.lat + 0.8, R * 1.03), size > 0.05 ? '冰山' : '融化了', iv > 0, 0, '#ffffff'),
  ]
  const want: Want = mode === 'debris' ? {
    sun: { az: azFor(200) / RAD + 25, lat: 35 }, night: 0.55, cloud: 0.2, grid: 0.15,
    flows: { keys: ['npNEC', 'kuroshio', 'npc', 'calif'], on: 0.55, speed: 1.2, size: 0.4 },
  } : {
    sun: { az: azFor(-53) / RAD + 25, lat: 45 }, night: 0.55, cloud: 0.2, grid: 0.1,
    flows: { keys: ['labrador', 'gulf', 'nac'], on: 0.85, speed: 0.8, size: 0.32 },
  }
  return (
    <LabShell narration={voiced(NARRATION['x'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={mode === 'debris' ? '北太平洋' : '北大西洋'}
      stage={<LabStage<Want> labels={labels} target={cam.target} span={cam.span} view={cam.view} {...SPACE} world={want}>
        {mode === 'debris' && <Debris days={dv * YEARS * 365} onMean={setMean} />}
        {mode === 'ice' && iv > 0 && <><Track pts={ICEBERG_TRACK} t={iv} width={0.03} color="#e8f6ff" />{size > 0.02 && <OnSea lon={ip.lon} lat={ip.lat} heading={ip.heading} scale={0.22 * (0.25 + 0.75 * size)}><Iceberg /></OnSea>}</>}
      </LabStage>}
      lesson={<LessonBlock no="拓展" title="垃圾带和冰山" concept="漂在海面上的东西，跟着洋流走" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>北太平洋副热带环流的中心海水流动缓慢，表层海水向中心汇聚，塑料等漂浮垃圾随洋流打转，越聚越多，形成大片的“垃圾带”。</p>
          <p className="mt-2">格陵兰冰川崩解下来的冰山，顺着拉布拉多寒流南下，到纽芬兰外海和墨西哥湾暖流相遇，海水变暖，冰山很快融化。这一带是北大西洋航线上要提防冰山的海区。</p>
          <p className="mt-2 text-[13.5px] text-white/65">画面上的漂浮物和冰山放大画了很多倍，聚拢的快慢是示意。</p>
        </>} />}
      finale={T.finale && <Fin kicker="两个小实验都做完了" big="漂在海面上的东西，跟着洋流走" small="北太平洋的漂浮垃圾随环流聚到中心，成了垃圾带；冰山顺着拉布拉多寒流南下，遇到墨西哥湾暖流融化。" />}
      panel={
        <Glass className="px-4 py-4">
          {mode === 'debris'
            ? <><Big label="过了几年" value={(dv * YEARS).toFixed(1)} unit="年" />
              <p className="mt-2 text-center text-[13px] text-white/60 tabular-nums">离环流中心平均 {mean.toFixed(0)}°（示意）</p></>
            : <><Big label="冰山漂到" value={iv > 0 ? `${ip.lat.toFixed(0)}°N` : '—'} color="#e8f6ff" />
              <p className="mt-2 text-center text-[13px] text-white/60">到 {ICEBERG_MELT_LAT}°N 附近遇到暖流就化了（示意）</p></>}
          <H2>看图</H2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">{mode === 'debris' ? '彩色的小点是漂浮垃圾，箭头是北太平洋的大洋环流。' : '蓝色箭头是寒流，红色是暖流，白线是冰山漂过的路线。'}</p>
        </Glass>
      }
      actions={<LabButton primary pulse={next === 'go'} onClick={go} disabled={busy || done.includes(mode)}>{mode === 'debris' ? '撒下漂浮垃圾' : '放出冰山'}</LabButton>}
      extras={<Control label="海区"><Segmented label="海区" pulse={next === 'mode'} want={wantMode} value={mode} onChange={m => pick(m as Mode)} disabled={busy} options={[{ value: 'debris', label: '北太平洋' }, { value: 'ice', label: '北大西洋' }]} /></Control>}
    />
  )
}
