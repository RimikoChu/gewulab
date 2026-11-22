// 光的反射和平面镜 · 第 1 课 光走直线（光沿直线传播，小孔成像）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Candle, Candlestick, Dark, Path, useEase } from './optics'
import { CANDLE, HOLE_US, SCREEN, pinholeHeight, pinholeSize } from './physics'
import { PinholeBox, Ruler } from './props'
import { DataTable, Finale, Readout } from './ui'
import { CM, ST, TOP } from './world'

type U = '30' | '15' | '10'
const TASKS: Task[] = [
  { id: 'rays', text: '按“画出光线”，看烛焰尖和烛底发出的光各落在屏的哪里', note: '光沿直线穿过小孔：上面来的光落到下面，下面来的落到上面，所以像是倒立的' },
  ...HOLE_US.map(u => ({ id: String(u), text: `蜡烛离小孔 ${u} cm：记下屏上的像有多高`, note: `像高 ${pinholeHeight(u)} cm，是倒立、${pinholeSize(u)}的` })),
]
// 小孔在 (X0, AX)；暗箱里面高度的一半；屏离小孔多远。蜡烛的正中对着小孔
const X0 = ST.hole, AX = TOP + 0.66, HH = 0.36
const X = (cm: number) => X0 + cm * CM, Y = (cm: number) => AX + cm * CM
const TIP = '#ffd24a', FOOT = '#7fe3d4'

/** 面板上的小图：从屏的背面看过去，屏上是什么样 */
function ScreenView({ h }: { h: number }) {
  const W = 250, H = 150, S = 11, w = h * S * 0.2 + 3     // 1 cm 画 11 个单位
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-lg" role="img" aria-label="屏上看到的">
      <rect width={W} height={H} fill="#d9d6ca" /><rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="#2b3136" strokeWidth={2} />
      <ellipse cx={W / 2} cy={H / 2} rx={30 + h * 6} ry={22 + h * 5} fill="#ffcf7a" opacity={0.25} />
      <g transform={`translate(${W / 2} ${H / 2 + h * S / 2}) scale(1 -1)`} opacity={Math.max(0.55, 1 - h / 22)}>
        <rect x={-w / 2} y={h * S * 0.26} width={w} height={h * S * 0.74} rx={1.5} fill="#e9dcc0" stroke="#b9a988" strokeWidth={0.6} />
        <path d={`M0 0 C ${w * 0.55} ${h * S * 0.1} ${w * 0.42} ${h * S * 0.2} 0 ${h * S * 0.24} C ${-w * 0.42} ${h * S * 0.2} ${-w * 0.55} ${h * S * 0.1} 0 0Z`} fill="#ff9a2e" />
      </g>
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#2b3136" strokeOpacity={0.14} strokeDasharray="3 4" />
    </svg>
  )
}

export default function Lesson1() {
  const [us, setUs] = useState<U>('30')
  const [rays, setRays] = useState(false)
  const [rows, setRows] = useState<U[]>([])
  const T = useTasks('gewu:mirror:1', TASKS)
  const u = useEase(Number(us), 0.9), steady = Math.abs(u - Number(us)) < 0.02, k = useEase(rays ? 1 : 0, 1.1)
  const hi = pinholeHeight(u), dup = rows.includes(us)
  const draw = () => { const on = !rays; setRays(on); if (on) T.check(id => id === 'rays') }
  const record = () => { if (!steady || dup) return; const next = [...rows, us]; setRows(next); T.check(id => next.includes(id as U)) }
  const resetAll = () => { setUs('30'); setRays(false); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'rays' | 'u' | 'record' | null } = !task ? { hint: '三个距离都记完了。蜡烛离小孔越近，屏上的像越大，但总是倒立的。', next: null }
    : task.id === 'rays' ? { hint: '按“画出光线”', next: 'rays' }
    : us !== task.id ? { hint: `把蜡烛移到离小孔 ${task.id} cm 的地方`, next: 'u' }
    : !steady ? { hint: '蜡烛在移…', next: null } : { hint: '看屏上的像有多高，按“记录”', next: 'record' }
  const labels: Label[] = [
    { id: 'u', at: [X(-u / 2), TOP + 0.2, 0.36], ax: 0.5, className: 'scene-tag', children: <><small>蜡烛到小孔</small>{u.toFixed(0)} cm</> },
    { id: 'v', at: [X(SCREEN / 2), TOP + 0.2, 0.36], ax: 0.5, className: 'scene-tag', children: <><small>屏到小孔</small>{SCREEN} cm</> },
    { id: 'h', at: [X(SCREEN) + 0.1, AX + HH + 0.34, 0.26], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>像高</small>{hi.toFixed(1)} cm</> },
    { id: 'n1', at: [X0, AX + HH + 0.06, 0.26], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '小孔' },
    { id: 'n2', at: [X(SCREEN), AX + HH + 0.06, 0.26], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '半透明的屏' },
    { id: 'n3', at: [X(-u), Y(CANDLE / 2) + 0.1, 0.1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: `蜡烛（高 ${CANDLE} cm）` },
  ]

  return (
    <LabShell title={TITLE} lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="小孔成像"
      stage={<Dark at="hole" labels={labels}>
        <PinholeBox x={X0} y={AX} len={SCREEN * CM} hh={HH} />
        <Candlestick x={X(-u)} y0={TOP} h={Y(-CANDLE / 2) - TOP} />
        <Candle x={X(-u)} y={Y(-CANDLE / 2)} h={CANDLE * CM} dish={false} />
        {/* 屏上的像：倒着的一支蜡烛 */}
        <Candle x={X(SCREEN) - 0.006} y={Y(hi / 2)} h={-hi * CM} image flat />
        <Ruler x0={X(-34)} y={TOP + 0.001} z={0.5} cm={52} scale={CM} zero={34} />
        {k > 0 && <>
          <Path pts={[[X(-u), Y(CANDLE / 2)], [X0, AX], [X(SCREEN), Y(-hi / 2)]]} k={k} color={TIP} r={0.007} />
          <Path pts={[[X(-u), Y(-CANDLE / 2)], [X0, AX], [X(SCREEN), Y(hi / 2)]]} k={k} color={FOOT} r={0.007} />
        </>}
      </Dark>}
      lesson={<LessonBlock no="1" title="光走直线" concept="光在同种均匀介质中沿直线传播" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光在<b className="text-white">同种均匀介质</b>中沿直线传播。影子、日食和月食、小孔成像，都是因为光走直线。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>烛焰尖上发出的光，只有对准小孔的那一条能穿过去，它落在屏的下方；烛底发出的落在屏的上方。所以像上下颠倒、左右也相反</li>
            <li>小孔成的像是实际的光照在屏上形成的，是<b className="text-white">实像</b></li>
            <li>像的大小由“屏到小孔”和“蜡烛到小孔”这两个距离的比决定，和小孔是圆是方没有关系</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">像高 = 物高 × 屏到小孔的距离 ÷ 蜡烛到小孔的距离（相似三角形）。这个算式课本不要求。</p>
        </>} />}
      finale={T.finale && <Finale kicker="三个距离都记下了" title="光走直线，所以小孔成的像是倒立的" onClose={() => T.setFinale(false)}>蜡烛离小孔 30、15、10 cm，像高 {pinholeHeight(30)}、{pinholeHeight(15)}、{pinholeHeight(10)} cm：离得越近，像越大。</Finale>}
      panel={
        <Glass className="px-4 py-4">
          <Readout label="屏上的像 · 高度" value={hi.toFixed(1)} unit="cm" />
          <h2 className="mt-4 text-[12.5px] text-white/55">屏上看到的</h2>
          <ScreenView h={hi} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ParamTile symbol="物高" value={`${CANDLE}`} unit="cm · 蜡烛" />
            <ParamTile symbol="物距" value={u.toFixed(0)} unit="cm · 烛到孔" />
            <ParamTile symbol="像距" value={`${SCREEN}`} unit="cm · 屏到孔" />
          </div>
          <DataTable head={['蜡烛到小孔 / cm', '像高 / cm', '像']} empty="每换一个距离，按一次“记录”。"
            rows={rows.map(r => [r, pinholeHeight(Number(r)).toFixed(0), `倒立、${pinholeSize(Number(r))}`])} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'rays'} onClick={draw}>{rays ? '擦掉光线' : '画出光线'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="蜡烛到小孔"><Segmented label="蜡烛到小孔" pulse={next === 'u'} want={next === 'u' ? task!.id as U : null} value={us} onChange={setUs} options={HOLE_US.map(x => ({ value: String(x) as U, label: `${x} cm` }))} /></Control>}
    />
  )
}
