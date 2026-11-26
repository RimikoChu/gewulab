// 消化和吸收 · 拓展 一顿饭的旅程：跟着一口馒头，在人体模型里从口腔走到肛门。镜头跟着走，
// 面板上一段段画出教材里那张“三种营养物质在消化道内被消化的程度”的曲线（示意）。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place, ease, useRun } from './parts'
import { LEGS, MACRO, SITES, leftAfter, type Macro } from './physics'
import { TRACT_PATH, tractAt, type OrganKey } from './body'
import { onBody, type SpotKey } from './world'

const TASKS: Task[] = [
  { id: 'mouth', text: '在口腔里嚼一嚼', note: '一部分淀粉被唾液分解成麦芽糖' },
  { id: 'esophagus', text: '咽下去，经过食道', note: '食道靠蠕动把食团送进胃，不消化' },
  { id: 'stomach', text: '在胃里停一停', note: '蛋白质被初步分解' },
  { id: 'small', text: '走过小肠', note: '三类物质被彻底分解，营养被吸收' },
  { id: 'end', text: '经过大肠，从肛门排出', note: '大肠吸收少量水、无机盐和部分维生素' },
]
const M = TRACT_PATH.marks
/** 每一段在路上从哪到哪 */
const RANGE: [number, number][] = [[0.0, M.pharynx], [M.pharynx, M.stomach], [M.stomach, M.small], [M.small, M.large], [M.large, M.anus], [M.anus, 0.999]]
const VIEW: SpotKey[] = ['head', 'chest', 'belly', 'belly', 'belly', 'belly']
const ORG: OrganKey[] = ['mouth', 'esophagus', 'stomach', 'small', 'large', 'anus']
const LOOK = [{ size: 0.075, color: '#f3eee2' }, { size: 0.06, color: '#efe6cf' }, { size: 0.065, color: '#dcc89a' }, { size: 0.045, color: '#d7b878' }, { size: 0.06, color: '#8a6440' }, { size: 0.06, color: '#7a5634' }]

/** 教材上那张曲线：横轴是消化道的五个部位，纵轴是还没被消化的；只画到 upto 为止 */
function Curve({ upto }: { upto: number }) {
  const W = 280, H = 130, x = (i: number) => 22 + i * ((W - 34) / 4), y = (v: number) => 10 + (1 - v) * (H - 34)
  return <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
    <line x1={22} y1={H - 24} x2={W - 8} y2={H - 24} stroke="rgba(255,255,255,0.25)" />
    <line x1={22} y1={6} x2={22} y2={H - 24} stroke="rgba(255,255,255,0.25)" />
    {SITES.map((s, i) => <g key={s.key}><text x={x(i)} y={H - 8} fill={i <= upto ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'} fontSize="11" textAnchor="middle">{s.name}</text></g>)}
    {(Object.keys(MACRO) as Macro[]).map(m => {
      const pts = [[x(0) - 14, y(1)], ...SITES.map((s, i) => [x(i), y(leftAfter(m, s.key))])].slice(0, upto + 2)
      return upto >= 0 && <polyline key={m} points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={MACRO[m].color} strokeWidth={2.4} strokeLinejoin="round" />
    })}
  </svg>
}

export default function LessonX() {
  const [leg, setLeg] = useState(-1)       // 走完了第几段
  const T = useTasks('gewu:digest:x', TASKS)
  const go = useRun(3.4, () => { const n = leg + 1; setLeg(n); const id = n === 5 ? 'end' : n < 5 ? LEGS[n].key : ''; if (n !== 4) T.check(k => k === id) })
  const moving = go.busy, cur = moving ? leg + 1 : leg
  const s = cur < 0 ? 0.004 : moving ? RANGE[cur][0] + (RANGE[cur][1] - RANGE[cur][0]) * ease(go.k) : RANGE[cur][1] - 0.0005
  const step = () => { if (moving || leg >= LEGS.length - 1) return; go.run() }
  const resetAll = () => { go.snap(0); setLeg(-1); T.reset() }
  const task = T.current
  const L = cur >= 0 ? LEGS[cur] : null
  const { hint, next }: { hint: string; next: 'go' | null } = !task ? { hint: '淀粉从口腔、蛋白质从胃、脂肪从小肠开始被消化，最后都在小肠被彻底分解。', next: null }
    : moving ? { hint: `正在经过${LEGS[leg + 1].name}…`, next: null }
    : leg < 0 ? { hint: '一口馒头放进了嘴里。按“往下走一段”', next: 'go' }
    : { hint: `到了${LEGS[leg].name}。按“往下走一段”`, next: 'go' }
  const look = LOOK[Math.max(0, cur)]
  const p = tractAt(Math.min(0.998, s))
  const labels: Label[] = L ? [{ id: 'b', at: onBody([p.x + 0.25, p.y + 0.1, p.z + 0.2]), ax: 0, className: 'scene-tag key -translate-y-1/2', children: <><small>{L.name}</small>{L.stay ?? (cur === 0 ? '嚼碎、拌匀' : cur === 1 ? '一段段蠕动' : cur === 4 ? '形成粪便' : '排出')}</> }]
    : [{ id: 'n', at: onBody([0.35, 16.1, 0.7]), ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>一口</small>馒头</> }]
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel="一口馒头"
      stage={<Place at={T.finale ? 'tract' : cur < 0 ? 'head' : VIEW[cur]} labels={labels} want={{ body: { hl: cur >= 0 ? [ORG[cur]] : ['mouth'], dim: 0.55, shell: !T.finale && (cur < 1) ? 0.15 : 1, head: !T.finale && cur < 2 ? 1 : 0 }, bolus: { s, ...look } }} />}
      lesson={<LessonBlock no="拓展" title="一顿饭的旅程" concept="一口馒头走完消化道" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>食物在口腔里被嚼碎，和唾液拌匀，一部分淀粉变成麦芽糖；经咽、食道进入胃，蛋白质被初步分解；在小肠里，三类物质被彻底分解成葡萄糖、氨基酸、甘油和脂肪酸，并被吸收；大肠吸收少量水、无机盐和部分维生素，剩下的形成粪便，由肛门排出。</p>
          <p className="mt-3">停留时间是混合食物的大致范围，和吃的东西有关。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">一口馒头走完了消化道</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">消化从口腔开始，在小肠完成</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">淀粉从口腔、蛋白质从胃、脂肪从小肠开始被消化；营养物质主要在小肠被吸收。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{L ? '现在在' : '准备出发'}</div>
            <div className="mt-1 text-[30px] leading-none font-bold">{L ? L.name : '口腔'}</div>
            {L?.stay && <div className="mt-1.5 text-[14px] text-white/75">停留{L.stay}</div>}
          </div>
          {L && <p className="mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13.5px] leading-relaxed text-white/80">{L.what}</p>}
          <h2 className="mt-4 text-[13px] text-white/60">还没被消化的（示意）</h2>
          <Curve upto={cur < 0 ? -1 : Math.min(4, cur)} />
          <div className="mt-1 flex justify-center gap-3 text-[12px] text-white/70">{(Object.keys(MACRO) as Macro[]).map(m => <span key={m} className="flex items-center gap-1"><span className="h-1 w-3 rounded" style={{ background: MACRO[m].color }} />{MACRO[m].name}</span>)}</div>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={step} disabled={moving || leg >= LEGS.length - 1}>往下走一段</LabButton>
      </>}
      extras={null}
    />
  )
}
