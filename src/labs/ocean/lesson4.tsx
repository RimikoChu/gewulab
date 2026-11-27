// 洋流和厄尔尼诺 · 第 4 课 洋流对沿岸气候的影响：先在海面上铺开表层水温，找到暖流和寒流流过的地方；
// 再分别从西欧外海、秘鲁外海放一团海上的空气吹向陆地：流过暖流的空气增温增湿，西欧温和多雨；流过寒流的空气降温减湿，秘鲁沿岸成了荒漠。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Cloud, R, Track, alongTrack, azFor, sph } from './ocean'
import { Big, Fin, H2, Rows, noteTag, useRun } from './parts'
import { COASTS, CURRENT, coastDT, type CoastKey } from './physics'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

type Spot = 'all' | CoastKey
const TASKS: Task[] = [
  { id: 'sst', text: '在海面上显示表层水温', note: '暖流流过的海区比同纬度暖，寒流流过的偏冷' },
  { id: 'europe', text: '西欧：从外海放一团空气吹上岸', note: '北大西洋暖流增温增湿，西欧温和湿润' },
  { id: 'peru', text: '秘鲁：从外海放一团空气吹上岸', note: '秘鲁寒流降温减湿，沿岸成了荒漠' },
]
const RAD = Math.PI / 180
const VIEWS: Record<Spot, { lon: number; lat: number; span: [number, number] }> = {
  all: { lon: -42, lat: 20, span: [15.5, 12.2] }, europe: { lon: -12, lat: 50, span: [8.6, 6.4] }, peru: { lon: -79, lat: -15, span: [8.6, 6.4] },
}
const AIR: Record<CoastKey, [number, number][]> = {
  europe: [[-30, 46.5], [-22, 49], [-14, 51], [-7, 52.3], [0, 52.8], [6, 52.6]],
  peru: [[-91, -16.5], [-86, -15.8], [-81.5, -14.8], [-77.5, -14], [-74, -13.6], [-71, -13.4]],
}
const SEA_OF: Record<CoastKey, 'nac' | 'peru'> = { europe: 'nac', peru: 'peru' }

export default function Lesson4() {
  const [spot, setSpot] = useState<Spot>('all')
  const [sst, setSst] = useState(false)
  const [flown, setFlown] = useState<CoastKey[]>([])
  const run = useRun(0.24)
  const T = useTasks('gewu:ocean:4', TASKS)
  const pick = (s: Spot) => { setSpot(s); run.reset() }
  const showSst = () => { setSst(true); T.check(id => id === 'sst') }
  const fly = () => { if (spot === 'all') return; const s = spot; run.start(0, 1, () => { const n = flown.includes(s) ? flown : [...flown, s]; setFlown(n); T.check(id => n.includes(id as CoastKey)) }) }
  const resetAll = () => { pick('all'); setSst(false); setFlown([]); T.reset() }

  const task = T.current
  const wantSpot: Spot | null = task && task.id !== 'sst' ? task.id as CoastKey : null
  const { hint, next }: { hint: string; next: 'sst' | 'spot' | 'fly' | null } = (() => {
    if (!task) return { hint: '都做完了。暖流增温增湿，寒流降温减湿。', next: null }
    if (!sst) return { hint: '在海面上显示表层水温，找一找暖流和寒流', next: 'sst' }
    if (wantSpot && spot !== wantSpot) return { hint: `换到${COASTS[wantSpot].name}`, next: 'spot' }
    if (run.on) return { hint: spot === 'europe' ? '空气从暖的海面上吹过来…' : '空气从冷的海面上吹过来…', next: null }
    return { hint: `从${COASTS[spot as CoastKey].name}的外海放一团空气，吹上岸`, next: 'fly' }
  })()

  const cam = useMemo(() => { const v = VIEWS[spot]; return { target: new THREE.Vector3(...sph(v.lon, v.lat, R * 0.9)), view: [azFor(v.lon), v.lat * RAD] as [number, number], span: v.span } }, [spot])
  const v = VIEWS[spot]
  const c = spot === 'all' ? null : COASTS[spot]
  const arrived = c && (flown.includes(spot as CoastKey) || (run.on && run.v > 0.55))
  const here = (k: CoastKey) => spot === k && (run.on || flown.includes(k))
  const head = spot !== 'all' && (run.on || flown.includes(spot)) ? alongTrack(AIR[spot], run.on ? run.v : 1) : null
  const labels: Label[] = spot === 'all' ? [
    noteTag('nac', sph(-25, 52, R * 1.03), '北大西洋暖流', sst, 0.5, '#ffb4a3'),
    noteTag('canary', sph(-20, 28, R * 1.03), '加那利寒流', sst, 0.5, '#a9cbff'),
    noteTag('peru', sph(-86, -22, R * 1.03), '秘鲁寒流', sst, 0.5, '#a9cbff'),
    noteTag('gulf', sph(-68, 34, R * 1.03), '墨西哥湾暖流', sst, 0.5, '#ffb4a3'),
  ] : [
    noteTag('cur', sph(...(CURRENT[SEA_OF[spot]].pts[spot === 'europe' ? 3 : 3] as [number, number]), R * 1.03), CURRENT[SEA_OF[spot]].name, true, 0.5, spot === 'europe' ? '#ffb4a3' : '#a9cbff'),
    noteTag('land', sph(c!.lon + (spot === 'europe' ? 16 : 9), c!.lat + (spot === 'europe' ? -2 : -4), R * 1.03), spot === 'europe' ? '西欧 · 温和湿润' : '沿岸荒漠 · 干燥少雨', !!arrived && !run.on, 0.5, '#ffffff'),
    noteTag('air', head ? sph(head.lon, head.lat + 1.6, R * 1.04) : sph(0, 0), spot === 'europe' ? '增温增湿' : '降温减湿', !!head && run.on && run.v > 0.3, 0.5, '#ffe17a'),
  ]
  const want: Want = {
    sun: { az: azFor(v.lon) / RAD + 20, lat: v.lat * 0.6 + 10 }, night: 0.55, cloud: 0.15, grid: 0.15,
    sst: { on: sst ? 1 : 0, anom: true },
    flows: { keys: spot === 'all' ? [] : [SEA_OF[spot]], on: spot === 'all' ? 0 : 0.8, speed: 0.8, size: 0.36 },
  }
  const dt = c ? coastDT(spot as CoastKey) : 0
  const upE = sph(2, 52.5, 1), upP = sph(-73, -14, 1)
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={c ? c.name : '世界'}
      stage={<LabStage<Want> labels={labels} target={cam.target} span={cam.span} view={cam.view} {...SPACE} world={want}>
        {spot !== 'all' && (run.on || flown.includes(spot)) && <Track key={spot} pts={AIR[spot]} t={run.on ? run.v : 1} lift={1.02} width={0.06} />}
        <Cloud at={sph(1, 52.5, R * 1.03)} up={upE} amt={here('europe') && arrived ? 1 : 0} rain={here('europe') && arrived ? 1 : 0} scale={0.55} seed={4} />
        <Cloud at={sph(-6, 54, R * 1.03)} up={sph(-6, 54, 1)} amt={here('europe') && arrived ? 0.8 : 0} rain={here('europe') && arrived ? 0.8 : 0} scale={0.5} seed={9} />
        {/* 秘鲁沿岸：冷海面上的一层低雾，不下雨 */}
        <Cloud at={sph(-77.8, -13, R * 1.006)} up={upP} amt={here('peru') && arrived ? 1 : 0} scale={0.5} seed={12} flat />
      </LabStage>}
      lesson={<LessonBlock no="4" title="对沿岸气候的影响" concept="暖流增温增湿，寒流降温减湿" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>暖流流经的海区，水温比同纬度高，对沿岸气候有<b className="text-white">增温增湿</b>的作用。北大西洋暖流使西欧冬季温和、全年湿润，形成温带海洋性气候。</p>
          <p className="mt-2">寒流流经的海区，水温比同纬度低，对沿岸气候有<b className="text-white">降温减湿</b>的作用：近海面的空气被冷却，上冷下暖难以上升成云致雨。秘鲁寒流使秘鲁沿岸干燥少雨，形成沿岸荒漠。</p>
          <p className="mt-2 text-[13.5px] text-white/65">画面上的表层水温是示意，只表示冷暖的差别。</p>
        </>} />}
      finale={T.finale && <Fin kicker="西欧、秘鲁都看过了" big="暖流增温增湿，寒流降温减湿" small="北大西洋暖流使西欧温和湿润；秘鲁寒流使秘鲁沿岸干燥少雨，形成荒漠。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={c ? `${c.name} · 水温比同纬度（示意）` : '表层水温比同纬度'} value={c ? `${dt > 0 ? '+' : ''}${dt.toFixed(0)}` : sst ? '红暖蓝冷' : '—'} unit={c ? '°C' : undefined} color={c ? (dt > 0 ? '#ff8a70' : '#7fb2ff') : '#ffffff'} />
          <H2>记录</H2>
          {flown.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">放一团海上的空气吹上岸，看它变成什么样。</p>
            : <Rows head={['沿岸', '洋流', '作用']} rows={flown.map(k => [COASTS[k].name, CURRENT[COASTS[k].current].name, <b key="a" className={CURRENT[COASTS[k].current].warm ? 'text-[#ff8a70]' : 'text-[#7fb2ff]'}>{COASTS[k].effect}</b>])} />}
          {c && arrived && <p className="mt-3 text-[13.5px] leading-relaxed text-white/75">{c.name}：{c.climate}。</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'sst'} onClick={showSst} disabled={sst}>显示表层水温</LabButton>
        <LabButton primary pulse={next === 'fly'} onClick={fly} disabled={spot === 'all' || run.on || !sst}>放一团空气</LabButton>
      </>}
      extras={<Control label="地方"><Segmented label="地方" pulse={next === 'spot'} want={wantSpot} value={spot} onChange={s => pick(s as Spot)} disabled={run.on} options={[{ value: 'all', label: '大西洋两岸' }, { value: 'europe', label: '西欧' }, { value: 'peru', label: '秘鲁' }]} /></Control>}
    />
  )
}
