// 光的反射和平面镜 · 第 5 课 画出像（平面镜成像的原理和作图）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Arc, Candle, Dark, Dot, Eye, Path, Ray, useEase, type V2 } from './optics'
import { DRAW_US, angleTo, hitHeight, imageDistance, mirrorPoint } from './physics'
import { UprightMirror } from './props'
import { Finale, Note, Readout } from './ui'
import { CM, ST, TOP } from './world'

type U = '8' | '14'
const STEPS = ['画第一条光线', '画第二条光线', '把反射光线反向延长'] as const
const TASKS: Task[] = [
  { id: 'r1', text: '从烛焰上的一点 S 画一条射向镜面的光线，和它的反射光线', note: '反射角等于入射角：反射光线射进了眼睛' },
  { id: 'r2', text: '再从 S 画一条方向不同的光线', note: '两条反射光线是散开的，它们本身不会相交' },
  { id: 'ext', text: '把两条反射光线反向延长，找到交点 S′', note: '眼睛顺着光射来的方向看过去，觉得光是从镜后的 S′ 发出的：S′ 就是 S 的像' },
  { id: 'far', text: `把蜡烛移到离镜面 ${DRAW_US[1]} cm 处，再画一遍`, note: `像也退到镜后 ${imageDistance(DRAW_US[1])} cm：像和物体到镜面的距离总相等` },
]
// 镜面在 X0，镜子的下沿在 MY；蜡烛连火焰高 7 cm；眼睛在左上方，两条反射光线分别射到瞳孔的上下两边
const X0 = ST.draw, MY = TOP + 0.06, MH = 1.3, CH = 7 * CM, BASE = TOP + 0.04, RAD = Math.PI / 180
const EYE: V2 = [X0 - 1.5, TOP + 1.08], AIMS: V2[] = [[EYE[0] + 0.1, EYE[1] + 0.06], [EYE[0] + 0.1, EYE[1] - 0.07]]
const TINT = ['#ffd24a', '#ff8fb3']
/** 从 from 看 to 的方向（0 到 360 度） */
const deg = (from: V2, to: V2) => (Math.atan2(to[1] - from[1], to[0] - from[0]) / RAD + 360) % 360

export default function Lesson5() {
  const [us, setUs] = useState<U>('8')
  const [n, setN] = useState(0)
  const T = useTasks('gewu:mirror:5', TASKS)
  const u = useEase(Number(us), 0.9), steady = Math.abs(u - Number(us)) < 0.02, p = useEase(n, 0.9)
  const part = (j: number) => Math.max(0, Math.min(1, p - j))
  // 物点 S、像点 S′、两条光线在镜面上的落点
  const S: V2 = [X0 - u * CM, BASE + CH - 0.012], I = mirrorPoint(S, X0)
  const M: V2[] = AIMS.map(a => [X0, hitHeight([S[0] - X0, S[1]], [a[0] - X0, a[1]])])
  const inc = angleTo([M[0][0] - S[0], M[0][1] - S[1]], [1, 0]), ref = angleTo([AIMS[0][0] - M[0][0], AIMS[0][1] - M[0][1]], [1, 0])
  const go = () => { if (n >= 3 || !steady) return; const k = n + 1; setN(k); T.check(id => (id === 'r1' && k >= 1) || (id === 'r2' && k >= 2) || (id === 'ext' && k >= 3) || (id === 'far' && k >= 3 && us === '14')) }
  const pick = (k: U) => { if (k === us) return; setUs(k); setN(0) }
  const resetAll = () => { setUs('8'); setN(0); T.reset() }
  const task = T.current, full = n >= 3 && part(2) >= 1
  const { hint, next }: { hint: string; next: 'u' | 'go' | null } = !task ? { hint: '画完了。像点是反射光线反向延长线的交点，和物点关于镜面对称。', next: null }
    : task.id === 'far' && us !== '14' ? { hint: `把蜡烛移到离镜面 ${DRAW_US[1]} cm 处`, next: 'u' }
    : !steady ? { hint: '蜡烛在移…', next: null } : n < 3 ? { hint: `按“${STEPS[n]}”`, next: 'go' } : { hint: '两条虚线交在镜后的 S′', next: null }
  const labels: Label[] = [
    { id: 's', at: [S[0] - 0.08, S[1] + 0.06, 0.1], ax: 1, className: 'scene-name -translate-y-full', children: 'S' },
    { id: 'e', at: [EYE[0], EYE[1] + 0.16, 0.1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '眼睛' },
    { id: 'm', at: [X0 + 0.1, MY + MH + 0.06, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '平面镜' },
    { id: 'i', at: [X0 - 0.36, M[0][1] - 0.02, 0.1], ax: 1, className: 'scene-tag transition-opacity', style: { opacity: part(0) >= 1 && n === 1 ? 1 : 0 }, children: <><small>入射角</small>{inc.toFixed(0)}°<small className="ml-2">反射角</small>{ref.toFixed(0)}°</> },
    { id: 'i2', at: [I[0] + 0.08, I[1] + 0.06, 0.1], className: 'scene-name -translate-y-full transition-opacity', style: { opacity: full ? 1 : 0 }, children: 'S′（像）' },
    { id: 'u', at: [(S[0] + X0) / 2, TOP + 0.16, 0.42], ax: 0.5, className: 'scene-tag', children: <><small>物距</small>{u.toFixed(0)} cm</> },
    { id: 'v', at: [(I[0] + X0) / 2 + 0.1, TOP + 0.16, 0.42], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: full ? 1 : 0 }, children: <><small>像距</small>{imageDistance(u).toFixed(0)} cm</> },
  ]

  return (
    <LabShell title={TITLE} lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="光路图"
      stage={<Dark at="draw" labels={labels}>
        <UprightMirror x={X0} y={MY} h={MH} d={0.8} />
        <Candle x={S[0]} y={BASE} h={CH} />
        <Eye at={EYE} look={[M[0][0] - EYE[0], (M[0][1] + M[1][1]) / 2 - EYE[1]]} r={0.11} />
        <Dot at={S} r={0.014} z={0.03} />
        {[0, 1].map(j => part(j) > 0 && <group key={j}>
          <Path pts={[S, M[j], AIMS[j]]} k={part(j)} color={TINT[j]} r={0.007} z={0.02 + j * 0.004} />
          {/* 落点处的法线：垂直于镜面的一小段虚线 */}
          {part(j) > 0.5 && <Ray a={M[j]} b={[M[j][0] - 0.42, M[j][1]]} color="#c9d2da" r={0.005} dash z={0.02} />}
          {part(j) >= 1 && <><Arc at={M[j]} from={180} to={deg(M[j], S)} r={0.2} z={0.022} /><Arc at={M[j]} from={180} to={deg(M[j], AIMS[j])} r={0.24} color="#7fe3d4" z={0.022} /></>}
          {part(2) > 0 && <Ray a={M[j]} b={[M[j][0] + (I[0] - M[j][0]) * part(2), M[j][1] + (I[1] - M[j][1]) * part(2)]} color={TINT[j]} r={0.007} dash z={0.02} />}
        </group>)}
        {full && <>
          {/* 镜后的像：光并没有真的到过那里，所以画成淡淡的 */}
          <Candle x={I[0]} y={BASE} h={CH} image tint="#a9d2ff" />
          <Dot at={I} r={0.014} color="#a9d2ff" z={0.03} />
          <Ray a={[S[0], BASE + 0.1]} b={[I[0], BASE + 0.1]} color="#8a96a2" r={0.004} dash z={0.3} />
        </>}
      </Dark>}
      lesson={<LessonBlock no="5" title="画出像" concept="像点是反射光线反向延长线的交点" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>烛焰上的一点 S 向四面八方发光。射到镜面上的光被反射，反射光线是散开的；它们的<b className="text-white">反向延长线</b>交于镜后的一点 S′。</p>
          <p className="mt-3">人眼总以为光是沿直线射来的，所以觉得光是从 S′ 发出的：S′ 就是 S 在镜中的<b className="text-white">像</b>。镜子后面并没有光真的经过那里，所以它是<b className="text-white">虚像</b>，反向延长线也要画成虚线。</p>
          <p className="mt-3 text-[13.5px] text-white/65">作图时更快的办法：利用对称。过 S 作镜面的垂线，在镜后取等距的一点，就是 S′；物体上每一点都这样找，连起来就是整个像。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两个位置都画过了" title="像点是反射光线反向延长线的交点" onClose={() => T.setFinale(false)}>光没有真的到过镜子后面，所以是虚像；它和物点关于镜面对称。</Finale>}
      panel={
        <Glass className="px-4 py-4">
          <Readout label={`蜡烛离镜面 ${Number(us)} cm · 像在哪里`} value={full ? `镜后 ${imageDistance(Number(us))} cm` : n ? `画了 ${Math.min(n, 2)} 条光线` : '还没画'} text />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="物距" value={`${Number(us)} cm`} unit="S 到镜面" />
            <ParamTile symbol="像距" value={full ? `${imageDistance(Number(us))} cm` : '—'} unit="S′ 到镜面" />
          </div>
          {n >= 1 && <Note>第一条光线：入射角 {inc.toFixed(0)}°，反射角 {ref.toFixed(0)}°。</Note>}
          {full && <Note>虚线不是光线：镜子后面没有光。S 和 S′ 的连线与镜面垂直，到镜面的距离相等。</Note>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={go} disabled={n >= 3 || !steady}>{STEPS[Math.min(n, 2)]}</LabButton>
        <LabButton onClick={() => setN(0)} disabled={n === 0}>擦掉重画</LabButton>
      </>}
      extras={<Control label="蜡烛到镜面"><Segmented label="蜡烛到镜面" pulse={next === 'u'} want={next === 'u' ? '14' : null} value={us} onChange={pick} options={DRAW_US.map(x => ({ value: String(x) as U, label: `${x} cm` }))} /></Control>}
    />
  )
}
