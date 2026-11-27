// 洋流和厄尔尼诺 · 第 5 课 洋流对渔场的影响：依次飞到北海道、纽芬兰、北海、秘鲁四大渔场，画出那里的洋流，
// 看海水泛绿（浮游生物多）的地方：前三处是寒暖流交汇，海水受到扰动，营养盐上泛；秘鲁是离岸风造成的上升流。渔船在那里作业。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { R, azFor, sph } from './ocean'
import { Big, Fin, H2, OnSea, Rows, noteTag } from './parts'
import { CURRENT, FISHERIES, fishCause, type FishKey } from './physics'
import { FishingBoat } from './ships'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

const KEYS: FishKey[] = ['hokkaido', 'newfound', 'northsea', 'peru']
const TASKS: Task[] = [
  { id: 'hokkaido', text: '北海道渔场：画出洋流，记下成因', note: '日本暖流和千岛寒流交汇' },
  { id: 'newfound', text: '纽芬兰渔场：再记一次', note: '墨西哥湾暖流和拉布拉多寒流交汇' },
  { id: 'northsea', text: '北海渔场：再记一次', note: '北大西洋暖流和北冰洋南下的冷海水交汇' },
  { id: 'peru', text: '秘鲁渔场：再记一次', note: '离岸风造成上升流，深层营养盐被带上来' },
]
const RAD = Math.PI / 180
const SPAN: [number, number] = [5.4, 3.9]
const SHORT: Record<FishKey, string> = { hokkaido: '北海道', newfound: '纽芬兰', northsea: '北海', peru: '秘鲁' }
/** 每个渔场里几条渔船的位置（经度、纬度偏移）和船头朝向 */
const BOATS: [number, number, number][] = [[-1.3, 0.5, 40], [1.0, -0.7, 200], [0.3, 1.2, 120]]

export default function Lesson5() {
  const [g, setG] = useState<FishKey>('hokkaido')
  const [shown, setShown] = useState(false)
  const [rec, setRec] = useState<FishKey[]>([])
  const T = useTasks('gewu:ocean:5', TASKS)
  const pick = (k: FishKey) => { setG(k); setShown(false) }
  const record = () => { if (!shown || rec.includes(g)) return; const n = [...rec, g]; setRec(n); T.check(id => n.includes(id as FishKey)) }
  const resetAll = () => { pick('hokkaido'); setRec([]); T.reset() }

  const task = T.current
  const wantG = (task?.id as FishKey | undefined) ?? null
  const f = FISHERIES[g]
  const { hint, next }: { hint: string; next: 'g' | 'show' | 'rec' | null } = (() => {
    if (!task) return { hint: '都做完了。寒暖流交汇、上升流，都能形成大渔场。', next: null }
    if (wantG && g !== wantG) return { hint: `换到${FISHERIES[wantG].name}`, next: 'g' }
    if (!shown) return { hint: `画出${f.name}附近的洋流`, next: 'show' }
    return { hint: '看海水泛绿的地方，记下渔场的成因', next: 'rec' }
  })()

  const cam = useMemo(() => { const v = FISHERIES[g]; return { target: new THREE.Vector3(...sph(v.lon, v.lat, R * 0.94)), view: [azFor(v.lon), v.lat * RAD] as [number, number] } }, [g])
  const done = rec.includes(g)
  const labels: Label[] = [
    ...f.keys.map(k => { const p = CURRENT[k].pts, [lo, la] = p[k === 'peru' ? 2 : Math.max(0, p.length - 2)]; return noteTag(k, sph(lo, la, R * 1.03), CURRENT[k].name, shown, 0.5, CURRENT[k].warm ? '#ffb4a3' : '#a9cbff') }),
    noteTag('name', sph(f.lon, f.lat - 2.6, R * 1.03), f.name, true, 0.5, '#ffffff'),
    noteTag('cause', sph(f.lon, f.lat + 2.4, R * 1.03), fishCause(g), done, 0.5, '#ffe17a'),
  ]
  const want: Want = {
    sun: { az: azFor(f.lon) / RAD + 20, lat: f.lat * 0.6 + 10 }, night: 0.55, cloud: 0.2, grid: 0.1,
    flows: { keys: shown ? f.keys : [], on: shown ? 1 : 0, speed: 0.6, size: 0.3 },
    blooms: shown ? [[f.lon, f.lat, g === 'peru' ? 4.5 : 3.6, 1]] : [],
  }
  return (
    <LabShell narration={voiced(NARRATION['5'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={f.name}
      stage={<LabStage<Want> labels={labels} target={cam.target} span={SPAN} view={cam.view} {...SPACE} world={want}>
        {BOATS.map(([dl, db, h], i) => <OnSea key={`${g}${i}`} lon={f.lon + dl} lat={f.lat + db} heading={h} scale={0.014}><FishingBoat hull={i === 1 ? '#3a78a8' : i === 2 ? '#b8452f' : '#e9e6dc'} /></OnSea>)}
      </LabStage>}
      lesson={<LessonBlock no="5" title="对渔场的影响" concept="寒暖流交汇、上升流处多渔场" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>寒暖流交汇的海区，海水受到扰动，下层的营养盐被带到表层，浮游生物大量繁殖，为鱼类提供饵料；两种洋流还能形成“水障”，阻碍鱼群游动，鱼群集中。北海道渔场、纽芬兰渔场、北海渔场都是这样形成的。</p>
          <p className="mt-2">有上升流的海区，深层海水把营养盐带到表层，也会形成大渔场，例如秘鲁渔场。</p>
          <p className="mt-2 text-[13.5px] text-white/65">画面上的渔船放大画了很多倍。</p>
        </>} />}
      finale={T.finale && <Fin kicker="四大渔场都看过了" big="寒暖流交汇、上升流处多渔场" small="北海道、纽芬兰、北海渔场是寒暖流交汇形成的；秘鲁渔场是上升流形成的。营养盐丰富，浮游生物多，鱼类就多。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={f.name} value={done ? fishCause(g) : '—'} color="#ffe17a" />
          <H2>记录</H2>
          {rec.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">画出洋流以后，按“记下成因”。</p>
            : <Rows head={['渔场', '洋流', '成因']} rows={rec.map(k => [SHORT[k], FISHERIES[k].keys.map(c => CURRENT[c].name).join('、'), <b key="a" className="text-[#ffe17a]">{fishCause(k)}</b>])} />}
          <H2>看图</H2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">海水泛绿的地方浮游生物多。红色箭头是暖流，蓝色是寒流。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'show'} onClick={() => setShown(true)} disabled={shown}>画出洋流</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!shown || done}>记下成因</LabButton>
      </>}
      extras={<Control label="渔场"><Segmented label="渔场" pulse={next === 'g'} want={wantG} value={g} onChange={k => pick(k as FishKey)} options={KEYS.map(k => ({ value: k, label: SHORT[k] }))} /></Control>}
    />
  )
}
