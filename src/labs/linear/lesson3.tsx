// 一次函数 · 第 3 课 列表、描点、连线（函数的图像；表格、解析式、图像三种表示法）
import { useEffect, useState } from 'react'
import { Glass, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Scene3 from './scene3'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { RATE, READ_X, TANK, TRIP_XS, fuelLeft } from './physics'

const TASKS: Task[] = [
  { id: 'one', text: '开出 100 km，表格记一行、图上描一个点', note: '(100, 42)：横坐标是里程，纵坐标是油量' },
  { id: 'all', text: '开到 500 km，描出全部六个点', note: '六个点排成了一条直线' },
  { id: 'join', text: '把点连起来', note: '连起来就是函数 y = 50 − 0.08x 的图像' },
  { id: 'read', text: '从图像上读出开到 250 km 时还剩多少油', note: '250 km 时剩 30 L，表格里没有的也能从图上读' },
]
const LAST = TRIP_XS[TRIP_XS.length - 1]

export default function Lesson3() {
  const [goal, setGoal] = useState(0)
  const [xs, setXs] = useState<number[]>([0])
  const [join, setJoin] = useState(false)
  const [read, setRead] = useState(false)
  const T = useTasks('gewu:linear:3', TASKS)
  const x = useSlide(goal, 75), moving = Math.abs(x - goal) > 0.01
  const line = useSlide(join ? 1 : 0, 0.55), joining = join && line < 1
  // 车开到了：表格加一行，图上加一个点
  useEffect(() => { if (moving || xs.includes(goal)) return; const n = [...xs, goal]; setXs(n); T.check(id => id === 'one' ? n.length >= 2 : id === 'all' && n.length === TRIP_XS.length) }, [moving, goal])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (join && line >= 1) T.check(id => id === 'join') }, [join, line])   // eslint-disable-line react-hooks/exhaustive-deps
  const drive = () => { if (moving || goal >= LAST) return; setGoal(goal + 100) }
  const doRead = () => { if (!join || joining) return; setRead(true); T.check(id => id === 'read') }
  const resetAll = () => { setGoal(0); setXs([0]); setJoin(false); setRead(false); T.reset() }
  const full = xs.length === TRIP_XS.length

  const { hint, next }: { hint: string; next: 'drive' | 'join' | 'read' | null } = !T.current ? { hint: '表格、解析式、图像，说的是同一个函数。', next: null }
    : moving ? { hint: '车在开，油量表的指针在往下落…', next: null }
    : !full ? { hint: `按“开 100 千米”：每开 100 千米，记一行、描一个点（已描 ${xs.length} 个）`, next: 'drive' }
    : !join ? { hint: '六个点都描好了，按“连线”', next: 'join' }
    : joining ? { hint: '顺着点画一条线…', next: null }
    : { hint: '按“读图”：从图上找 250 千米时的油量', next: 'read' }

  return (
    <LabShell title="一次函数" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="开车、画图"
      stage={<Scene3 x={x} xs={xs} line={line} read={read} />}
      lesson={<LessonBlock no="3" title="列表、描点、连线" concept="列表、描点、连线，就画出了函数的图像" tasks={TASKS} done={T.done} current={T.current?.id}
        theory={<>
          <p>画函数的图像分三步：</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">列表：</b>取几个自变量的值，算出对应的函数值，填进表格</li>
            <li><b className="text-[#7fe3d4]">描点：</b>每一组 (x, y) 是平面上的一个点，横坐标是 x，纵坐标是 y</li>
            <li><b className="text-[#7fe3d4]">连线：</b>按 x 从小到大，用平滑的线把点连起来</li>
          </ul>
          <p className="mt-3">同一个函数有三种表示法：表格（几组数）、解析式（y = 50 − 0.08x）、图像（这条线）。表格看得清每个数，解析式能算任何一个数，图像一眼看出变化的趋势。</p>
          <p className="mt-3 text-[13.5px] text-white/65">这辆车满箱 {TANK} L，每千米耗油 {RATE} L，也就是每百千米 8 L。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">图像画好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">油量 y 是里程 x 的函数：y = 50 − 0.08x</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">表格、解析式、图像是同一个函数的三种表示法。图像上开到 250 km 剩 30 L，代进解析式算也是 30 L。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">y = 50 − 0.08x</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{fuelLeft(x).toFixed(0)}<span className="ml-1 text-[15px] font-medium text-white/55">L 剩油</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="x" value={x.toFixed(0)} unit="km · 里程（自变量）" />
            <ParamTile symbol="y" value={fuelLeft(x).toFixed(0)} unit="L · 油量（函数）" />
          </div>
          <table className="mt-4 w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">里程 x / km</th><th className="text-right font-normal">油量 y / L</th></tr></thead>
            <tbody>{xs.map(v => <tr key={v} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums">{v}</td><td className="text-right font-semibold text-[#ffd25a] tabular-nums">{fuelLeft(v)}</td></tr>)}
              {read && <tr className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums text-white/70">{READ_X}（从图上读）</td><td className="text-right font-semibold text-[#ff8a5c] tabular-nums">{fuelLeft(READ_X)}</td></tr>}</tbody>
          </table>
          <p className="mt-3 text-[12.5px] text-white/50">图中路程按比例缩短。</p>
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'drive'} onClick={drive} disabled={moving || full}>开 100 千米</LabButton>
        <LabButton pulse={next === 'join'} onClick={() => setJoin(true)} disabled={!full || join}>连线</LabButton>
        <LabButton primary pulse={next === 'read'} onClick={doRead} disabled={!join || joining || read}>读图</LabButton>
      </>}
      extras={null}
    />
  )
}
