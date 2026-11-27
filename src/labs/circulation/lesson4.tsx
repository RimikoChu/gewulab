// 大气环流 · 第 4 课 气压带和风带的季节移动：从侧面看地球，太阳在左前方。按“下一个节气”，太阳直射点在回归线之间连续移动，
// 晨昏线跟着变，地面上的气压带和风带也跟着南北移动。到二分二至时记录直射点和两个气压带的位置。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Big, Fin, H2, Rows, noteTag, pTag } from './parts'
import { TERMS, YEAR, beltLat, fmtLat, nearTerm, subsolarRaw, type Air, type TermKey } from './physics'
import { VOICE } from './voice'
import { SPACE, at, azFor, sunDir, type Want } from './world'

const TASKS: Task[] = [
  { id: 'mar', text: '春分：记下直射点和气压带的位置', note: '直射点在赤道，赤道低气压带在 0°，副热带高气压带在 30°N' },
  { id: 'jun', text: '走到夏至，再记一次', note: '直射点北移到北回归线，气压带、风带跟着北移约 5°' },
  { id: 'dec', text: '走到冬至，再记一次', note: '直射点南移到南回归线，气压带、风带跟着南移' },
]
const LON = 0, AZ = azFor(LON), EL = 0.1
const VIEW: [number, number] = [AZ, EL], TARGET = new THREE.Vector3(0, 0, 0), SPAN: [number, number] = [27, 25]
const SUN_AZ = AZ / (Math.PI / 180) - 78
const TAG_LON = LON - 22

export default function Lesson4() {
  const [goal, setGoal] = useState(80)
  const [rows, setRows] = useState<TermKey[]>([])
  const T = useTasks('gewu:circulation:4', TASKS)
  const pos = useSlide(goal, 55), day = ((pos % YEAR) + YEAR) % YEAR, moving = Math.abs(pos - goal) > 0.01
  const sun = subsolarRaw(day), term = nearTerm(day)
  const nextTerm = () => setGoal(g => { const i = TERMS.findIndex(t => t.day > ((g % YEAR) + YEAR) % YEAR + 1); const tgt = i < 0 ? TERMS[0].day + YEAR : TERMS[i].day; return g - (((g % YEAR) + YEAR) % YEAR) + tgt })
  const dup = !!term && rows.includes(term.key)
  const record = () => { if (moving || !term || dup) return; const n = [...rows, term.key]; setRows(n); T.check(id => n.includes(id as TermKey)) }
  const resetAll = () => { setGoal(80); setRows([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'term' | 'record' | null } = (() => {
    if (!task) return { hint: '都做完了。直射点往北，气压带风带跟着往北。', next: null }
    if (moving) return { hint: '直射点在移动，盯住红色的直射点和地面上的气压带…', next: null }
    if (term?.key === task.id) return { hint: `${term.name}：记下直射点和气压带的位置`, next: 'record' }
    if (term && !rows.includes(term.key)) return { hint: `到${term.name}了，接着走`, next: 'term' }
    return { hint: '让直射点走到下一个节气', next: 'term' }
  })()

  // 直射点每移动 0.5° 重新画一次气压带
  const sr = Math.round(sun * 2) / 2
  const air: Air = useMemo(() => ({ k: 1, sunLat: sr }), [sr])
  const eq = beltLat('eq', sun), sth = beltLat('sthN', sun), sths = beltLat('sthS', sun)
  const sd = sunDir(SUN_AZ, sun)
  const labels: Label[] = [
    noteTag('sub', [sd[0] * 10.3, sd[1] * 10.3 + 1.1, sd[2] * 10.3], `直射点 ${fmtLat(sun)}`, true, 0, '#ffd27a'),
    pTag('eq', at(TAG_LON, eq, 1.02), `赤道低气压带 ${fmtLat(eq)}`, false, true, 0.5),
    pTag('sth', at(TAG_LON, sth, 1.02), `副热带高气压带 ${fmtLat(sth)}`, true, true, 0.5),
    pTag('sths', at(TAG_LON, sths, 1.02), `副热带高气压带 ${fmtLat(sths)}`, true, true, 0.5),
    noteTag('tn', at(LON + 62, 23.4, 1.02), '北回归线', true, 0, '#ffb86b'),
    noteTag('ts', at(LON + 62, -23.4, 1.02), '南回归线', true, 0, '#ffb86b'),
  ]
  const want: Want = {
    sun: { az: SUN_AZ, lat: sun }, night: 0.08, cloud: 0.6, grid: 0.25, lines: true, ray: true,
    press: { air, key: `s${sr}`, on: 0.8 },
    winds: { air, on: 1, n: 1300 },
  }
  const t = term ?? TERMS.reduce((a, b) => (Math.abs(b.day - day) < Math.abs(a.day - day) ? b : a))
  return (
    <LabShell narration={voiced(NARRATION['4'], VOICE)} title="大气环流" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="太阳直射点"
      stage={<LabStage<Want> labels={labels} target={TARGET} span={SPAN} view={VIEW} {...SPACE} world={want}>{null}</LabStage>}
      lesson={<LessonBlock no="4" title="季节移动" concept="直射点往北，气压带风带跟着往北" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>气压带和风带的形成和太阳辐射分不开，所以它们随着<b className="text-white">太阳直射点的季节移动</b>而移动。</p>
          <p className="mt-2">就北半球来说，大致是<b className="text-white">夏季北移，冬季南移</b>。</p>
          <p className="mt-2 text-[13.5px] text-white/65">图上移动的幅度是示意值：直射点到回归线时，气压带移动约 5°。两极的高气压带不随着移。</p>
        </>} />}
      finale={T.finale && <Fin kicker="春分、夏至、冬至都记下了" big="直射点往北，气压带风带跟着往北" small="夏至直射北回归线，赤道低气压带移到约 5°N、副热带高气压带移到约 35°N；冬至直射南回归线，都往南移。就北半球来说：夏季北移，冬季南移。" />}
      panel={
        <Glass className="px-4 py-4">
          <Big label={term ? `${term.name} · ${term.date}` : `接近${t.name}`} value={fmtLat(sun)} />
          <p className="mt-1 text-center text-[12.5px] text-white/50">太阳直射点的纬度</p>
          <H2>关键参数</H2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="赤道低压" value={fmtLat(eq)} unit="中心，约" />
            <ParamTile symbol="副热带高压" value={fmtLat(sth)} unit="北半球中心，约" />
          </div>
          <H2>数据表</H2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">到节气时按“记录”。</p>
            : <Rows head={['节气', '直射点', '赤道低压', '副高（北）']} rows={rows.map(k => { const d = TERMS.find(x => x.key === k)!.day, s = subsolarRaw(d); return [TERMS.find(x => x.key === k)!.name, fmtLat(s), fmtLat(beltLat('eq', s)), fmtLat(beltLat('sthN', s))] })} />}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'term'} onClick={nextTerm} disabled={moving}>下一个节气</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || !term || dup}>记录</LabButton>
      </>}
      extras={null}
    />
  )
}
