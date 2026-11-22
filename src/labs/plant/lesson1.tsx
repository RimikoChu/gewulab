// 植物的一生 · 第 1 课 种子的结构：剥开菜豆种子、纵向切开玉米种子，逐个认出各部分；在玉米的剖面上滴碘液。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { useRun, type V3 } from './parts'
import { SEEDS, embryoOf, storeOf, turnsBlue, type PartKey, type SeedKey } from './physics'
import { BEAN_X, CORN_X, S0, SeedBench, beanAnchor, cornAnchor } from './seeds'
import { Finale, H, Row } from './ui'
import { Room } from './world'

const TASKS: Task[] = [
  { id: 'open', text: '剥去菜豆种子的种皮，掰开两片子叶', note: '种皮里面是胚，两片肥厚的是子叶' },
  { id: 'bean', text: '逐个认出菜豆种子的五个部分', note: `胚由${embryoOf('bean').join('、')}组成` },
  { id: 'cut', text: '换成玉米种子，用刀片纵向切开', note: '剖面上大半是胚乳，胚在一侧' },
  { id: 'iodine', text: '在玉米的剖面上滴一滴碘液', note: '胚乳变蓝了：里面有淀粉' },
  { id: 'corn', text: '逐个认出玉米种子的六个部分', note: `玉米只有一片子叶，营养物质贮存在${storeOf('corn')}里` },
]
const at = (p: V3): V3 => [S0[0] + p[0], S0[1] + p[1], S0[2] + p[2]]

export default function Lesson1() {
  const [seed, setSeed] = useState<SeedKey>('bean')
  const [opened, setOpened] = useState(false), [cutDone, setCutDone] = useState(false), [dropped, setDropped] = useState(false)
  const [idx, setIdx] = useState({ bean: -1, corn: -1 })
  const T = useTasks('gewu:plant:1', TASKS)
  const open = useRun(opened ? 1 : 0, 2.6), cut = useRun(cutDone ? 1 : 0, 3.4), drop = useRun(dropped ? 1 : 0, 5)
  const parts = SEEDS[seed].parts, ready = seed === 'bean' ? open >= 1 : cut >= 1, i = idx[seed], sel: PartKey | null = ready && i >= 0 ? parts[i % parts.length].key : null
  const seenAll = (s: SeedKey, n = idx[s]) => n >= SEEDS[s].parts.length - 1
  const check = (n = idx) => T.check(id => id === 'open' ? open >= 1 : id === 'bean' ? seenAll('bean', n.bean) : id === 'cut' ? cut >= 1 : id === 'iodine' ? drop >= 1 : seenAll('corn', n.corn))
  useEffect(() => { check() }, [open >= 1, cut >= 1, drop >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const act = () => { if (seed === 'bean') setOpened(true); else setCutDone(true) }
  const nextPart = () => { if (!ready) return; const n = { ...idx, [seed]: i + 1 }; setIdx(n); check(n) }
  const resetAll = () => { setSeed('bean'); setOpened(false); setCutDone(false); setDropped(false); setIdx({ bean: -1, corn: -1 }); T.reset() }
  const task = T.current, busy = (opened && open < 1) || (cutDone && cut < 1) || (dropped && drop < 1)
  const { hint, next }: { hint: string; next: 'seed' | 'act' | 'part' | 'drop' | null } = (() => {
    if (!task) return { hint: '两种种子都看过了。它们都有种皮和胚；胚是新植物的幼体。', next: null }
    const want: SeedKey = task.id === 'open' || task.id === 'bean' ? 'bean' : 'corn'
    if (seed !== want) return { hint: `换成${SEEDS[want].name}`, next: 'seed' }
    if (busy) return { hint: task.id === 'iodine' ? '碘液渗开了，看剖面的颜色…' : task.id === 'cut' ? '刀片从中间纵向切下去…' : '先掀开种皮，再把两片子叶掰开…', next: null }
    if (task.id === 'open') return { hint: '菜豆种子外面包着一层种皮。按“剥开种子”', next: 'act' }
    if (task.id === 'cut') return { hint: '玉米种子的果皮和种皮紧贴在一起，剥不开。按“纵向切开”', next: 'act' }
    if (task.id === 'iodine') return { hint: '按“滴加碘液”，看剖面上哪一部分变蓝', next: 'drop' }
    return { hint: sel ? `这是${parts[i % parts.length].name}。按“看下一部分”` : '按“看下一部分”，一个一个认', next: 'part' }
  })()
  const p = sel ? parts[i % parts.length] : null
  const labels: Label[] = [
    ...(p ? [{ id: 'sel', at: at(seed === 'bean' ? beanAnchor(p.key, true) : cornAnchor(p.key, true)), ax: 0.5, className: 'scene-tag key -translate-y-[150%]', children: p.name }] : []),
    { id: 'nb', at: at([BEAN_X, 0.2, 2.75]), ax: 0.5, name: true, className: 'scene-name', children: '菜豆种子' },
    { id: 'nc', at: at([CORN_X, 0.2, 2.75]), ax: 0.5, name: true, className: 'scene-name', children: '玉米种子' },
    { id: 'ni', at: at([5.6, 2.5, -1.6]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '碘液' },
  ]
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SEEDS[seed].name}
      stage={<Room at="s1" labels={labels} shift={[seed === 'bean' ? BEAN_X + 0.2 : CORN_X + 0.4, 0, 0.1]} span={[6.6, 3.9]}><SeedBench open={open} cut={cut} drop={drop} sel={sel} seed={seed} /></Room>}
      lesson={<LessonBlock no="1" title="种子的结构" concept="种子里有胚，胚是新植物的幼体" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>种子的表面有一层<b className="text-white">种皮</b>，里面是<b className="text-white">胚</b>。胚由胚芽、胚轴、胚根和子叶组成，是新植物的幼体。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>菜豆种子有两片子叶，营养物质贮存在子叶里。</li>
            <li>玉米种子只有一片子叶，营养物质贮存在胚乳里；它的果皮和种皮紧贴在一起。</li>
            <li>淀粉遇碘液变蓝。玉米的胚乳变蓝，说明里面有淀粉。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两种种子都认完了" title="种子都有种皮和胚，胚是新植物的幼体" text={`胚由${embryoOf('bean').join('、')}组成。菜豆有两片子叶，营养物质在子叶里；玉米有一片子叶，营养物质在胚乳里。`} notes="画面上的种子比真的大得多，各部分的大小只是示意。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SEEDS[seed].name} · {SEEDS[seed].kind}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold">{p ? p.name : ready ? '认一认' : '还没打开'}</div>
            <div className="mt-1 min-h-[2.6em] text-[13.5px] leading-snug text-white/70">{p ? `${p.job}${seed === 'corn' && drop >= 1 ? (turnsBlue(p.key) ? '。滴碘液后变蓝' : p.embryo ? '。滴碘液后不变蓝' : '') : ''}` : ready ? '按“看下一部分”' : seed === 'bean' ? '先剥开种子' : '先纵向切开'}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="子叶" value={`${SEEDS[seed].cotyledons} 片`} unit={SEEDS[seed].kind} />
            <ParamTile symbol="营养物质" value={storeOf(seed)} unit="贮存的地方" />
          </div>
          <H>各部分</H>
          <div className="flex flex-col gap-1.5">
            {parts.map((q, k) => <Row key={q.key} name={q.name} text={q.job} on={sel === q.key} seen={ready && i >= k} tag={q.embryo ? '胚' : undefined} />)}
          </div>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'act'} onClick={act} disabled={busy || ready}>{seed === 'bean' ? '剥开种子' : '纵向切开'}</LabButton>
        <LabButton primary pulse={next === 'part'} onClick={nextPart} disabled={busy || !ready}>看下一部分</LabButton>
        <LabButton pulse={next === 'drop'} onClick={() => setDropped(true)} disabled={busy || seed !== 'corn' || cut < 1 || dropped}>滴加碘液</LabButton>
      </>}
      extras={<Control label="种子"><Segmented label="种子" pulse={next === 'seed'} want={next === 'seed' ? (seed === 'bean' ? 'corn' : 'bean') : null} value={seed} onChange={v => { if (!busy) setSeed(v) }} options={[{ value: 'bean', label: '菜豆种子' }, { value: 'corn', label: '玉米种子' }]} /></Control>}
    />
  )
}
