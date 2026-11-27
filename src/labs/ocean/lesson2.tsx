// 洋流和厄尔尼诺 · 第 2 课 中低纬的大洋环流：镜头依次对着北太平洋、南太平洋、北大西洋、南大西洋，画出那里的四条洋流，
// 看它们首尾相接成一个环：北半球顺时针，南半球逆时针；大洋西岸是暖流，东岸是寒流。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { R, azFor, sph } from './ocean'
import { Big, Fin, H2, Rows, noteTag } from './parts'
import { CURRENT, GYRES, SENSE_NAME, gyreSense, westSide } from './physics'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

type Sea = 'np' | 'sp' | 'na' | 'sa'
const SEAS: Sea[] = ['np', 'sp', 'na', 'sa']
const TASKS: Task[] = [
  { id: 'np', text: '画出北太平洋的洋流，记下环流方向', note: '北半球中低纬：顺时针' },
  { id: 'sp', text: '换到南太平洋，再记一次', note: '南半球中低纬：逆时针' },
  { id: 'na', text: '换到北大西洋，再记一次', note: '和北太平洋一样，顺时针' },
  { id: 'sa', text: '换到南大西洋，再记一次', note: '大洋西岸是暖流，东岸是寒流' },
]
const RAD = Math.PI / 180
const VIEWS: Record<Sea, { lon: number; lat: number }> = { np: { lon: 188, lat: 27 }, sp: { lon: 218, lat: -27 }, na: { lon: -42, lat: 29 }, sa: { lon: -14, lat: -22 } }
const SPAN: [number, number] = [20, 15]
const mid = (pts: [number, number][]) => pts[Math.floor(pts.length / 2)]

export default function Lesson2() {
  const [sea, setSea] = useState<Sea>('np')
  const [shown, setShown] = useState(false)
  const [rec, setRec] = useState<Sea[]>([])
  const T = useTasks('gewu:ocean:2', TASKS)
  const pick = (s: Sea) => { setSea(s); setShown(false) }
  const record = () => { if (!shown || rec.includes(sea)) return; const n = [...rec, sea]; setRec(n); T.check(id => n.includes(id as Sea)) }
  const resetAll = () => { pick('np'); setRec([]); T.reset() }

  const task = T.current
  const wantSea = (task?.id as Sea | undefined) ?? null
  const { hint, next }: { hint: string; next: 'sea' | 'show' | 'rec' | null } = (() => {
    if (!task) return { hint: '都做完了。北半球顺时针，南半球逆时针。', next: null }
    if (wantSea && sea !== wantSea) return { hint: `换到${GYRES[wantSea].name}`, next: 'sea' }
    if (!shown) return { hint: `画出${GYRES[sea].name}中低纬的洋流`, next: 'show' }
    return { hint: '顺着箭头看一圈，记下环流方向', next: 'rec' }
  })()

  const cam = useMemo(() => { const v = VIEWS[sea]; return { target: new THREE.Vector3(...sph(v.lon, v.lat, R * 0.9)), view: [azFor(v.lon), v.lat * RAD] as [number, number] } }, [sea])
  const v = VIEWS[sea], keys = GYRES[sea].keys, sense = gyreSense(sea), done = rec.includes(sea)
  const ws = westSide(sea)!
  const labels: Label[] = [
    ...keys.map(k => { const [lo, la] = mid(CURRENT[k].pts as [number, number][]); return noteTag(k, sph(lo, la, R * 1.03), CURRENT[k].name, shown, 0.5, CURRENT[k].warm ? '#ffb4a3' : '#a9cbff') }),
    noteTag('sense', sph(v.lon, v.lat, R * 1.02), SENSE_NAME[sense], done, 0.5, '#ffe17a'),
    noteTag('seaName', sph(v.lon, v.lat + (v.lat > 0 ? 4 : -4), R * 1.02), GYRES[sea].name, !done, 0.5, '#ffffff'),
  ]
  const want: Want = {
    sun: { az: azFor(v.lon) / RAD + 25, lat: v.lat * 0.6 }, night: 0.55, cloud: 0.35, grid: 0.3,
    flows: { keys, on: shown ? 1 : 0.16, speed: shown ? 1.4 : 0.5, size: 0.5 },
  }
  return (
    <LabShell narration={voiced(NARRATION['2'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={GYRES[sea].name}
      stage={<LabStage<Want> labels={labels} target={cam.target} span={SPAN} view={cam.view} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="2" title="中低纬的大洋环流" concept="北半球顺时针，南半球逆时针" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在中低纬海区，信风吹出自东向西的赤道洋流，盛行西风吹出自西向东的洋流，再加上大陆的阻挡，洋流首尾相接，形成以<b className="text-white">副热带海区为中心</b>的大洋环流。</p>
          <p className="mt-2">北半球的环流<b className="text-white">顺时针</b>流动，南半球的<b className="text-white">逆时针</b>流动。环流的西侧（大陆东岸）是从低纬流向高纬的<b className="text-white">暖流</b>，东侧（大陆西岸）是从高纬流向低纬的<b className="text-white">寒流</b>。</p>
        </>} />}
      finale={T.finale && <Fin kicker="四个大洋环流都记下了" big="北半球顺时针，南半球逆时针" small="中低纬的大洋环流以副热带海区为中心。大洋西岸是暖流，东岸是寒流。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={`${GYRES[sea].name} · 中低纬`} value={done ? SENSE_NAME[sense] : '—'} color="#ffe17a" />
          <H2>记录</H2>
          {rec.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">画出洋流以后，按“记录方向”。</p>
            : <Rows head={['海区', '方向', '西岸', '东岸']} rows={rec.map(s => { const w = westSide(s)!; return [GYRES[s].name, <b key="a" className="text-[#ffe17a]">{SENSE_NAME[gyreSense(s)]}</b>, <span key="b" className="text-[#ff8a70]">{w.west.name}</span>, <span key="c" className="text-[#7fb2ff]">{w.east.name}</span>] })} />}
          <H2>看图</H2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">红色箭头是暖流，蓝色箭头是寒流。这里西岸是{ws.west.name}，东岸是{ws.east.name}。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'show'} onClick={() => setShown(true)} disabled={shown}>画出洋流</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!shown || done}>记录方向</LabButton>
      </>}
      extras={<Control label="海区"><Segmented label="海区" pulse={next === 'sea'} want={wantSea} value={sea} onChange={s => pick(s as Sea)} options={SEAS.map(s => ({ value: s, label: GYRES[s].name }))} /></Control>}
    />
  )
}
