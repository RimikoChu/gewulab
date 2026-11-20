// 机械运动 · 拓展课：三个小专题。多量几次（误差和平均值）、一起动就是不动（相对静止）、从纳米到光年（长度的尺度）。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import At from './at'
import { LESSONS, goLesson } from './lessons'
import { REPEATS, mean } from './physics'
import { PLAT, TRACK, Train } from './world'

type Sub = 'repeat' | 'side' | 'scale'
const SUBS: Record<Sub, { name: string; title: string; say: string; button: string }> = {
  repeat: { name: '多量几次', title: '多次测量取平均值，可以减小误差', button: '再量三次', say: `同一张车票量四次，得到 ${REPEATS.map(x => x.toFixed(2)).join('、')} cm。每次都做对了，最后一位还是略有不同：这是误差。取平均值 ${mean(REPEATS).toFixed(2)} cm，比任何一次都更可靠。平均值的位数要和测量值一样。` },
  side: { name: '一起动就是不动', title: '速度的大小和方向都相同，就相对静止', button: '并排开', say: '两列车并排、一样快地往同一个方向开。以其中一列为参照物，另一列的位置没有变，是静止的。空中加油、同步卫星，都是这个道理。' },
  scale: { name: '从纳米到光年', title: '长度的单位差着很多个数量级', button: '排一排', say: '1 km = 1000 m；1 m = 10 dm = 100 cm = 1000 mm；1 mm = 1000 μm；1 μm = 1000 nm。量原子用纳米，量星星之间的距离用光年：光在一年里走过的路程。' },
}
const ORDER: Sub[] = ['repeat', 'side', 'scale']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))
const SCALES = [['原子的直径', '约 0.1 nm'], ['头发丝的直径', '约 70 μm'], ['一张车票', '8.64 cm'], ['一节车厢', '约 25 m'], ['地球的直径', '约 12 700 km'], ['太阳到地球', '约 1.5 亿 km']]

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('repeat')
  const [did, setDid] = useState<Sub[]>([])
  const T = useTasks('gewu:motion:x', TASKS)
  const on = did.includes(sub), x = useSlide(sub === 'side' && on ? 30 : 6, 6)
  const act = () => { if (on) return; const next = [...did, sub]; setDid(next); T.check(id => next.includes(id as Sub)) }
  const resetAll = () => { setSub('repeat'); setDid([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const labels: Label[] = sub === 'side' ? [{ id: 'a', at: [x - 12, PLAT + 3.4, TRACK.near], ax: 0.5, className: 'scene-tag -translate-y-full', children: '我坐的车' }, { id: 'b', at: [x - 12, PLAT + 3.4, TRACK.far], ax: 0.5, className: `scene-tag -translate-y-full${on ? ' key' : ''}`, children: on ? '在我看来：静止' : '旁边的车' }] : []

  return (
    <LabShell title="机械运动" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={<At at="platform" labels={labels}><Train x={x} z={TRACK.near} /><Train x={x} z={TRACK.far} color="#f1ede4" stripe="#c9453a" /></At>}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">量得准、比得清，才说得明白一个东西怎样在动</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'repeat' && <>
            <table className="mt-4 w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">第几次</th><th className="text-right font-normal">读数</th></tr></thead>
              <tbody>{REPEATS.slice(0, on ? 4 : 1).map((v, i) => <tr key={i} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">第 {i + 1} 次</td><td className="text-right tabular-nums">{v.toFixed(2)} cm</td></tr>)}</tbody>
            </table>
            <div className="mt-3 grid grid-cols-1 gap-2"><ParamTile symbol="平均值" value={on ? `${mean(REPEATS).toFixed(2)} cm` : '—'} unit="位数和每次的读数一样" /></div>
          </>}
          {sub === 'scale' && on && <table className="row-in mt-4 w-full text-[13.5px]"><tbody>{SCALES.map(([n, v]) => <tr key={n} className="border-t border-white/12"><td className="py-1.5 text-white/80">{n}</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{v}</td></tr>)}</tbody></table>}
          {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={on}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
