// 二次函数 · 拓展课：两个小专题。租金定多少（利润也是二次函数，顶点处最大）、三点定水柱（待定系数法）。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import At, { Local, toWorld } from './at'
import { Curve, Dash, Dot, type Axes } from './graph'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { fit3, fmt, PRICES, profit, quad, rented, RENT, THREE_PTS } from './physics'
import { Board } from './props'
import { Jet } from './water'
import { BASIN, P, SPOT } from './world'

type Sub = 'rent' | 'fit'
type V3 = [number, number, number]
const SUBS: Record<Sub, { name: string; title: string; button: string; say: string }> = {
  rent: { name: '租金定多少', title: '利润也是二次函数，顶点处最大', button: '算一算', say: `游船每船次成本 ${RENT.cost} 元。租金 ${RENT.base} 元时一天租出 ${RENT.n0} 船次，每涨 1 元少租 ${RENT.drop} 船次。租金定 p 元，一天的利润 W = (p − 20)(140 − 2p) = −2(p − 45)² + 1250：p = 45 元时最大，1250 元。40 元和 50 元时都是 1200 元。` },
  fit: { name: '三点定水柱', title: '不在一条直线上的三个点，确定一条抛物线', button: '求解析式', say: '量得水柱经过 (0, 0)、(1, 1.5)、(2, 2)。设 y = ax² + bx + c，代入三个点：c = 0，a + b = 1.5，4a + 2b = 2，解得 a = −0.5，b = 2。水柱是 y = −0.5x² + 2x，顶点 (2, 2)，落点 x = 4 m。' },
}
const ORDER: Sub[] = ['rent', 'fit']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))

const AR: Axes = { xr: [30, 60], yr: [0, 1400], xStep: 5, yStep: 200, sx: 0.2, sy: 0.003, minor: [1, 100], xName: 'p / 元', yName: 'W / 元', font: 0.17, pad: 0.3, padL: 0.8, tint: 'rgba(12,26,36,0.62)' }
const AF: Axes = { xr: [-0.5, 4.5], yr: [0, 2.6], xStep: 1, yStep: 0.5, sx: 1, sy: 1, minor: [0.5, 0.25], xName: 'x / m', yName: 'y / m', font: 0.15, pad: 0.25 }
const AZD = SPOT.dock.view[0], AZB = SPOT.basin.view[0]
const RB: V3 = [-3.2 - 30 * AR.sx, 0.75, 1.8]   // 租金图表板（数据原点）在码头局部坐标里的位置
export const OF: V3 = [P.basin[0] - 2, BASIN.water, P.basin[2]]
const [FA, FB, FC] = fit3(THREE_PTS)

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('rent')
  const [did, setDid] = useState<Sub[]>([])
  const T = useTasks('gewu:quadratic:x', TASKS)
  const on = did.includes(sub)
  const act = () => { if (on) return; const next = [...did, sub]; setDid(next); T.check(id => next.includes(id as Sub)) }
  const resetAll = () => { setSub('rent'); setDid([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '两个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }

  const WR = (p: V3) => toWorld(P.dock, AZD, p), WF = (p: V3) => toWorld(OF, AZB, p)
  const labels: Label[] = sub === 'rent'
    ? [...(on ? PRICES.map(p => ({ id: `p${p}`, at: WR([RB[0] + p * AR.sx, RB[1] + profit(p) * AR.sy + 0.12, RB[2] + 0.1]), ax: 0.5, className: `scene-tag -translate-y-full${p === 45 ? ' key' : ''}`, children: <>{p} 元 · {profit(p)} 元</> } satisfies Label)) : []),
      { id: 'nb', at: WR([-4, 2.4, -8.6]), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '出租的游船' }]
    : [...THREE_PTS.map(([x, y], i) => ({ id: `q${i}`, at: WF([x - 0.1, y + 0.08, 0.1]), ax: 1, className: 'scene-tag -translate-y-full', children: <>({fmt(x)}, {fmt(y)})</> } satisfies Label)),
      ...(on ? [{ id: 'ff', at: WF([3.3, quad(FA, FB, FC, 3.3) + 0.25, 0.1]), className: 'scene-tag key -translate-y-1/2', children: <span className="font-formula italic">y = −0.5x² + 2x</span> } satisfies Label] : [])]

  return (
    <LabShell title="二次函数" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={sub === 'rent'
        ? <At at="dock" labels={labels}><Local origin={P.dock} az={AZD}><group position={RB}><Board A={AR} lift={0.75} screen>
            {on && <>
              <Curve A={AR} f={profit} xr={[30, 60]} color="#ffd25a" width={0.04} />
              {PRICES.map(p => <Dot key={p} A={AR} x={p} y={profit(p)} r={0.08} color={p === 45 ? '#ff7a59' : '#ffd25a'} />)}
              <Dash A={AR} p={[45, 0]} q={[45, 1250]} width={0.02} gap={0.1} />
            </>}
          </Board></group></Local></At>
        : <At at="basinx" labels={labels}><Local origin={OF} az={AZB}>
            <Jet a={FA} h={-FB / (2 * FA)} k={FC - FB * FB / (4 * FA)} floor={0} n={320} thick={1.5} seed={9} />
            <group position-z={0.05}><Board A={AF} lift={0.05}>
              {THREE_PTS.map(([x, y]) => <Dot key={x} A={AF} x={x} y={y} r={0.07} />)}
              {on && <Curve A={AF} f={x => quad(FA, FB, FC, x)} xr={[0, 4]} color="#ffd25a" width={0.035} />}
            </Board></group>
          </Local></At>}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">两个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">求最值找顶点，求解析式代点：二次函数到处都用得上</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[21px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'rent' && <>
            <table className="mt-4 w-full text-[13.5px]">
              <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">租金 p / 元</th><th className="text-right font-normal">船次</th><th className="text-right font-normal">利润 W / 元</th></tr></thead>
              <tbody>{PRICES.map(p => <tr key={p} className="border-t border-white/12"><td className="py-1.5 tabular-nums">{p}</td><td className="text-right tabular-nums">{rented(p)}</td><td className={`text-right font-semibold tabular-nums ${p === 45 && on ? 'text-[#7fe3d4]' : ''}`}>{on ? profit(p) : '—'}</td></tr>)}</tbody>
            </table>
            <div className="mt-3 grid grid-cols-2 gap-2"><ParamTile symbol="成本" value={`${RENT.cost} 元`} unit="每船次" /><ParamTile symbol="最大利润" value={on ? `${profit(45)} 元` : '—'} unit="p = 45 元时" /></div>
          </>}
          {sub === 'fit' && <div className="mt-4 grid grid-cols-3 gap-2"><ParamTile symbol="a" value={on ? fmt(FA) : '?'} unit="" /><ParamTile symbol="b" value={on ? fmt(FB) : '?'} unit="" /><ParamTile symbol="c" value={on ? fmt(FC) : '?'} unit="" /></div>}
          {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={on}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
