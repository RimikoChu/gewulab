// 洋流和厄尔尼诺 · 第 1 课 洋流的成因：三处地方看三种成因。
// 风海流：北太平洋上吹起信风和西风，表层海水跟着流；密度流：沿 36°N 切开直布罗陀海峡，地中海的海水盐度高、密度大，从底层流出，大西洋的海水从表层流入；
// 补偿流：沿 12°S 切开秘鲁沿岸，离岸风把表层海水吹走，深层冷水上升补充。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { COLD, R, WARM, WIND, azFor, faceView, facePoint, sph, surfaceLine, type CutGeo, type Line, type V3 } from './ocean'
import { Big, Fin, H2, Rows, noteTag } from './parts'
import { CURRENT, STRAIT, STRAIT_BED, WIND_BELTS, WINDS, driftOf, straitFlow } from './physics'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

type Mode = 'wind' | 'dens' | 'comp'
const NAME: Record<Mode, string> = { wind: '风海流', dens: '密度流', comp: '补偿流' }
const PLACE: Record<Mode, string> = { wind: '北太平洋', dens: '直布罗陀海峡', comp: '秘鲁沿岸' }
const TASKS: Task[] = [
  { id: 'wind', text: '北太平洋：吹起盛行风，记下洋流方向', note: '风海流：盛行风吹动海水，大致顺着风向流' },
  { id: 'dens', text: '直布罗陀海峡：让两边的海水流动', note: '密度流：地中海海水密度大，从底层流出；大西洋海水从表层流入' },
  { id: 'comp', text: '秘鲁沿岸：吹起离岸风', note: '补偿流：表层海水被吹走，深层冷水上升补充' },
]
const RAD = Math.PI / 180
const GIB: CutGeo = { lat: 36, D: 1.05 }, PERU: CutGeo = { lat: -12, D: 1.25 }
const DOWN: V3 = [0, -1, 0]
const gp = (lon: number, z: number) => facePoint(GIB, lon, z, 0.02)
const pp = (lon: number, z: number) => facePoint(PERU, lon, z, 0.02)
const CAM: Record<Mode, { target: THREE.Vector3; span: [number, number]; view: [number, number] }> = {
  wind: { target: new THREE.Vector3(...sph(192, 28, R * 0.9)), span: [17, 12.5], view: [azFor(192), 28 * RAD] },
  dens: { target: new THREE.Vector3(...gp(-6, 0.55)), span: [3.6, 2.2], view: faceView(-6, 1.4) },
  comp: { target: new THREE.Vector3(...pp(-83, 0.5)), span: [4.6, 2.6], view: faceView(-83, 1.4) },
}

export default function Lesson1() {
  const [mode, setMode] = useState<Mode>('wind')
  const [on, setOn] = useState(false)
  const [flow, setFlow] = useState(false)
  const [rec, setRec] = useState<Mode[]>([])
  const T = useTasks('gewu:ocean:1', TASKS)
  const pick = (m: Mode) => { setMode(m); setOn(false); setFlow(false) }
  const start = () => { setOn(true); setTimeout(() => setFlow(true), 2200) }
  const record = () => { if (!flow || rec.includes(mode)) return; const n = [...rec, mode]; setRec(n); T.check(id => n.includes(id as Mode)) }
  const resetAll = () => { pick('wind'); setRec([]); T.reset() }

  const task = T.current
  const wantMode = (task?.id as Mode | undefined) ?? null
  const ACT: Record<Mode, string> = { wind: '吹起盛行风', dens: '让海水流动', comp: '吹起离岸风' }
  const { hint, next }: { hint: string; next: 'mode' | 'go' | 'rec' | null } = (() => {
    if (!task) return { hint: '都做完了。风海流、密度流、补偿流。', next: null }
    if (wantMode && mode !== wantMode) return { hint: `换到${PLACE[wantMode]}`, next: 'mode' }
    if (!on) return { hint: mode === 'wind' ? '在北太平洋上吹起信风和西风' : mode === 'dens' ? '比一比两边海水的密度，再让海水流动' : '在秘鲁沿岸吹起离岸的东南信风', next: 'go' }
    if (!flow) return { hint: mode === 'wind' ? '风吹着海面，看表层海水往哪流…' : mode === 'dens' ? '海水开始流动，看上下两层…' : '表层海水被吹走了，看下面的海水…', next: null }
    return { hint: `记下${NAME[mode]}的成因`, next: 'rec' }
  })()

  const lines = useMemo(() => {
    const w = (pts: [number, number][]) => surfaceLine(pts, WIND, 1.022)
    const windAir: Line[] = [w(WINDS.tradeN), w(WINDS.tradeN2), w(WINDS.westN), w(WINDS.westN2)]
    const windSea: Line[] = [surfaceLine(CURRENT.npNEC.pts, WARM), surfaceLine(CURRENT.npc.pts, WARM)]
    // 海峡：表层从大西洋流进地中海，底层从地中海翻过海槛流回大西洋
    const strait: Line[] = [
      { pts: [[-11, 0.06], [-8.5, 0.06], [-6.4, 0.07], [-5, 0.07], [-3, 0.07], [-0.5, 0.07]].map(([l, z]) => gp(l, z)), color: WARM },
      { pts: [[0, 0.95], [-2.5, 0.85], [-4.5, 0.6], [-5.6, 0.38], [-6.4, 0.5], [-7.6, 0.8], [-10, 1.05], [-12.5, 1.25]].map(([l, z]) => gp(l, z)), color: COLD },
    ]
    const comp: Line[] = [
      { pts: [[-77.6, 0.05], [-81, 0.05], [-85, 0.05], [-89, 0.05]].map(([l, z]) => pp(l, z)), color: WARM },
      { pts: [[-82, 0.85], [-80, 0.62], [-78.8, 0.36], [-78, 0.12], [-77.9, 0.04]].map(([l, z]) => pp(l, z)), color: COLD },
      { pts: [[-85.5, 0.8], [-83, 0.56], [-81, 0.32], [-79.5, 0.12]].map(([l, z]) => pp(l, z)), color: COLD },
    ]
    const compAir: Line[] = [{ pts: [-75.5, -78.5, -82, -86, -90].map(l => pp(l, -0.09)), color: WIND }]
    return { windAir, windSea, strait, comp, compAir }
  }, [])
  const sf = straitFlow()
  const cam = CAM[mode]
  const labels: Label[] = mode === 'wind' ? [
    noteTag('sea', sph(205, 30, R * 1.03), '北太平洋', !on, 0.5, '#ffffff'),
    noteTag('tw', sph(170, 21.5, R * 1.04), '东北信风', on, 0.5),
    noteTag('ww', sph(200, 51, R * 1.04), '盛行西风', on, 0.5),
    noteTag('nec', sph(175, 9.5, R * 1.03), '北赤道暖流', flow, 0.5, '#ffb4a3'),
    noteTag('npc', sph(195, 39, R * 1.03), '北太平洋暖流', flow, 0.5, '#ffb4a3'),
  ] : mode === 'dens' ? [
    noteTag('atl', gp(-10.5, 0.45), `大西洋 · 盐度 ${STRAIT.atl.S}‰`, true, 0.5, '#d9f2ff'),
    noteTag('med', gp(-1.2, 0.45), `地中海 · 盐度 ${STRAIT.med.S}‰`, true, 0.5, '#9fe0d6'),
    noteTag('sill', gp(-5.6, -0.12), '海峡', true, 0.5),
    noteTag('in', gp(-2.6, -0.14), '表层流入', flow, 0.5, '#ffb4a3'),
    noteTag('out', gp(-8.2, 1.0), '底层流出', flow, 0.5, '#a9cbff'),
    noteTag('note', gp(-6, -0.42), '沿 36°N 切开 · 海水厚度放大（示意）', true, 0.5, '#d6e2f0'),
  ] : [
    noteTag('coast', pp(-76.2, -0.2), '秘鲁海岸', true, 0, '#ffffff'),
    noteTag('wind', pp(-84, -0.2), '离岸风（东南信风）', on, 0.5),
    noteTag('off', pp(-86.5, 0.15), '表层海水被吹走', flow, 0.5, '#ffb4a3'),
    noteTag('up', pp(-82.5, 0.72), '深层冷水上升补充', flow, 0.5, '#a9cbff'),
    noteTag('note', pp(-83, -0.48), '沿 12°S 切开 · 海水厚度放大（示意）', true, 0.5, '#d6e2f0'),
  ]
  const want: Want = mode === 'wind' ? {
    sun: { az: azFor(192) / RAD + 30, lat: 20 }, night: 0.55, cloud: 0.3, grid: 0.25,
    flows: { keys: [], on: 0 },
    lines: [{ id: 'air', lines: lines.windAir, on: on ? 0.9 : 0.28, speed: on ? 2 : 0.6, size: 0.42, gap: 1.3, line: 0.1 }, { id: 'sea', lines: lines.windSea, on: flow ? 1 : 0.14, speed: flow ? 0.9 : 0.3, size: 0.48, line: 0.3 }],
  } : mode === 'dens' ? {
    sun: { az: cam.view[0] / RAD, lat: -60 }, night: 0.7, cloud: 0.2, grid: 0,
    cut: { ...GIB, kind: 'strait', bed: STRAIT_BED, zMax: 1000, tint: 1 },
    lines: [{ id: 'st', lines: lines.strait, on: flow ? 1 : 0, speed: 0.22, size: 0.1, gap: 0.24, normal: DOWN, line: 0.35 }],
  } : {
    sun: { az: cam.view[0] / RAD, lat: -60 }, night: 0.7, cloud: 0.2, grid: 0,
    cut: { ...PERU, kind: 'peru', k: on ? 1 : 0, zMax: 300, tint: 1, thermo: true },
    lines: [{ id: 'air', lines: lines.compAir, on: on ? 0.95 : 0, speed: 0.5, size: 0.1, gap: 0.3, normal: DOWN, line: 0.2 }, { id: 'cp', lines: lines.comp, on: flow ? 1 : 0, speed: 0.22, size: 0.085, gap: 0.22, normal: DOWN, line: 0.3 }],
  }
  const d = driftOf('trade'), dw = driftOf('west')
  return (
    <LabShell narration={voiced(NARRATION['1'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={PLACE[mode]}
      stage={<LabStage<Want> labels={labels} target={cam.target} span={cam.span} view={cam.view} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="1" title="洋流的成因" concept="盛行风是洋流最主要的动力" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>海洋中的海水常年比较稳定地沿着一定方向作大规模的流动，叫作<b className="text-white">洋流</b>。</p>
          <ul className="mt-2 flex flex-col gap-1 text-[14px] text-white/80">
            <li><b className="text-white">风海流</b>：盛行风吹拂海面，推动海水随风漂流，是最主要的洋流。</li>
            <li><b className="text-white">密度流</b>：海水的温度、盐度不同，密度不同，海水从密度小的海区流向密度大的海区。</li>
            <li><b className="text-white">补偿流</b>：一个海区的海水流走了，相邻海区的海水流来补充；可以是水平的，也可以是垂直的（上升流、下降流）。</li>
          </ul>
        </>} />}
      finale={T.finale && <Fin kicker="三种成因都看过了" big="盛行风是洋流最主要的动力" small="风海流由盛行风吹出；密度流由海水密度不同引起；补偿流是海水流走以后，旁边的海水流来补充。" />}
      panel={
        <Glass className="px-4 py-4">
          {mode === 'dens'
            ? <><Big label="海水密度（约）" value={`${sf.med.toFixed(1)}`} unit="kg/m³" color="#9fe0d6" />
              <p className="mt-1 text-center text-[13px] text-white/60">地中海一侧 · 大西洋一侧 {sf.atl.toFixed(1)} kg/m³</p></>
            : mode === 'wind'
              ? <Big label="风向 → 洋流方向" value={flow ? '顺风流' : '—'} color="#ffb4a3" />
              : <Big label="秘鲁沿岸" value={flow ? '冷水上泛' : '—'} color="#7fb2ff" />}
          <H2>记录</H2>
          {rec.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">看到海水流起来以后，按“记录成因”。</p>
            : <Rows head={['地方', '洋流', '成因']} rows={rec.map(m => [PLACE[m], NAME[m], m === 'wind' ? '盛行风' : m === 'dens' ? '密度差异' : '海水被吹走'])} />}
          <H2>看图</H2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">{mode === 'wind' ? `白色箭头是风：${WIND_BELTS.trade.name}吹出${d.flow}的${WIND_BELTS.trade.current}，${WIND_BELTS.west.name}吹出${dw.flow}的${WIND_BELTS.west.current}。` : mode === 'dens' ? `颜色越深，盐度越高、密度越大。表层：${sf.surface}；底层：${sf.bottom}。` : '剖面上红色是暖的表层水，蓝色是冷水；亮黄色虚线是温跃层。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={start} disabled={on}>{ACT[mode]}</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!flow || rec.includes(mode)}>记录成因</LabButton>
      </>}
      extras={<Control label="地方"><Segmented label="地方" pulse={next === 'mode'} want={wantMode} value={mode} onChange={v => pick(v as Mode)} options={(['wind', 'dens', 'comp'] as Mode[]).map(m => ({ value: m, label: PLACE[m] }))} /></Control>}
    />
  )
}
