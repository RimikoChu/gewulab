// 水的净化和组成 · 第 5 课 自来水厂：沿着厂区走一遍。从取水泵房出发，依次到絮凝沉淀池、滤池、活性炭池、加氯间、清水池和送水泵房；
// 每到一站，镜头飞过去，读这一站出水的浊度；在加氯间投加消毒剂。池子都朝镜头剖开，看得见里面的水、矾花、砂层、炭层。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Puffs } from './fx'
import { LESSONS, goLesson } from './lessons'
import { NTU_LIMIT, PLANT, RIVER_NTU, fmtNtu, passes, stationTurb } from './physics'
import { CHLOR, CUT, INTAKE, PUMP, TANK } from './plant'
import { Place, type V3 } from './world'

const TASKS: Task[] = [
  { id: 'floc', text: '去絮凝沉淀池', note: '加絮凝剂，矾花沉到池底：和第 2 课的明矾一样' },
  { id: 'sand', text: '去滤池', note: '水穿过石英砂层：和第 3 课的过滤一样' },
  { id: 'carbon', text: '去活性炭池', note: '活性炭吸附色素和异味：和第 4 课一样' },
  { id: 'chlorine', text: '在加氯间投加消毒剂', note: '消毒杀死细菌等微生物，这一步是化学变化' },
  { id: 'clear', text: '去清水池和送水泵房', note: `出厂水的浊度不超过 ${NTU_LIMIT} NTU，送往城市` },
]
/** 每一站的标签位置 */
const TAG: V3[] = [
  [(INTAKE.x0 + INTAKE.x1) / 2, INTAKE.h + 6, INTAKE.z1],
  [(TANK.floc.x0 + TANK.sed.x1) / 2, TANK.floc.h + 14, CUT],
  [(TANK.sand.x0 + TANK.sand.x1) / 2, TANK.sand.h + 12, CUT],
  [(TANK.carbon.x0 + TANK.carbon.x1) / 2, TANK.carbon.h + 12, CUT],
  [(CHLOR.x0 + CHLOR.x1) / 2, CHLOR.h + 8, CHLOR.z1],
  [(TANK.clear.x0 + TANK.clear.x1) / 2, TANK.clear.h + 12, CUT],
]

export default function Lesson5() {
  const [at, setAt] = useState(0)
  const [arrived, setArrived] = useState(true)
  const [dosed, setDosed] = useState(false)
  const [dosing, setDosing] = useState(false)
  const T = useTasks('gewu:water:5', TASKS)
  // 镜头飞到下一站要两三秒；飞到了再打勾
  useEffect(() => { if (arrived) return; const t = setTimeout(() => { setArrived(true); const id = PLANT[at].id; if (id !== 'chlorine') T.check(k => k === id) }, 2800); return () => clearTimeout(t) }, [at, arrived])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!dosing) return; const t = setTimeout(() => { setDosing(false); setDosed(true); T.check(k => k === 'chlorine') }, 3200); return () => clearTimeout(t) }, [dosing])   // eslint-disable-line react-hooks/exhaustive-deps
  const go = () => { if (!arrived || dosing || at >= PLANT.length - 1) return; if (PLANT[at].id === 'chlorine' && !dosed) return; setAt(at + 1); setArrived(false) }
  const dose = () => { if (PLANT[at].id !== 'chlorine' || dosed || dosing || !arrived) return; setDosing(true) }
  const resetAll = () => { setAt(0); setArrived(true); setDosed(false); setDosing(false); T.reset() }
  const s = PLANT[at], ntu = stationTurb(at)

  const task = T.current
  const { hint, next }: { hint: string; next: 'go' | 'dose' | null } = !task ? { hint: '取水、絮凝沉淀、过滤、吸附、消毒，河水变成了自来水。只有消毒是化学变化。', next: null }
    : !arrived ? { hint: `去${s.place}…`, next: null }
    : dosing ? { hint: '投药泵把消毒剂加进水里…', next: null }
    : s.id === 'chlorine' && !dosed ? { hint: '这里是加氯间。投加消毒剂', next: 'dose' }
    : at === 0 ? { hint: '水泵把河水抽进厂里。去下一站：絮凝沉淀池', next: 'go' }
    : { hint: `${s.what}。去下一站：${PLANT[at + 1].place}`, next: 'go' }

  const labels: Label[] = [
    { id: 's', at: TAG[at], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: arrived ? 1 : 0 }, children: <><small>{s.place} · 出水</small>约 {fmtNtu(ntu)} NTU</> },
    ...(at === 1 && arrived ? [
      { id: 'a', at: [(TANK.floc.x0 + TANK.floc.x1) / 2, TANK.floc.w * 0.5, CUT] as V3, ax: 0.5, className: 'scene-name -translate-y-1/2', children: '絮凝：加絮凝剂，慢慢搅拌，形成矾花' },
      { id: 'b', at: [(TANK.sed.x0 + TANK.sed.x1) / 2 + 10, TANK.sed.w * 0.62, CUT] as V3, ax: 0.5, className: 'scene-name -translate-y-1/2', children: '斜管沉淀：上面的清水溢进集水槽' },
      { id: 'c', at: [(TANK.sed.x0 + TANK.sed.x1) / 2, 2.5, CUT] as V3, ax: 0.5, className: 'scene-name -translate-y-full', children: '沉到池底的泥' },
    ] : []),
    ...(at === 2 && arrived ? [
      { id: 'a', at: [TANK.sand.x0 - 4, (TANK.sand.bed + TANK.sand.gravel) / 2, CUT] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '石英砂' },
      { id: 'b', at: [TANK.sand.x0 - 4, TANK.sand.gravel / 2, CUT] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '卵石承托层' },
    ] : []),
    ...(at === 3 && arrived ? [{ id: 'a', at: [TANK.carbon.x0 - 4, (TANK.carbon.bed + TANK.carbon.gravel) / 2, CUT] as V3, ax: 1, className: 'scene-name -translate-y-1/2', children: '颗粒活性炭' }] : []),
    ...(at === 5 && arrived ? [{ id: 'a', at: [(PUMP.x0 + PUMP.x1) / 2, PUMP.h + 6, PUMP.z1] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>送往城市</small>{passes(ntu) ? '合格' : '不合格'}</> }] : []),
  ]
  return (
    <LabShell title="水的净化和组成" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="厂区"
      stage={<Place at={at} labels={labels} station={at} chlorine={dosed || dosing}>
        <Puffs at={[(CHLOR.x0 + CHLOR.x1) / 2 - 8, CHLOR.h + 1, CHLOR.z0 + 6]} on={dosing} opt={{ rate: 6, life: 2.4, size: [1.2, 5], speed: 2, spread: 0.2, color: '#eef2f2', opacity: 0.35, accel: [0.3, 0.6, 0], drag: 0.4 }} seed={4} />
      </Place>}
      lesson={<LessonBlock no="5" title="自来水厂" concept="水厂一步步把河水变成自来水" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>自来水厂的净水过程：取水 → 加絮凝剂 → 沉淀 → 过滤 → 活性炭吸附 → 投药消毒 → 配水。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>絮凝沉淀、过滤、吸附只是把杂质和水分开，没有生成新物质，是<b className="text-white">物理变化</b></li>
            <li>消毒用的氯气、二氧化氯等和水里的细菌发生反应，是<b className="text-white">化学变化</b></li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">自来水里仍然溶有可溶性的钙、镁化合物等，是混合物，不是纯净物。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">厂区走完一遍了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">沉淀、过滤、吸附、消毒，河水变成自来水</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">浊度从约 {fmtNtu(RIVER_NTU)} NTU 降到约 {fmtNtu(stationTurb(PLANT.length - 1))} NTU，不超过国家标准的 {NTU_LIMIT} NTU。四步里只有消毒是化学变化。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{s.place}出水的浊度</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{arrived ? fmtNtu(ntu) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">NTU</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="出厂水" value={`≤ ${NTU_LIMIT}`} unit="NTU · 国家标准" />
            <ParamTile symbol="消毒剂" value={dosed ? '已投加' : '—'} unit="加氯间" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">净水流程</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium">步骤</th><th className="pb-1 font-medium">出水浊度</th><th className="pb-1 font-medium">变化</th></tr></thead>
            <tbody>{PLANT.map((p, i) => <tr key={p.id} className={i === at ? 'bg-white/[0.12]' : 'bg-white/[0.04]'}><td className="rounded-l-lg px-2 py-1.5 text-left">{p.name}</td><td className="tabular-nums">{i < at || (i === at && arrived) ? `约 ${fmtNtu(p.ntu)}` : '—'}</td><td className={`rounded-r-lg ${p.chem && (i < at || dosed) ? 'font-semibold text-[#ffd27a]' : ''}`}>{i < at || (i === at && arrived) ? (p.chem ? '化学变化' : '物理变化') : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'go'} pulse={next === 'go'} onClick={go} disabled={!arrived || dosing || at >= PLANT.length - 1 || (s.id === 'chlorine' && !dosed)}>去下一站</LabButton>
        <LabButton primary={next === 'dose'} pulse={next === 'dose'} onClick={dose} disabled={s.id !== 'chlorine' || dosed || dosing || !arrived}>投加消毒剂</LabButton>
      </>}
      extras={null}
    />
  )
}
