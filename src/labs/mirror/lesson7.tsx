// 光的反射和平面镜 · 第 7 课 凹面镜 · 凸面镜（球面镜对光的作用和它们的用处，只定性）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Dark, Dot, Path, Ray, useEase, type V2 } from './optics'
import { CURVES, RAY_HS, R_CURVE, curveRay, type CurveKey } from './physics'
import { CurvedMirror, LightBox, Post, SolarCooker, StreetMirror } from './props'
import { Finale, Note, Readout } from './ui'
import { CM, ST, TOP } from './world'

const KEYS = Object.keys(CURVES) as CurveKey[]
const TASKS: Task[] = KEYS.flatMap(k => [
  { id: `rec:${k}`, text: `${CURVES[k].name}：让平行光射上去，记下反射光的去向`, note: `${CURVES[k].name}对光有${CURVES[k].act}作用：${CURVES[k].say}` },
  { id: `use:${k}`, text: `看看${CURVES[k].name}用在哪里`, note: CURVES[k].use },
])
// 镜面的顶点在 (X0, AY)；灯箱的前板在 SRC；反射光线画多长
const X0 = ST.curve, AY = TOP + 0.85, SRC = X0 - 1.8, LOUT = { concave: 1.3, convex: 1.05 }
const P = (p: V2): V2 => [X0 + p[0] * CM, AY + p[1] * CM]

export default function Lesson7() {
  const [kind, setKind] = useState<CurveKey>('concave')
  const [on, setOn] = useState(false)
  const [show, setShow] = useState(false)
  const [rows, setRows] = useState<string[]>([])
  const [shot, setShot] = useState(0)       // 每开一次灯、换一次镜子加一：光路重新画一遍
  const T = useTasks('gewu:mirror:7', TASKS)
  const sk = useEase(shot, 1.3), k = on ? Math.max(0, Math.min(1, sk - (shot - 1))) : 0, uk = useEase(show ? 1 : 0, 0.8)
  const c = CURVES[kind], rays = RAY_HS.map(h => curveRay(kind, h)), drawn = on && k >= 1
  const mark = (id: string) => { if (rows.includes(id)) return; const next = [...rows, id]; setRows(next); T.check(x => next.includes(x)) }
  const light = () => { setOn(!on); if (!on) setShot(n => n + 1) }
  const pick = (v: CurveKey) => { if (v === kind) return; setKind(v); setShow(false); setShot(n => n + 1) }
  const resetAll = () => { setKind('concave'); setOn(false); setShow(false); setRows([]); T.reset() }
  const task = T.current, [what, want] = (task?.id ?? ':').split(':') as ['rec' | 'use', CurveKey]
  const { hint, next }: { hint: string; next: 'kind' | 'on' | 'record' | 'use' | null } = !task ? { hint: '都看完了。凹面镜使光会聚，凸面镜使光发散。', next: null }
    : kind !== want ? { hint: `换成“${CURVES[want].name}”`, next: 'kind' }
    : !on ? { hint: '按“打开平行光源”', next: 'on' }
    : !drawn ? { hint: '光射过来了…', next: null }
    : what === 'rec' ? { hint: `看反射光线是聚拢还是散开，按“记录”`, next: 'record' } : { hint: '按“看它用在哪”', next: 'use' }
  // 反射光线（或反向延长线）和主轴的交点：取靠近主轴的那两条
  const focus: V2 = P([curveRay(kind, RAY_HS[1]).cross ?? 0, 0])
  const labels: Label[] = [
    { id: 'f', at: [focus[0], focus[1] - 0.08, 0.1], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: drawn ? 1 : 0 }, children: kind === 'concave' ? '光会聚到这里' : '反向延长线交在镜后' },
    { id: 'm', at: [X0 + 0.05, AY + 0.56, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: c.name },
    { id: 'b', at: [SRC - 0.3, AY + 0.6, 0.2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '平行光源' },
    ...(uk >= 1 ? [{ id: 'u', at: [X0 + 1.3, TOP + (kind === 'concave' ? 0.95 : 1.4), 0] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: c.use }] : []),
  ]

  return (
    <LabShell title={TITLE} lessons={LESSONS} current="7" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={c.name}
      stage={<Dark at="curve" labels={labels}>
        <Post x={SRC - 0.29} z={-0.36} y={AY + 0.06} />
        <LightBox at={[SRC, AY]} dir={[1, 0]} w={0.95} slits={RAY_HS.map(h => h * CM)} on={on} />
        <CurvedMirror x={X0} y={AY} kind={kind} R={R_CURVE * CM} A={0.44} />
        <Ray a={[SRC, AY]} b={[X0 + (kind === 'convex' ? 0.72 : 0), AY]} color="#8a96a2" r={0.0035} dash z={-0.02} />
        {on && rays.map((r, j) => {
          const hit = P(r.hit), L = LOUT[kind]
          return <group key={j}>
            <Path pts={[[SRC, hit[1]], hit, [hit[0] + r.out[0] * L, hit[1] + r.out[1] * L]]} k={k} r={0.008} />
            {drawn && kind === 'convex' && r.cross != null && <Ray a={hit} b={P([r.cross, 0])} r={0.006} dash />}
          </group>
        })}
        {drawn && <Dot at={focus} r={0.02} color="#ffffff" z={0.012} />}
        {uk > 0 && <group position={[X0 + 1.3, TOP * (1 - uk * (kind === 'concave' ? 1.5 : 1)), 0]} scale={uk * (kind === 'concave' ? 1.5 : 1)}>{kind === 'concave' ? <SolarCooker x={0} /> : <StreetMirror x={0} />}</group>}
      </Dark>}
      lesson={<LessonBlock no="7" title="凹面镜 · 凸面镜" concept="凹面镜使光会聚，凸面镜使光发散" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>反射面是球面一部分的镜子叫球面镜。用球面的里面反射的是<b className="text-white">凹面镜</b>，用外面反射的是<b className="text-white">凸面镜</b>。</p>
          <ul className="mt-3 flex flex-col gap-2 text-[14px] text-white/80">{KEYS.map(v => <li key={v}><b className="text-[#7fe3d4]">{CURVES[v].name}：</b>对光有{CURVES[v].act}作用。{CURVES[v].useSay}</li>)}</ul>
          <p className="mt-3 text-[13.5px] text-white/65">球面上每一小块都可以看成一面小平面镜，每条光线照样遵守反射定律；镜面是弯的，各处的法线方向不同，所以平行光反射后不再平行。图里的光路是按反射定律一条一条算出来的。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两种镜子都看过了" title="凹面镜使光会聚，凸面镜使光发散" onClose={() => T.setFinale(false)}>太阳灶靠凹面镜把光聚到一处；街角的反光镜靠凸面镜照到更大的范围。</Finale>}
      panel={
        <Glass className="px-4 py-4">
          <Readout label={`${c.name} · 对光的作用`} value={drawn ? c.act : '…'} text />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="入射光" value={on ? `${RAY_HS.length} 条` : '—'} unit="平行于主轴" />
            <ParamTile symbol="反射光" value={drawn ? (kind === 'concave' ? '聚拢' : '散开') : '—'} unit={kind === 'concave' ? '相交在镜前' : '反向延长才相交'} />
          </div>
          {rows.includes(`rec:${kind}`) && <Note>{c.say}。</Note>}
          {show && <Note><b className="text-white">{c.use}：</b>{c.useSay}。</Note>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'on'} onClick={light}>{on ? '关掉平行光源' : '打开平行光源'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={() => mark(`rec:${kind}`)} disabled={!drawn || rows.includes(`rec:${kind}`)}>记录</LabButton>
        <LabButton pulse={next === 'use'} onClick={() => { setShow(true); mark(`use:${kind}`) }} disabled={show}>看它用在哪</LabButton>
      </>}
      extras={<Control label="镜子"><Segmented label="镜子" pulse={next === 'kind'} want={next === 'kind' ? want : null} value={kind} onChange={pick} options={KEYS.map(v => ({ value: v, label: CURVES[v].name }))} /></Control>}
    />
  )
}
