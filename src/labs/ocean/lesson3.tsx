// 洋流和厄尔尼诺 · 第 3 课 中高纬的洋流和北印度洋季风洋流：北太平洋北部的环流逆时针；南半球的西风漂流自西向东绕南极一圈；
// 北印度洋冬季吹东北季风，洋流逆时针，夏季吹西南季风，洋流顺时针。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { COLD, R, WIND, azFor, sph, surfaceLine, type Line } from './ocean'
import { Big, Fin, H2, Rows, noteTag } from './parts'
import { CURRENT, GYRES, MONSOON, SENSE_NAME, WINDS, WWD_RING, gyreSense, ringSense } from './physics'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

type Sea = 'npN' | 'ring' | 'monW' | 'monS'
const SEAS: Sea[] = ['npN', 'ring', 'monW', 'monS']
const SEA_NAME: Record<Sea, string> = { npN: '北太平洋北部', ring: '南极周围', monW: '北印度洋冬季', monS: '北印度洋夏季' }
const TASKS: Task[] = [
  { id: 'npN', text: '北太平洋北部：画出洋流，记下方向', note: '北半球中高纬：逆时针' },
  { id: 'ring', text: '南极周围：看西风漂流', note: '南半球中高纬没有大陆阻挡，西风漂流绕南极一圈' },
  { id: 'monW', text: '北印度洋冬季：记下季风洋流的方向', note: '冬季吹东北季风，洋流逆时针' },
  { id: 'monS', text: '北印度洋夏季：再记一次', note: '夏季吹西南季风，洋流顺时针' },
]
const RAD = Math.PI / 180
const VIEWS: Record<Sea, { lon: number; lat: number; span: [number, number] }> = {
  npN: { lon: 185, lat: 45, span: [14, 10.5] }, ring: { lon: 160, lat: -72, span: [22, 21] },
  monW: { lon: 72, lat: 8, span: [8.4, 6.2] }, monS: { lon: 72, lat: 8, span: [8.4, 6.2] },
}
const mid = (pts: [number, number][]) => pts[Math.floor(pts.length / 2)]
const senseOf = (s: Sea) => s === 'ring' ? ringSense() : SENSE_NAME[gyreSense(s)]

export default function Lesson3() {
  const [sea, setSea] = useState<Sea>('npN')
  const [shown, setShown] = useState(false)
  const [rec, setRec] = useState<Sea[]>([])
  const T = useTasks('gewu:ocean:3', TASKS)
  const pick = (s: Sea) => { setSea(s); setShown(false) }
  const record = () => { if (!shown || rec.includes(sea)) return; const n = [...rec, sea]; setRec(n); T.check(id => n.includes(id as Sea)) }
  const resetAll = () => { setSea('npN'); setShown(false); setRec([]); T.reset() }

  const task = T.current
  const wantSea = (task?.id as Sea | undefined) ?? null
  const mon = sea === 'monW' ? MONSOON.win : sea === 'monS' ? MONSOON.sum : null
  const { hint, next }: { hint: string; next: 'sea' | 'show' | 'rec' | null } = (() => {
    if (!task) return { hint: '都做完了。北半球中高纬逆时针；北印度洋夏顺冬逆。', next: null }
    if (wantSea && sea !== wantSea) return { hint: `换到${SEA_NAME[wantSea]}`, next: 'sea' }
    if (!shown) return { hint: sea === 'ring' ? '画出南极周围的洋流' : mon ? `画出${mon.name}的季风和洋流` : '画出北太平洋北部的洋流', next: 'show' }
    return { hint: '顺着箭头看，记下洋流的方向', next: 'rec' }
  })()

  const cam = useMemo(() => { const v = VIEWS[sea]; return { target: new THREE.Vector3(...sph(v.lon, v.lat, R * (sea === 'ring' ? 0.4 : 0.9))), view: [azFor(v.lon), v.lat * RAD] as [number, number], span: v.span } }, [sea])
  const lines = useMemo(() => {
    const ring: Line[] = [surfaceLine(WWD_RING, COLD, 1.004, true)]
    const w = (p: [number, number][]) => surfaceLine(p, WIND, 1.02)
    return { ring, winW: [w(WINDS.monNE), w(WINDS.monNE2)], winS: [w(WINDS.monSW), w(WINDS.monSW2)] }
  }, [])
  const keys = sea === 'ring' ? [] : GYRES[sea].keys
  const done = rec.includes(sea)
  const v = VIEWS[sea]
  const labels: Label[] = sea === 'ring' ? [
    noteTag('ring', sph(200, -55, R * 1.03), '西风漂流', shown, 0.5, '#a9cbff'),
    noteTag('ant', sph(160, -85, R * 1.02), '南极洲', true, 0.5),
    noteTag('seaName', sph(250, -62, R * 1.02), '南极周围的海洋', !done, 0.5, '#ffffff'),
  ] : [
    ...keys.map(k => { const [lo, la] = mid(CURRENT[k].pts as [number, number][]); return noteTag(k, sph(lo, la, R * 1.03), sea.startsWith('mon') ? '季风洋流' : CURRENT[k].name, shown, 0.5, CURRENT[k].warm ? '#ffb4a3' : '#a9cbff') }),
    ...(mon ? [noteTag('wind', sph(80, 15, R * 1.04), mon.wind, shown, 0.5), noteTag('india', sph(78, 20, R * 1.02), '印度半岛', true, 0.5)] : []),
    noteTag('seaName', sph(mon ? 66 : 180, mon ? 2 : 40, R * 1.02), mon ? '北印度洋' : '北太平洋北部', !done, 0.5, '#ffffff'),
    noteTag('sense', sph(v.lon + (mon ? -6 : 0), v.lat + (mon ? 4 : 0), R * 1.02), senseOf(sea), done, 0.5, '#ffe17a'),
  ]
  const want: Want = {
    sun: { az: azFor(v.lon) / RAD + 25, lat: Math.max(-60, Math.min(60, v.lat)) * 0.7 }, night: 0.55, cloud: 0.3, grid: 0.25,
    flows: { keys, on: shown ? 1 : 0.16, speed: shown ? 1.1 : 0.4, size: mon ? 0.3 : 0.5 },
    lines: [
      { id: 'ring', lines: lines.ring, on: sea === 'ring' ? (shown ? 1 : 0.16) : 0, speed: 1.6, size: 0.6, gap: 1.4 },
      { id: 'winW', lines: lines.winW, on: sea === 'monW' ? (shown ? 0.85 : 0.2) : 0, speed: 1.2, size: 0.3, gap: 0.8, line: 0.1 },
      { id: 'winS', lines: lines.winS, on: sea === 'monS' ? (shown ? 0.85 : 0.2) : 0, speed: 1.2, size: 0.3, gap: 0.8, line: 0.1 },
    ],
  }
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SEA_NAME[sea]}
      stage={<LabStage<Want> labels={labels} target={cam.target} span={cam.span} view={cam.view} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="3" title="中高纬和季风洋流" concept="北印度洋季风洋流：夏顺冬逆" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>北半球中高纬海区，形成以<b className="text-white">副极地海区为中心</b>的大洋环流，<b className="text-white">逆时针</b>流动。南半球中高纬海区没有大陆阻挡，形成环绕南极的<b className="text-white">西风漂流</b>。</p>
          <p className="mt-2">北印度洋受季风影响，洋流随季节改变方向：冬季吹东北季风，洋流<b className="text-white">逆时针</b>流动；夏季吹西南季风，洋流<b className="text-white">顺时针</b>流动。</p>
        </>} />}
      finale={T.finale && <Fin kicker="中高纬和北印度洋都看过了" big="北半球中高纬逆时针；北印度洋夏顺冬逆" small="南半球中高纬，西风漂流自西向东绕南极流动。北印度洋的季风洋流，冬季逆时针、夏季顺时针。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={SEA_NAME[sea]} value={done ? senseOf(sea) : '—'} color="#ffe17a" />
          <H2>记录</H2>
          {rec.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">画出洋流以后，按“记录方向”。</p>
            : <Rows head={['海区', '盛行风', '洋流方向']} rows={rec.map(s => [SEA_NAME[s], s === 'monW' ? MONSOON.win.wind : s === 'monS' ? MONSOON.sum.wind : '盛行西风', <b key="a" className="text-[#ffe17a]">{senseOf(s)}</b>])} />}
          <H2>看图</H2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">红色箭头是暖流，蓝色是寒流，白色是风。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'show'} onClick={() => setShown(true)} disabled={shown}>画出洋流</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!shown || done}>记录方向</LabButton>
      </>}
      extras={<Control label="海区"><Segmented label="海区" pulse={next === 'sea'} want={wantSea} value={sea} onChange={s => pick(s as Sea)} options={SEAS.map(s => ({ value: s, label: SEA_NAME[s] }))} /></Control>}
    />
  )
}
