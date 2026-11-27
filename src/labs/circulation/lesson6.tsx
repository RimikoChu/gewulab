// 大气环流 · 第 6 课 海陆分布与高低压中心：镜头在北极上空斜着往下看整个北半球。1 月陆地冷、海洋暖，7 月反过来；
// 按“画出气压中心”，带状的气压带被大陆切断，变成一块块的高压、低压中心。
import { useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, H2, Rows, pTag } from './parts'
import { BELTS, CENTERS, airOf, brokenBelt, landVsSea, type Month } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, facing, type Want } from './world'

const TASKS: Task[] = [
  { id: 'jt', text: '1 月：看海陆的冷暖', note: '冬季陆地降温快，比同纬度的海洋冷' },
  { id: 'jc', text: '1 月：画出气压中心', note: '亚洲高压切断了副极地低气压带，只剩海洋上的阿留申低压、冰岛低压' },
  { id: 'st', text: '换到 7 月，再看海陆的冷暖', note: '夏季陆地升温快，比海洋热' },
  { id: 'sc', text: '7 月：画出气压中心', note: '亚洲低压切断了副热带高气压带，只剩海洋上的夏威夷高压、亚速尔高压' },
]
const LON = 100, AZ = azFor(LON), EL = 0.98
const VIEW: [number, number] = [AZ, EL], TARGET = new THREE.Vector3(0, 4.2, 0), SPAN: [number, number] = [21.5, 20]
const MONTHS: Record<Month, string> = { jan: '1 月', jul: '7 月' }

export default function Lesson6() {
  const [month, setMonth] = useState<Month>('jan')
  const [temp, setTemp] = useState(false)
  const [centers, setCenters] = useState(false)
  const T = useTasks('gewu:circulation:6', TASKS)
  const amt = useSlide(centers ? 1 : 0, 0.5)
  const pick = (m: Month) => { setMonth(m); setTemp(false); setCenters(false) }
  const showTemp = () => { setTemp(true); T.check(id => (id === 'jt' && month === 'jan') || (id === 'st' && month === 'jul')) }
  const showCenters = () => { setCenters(true); T.check(id => (id === 'jc' && month === 'jan') || (id === 'sc' && month === 'jul')) }
  const resetAll = () => { pick('jan'); T.reset() }

  const task = T.current
  const wantM: Month | null = task ? (task.id === 'jt' || task.id === 'jc' ? 'jan' : 'jul') : null
  const { hint, next }: { hint: string; next: 'month' | 'temp' | 'centers' | null } = (() => {
    if (!task) return { hint: '都做完了。海陆冷热不同，气压带被切成一块块。', next: null }
    if (wantM && month !== wantM) return { hint: '换到 7 月', next: 'month' }
    if (!temp) return { hint: `${MONTHS[month]}：显示海陆的冷暖`, next: 'temp' }
    if (!centers) return { hint: `${MONTHS[month]}：画出气压中心，看气压带怎样被切断`, next: 'centers' }
    return { hint: '换到 7 月', next: 'month' }
  })()

  const ak = Math.round(amt * 10) / 10
  const air = airOf(month, ak)
  const broken = BELTS.find(b => b.key === brokenBelt(month))!
  const named = CENTERS[month].filter(c => c.named)
  const labels: Label[] = named.map(c => pTag(c.key, at(c.lon, c.lat, 1.03), c.name, c.p > 0, centers && amt > 0.6 && facing(c.lon, c.lat, AZ, EL, 0.05)))
  const want: Want = {
    sun: { az: AZ / (Math.PI / 180) + 20, lat: 55 }, night: 0.55, cloud: 0.25, grid: 0.3,
    landT: temp ? landVsSea(month) : 0,
    press: { air, key: `${month}${ak}`, on: temp ? 0.8 : 0 },
    winds: { air, on: centers && amt > 0.9 ? 0.85 : 0, n: 1500, size: 0.5 },
  }
  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title="大气环流" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="北半球"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="6" title="海陆分布" concept="海陆冷热不同，气压带被切成一块块" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>陆地比热容小，升温快、降温也快；海洋比热容大，升温慢、降温也慢。这叫<b className="text-white">海陆热力性质差异</b>。</p>
          <p className="mt-2">北半球陆地面积大，这种差异让带状的气压带断裂成一个个<b className="text-white">高、低压中心</b>：</p>
          <ul className="mt-2 flex flex-col gap-1 text-[14px] text-white/80">
            <li><b className="text-white">1 月</b>：亚欧大陆冷，形成<b className="text-[#8fb0ff]">亚洲高压</b>（蒙古—西伯利亚高压），切断副极地低气压带，低压只留在海洋上：<b className="text-[#ff8a8f]">阿留申低压、冰岛低压</b></li>
            <li><b className="text-white">7 月</b>：亚欧大陆热，形成<b className="text-[#ff8a8f]">亚洲低压</b>（印度低压），切断副热带高气压带，高压只留在海洋上：<b className="text-[#8fb0ff]">夏威夷高压、亚速尔高压</b></li>
          </ul>
          <p className="mt-2 text-[13.5px] text-white/65">图上各中心的位置和范围是示意的。</p>
        </>} />}
      finale={T.finale && <Fin kicker="1 月、7 月都看过了" big="海陆冷热不同，气压带被切成一块块" small="1 月亚洲高压切断副极地低气压带，留下阿留申低压、冰岛低压；7 月亚洲低压切断副热带高气压带，留下夏威夷高压、亚速尔高压。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={`${MONTHS[month]} · 亚欧大陆比海洋`} value={temp ? (landVsSea(month) < 0 ? '冷' : '热') : '—'} color={temp ? (landVsSea(month) < 0 ? '#7fb2ff' : '#ff8a70') : undefined} />
          <H2>关键参数</H2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="陆地" value={landVsSea(month) < 0 ? '降温快' : '升温快'} unit="比热容小" />
            <ParamTile symbol="被切断" value={centers ? broken.name.replace('气压带', '') : '—'} unit={centers ? '气压带' : '画出中心后看'} />
          </div>
          <H2>{MONTHS[month]}的高、低压中心</H2>
          {centers
            ? <Rows head={['名称', '在', '高低']} rows={named.map(c => [c.name, c.on === 'land' ? '陆地' : '海洋', <span key={c.key} className={c.p > 0 ? 'text-[#8fb0ff]' : 'text-[#ff8a8f]'}>{c.p > 0 ? '高压' : '低压'}</span>])} />
            : <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">按“画出气压中心”。</p>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'temp'} onClick={showTemp} disabled={temp}>显示海陆冷暖</LabButton>
        <LabButton primary pulse={next === 'centers'} onClick={showCenters} disabled={!temp || centers}>画出气压中心</LabButton>
      </>}
      extras={<Control label="月份"><Segmented label="月份" pulse={next === 'month'} want={wantM} value={month} onChange={v => pick(v as Month)} options={[{ value: 'jan', label: '1 月' }, { value: 'jul', label: '7 月' }]} /></Control>}
    />
  )
}
