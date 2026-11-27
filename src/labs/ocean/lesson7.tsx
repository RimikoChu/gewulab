// 洋流和厄尔尼诺 · 第 7 课 厄尔尼诺和拉尼娜：先在地球上看赤道太平洋的表层水温，再沿赤道把北半球整块切掉，
// 从正上方看赤道上的剖面：西边暖水堆得厚、东边冷水上泛；信风减弱时暖水东移、温跃层变平、秘鲁沿岸上升流减弱，渔获减少，降水反常。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { COLD, Cloud, R, WARM, WIND, azFor, faceView, facePoint, sph, type CutGeo, type Line } from './ocean'
import { Big, Fin, H2, OnRim, Rows, noteTag } from './parts'
import { ENSO, catchIndex, ensoUpwelling, ninoIndex, rainfall, thermoEast, thermoWest, type EnsoKey } from './physics'
import { FishingBoat } from './ships'
import { VOICE } from './voice'
import { SPACE, type Want } from './world'

const TASKS: Task[] = [
  { id: 'cut', text: '沿赤道切开太平洋，看海水的冷暖', note: '西太平洋暖水厚，东太平洋冷水上泛' },
  { id: 'normal', text: '正常年份：记下温跃层、渔获和降水', note: '信风把暖水吹到西边，秘鲁沿岸上升流强，渔获多' },
  { id: 'nino', text: '让信风减弱，再记一次', note: '暖水东移，上升流减弱，渔获减少，秘鲁沿岸多雨' },
  { id: 'nina', text: '让信风增强，再记一次', note: '东太平洋更冷，西太平洋更暖、更多雨' },
]
const RAD = Math.PI / 180
const CUT: CutGeo = { lat: 0, D: 3.8 }
const ZMAX = 300
const MID = 240
const VIEW_CUT = faceView(MID, 1.42), TARGET_CUT = new THREE.Vector3(...facePoint(CUT, MID, 0.36))
const MID_G = 212
const VIEW_GLOBE: [number, number] = [azFor(MID_G), 0.12], TARGET_GLOBE = new THREE.Vector3(...sph(MID_G, 0, R * 0.85))
const SPAN_CUT: [number, number] = [12.6, 5.4], SPAN_GLOBE: [number, number] = [21, 17]
/** 赤道上一处在剖面里的位置（z 海面以下为正，以剖面那一层的厚度为单位） */
const fp = (lon: number, z: number) => facePoint(CUT, lon, z, 0.03)
const zOf = (m: number) => m / ZMAX
const NORMAL: [number, number, number] = [0, -1, 0]
const EAST = 278

export default function Lesson7() {
  const [cut, setCut] = useState(false)
  const [year, setYear] = useState<EnsoKey>('normal')
  const [rec, setRec] = useState<EnsoKey[]>([])
  const T = useTasks('gewu:ocean:7', TASKS)
  const k = ENSO[year].k
  const record = () => { if (!cut || rec.includes(year)) return; const n = [...rec, year]; setRec(n); T.check(id => n.includes(id as EnsoKey)) }
  const doCut = () => { setCut(true); setTimeout(() => T.check(id => id === 'cut'), 2600) }
  const resetAll = () => { setCut(false); setYear('normal'); setRec([]); T.reset() }

  const task = T.current
  const wantYear = task && task.id !== 'cut' ? task.id as EnsoKey : null
  const { hint, next }: { hint: string; next: 'cut' | 'year' | 'rec' | null } = (() => {
    if (!task) return { hint: '都做完了。信风一减弱，暖水就往东跑。', next: null }
    if (!cut) return { hint: '沿赤道把太平洋切开，看看水下', next: 'cut' }
    if (task.id === 'cut') return { hint: '切面正在降到赤道…', next: null }
    if (wantYear && year !== wantYear) return { hint: wantYear === 'nino' ? '让信风减弱' : '让信风增强', next: 'year' }
    return { hint: `${ENSO[year].name}：记下温跃层、渔获和降水`, next: 'rec' }
  })()

  // 剖面上的流：海面上的信风、表层向西的洋流、秘鲁沿岸的上升流、大气里的沃克环流
  const lines = useMemo(() => {
    const surf: Line[] = [{ pts: [282, 255, 225, 195, 165, 140].map(l => fp(l, 0.07)), color: WARM }]
    const up: Line[] = [{ pts: [[266, 0.95], [270, 0.62], [274, 0.34], [277, 0.14], [279.5, 0.04]].map(([l, z]) => fp(l, z)), color: COLD }, { pts: [[250, 0.9], [254, 0.58], [259, 0.3], [264, 0.08]].map(([l, z]) => fp(l, z)), color: COLD }]
    const rise = year === 'nino' ? 225 : 135, sink = year === 'nino' ? 150 : 268
    const loop = (a: number, b: number): Line => {
      const pts: [number, number][] = []
      for (let i = 0; i <= 8; i++) pts.push([b + (a - b) * i / 8, -0.07])     // 低空：从下沉的一边吹向上升的一边
      pts.push([a, -0.22])
      for (let i = 0; i <= 8; i++) pts.push([a + (b - a) * i / 8, -0.38])     // 高空：流回去
      pts.push([b, -0.22])
      return { pts: pts.map(([l, z]) => fp(l, z)), color: WIND, closed: true }
    }
    return { surf, up, walker: [loop(rise, sink)] }
  }, [year])
  const u = ensoUpwelling(k)
  const rain = rainfall(year)
  const done = rec.includes(year)
  const labels: Label[] = cut ? [
    noteTag('warm', fp(207, 0.16), '暖水', true, 0.5, '#ffc4a8'),
    noteTag('tc', fp(year === 'nino' ? 222 : 228, zOf((thermoWest(k) + thermoEast(k)) / 2) + 0.12), '温跃层', true, 0.5, '#fff3c4'),
    noteTag('deep', fp(230, 0.85), '深层冷水', true, 0.5, '#a9cbff'),
    noteTag('upw', fp(262, 0.62), '上升流', u > 0.6, 0.5, '#a9cbff'),
    noteTag('peru', fp(283, -0.3), '南美沿岸', true, 0, '#ffffff'),
    noteTag('indo', fp(214, -0.3), '← 西太平洋', true, 0.5, '#ffffff'),
    noteTag('wind', fp(255, -0.13), k < 0.8 ? '信风减弱' : k > 1.2 ? '信风增强' : '信风', true, 0.5, '#ffffff'),
    noteTag('sea', fp(MID, -0.48), '赤道上的剖面 · 海水厚度放大（示意）', true, 0.5, '#d6e2f0'),
  ] : [
    noteTag('sst', sph(245, 4, R * 1.03), '赤道东太平洋', true, 0.5, '#d9eeff'),
    noteTag('peruG', sph(-80, -9, R * 1.03), '秘鲁', true, 1, '#ffffff'),
    noteTag('indoG', sph(118, -1, R * 1.03), '印度尼西亚', true, 1, '#ffffff'),
    noteTag('ausG', sph(140, -24, R * 1.03), '澳大利亚', true, 0.5, '#ffffff'),
    noteTag('eqG', sph(185, 1.5, R * 1.03), '赤道', true, 0.5, '#ffe17a'),
  ]
  const want: Want = {
    sun: { az: (cut ? VIEW_CUT[0] : VIEW_GLOBE[0]) / RAD + 20, lat: cut ? -55 : 30 }, night: 0.7, cloud: 0.25, grid: cut ? 0 : 0.25,
    sst: { on: cut ? 1 : 0.6, enso: k, anom: true, latMax: 26 },
    cut: cut ? { ...CUT, kind: 'equator', k, zMax: ZMAX, tint: 1, thermo: true } : undefined,
    lines: cut ? [
      { id: 'surf', lines: lines.surf, on: Math.min(1, k), speed: 0.3 + k * 0.8, size: 0.34, gap: 1.4, normal: NORMAL, line: 0.2 },
      { id: 'up', lines: lines.up, on: Math.min(1, u), speed: 0.5 * u, size: 0.3, gap: 0.55, normal: NORMAL, line: 0.25 },
      { id: 'walker', lines: lines.walker, on: year === 'nino' ? 0.6 : 0.9, speed: 0.5 + 0.8 * k, size: 0.36, gap: 1.1, normal: NORMAL, line: 0.15 },
    ] : [],
  }
  const cloudW = year === 'nino' ? 0.35 : year === 'nina' ? 1.15 : 0.9, cloudE = year === 'nino' ? 1 : 0
  return (
    <LabShell narration={voiced(NARRATION['7'], VOICE)} title="洋流和厄尔尼诺" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="赤道太平洋"
      stage={<LabStage<Want> labels={labels} target={cut ? TARGET_CUT : TARGET_GLOBE} span={cut ? SPAN_CUT : SPAN_GLOBE} view={cut ? VIEW_CUT : VIEW_GLOBE} {...SPACE} world={want}>
        {cut && <group>
          {[275.6, 273.4, 271.2].map((l, i) => <OnRim key={l} cut={CUT} lon={l} scale={0.05} east={i % 2 === 0}><FishingBoat hull={i === 1 ? '#3a78a8' : '#e9e6dc'} net={Math.min(1.2, u)} /></OnRim>)}
          <Cloud at={fp(212, -0.3)} up={[Math.cos(138 * RAD), 0, -Math.sin(138 * RAD)]} amt={cloudW} rain={cloudW > 0.8 ? 1 : 0} scale={1.5} seed={2} />
          <Cloud at={fp(232, -0.3)} up={[Math.cos(225 * RAD), 0, -Math.sin(225 * RAD)]} amt={year === 'nino' ? 0.9 : 0} rain={year === 'nino' ? 1 : 0} scale={1.5} seed={5} />
          <Cloud at={fp(EAST - 3, -0.3)} up={[Math.cos(EAST * RAD), 0, -Math.sin(EAST * RAD)]} amt={cloudE} rain={cloudE} scale={1.3} seed={8} />
        </group>}
      </LabStage>}
      lesson={<LessonBlock no="7" title="厄尔尼诺和拉尼娜" concept="信风减弱，暖水东移，就是厄尔尼诺" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>正常年份，赤道附近的信风把表层暖水吹向西太平洋，西边暖水层厚、海面高，东边秘鲁沿岸深层冷水上泛，带来丰富的营养盐，渔业发达。</p>
          <p className="mt-2"><b className="text-white">厄尔尼诺</b>：信风减弱，西太平洋的暖水向东扩展，赤道中东太平洋表层水温异常升高，秘鲁沿岸上升流减弱，鱼类减少；秘鲁沿岸降水增多，印度尼西亚、澳大利亚东部干旱。</p>
          <p className="mt-2"><b className="text-white">拉尼娜</b>：信风增强，赤道中东太平洋表层水温异常降低，和厄尔尼诺的影响大致相反。</p>
          <p className="mt-2 text-[13.5px] text-white/65">剖面上海水的厚度放大了很多倍，温跃层深度和海温距平都是示意。</p>
        </>} />}
      finale={T.finale && <Fin kicker="三种年份都记下了" big="信风减弱，暖水东移，就是厄尔尼诺" small="厄尔尼诺时秘鲁沿岸上升流减弱、渔获减少、降水增多，西太平洋沿岸干旱；拉尼娜时信风增强，情况大致相反。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label="东太平洋海温距平（示意）" value={`${ninoIndex(k) > 0 ? '+' : ''}${ninoIndex(k).toFixed(1)}`} unit="°C" color={ninoIndex(k) > 0.4 ? '#ff8a70' : ninoIndex(k) < -0.4 ? '#7fb2ff' : '#ffffff'} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[13px]">
            <div className="rounded-xl bg-white/8 px-2 py-2"><div className="text-white/55">温跃层 西 / 东</div><div className="mt-0.5 text-[16px] font-semibold tabular-nums">{thermoWest(k)} / {thermoEast(k)} m</div></div>
            <div className="rounded-xl bg-white/8 px-2 py-2"><div className="text-white/55">秘鲁渔获（示意）</div><div className="mt-0.5 text-[16px] font-semibold tabular-nums">{catchIndex(k)}</div></div>
          </div>
          <H2>记录</H2>
          {rec.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">切开以后，按“记录”。渔获以正常年份为 100。</p>
            : <Rows head={['年份', '东太平洋', '秘鲁沿岸', '西太平洋']} rows={rec.map(e => [ENSO[e].name, <b key="a" className={ninoIndex(ENSO[e].k) > 0 ? 'text-[#ff8a70]' : ninoIndex(ENSO[e].k) < 0 ? 'text-[#7fb2ff]' : ''}>{ninoIndex(ENSO[e].k) > 0 ? '偏暖' : ninoIndex(ENSO[e].k) < 0 ? '偏冷' : '冷水上泛'}</b>, rainfall(e).peru, rainfall(e).west])} />}
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">现在：秘鲁沿岸{rain.peru}，印度尼西亚、澳大利亚东部{rain.west}。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'cut'} onClick={doCut} disabled={cut}>切开赤道</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={!cut || done || task?.id === 'cut'}>记录</LabButton>
      </>}
      extras={<Control label="信风"><Segmented label="信风" pulse={next === 'year'} want={wantYear} value={year} onChange={v => setYear(v as EnsoKey)} disabled={!cut} options={[{ value: 'normal', label: '正常' }, { value: 'nino', label: '减弱' }, { value: 'nina', label: '增强' }]} /></Control>}
    />
  )
}
