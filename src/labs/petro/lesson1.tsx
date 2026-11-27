// 从石油到塑料 · 第 1 课 石油的分馏。加热炉和常压分馏塔朝镜头剖开：点着火，原油变成油气进塔；
// 选一种烷烃追踪它，看它升到哪一层冷凝、从哪条线出来。放大窗里是它的球棍模型，面板上是沸点随碳原子数变化的图。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { voiced } from '@/lab-kit/narration'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { MiniChart, type ChartSpec } from './chart'
import { Flow, polyline } from './flow'
import { LESSONS, goLesson } from './lessons'
import { Lens, Mol, alkaneFrame, type LensSpec } from './mol'
import { NARRATION } from './narration'
import { ease, useRun, type V3 } from './parts'
import { ALKANE_BP, FEED_T, FRACTIONS, PROBES, probe, text, type FractionKey, type ProbeKey } from './physics'
import { DRAW_PIPE, DRAW_Y, FEED_PIPE, FEED_Y, FN, FRACTION_COLOR, TW } from './tower'
import { VOICE } from './voice'
import { Place, spot } from './world'

const TASKS: Task[] = [
  { id: 'heat', text: '点燃加热炉，把原油送进分馏塔', note: `原油被加热到约 ${FEED_T} °C，大部分变成油气进了塔` },
  { id: 'c8', text: '追踪辛烷，看它从哪一层出来', note: '辛烷的沸点 125.7 °C，从上部侧线出来，在汽油里' },
  { id: 'c16', text: '追踪十六烷', note: '十六烷的沸点 286.8 °C，升得不高就冷凝了，在柴油里' },
  { id: 'c3', text: '追踪丙烷', note: '丙烷的沸点 −42.1 °C，一路升到塔顶，在石油气里' },
  { id: 'c25', text: '追踪二十五烷', note: `二十五烷的沸点 401.9 °C，比进塔温度还高，没有汽化，留在重油里` },
]
const VIEW: [number, number] = [-0.3, 0.12]
const SPOT = spot(4.2, 19.2, TW.z, 36, 40, VIEW, false, [140, 1000])
const LENS0: LensSpec = { at: [FN.x + 2.6, 27.5, TW.z + 6], R: 4.4, rotY: VIEW[0] }
/** 长链时窗口横向最多再拉长这么多 */
const WIDE = 3.6
/** 被追踪的分子走的路：转油线进塔，汽化的往上升到出料的那一层再从侧线出去；不汽化的落到塔底 */
function route(k: FractionKey): V3[] {
  const y = DRAW_Y[k], z = TW.z - 0.8
  if (k === 'residue') return [...FEED_PIPE, [TW.x - 1, FEED_Y, z], [TW.x - 0.4, 5.6, z], [TW.x, 4.2, TW.z], ...DRAW_PIPE.residue.slice(0, 3)]
  if (k === 'gas') return [...FEED_PIPE, [TW.x - 1, FEED_Y, z], [TW.x - 0.5, 34.6, z], ...DRAW_PIPE.gas.slice(0, 4)]
  return [...FEED_PIPE, [TW.x - 1, FEED_Y, z], [TW.x - 0.6, y + 0.9, z], [TW.x + 0.9, y + 0.15, z], ...DRAW_PIPE[k].slice(0, 4)]
}
const SEC = 6.5

export default function Lesson1() {
  const T = useTasks('gewu:petro:1', TASKS)
  const [lit, setLit] = useState(false)
  const [pick, setPick] = useState<ProbeKey>('c8')
  const [shown, setShown] = useState<ProbeKey | null>(null)
  const fire = useSlide(lit ? 1 : 0, 0.5)
  const run = useRun(SEC, () => T.check(id => id === pick))
  const p = probe(pick), frac = p.fraction.key
  const light = () => { if (lit) return; setLit(true); setTimeout(() => T.check(id => id === 'heat'), 2200) }
  const send = () => { if (!lit || run.busy) return; setShown(pick); run.run() }
  const choose = (k: ProbeKey) => { if (run.busy) return; setPick(k); setShown(null); run.snap(0) }
  const resetAll = () => { setLit(false); setPick('c8'); setShown(null); run.snap(0); T.reset() }

  const task = T.current?.id
  const next: 'fire' | 'seg' | 'go' | null = !task || run.busy ? null : task === 'heat' ? (lit ? null : 'fire') : pick !== task ? 'seg' : 'go'
  const hint = !task ? '分馏按沸点把石油分开，没有生成新物质，是物理变化。'
    : run.busy ? (p.vapor ? `跟着亮点看：${p.name}变成气体往上升，越往上温度越低` : `跟着亮点看：${p.name}的沸点比进塔温度还高，没有汽化，随液体流到塔底`)
    : task === 'heat' ? (lit ? '炉膛烧起来了，油气正在进塔…' : '点燃加热炉，把原油加热到约 360 °C')
    : pick !== task ? `把要追踪的烷烃换成${PROBES[task as ProbeKey].name}` : `把${p.name}送进分馏塔`

  const line = useMemo(() => polyline(route(frac)), [frac])
  const dot = useMemo(() => new THREE.Vector3(), [])
  const done = shown === pick && !run.busy && run.k >= 1
  line.at(ease(run.k), dot)
  const at: V3 = run.busy || done ? [dot.x, dot.y, dot.z] : FEED_PIPE[0]
  const frame = useMemo(() => alkaneFrame(p.n), [p.n])
  const len = (p.n - 1) * 1.26 + 3.2, w = Math.max(0, Math.min(WIDE, len * 0.62 / 2 - LENS0.R * 0.9))
  const LENS = useMemo<LensSpec>(() => ({ ...LENS0, w }), [w])
  const u = Math.min(1.75, (LENS.R + w) * 1.86 / len)
  const draws = useMemo(() => (Object.keys(DRAW_PIPE) as FractionKey[]).map(k => DRAW_PIPE[k]), [])
  const keys = Object.keys(DRAW_PIPE) as FractionKey[]

  const labels: Label[] = [
    ...FRACTIONS.map(f => ({ id: f.key, at: [TW.x + (f.key === 'gas' ? 1.6 : f.key === 'residue' ? 6.2 : 6.6), DRAW_Y[f.key] + (f.key === 'gas' ? 1.4 : f.key === 'residue' ? -0.6 : 0), TW.z] as V3, ax: 0, className: `scene-tag ${done && frac === f.key ? 'key' : ''} -translate-y-1/2`, children: <><small>{f.name}</small>{f.carbons} · 约 {f.range}</> })),
    { id: 'lens', at: [LENS.at[0], LENS.at[1] + LENS.R + 0.3, LENS.at[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>{p.name}</small>{text(p.formula)} · 沸点 {p.bp.toFixed(1)} °C</> },
    { id: 'fn', at: [FN.x - 3.2, 8, FN.z + 1], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '加热炉' },
    { id: 'tw', at: [TW.x + 2.8, 32.6, TW.z], ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '常压分馏塔（剖开）' },
    { id: 'tray', at: [TW.x - 2.6, 18.6, TW.z], ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '塔盘' },
    { id: 'feed', at: [TW.x - 4.2, FEED_Y - 1.2, TW.z], ax: 0.5, className: 'scene-tag', style: { opacity: fire > 0.5 ? 1 : 0, transition: 'opacity .5s' }, children: <><small>进塔</small>约 {FEED_T} °C</> },
  ]
  const ns = Object.keys(ALKANE_BP).map(Number)
  const spec: ChartSpec = {
    x: { min: 0, max: 26, ticks: [1, 5, 10, 15, 20, 25], label: '碳原子数' }, y: { min: -180, max: 420, ticks: [-100, 0, 100, 200, 300, 400], label: '沸点 / °C' },
    bands: FRACTIONS.map(f => ({ lo: Math.max(-180, f.lo), hi: Math.min(420, f.hi), color: FRACTION_COLOR[f.key], label: f.name })),
    lines: [{ pts: ns.filter(n => n <= 20).map(n => [n, ALKANE_BP[n]]), color: '#ffffff' }],
    dots: [...(Object.keys(PROBES) as ProbeKey[]).map(k => ({ x: PROBES[k].n, y: ALKANE_BP[PROBES[k].n], color: '#ffffff', r: 3 })), { x: p.n, y: p.bp, color: '#35c7b3', r: 6, ring: true }],
  }
  return (
    <LabShell title="从石油到塑料" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="加热炉和分馏塔"
      stage={<Place at={SPOT} labels={labels} cut="tower" fire={fire} vapor={fire}>
        <Lens spec={LENS} point={run.busy || done ? at : undefined}><Mol a={frame} u={u} /></Lens>
        {(run.busy || done) && <group position={at}>
          <mesh><sphereGeometry args={[0.34, 20, 16]} /><meshBasicMaterial color="#7dffe6" toneMapped={false} /></mesh>
          <mesh><sphereGeometry args={[0.62, 20, 16]} /><meshBasicMaterial color="#35c7b3" transparent opacity={0.28} toneMapped={false} depthWrite={false} /></mesh>
        </group>}
        <Flow paths={draws} density={1.1} speed={2.2} size={0.2} on={fire} color={(_, i) => FRACTION_COLOR[keys[i]]} />
        <Flow paths={[FEED_PIPE]} density={1.4} speed={3} size={0.34} on={fire} color={() => '#ffb86a'} />
      </Place>}
      lesson={<LessonBlock no="1" title="石油的分馏" concept="沸点越低，在塔里升得越高" tasks={TASKS} done={T.done} current={task}
        theory={<>
          <p>石油是由多种碳氢化合物（烃）组成的混合物，各种烃的沸点不同：分子里的碳原子越多，沸点越高。</p>
          <p className="mt-3">把原油加热，让它变成气体进入分馏塔。塔里越往上温度越低，油气边上升边冷却：沸点高的先冷凝，从下面的塔盘流出来；沸点低的继续往上，在上面冷凝。这样按沸点范围分成几段，叫<b className="text-white">分馏</b>，每一段叫一种馏分。</p>
          <p className="mt-3">分馏只是把原来就有的各种烃分开，没有新物质生成，是<b className="text-white">物理变化</b>。得到的汽油、煤油、柴油各自仍是多种烃的混合物，没有固定的沸点。</p>
          <p className="mt-3">这里一次只追踪一个分子；真实的塔里各种烃在每层塔盘上反复汽化、冷凝，塔盘也多得多。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[18px] leading-snug font-bold">分馏按沸点把石油分开，是物理变化</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">丙烷、辛烷、十六烷依次从塔顶、上部侧线、下部侧线出来，二十五烷留在塔底。碳链越长，沸点越高，出来的位置越低。每种馏分仍是混合物。</p>
      </>}
      panel={<Panel className="px-4 py-4">
        <div className="text-center">
          <div className="text-[13px] text-white/60">{p.name} <span className="font-formula">{text(p.formula)}</span> 的沸点</div>
          <div className="mt-1 text-[44px] leading-none font-bold tracking-tight tabular-nums">{p.bp.toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">°C</span></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ParamTile symbol="碳原子数" value={String(p.n)} unit="个" />
          <ParamTile symbol="去向" value={done ? p.fraction.name : '—'} unit={done ? p.fraction.out : '送进塔里看'} />
        </div>
        <h2 className="mt-4 text-[12.5px] text-white/55">直链烷烃的沸点和碳原子数</h2>
        <MiniChart spec={spec} height={190} />
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">色带是各馏分的沸点范围（约数）。进塔温度约 {FEED_T} °C。</p>
      </Panel>}
      actions={<>
        <LabButton pulse={next === 'fire'} disabled={lit} onClick={light}>点燃加热炉</LabButton>
        <LabButton primary pulse={next === 'go'} disabled={!lit || run.busy || done} onClick={send}>送进分馏塔</LabButton>
      </>}
      extras={
        <Control label="追踪哪种烷烃">
          <Segmented label="追踪哪种烷烃" pulse={next === 'seg'} want={task && task !== 'heat' ? task as ProbeKey : null} disabled={run.busy} value={pick} onChange={k => choose(k as ProbeKey)} options={(Object.keys(PROBES) as ProbeKey[]).map(k => ({ value: k, label: `${PROBES[k].name} C${PROBES[k].n}` }))} />
        </Control>
      }
    />
  )
}
