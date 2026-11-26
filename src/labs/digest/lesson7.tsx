// 消化和吸收 · 第 7 课 合理营养与食品安全：展厅最左边的食堂餐桌。一类一类地往餐盘里放食物，宝塔上对应那一层亮起来；
// 五类都有了再检查；最后看牛奶盒上的生产日期和保质期。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { cn } from '@/lib/utils'
import { LESSONS, goLesson } from './lessons'
import { Place, useRun } from './parts'
import { FOODS, FOOD_ORDER, PAGODA, balanced, mealGroups, type FoodGroup } from './physics'
import { MEAL_AT, PAGODA_AT, foodAt, tier } from './meal'

const TASKS: Task[] = [
  { id: 'grain', text: '先放一份主食（谷薯类）', note: '谷薯类在宝塔最底层，每天吃得最多' },
  { id: 'vf', text: '配上蔬菜和水果', note: '蔬菜、水果在宝塔第二层' },
  { id: 'mm', text: '加上鱼肉蛋和奶', note: '鱼肉蛋在第三层，奶、大豆和坚果在第四层' },
  { id: 'check', text: '检查这份午餐：五类都有', note: '食物多样，五类都有，搭配合理' },
  { id: 'pack', text: '看包装上的生产日期和保质期', note: '买包装食品要看生产日期和保质期，过期的不吃' },
]
const ASK: Record<FoodGroup, [string, string]> = {
  grain: ['先配主食：选“主食”', '放一碗米饭到餐盘上'],
  veg: ['再配蔬菜：选“蔬菜”', '放一份炒青菜到餐盘上'],
  fruit: ['再配水果：选“水果”', '放一个橙子到餐盘上'],
  meat: ['再配鱼肉蛋：选“鱼肉蛋”', '放清蒸鱼和鸡蛋到餐盘上'],
  milk: ['最后配奶：选“奶”', '放一盒牛奶到餐盘边'],
}

export default function Lesson7() {
  const [sel, setSel] = useState<FoodGroup>('grain')
  const [items, setItems] = useState<FoodGroup[]>([])
  const [checked, setChecked] = useState(false)
  const T = useTasks('gewu:digest:7', TASKS)
  const pack = useRun(3.2, () => T.check(id => id === 'pack'))
  const put = () => {
    if (items.includes(sel)) return
    const n = [...items, sel]; setItems(n)
    T.check(id => id === 'grain' ? n.includes('grain') : id === 'vf' ? n.includes('veg') && n.includes('fruit') : id === 'mm' ? n.includes('meat') && n.includes('milk') : false)
  }
  const check = () => { if (!balanced(items)) return; setChecked(true); T.check(id => id === 'check') }
  const resetAll = () => { setSel('grain'); setItems([]); setChecked(false); pack.snap(0); T.reset() }
  const need = FOOD_ORDER.find(g => !items.includes(g))
  const task = T.current
  const { hint, next }: { hint: string; next: 'sel' | 'put' | 'check' | 'pack' | null } = !task ? { hint: '每天的饭菜要食物多样，五类都有。', next: null }
    : pack.busy ? { hint: '把牛奶盒转过来…', next: null }
    : need ? (sel !== need ? { hint: ASK[need][0], next: 'sel' } : { hint: ASK[need][1], next: 'put' })
    : !checked ? { hint: '五类食物都有了。检查这份午餐', next: 'check' }
    : { hint: '搭配合理。牛奶是包装食品，看看包装上的生产日期和保质期', next: 'pack' }
  const labels: Label[] = [
    ...PAGODA.map((p, i): Label => ({ id: `p${p.layer}`, at: [PAGODA_AT[0] - tier(p.layer).w / 2 - 0.08, PAGODA_AT[1] + tier(p.layer).y, PAGODA_AT[2] + 0.2], ax: 1, className: `scene-tag ${items.some(g => FOODS[g].layer === p.layer) ? 'key' : ''} -translate-y-1/2`, children: <><small>第 {i + 1} 层</small>{p.name}</> })),
    ...(items.length && !pack.k ? [{ id: 'last', at: foodAt(items[items.length - 1]), ax: 0.5, className: 'scene-tag -translate-y-full', children: FOODS[items[items.length - 1]].dish } as Label] : []),
    ...(pack.k > 0 ? [{ id: 'pk', at: [MEAL_AT[0] + 1.15, MEAL_AT[1] + 1.25, MEAL_AT[2] + 1.6], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>看清楚</small>生产日期 · 保质期</> } as Label] : []),
  ]
  const n = mealGroups(items)
  return (
    <LabShell title="消化和吸收" lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['7'], VOICE)} actionsLabel="午餐"
      stage={<Place at="meal" labels={labels} want={{ meal: { items, checked, pack: pack.k } }} />}
      lesson={<LessonBlock no="7" title="合理营养与食品安全" concept="食物多样，五类都要有" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>合理营养是指全面而平衡的营养。平衡膳食宝塔把食物分成五层：谷薯类在最底层，每天吃得最多；往上依次是蔬菜水果、动物性食物、奶和大豆坚果；油和盐在塔顶，要少吃。</p>
          <p className="mt-3">一日三餐要按时，食物要多样。早、中、晚餐的能量大约各占 30%、40%、30%。</p>
          <p className="mt-3">食品安全：购买包装食品时，要看生产日期、保质期，有没有质量安全图标；不吃发霉、变质的食物。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[12.5px] text-[#7fe3d4]">一份搭配合理的午餐</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">食物多样，五类都要有</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/70">主食吃得最多，蔬菜水果其次，鱼肉蛋和奶适量，油和盐要少。买包装食品先看生产日期和保质期。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">餐盘里的食物</div>
            <div className="mt-1 text-[40px] leading-none font-bold tabular-nums">{n}<span className="ml-1 text-[18px] font-medium text-white/55">/ {FOOD_ORDER.length} 类</span></div>
            {checked && <div className="mt-2 text-[14px] font-semibold text-[#7fe3d4]">五类都有，搭配合理</div>}
          </div>
          <h2 className="mt-4 text-[13px] text-white/60">平衡膳食宝塔 · 成人每天</h2>
          <ul className="mt-2 flex flex-col-reverse gap-1.5">
            {PAGODA.map(p => { const on = items.some(g => FOODS[g].layer === p.layer); return <li key={p.layer} className={cn('rounded-lg px-3 py-1.5', on ? 'bg-[#ffb070]/20' : 'bg-white/5')}>
              <div className={cn('text-[13.5px] font-semibold', on ? 'text-white' : 'text-white/70')}>{p.layer} · {p.name}</div>
              <div className="text-[12px] text-white/55">{p.amount}</div>
            </li> })}
          </ul>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'put'} pulse={next === 'put'} onClick={put} disabled={items.includes(sel) || pack.busy}>放到餐盘上</LabButton>
        <LabButton primary={next === 'check'} pulse={next === 'check'} onClick={check} disabled={!balanced(items) || checked}>检查这份午餐</LabButton>
        <LabButton primary={next === 'pack'} pulse={next === 'pack'} onClick={() => pack.run()} disabled={!checked || pack.k > 0}>看食品包装</LabButton>
      </>}
      extras={
        <Control label="选一类食物">
          <Segmented label="选一类食物" pulse={next === 'sel'} want={next === 'sel' ? need ?? null : null} value={sel} onChange={g => setSel(g as FoodGroup)} options={FOOD_ORDER.map(g => ({ value: g, label: FOODS[g].name }))} />
        </Control>
      }
    />
  )
}
