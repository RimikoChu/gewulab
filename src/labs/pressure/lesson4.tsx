// 压强 · 第 4 课 大坝为什么上窄下宽（p = ρgh；只和密度、深度有关）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import Scene4 from './scene4'
import { LESSONS, goLesson } from './lessons'
import { DAM, G, kPa, pWater } from './physics'
import { useSlide, useTasks } from '@/lab-kit'

interface Row { id: number; wide: boolean; h: number; p: number }
const TASKS: Task[] = [
  { id: 'h50', text: '把水位调到 50 m，记下坝底的压强', note: '50 m 深：490 kPa' },
  { id: 'h100', text: '蓄到 100 m，再记一次', note: '深度翻一倍，压强也翻一倍：坝底必须更厚' },
  { id: 'narrow', text: '换成很窄的水库，同样 100 m 深', note: '水少了很多，坝底的压强一点没变：只看深度' },
]

export default function Lesson4() {
  const [goal, setGoal] = useState(20)
  const [wide, setWide] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [touched, setTouched] = useState(false)
  const T = useTasks('gewu:pressure:4', TASKS)
  const level = useSlide(goal, 34)
  const moving = Math.abs(level - goal) > 0.01
  const p = pWater(level)
  const set = (m: number) => { setTouched(true); setGoal(Math.min(DAM.max, Math.max(0, m))) }
  const dup = rows.some(x => x.wide === wide && Math.abs(x.h - level) < 0.5)
  const record = () => {
    if (moving || level < 1 || dup) return
    const next = [...rows, { id: Date.now(), wide, h: Math.round(level), p }]
    setRows(next)
    T.check(id => id === 'h50' ? next.some(x => x.wide && x.h === 50) : id === 'h100' ? next.some(x => x.wide && x.h === 100) : next.some(x => !x.wide && x.h === 100))
  }
  const resetAll = () => { setGoal(20); setWide(true); setRows([]); setTouched(false); T.reset() }

  const task = T.current
  const want = task?.id === 'h50' ? 50 : 100, wantWide = task?.id !== 'narrow'
  const { hint, next }: { hint: string; next: 'h50' | 'h100' | 'record' | 'wide' | null } = (() => {
    if (!task) return { hint: '都做完了。拖一拖水位，看坝面上的箭头怎么变。', next: null }
    if (wide !== wantWide) return { hint: wantWide ? '先换回宽的水库' : '把水库换成窄的', next: 'wide' }
    if (moving) return { hint: '水位在变…', next: null }
    if (Math.abs(level - want) > 0.5) return { hint: `把水位调到 ${want} m（点按钮，或者抓住水面拖）`, next: want === 50 ? 'h50' : 'h100' }
    return dup ? { hint: '这一组记过了', next: null } : { hint: '按“记录数据”', next: 'record' }
  })()

  return (
    <LabShell title="压强" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="水库水位（也可以直接抓住水面拖）"
      stage={<Scene4 level={level} wide={wide} onLevel={set} dragHint={!touched} />}
      lesson={
        <LessonBlock no="4" title="大坝为什么上窄下宽" concept="水越深的地方，坝要越厚" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>液体内部某一点的压强，等于<b className="text-white">液体密度、g 和深度</b>三者相乘。</p>
            <p className="my-3 rounded-xl bg-white/8 py-3 text-center font-formula text-[21px] text-white italic">p = ρ g h</p>
            <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">h：</b>从液面往下量的竖直深度</li>
              <li><b className="text-[#7fe3d4]">只看两件事：</b>液体的密度、深度</li>
              <li><b className="text-[#ffd27a]">无关：</b>液体有多少、容器什么形状</li>
            </ul>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">水越深，压强越大，和水有多少无关</p>
          <p className="mt-2 font-formula text-[19px] italic text-white/85">p = ρ g h</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">坝底受到的压强最大，所以大坝要做成上窄下宽。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再拖一拖看看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">坝底的压强 p = ρ g h</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]">{kPa(p)}<span className="ml-1 text-[15px] font-medium text-white/55">kPa</span></div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="h" value={level.toFixed(0)} unit="m · 水深" />
            <ParamTile symbol={<>ρ<sub>水</sub></>} value="1.0" unit="×10³ kg/m³" />
            <ParamTile symbol="水库" value={wide ? '宽' : '窄'} unit={wide ? '很宽' : '只有 30 m'} />
          </div>
          <p className="mt-3 font-formula text-[15px] leading-relaxed text-white/70"><i>p</i> = 1.0×10³ × {G} × {level.toFixed(0)} = <b className="text-white">{kPa(p)} kPa</b></p>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">水位停稳以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">水库</th><th className="text-right font-normal">水深/m</th><th className="text-right font-normal">坝底压强/kPa</th></tr></thead>
                <tbody>{rows.map(x => (
                  <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{x.wide ? '宽' : '窄'}</td><td className="text-right">{x.h}</td><td className="text-right font-semibold text-[#7fe3d4]">{kPa(x.p)}</td></tr>
                ))}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'h50'} onClick={() => set(50)}>水位 50 m</LabButton>
        <LabButton pulse={next === 'h100'} onClick={() => set(100)}>水位 100 m</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={moving || level < 1 || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="水库">
          <Segmented label="水库" pulse={next === 'wide'} want={wantWide ? 'wide' : 'narrow'} value={wide ? 'wide' : 'narrow'} onChange={k => setWide(k === 'wide')} options={[{ value: 'wide', label: '宽' }, { value: 'narrow', label: '窄' }]} />
        </Control>
      }
    />
  )
}
