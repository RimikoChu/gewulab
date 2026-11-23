// 血液循环 · 第 1 课 血液的组成：左展台上一支加了抗凝剂的血液试管，静置后分成三层；再到后面的视野展板上，逐个认红细胞、白细胞、血小板。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { TUBE } from './bench'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { CELLS, L1_ORDER, LAYERS, cellsPct, layers, plasmaPct, type L1Step } from './physics'
import { FIELD_AT, TUBE_AT } from './world'

const TASKS: Task[] = [
  { id: 'settle', text: '往血里加抗凝剂，静置一段时间', note: '血液分成了三层' },
  { id: 'plasma', text: '认出上层的血浆', note: `上层淡黄色、半透明的是血浆，约占 ${plasmaPct()}%` },
  { id: 'rbc', text: '看红细胞：数量最多，没有细胞核', note: '红细胞两面凹，没有细胞核，运输氧' },
  { id: 'wbc', text: '看白细胞：个头最大，有细胞核', note: '白细胞有细胞核，能吞噬病菌' },
  { id: 'plt', text: '看血小板：最小，形状不规则', note: '血小板最小，没有细胞核，能止血、加速凝血' },
]
const NAME: Record<L1Step, string> = { plasma: '血浆', rbc: '红细胞', wbc: '白细胞', plt: '血小板' }

export default function Lesson1() {
  const [idx, setIdx] = useState(-1)
  const T = useTasks('gewu:blood:1', TASKS)
  const settle = useRun(4.5, () => T.check(id => id === 'settle'))
  const k = settle.k, settled = k >= 1
  const cur: L1Step | null = idx >= 0 ? L1_ORDER[idx] : null
  const look = () => { if (!settled || idx >= L1_ORDER.length - 1) return; const n = idx + 1; setIdx(n); T.check(id => id === L1_ORDER[n]) }
  const resetAll = () => { settle.snap(0); setIdx(-1); T.reset() }
  const task = T.current
  const onField = cur !== null && cur !== 'plasma'
  const { hint, next }: { hint: string; next: 'settle' | 'look' | null } = !task ? { hint: '血液由血浆和血细胞组成；血细胞有红细胞、白细胞、血小板三种。', next: null }
    : settle.busy ? { hint: '静置中：血细胞慢慢往下沉…', next: null }
    : !settled ? { hint: '一支刚采的血，加了抗凝剂，不会凝固。按“静置”，放一段时间看看', next: 'settle' }
    : { hint: idx < 0 ? '血分成了三层。按“看下一种”，从最上面那层看起' : `这是${NAME[cur!]}。按“看下一种”`, next: 'look' }
  const L = layers(k), H = TUBE.liquid, x = TUBE_AT[0] + TUBE.r + 0.08, y0 = TUBE_AT[1] + 0.012
  const labels: Label[] = onField
    ? [{ id: 'f', at: [FIELD_AT[0] - 1.1, FIELD_AT[1] + 1.15, FIELD_AT[2]], ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>放大的</small>{NAME[cur!]}</> },
       { id: 'fn', at: [FIELD_AT[0] - 1.42, FIELD_AT[1] - 1.25, FIELD_AT[2]], ax: 1, className: 'scene-name', children: '显微镜下的视野 · 示意' }]
    : settled ? [
      { id: 'p', at: [x, y0 + H * (L.mixed + L.buffy + L.plasma / 2), TUBE_AT[2]], ax: 0, className: `scene-tag ${cur === 'plasma' ? 'key' : ''} -translate-y-1/2`, children: <><small>上层</small>血浆 {plasmaPct()}%</> },
      { id: 'b', at: [x + 0.05, y0 + H * (L.mixed + L.buffy / 2), TUBE_AT[2]], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>中间一薄层</small>白细胞和血小板</> },
      { id: 'r', at: [x, y0 + H * L.mixed / 2, TUBE_AT[2]], ax: 0, className: 'scene-tag -translate-y-1/2', children: <><small>下层</small>红细胞</> },
    ] : [{ id: 't', at: [TUBE_AT[0] - 0.2, TUBE_AT[1] + TUBE.h + 0.12, TUBE_AT[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '加了抗凝剂的血' }]
  const c = cur && cur !== 'plasma' ? CELLS[cur] : null
  return (
    <LabShell title="血液循环" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="试管和视野"
      stage={<Place at={onField ? 'field' : 'tube'} labels={labels} want={{ tube: { k, hl: cur === 'plasma' ? 'plasma' : null }, field: onField ? cur : null }} />}
      lesson={<LessonBlock no="1" title="血液的组成" concept="血液由血浆和血细胞组成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在新鲜血液里加入抗凝剂（如柠檬酸钠），静置一段时间，血液会出现分层：上层淡黄色、半透明的是<b className="text-white">血浆</b>，下层深红色、不透明的是<b className="text-white">红细胞</b>，两层交界处一薄层白色的是<b className="text-white">白细胞和血小板</b>。</p>
          <p className="mt-3">血浆约占血液的 {plasmaPct()}%，主要成分是水，能运载血细胞，运输养料和废物。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {(['rbc', 'wbc', 'plt'] as const).map(k => <li key={k}><b className="text-white">{CELLS[k].name}</b>：{CELLS[k].shape}，{CELLS[k].nucleus}，{CELLS[k].many}。{CELLS[k].job}。</li>)}
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">真实的静脉血是暗红色的。这个实验室里用暗蓝表示静脉血，只是为了和动脉血分清楚。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">血液的成分都认出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">血液由血浆和血细胞组成</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">血浆约占 {plasmaPct()}%，血细胞约占 {cellsPct()}%。红细胞最多、没有细胞核；白细胞最大、有细胞核；血小板最小。</p>
          <p className="mt-2 text-[12.5px] text-white/50">视野里的血细胞是放大的示意，个数不代表真实的比例。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{c ? '正在看' : '试管里'}</div>
            <div className="mt-1 text-[34px] leading-none font-bold tracking-tight">{c ? c.name : settled ? `血浆 ${plasmaPct()}%` : '—'}</div>
            <div className="mt-2 text-[14px] text-white/70">{c ? `${c.shape}，${c.nucleus}` : settled ? `血细胞 ${cellsPct()}%` : '还没有分层'}</div>
          </div>
          {/* 分层的比例条 */}
          <div className="mt-4 flex h-40 gap-3">
            <div className="flex w-12 flex-col overflow-hidden rounded-lg ring-1 ring-white/15">
              <div style={{ height: `${L.plasma * 100}%`, background: LAYERS[0].color }} className="transition-all" />
              <div style={{ height: `${Math.max(L.buffy * 100, settled ? 2 : 0)}%`, background: LAYERS[1].color }} />
              <div style={{ height: `${L.mixed * 100}%`, background: settled ? LAYERS[2].color : '#8a1424' }} className="flex-1" />
            </div>
            <ul className="flex flex-1 flex-col justify-between py-1 text-[13.5px]">
              <li className={cur === 'plasma' ? 'font-semibold text-white' : 'text-white/70'}>血浆 <span className="tabular-nums">{settled ? `${plasmaPct()}%` : '—'}</span><br /><span className="text-[12px] text-white/50">淡黄，半透明</span></li>
              <li className="text-white/70">白细胞和血小板<br /><span className="text-[12px] text-white/50">很薄的一层</span></li>
              <li className={cur === 'rbc' ? 'font-semibold text-white' : 'text-white/70'}>红细胞<br /><span className="text-[12px] text-white/50">深红，不透明</span></li>
            </ul>
          </div>
          <p className="mt-3 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] leading-relaxed text-white/75">{c ? `${c.many}。${c.job}。` : '血细胞比血浆重，静置后沉到下面。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'settle'} pulse={next === 'settle'} onClick={() => settle.run()} disabled={settle.busy || settled}>静置</LabButton>
        <LabButton primary={next === 'look'} pulse={next === 'look'} onClick={look} disabled={!settled || idx >= L1_ORDER.length - 1}>看下一种</LabButton>
      </>}
      extras={null}
    />
  )
}
