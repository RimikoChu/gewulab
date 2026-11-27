// 光反应和暗反应 · 第 3 课 色素吸收什么光：暗室里白光经三棱镜分成光谱，把色素溶液放进光路，看哪几段暗下去。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { PRISM_Y, SPEC, hue } from './gear'
import type { V3 } from './kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { NARRATION } from './narration'
import { absorb, mainlyAbsorbs, zones, type Sample } from './physics'
import { O3, Scene3, X_CUV, X_LAMP, X_PRISM, onScreen } from './scene3'
import { Chart, Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { M, Place } from './world'

const TASKS: Task[] = [
  { id: 'chl', text: '把叶绿素溶液放进光路', note: '蓝紫光区和红光区暗下去了：叶绿素主要吸收蓝紫光和红光' },
  { id: 'back', text: '移出来，和完整的光带比一比', note: '白光经三棱镜分成红、橙、黄、绿、青、蓝、紫的光带' },
  { id: 'car', text: '换成类胡萝卜素溶液再放一次', note: '只有蓝紫光区暗下去：类胡萝卜素主要吸收蓝紫光' },
]
const NAME: Record<Sample, string> = { chl: '叶绿素', car: '类胡萝卜素' }
const CURVE = (s: Sample) => Array.from({ length: 65 }, (_, i) => { const x = SPEC[0] + i * 5; return { x, y: absorb(s, x) * 100 } })
const BANDS = Array.from({ length: 32 }, (_, i) => { const a = SPEC[0] + i * 10, c = hue(a + 5); return { from: a, to: a + 10, color: `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})` } })
const pct = (x: number) => `${Math.round(x * 100)}%`

export default function Lesson3() {
  const lit = true
  const [sample, setSample] = useState<Sample>('chl')
  const [inPath, setIn] = useState(false)
  const k = useSlide(inPath ? 1 : 0, 0.8)
  const T = useTasks('gewu:chloroplast:3', TASKS)
  const [seen, setSeen] = useState<Record<string, boolean>>({})
  useEffect(() => { if (k === 1) setSeen(s => s[sample] ? s : { ...s, [sample]: true }); if (k === 0) setSeen(s => s.chl && !s.back ? { ...s, back: true } : s) }, [k, sample])
  useEffect(() => { T.check(id => !!seen[id]) }, [seen])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSample('chl'); setIn(false); setSeen({}); T.reset() }
  const task = T.current, moving = k > 0 && k < 1
  const { hint, next }: { hint: string; next: 'in' | 'pick' | null } = (() => {
    if (!task) return { hint: '叶绿素主要吸收蓝紫光和红光，类胡萝卜素主要吸收蓝紫光。', next: null }
    if (moving) return { hint: '比色皿正在移动…', next: null }
    if (task.id === 'back') return { hint: '蓝紫光和红光两头暗了。按“移出光路”，和完整的光带比一比', next: 'in' }
    if (task.id !== sample) return { hint: `把溶液换成${NAME[task.id as Sample]}`, next: 'pick' }
    if (!inPath) return { hint: `白光经三棱镜分成了一条彩色光带。按“放进光路”，让光先穿过${NAME[sample]}溶液`, next: 'in' }
    return { hint: '看光屏上哪几段暗了…', next: null }
  })()
  const z = zones(sample), main = mainlyAbsorbs(sample), shown = lit && k === 1
  const o = (x: number, y: number, zz: number): V3 => [O3[0] + x * M, O3[1] + y * M, O3[2] + zz * M]
  const s = (nm: number, dy: number): V3 => { const p = onScreen(nm); return [O3[0] + p[0], O3[1] + (PRISM_Y + dy) * M, O3[2] + p[2]] }
  const labels: Label[] = [
    { id: 'lamp', at: o(X_LAMP, 0.16, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '光源' },
    { id: 'pr', at: o(X_PRISM, 0.125, 0), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '三棱镜' },
    { id: 'cu', at: o(X_CUV, 0.14, -0.11 + 0.11 * k), ax: 0.5, className: 'scene-name -translate-y-full', children: `${NAME[sample]}溶液` },
    ...(lit ? [
      { id: 'r', at: s(680, 0.085), ax: 0.5, className: 'scene-tag -translate-y-full', style: { opacity: shown && main.red ? 0.45 : 1 }, children: shown && main.red ? '红光 · 变暗' : '红光' },
      { id: 'g', at: s(535, -0.075), ax: 0.5, className: 'scene-tag', children: '绿光' },
      { id: 'b', at: s(435, 0.085), ax: 0.5, className: 'scene-tag -translate-y-full', style: { opacity: shown && main.blue ? 0.45 : 1 }, children: shown && main.blue ? '蓝紫光 · 变暗' : '蓝紫光' },
    ] as Label[] : []),
  ]
  return (
    <LabShell title={TITLE} lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光路"
      stage={<Place at="prism" labels={labels}><Scene3 lit={lit} sample={sample} k={k} /></Place>}
      lesson={<LessonBlock no="3" title="色素吸收什么光" concept="叶绿素主要吸收红光和蓝紫光" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>阳光是由不同波长的光组合成的复合光，通过三棱镜可以分成不同颜色的光，形成光谱。</p>
          <p className="mt-2">让光先穿过色素溶液再分光，光谱上变暗的地方，就是被色素吸收了的光。<b className="text-white">叶绿素 a 和叶绿素 b 主要吸收蓝紫光和红光，胡萝卜素和叶黄素主要吸收蓝紫光。</b></p>
          <p className="mt-2">绿光被吸收得最少，大多被反射出来，所以叶片看上去是绿色的。色素吸收的光能用于光合作用。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两种溶液都试过了" title="叶绿素主要吸收蓝紫光和红光，类胡萝卜素主要吸收蓝紫光" text="绿光被吸收得最少，大多被反射，所以叶片是绿色的。这些被吸收的光能，就是光合作用的能量来源。" notes="光屏上的明暗和吸收曲线是示意，只表示哪些波段吸收得多。" />}
      panel={
        <Glass className="px-4 py-4">
          <H>{NAME[sample]}溶液吸收的光</H>
          <Chart pts={CURVE(sample)} upto={shown ? 64 : -1} xr={SPEC} yr={[0, 100]} xLabel="波长（nm）" yLabel="吸收的光（%）" bands={BANDS} color="#ffffff" />
          <div className="mt-2 flex flex-col gap-1.5">
            <Row wide dot="#5b6cff" name="蓝紫光区" text={shown ? `吸收约 ${pct(z.blue)}${main.blue ? ' · 主要吸收' : ''}` : '—'} seen={shown} />
            <Row wide dot="#35c45a" name="绿光区" text={shown ? `吸收约 ${pct(z.green)} · 最少` : '—'} seen={shown} />
            <Row wide dot="#ff4a3a" name="红光区" text={shown ? `吸收约 ${pct(z.red)}${main.red ? ' · 主要吸收' : ''}` : '—'} seen={shown} />
          </div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'in'} onClick={() => setIn(v => !v)} disabled={moving}>{inPath ? '移出光路' : '放进光路'}</LabButton>
      </>}
      extras={
        <Control label="溶液">
          <Segmented label="溶液" pulse={next === 'pick'} want={next === 'pick' ? (task!.id as Sample) : null} value={sample} disabled={moving} onChange={v => { setSample(v as Sample); setIn(false) }} options={[{ value: 'chl', label: '叶绿素' }, { value: 'car', label: '类胡萝卜素' }]} />
        </Control>
      }
    />
  )
}
