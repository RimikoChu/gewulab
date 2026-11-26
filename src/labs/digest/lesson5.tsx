// 消化和吸收 · 第 5 课 小肠里的消化：悬在人体模型旁边的放大球，里面是十二指肠里的营养物质（示意）。
// 加入胆汁，大油滴碎成小微粒（乳化）；加入胰液和肠液，淀粉、蛋白质、脂肪被彻底分解；再逐个看最终产物。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { L5_ORDER, MACRO, PRODUCTS, areaGain, leftAfter, type Macro } from './physics'
import { DUO_AT, DUO_R } from './duo'
import { Bars } from './bars'

const N_DROPS = 8
const TASKS: Task[] = [
  { id: 'bile', text: '加入胆汁，看脂肪的变化', note: '胆汁不含消化酶，只把脂肪乳化成微粒' },
  { id: 'juice', text: '加入胰液和肠液', note: '胰液、肠液含多种消化酶，能消化淀粉、蛋白质和脂肪' },
  { id: 'starch', text: '找到淀粉的最终产物', note: `淀粉最终被分解成${PRODUCTS.starch}` },
  { id: 'protein', text: '找到蛋白质的最终产物', note: `蛋白质最终被分解成${PRODUCTS.protein}` },
  { id: 'fat', text: '找到脂肪的最终产物', note: `脂肪最终被分解成${PRODUCTS.fat}` },
]
const at = (x: number, y: number, z = 0): [number, number, number] => [DUO_AT[0] + x, DUO_AT[1] + y, DUO_AT[2] + z]

export default function Lesson5() {
  const [idx, setIdx] = useState(-1)
  const T = useTasks('gewu:digest:5', TASKS)
  const bile = useRun(4.2, () => T.check(id => id === 'bile'))
  const juice = useRun(7.5, () => T.check(id => id === 'juice'))
  const busy = bile.busy || juice.busy
  const look = () => { if (juice.k < 1 || idx >= L5_ORDER.length - 1) return; const n = idx + 1; setIdx(n); T.check(id => id === L5_ORDER[n]) }
  const resetAll = () => { bile.snap(0); juice.snap(0); setIdx(-1); T.reset() }
  const focus: Macro | null = idx >= 0 ? L5_ORDER[idx] : null
  const task = T.current
  const { hint, next }: { hint: string; next: 'bile' | 'juice' | 'look' | null } = !task ? { hint: '小肠里有胆汁、胰液、肠液，是消化的主要场所。', next: null }
    : bile.busy ? { hint: '胆汁从胆总管流进来了…', next: null }
    : juice.busy ? { hint: '胰液、肠液里的消化酶正在分解…', next: null }
    : bile.k < 1 ? { hint: '淀粉、蛋白质、脂肪都来到了十二指肠。先加入胆汁', next: 'bile' }
    : juice.k < 1 ? { hint: '大油滴碎成了许多小微粒。再加入胰液和肠液', next: 'juice' }
    : idx < 0 ? { hint: '长链都拆开了。按“看下一种产物”，从淀粉看起', next: 'look' }
    : { hint: `${MACRO[L5_ORDER[idx]].name}最终变成了${PRODUCTS[L5_ORDER[idx]]}。按“看下一种产物”`, next: 'look' }
  const kj = juice.k
  const left: Record<Macro, number> = { starch: leftAfter('starch', 'C') * (1 - kj), protein: leftAfter('protein', 'C') * (1 - kj), fat: leftAfter('fat', 'C') * (1 - kj) }
  const labels: Label[] = [
    { id: 'bile', at: at(-1.0, 1.32, -1.0), ax: 1, className: `scene-tag ${bile.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>来自肝和胆囊</small>胆汁</> },
    { id: 'pan', at: at(-1.42, 0.62, -1.0), ax: 1, className: `scene-tag ${juice.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>来自胰</small>胰液</> },
    { id: 'wall', at: at(1.2, -1.15, -0.9), ax: 0, className: `scene-tag ${juice.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>肠壁里的肠腺</small>肠液</> },
    focus
      ? { id: 'f', at: at(-DUO_R * 0.55, -DUO_R * 0.95), ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>{MACRO[focus].name}的最终产物</small>{PRODUCTS[focus]}</> }
      : { id: 'n', at: at(DUO_R * 0.8, DUO_R * 0.72), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '十二指肠里 · 放大示意' },
  ]
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="十二指肠"
      stage={<Place at="duo" labels={labels} want={{ duo: { bile: bile.k, juice: juice.k, focus }, body: { hl: ['small'], dim: 0.6 } }} />}
      lesson={<LessonBlock no="5" title="小肠里的消化" concept="小肠是消化的主要场所" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>肝分泌的<b className="text-white">胆汁</b>储存在胆囊里，经导管流入十二指肠。胆汁不含消化酶，但能把脂肪变成微小的颗粒，增加脂肪和消化酶的接触面积。</p>
          <p className="mt-3">胰分泌的<b className="text-white">胰液</b>和肠腺分泌的<b className="text-white">肠液</b>含有多种消化酶，能把淀粉分解成葡萄糖，把蛋白质分解成氨基酸，把脂肪分解成甘油和脂肪酸。</p>
          <p className="mt-3">图中淀粉画成一串六边形，蛋白质画成一串彩色小球，只是示意。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">三种产物都找到了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">小肠是消化的主要场所</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">胆汁把脂肪乳化成微粒；胰液、肠液把淀粉分解成葡萄糖，蛋白质分解成氨基酸，脂肪分解成甘油和脂肪酸。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <h2 className="text-[13px] text-white/60">还没被消化的（示意）</h2>
          <Bars left={left} hl={focus} />
          <div className="mt-4 rounded-xl bg-white/6 px-3 py-3">
            <div className="text-[13px] text-white/60">胆汁乳化：一个大油滴分成 {N_DROPS} 个小微粒</div>
            <div className="mt-1 text-[24px] leading-none font-bold tabular-nums">表面积 × {bile.k >= 1 ? areaGain(N_DROPS).toFixed(0) : '1'}</div>
            <div className="mt-1.5 text-[12.5px] text-white/55">还是脂肪，只是变小了，更容易被消化酶分解</div>
          </div>
          {focus && <p className="mt-3 rounded-xl bg-white/8 px-3 py-2.5 text-[14px] text-white/85">{MACRO[focus].name} → <b className="text-white">{PRODUCTS[focus]}</b></p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'bile'} pulse={next === 'bile'} onClick={() => bile.run()} disabled={busy || bile.k > 0}>加入胆汁</LabButton>
        <LabButton primary={next === 'juice'} pulse={next === 'juice'} onClick={() => juice.run()} disabled={busy || bile.k < 1 || juice.k > 0}>加入胰液和肠液</LabButton>
        <LabButton primary={next === 'look'} pulse={next === 'look'} onClick={look} disabled={juice.k < 1 || idx >= L5_ORDER.length - 1}>看下一种产物</LabButton>
      </>}
      extras={null}
    />
  )
}
