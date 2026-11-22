// 光的反射和平面镜 · 拓展课：三个小专题。日食和月食（光沿直线传播）、夹角镜里的许多个像（万花筒）、角反射器（自行车尾灯）。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Beam, Dark, Laser, Path, useEase, type V2 } from './optics'
import { RETRO_IN, WEDGES, imageCount, reflect, retro, wedgeImages } from './physics'
import { CornerMirrors, HingedMirrors, Orrery, Pawn, Post } from './props'
import { Finale, Note, Readout } from './ui'
import { ST, TOP } from './world'

type Sub = 'eclipse' | 'wedge' | 'corner'
const SUBS: Record<Sub, { name: string; title: string; say: string }> = {
  eclipse: { name: '日食和月食', title: '影子落在谁身上，谁那里就“食”', say: '光沿直线传播，不透明的物体背后就有影子。月球转到太阳和地球之间，它的影子落在地球上，影子里的人看不到太阳，这是日食；月球转到地球背后，进了地球的影子，照不到太阳光，这是月食。' },
  wedge: { name: '夹角镜', title: '两面镜子夹得越小，像越多', say: `两面平面镜夹成一个角，镜子里的像又会被另一面镜子再照一次。夹角 ${WEDGES[0]}° 时能看到 ${imageCount(WEDGES[0])} 个像，${WEDGES[1]}° 时是 ${imageCount(WEDGES[1])} 个。万花筒里是三面镜子围成一圈，几片碎彩纸就变出满眼的花。` },
  corner: { name: '角反射器', title: '两面互相垂直的镜子把光原路送回', say: '光先后被两面互相垂直的镜子各反射一次，射出去的方向正好和射来的方向相反，不管它从哪个角度来。自行车的尾灯里排满了这样的小直角，后面汽车的灯光照上去，会被送回司机眼里。' },
}
const ORDER: Sub[] = ['eclipse', 'wedge', 'corner']
const BUTTON: Record<Sub, string[]> = { eclipse: ['把月球转到太阳和地球之间', '再把月球转到地球背后', '回到开头'], wedge: [`把夹角收到 ${WEDGES[1]}°`, `张开到 ${WEDGES[0]}°`], corner: ['射一束光进去', '换一个角度再射'] }
const TASKS: Task[] = [
  { id: 'eclipse', text: '日食和月食：把月球转到两个位置各看一看', note: '影子是光沿直线传播造成的' },
  { id: 'wedge', text: `夹角镜：把夹角从 ${WEDGES[0]}° 收到 ${WEDGES[1]}°，数一数像`, note: `${imageCount(WEDGES[0])} 个变成 ${imageCount(WEDGES[1])} 个` },
  { id: 'corner', text: '角反射器：射一束光进去，看它从哪儿出来', note: '反射回来的光和射来的光平行、方向相反' },
]
const X0 = ST.extra, AY = TOP + 0.85, RAD = Math.PI / 180
// 日食模型：太阳、地球的位置，月球轨道的半径；月球转到的三个位置（度）
const SUN: V2 = [X0 - 1.5, AY], EARTH: V2 = [X0 + 0.85, AY], ORBIT = 0.58, MOON_AT = [90, 0, 180]
// 夹角镜：顶点的位置、棋子离顶点多远
const VX = X0, VZ = -0.5, PR = 0.52
// 角反射器：拐角的位置，光射到平放的那面镜子上离拐角多远
const CORNER: V2 = [X0 + 0.65, TOP + 0.3], REACH = 0.46

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('eclipse')
  const [step, setStep] = useState<Record<Sub, number>>({ eclipse: 0, wedge: 0, corner: 0 })
  const T = useTasks('gewu:mirror:x', TASKS)
  const n = step[sub]
  const moon = useEase(MOON_AT[step.eclipse], 1.8), alpha = useEase(WEDGES[step.wedge], 1.4), shot = useEase(step.corner, 1.4)
  const act = () => {
    const k = sub === 'eclipse' ? (n + 1) % 3 : sub === 'wedge' ? 1 - n : n + 1
    setStep({ ...step, [sub]: k })
    if ((sub === 'eclipse' && k === 2) || (sub === 'wedge' && k === 1) || sub === 'corner') T.check(id => id === sub)
  }
  const resetAll = () => { setSub('eclipse'); setStep({ eclipse: 0, wedge: 0, corner: 0 }); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${BUTTON[sub][Math.min(n, BUTTON[sub].length - 1)]}”`, next: 'act' }
  // 日食：月球现在在不在太阳和地球的连线上
  const mx = EARTH[0] - Math.cos(moon * RAD) * ORBIT, solar = Math.abs(moon) < 2, lunar = Math.abs(moon - 180) < 2
  // 夹角镜：夹角停稳了才摆出像
  const still = Math.abs(alpha - WEDGES[step.wedge]) < 0.01, half = alpha / 2 * RAD
  const images = still ? wedgeImages(WEDGES[step.wedge] / 2, WEDGES[step.wedge]) : []
  const spot = (a: number): [number, number] => { const f = -half + a * RAD; return [VX + Math.sin(f) * PR, VZ + Math.cos(f) * PR] }
  // 角反射器：光线依次经过的四个点
  const inc = RETRO_IN[step.corner === 0 ? 0 : (step.corner - 1) % 2] * RAD, d: V2 = [Math.sin(inc), -Math.cos(inc)], r1 = reflect(d, [0, 1]), out = retro(d)
  const p1: V2 = [CORNER[0] - REACH, CORNER[1]], p2: V2 = [CORNER[0], CORNER[1] + r1[1] * REACH / r1[0]], p0: V2 = [p1[0] - d[0] * 1.15, p1[1] - d[1] * 1.15], p3: V2 = [p2[0] + out[0] * 1.3, p2[1] + out[1] * 1.3]
  const ck = step.corner === 0 ? 0 : Math.max(0, Math.min(1, shot - (step.corner - 1)))

  const labels: Label[] = sub === 'eclipse' ? [
    { id: 's', at: [SUN[0], SUN[1] + 0.34, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '太阳（一盏灯）' },
    { id: 'e', at: [EARTH[0], EARTH[1] + 0.3, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '地球' },
    { id: 'k', at: [solar ? mx : EARTH[0] + ORBIT, AY - 0.42, 0.2], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: solar || lunar ? 1 : 0 }, children: solar ? '日食：月球的影子落在地球上' : '月食：月球进了地球的影子' },
  ] : sub === 'wedge' ? [
    { id: 'a', at: [VX, TOP + 0.45, VZ - 0.1], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>夹角</small>{alpha.toFixed(0)}°</> },
    { id: 'c', at: [VX, TOP + 0.02, VZ + PR + 0.42], ax: 0.5, className: 'scene-tag key transition-opacity', style: { opacity: still ? 1 : 0 }, children: <>能看到 {imageCount(WEDGES[step.wedge])} 个像</> },
    { id: 'o', at: [VX, TOP + 0.34, VZ + PR], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '棋子' },
  ] : [
    { id: 'k', at: [(p0[0] + p3[0]) / 2 - 0.5, (p0[1] + p3[1]) / 2 + 0.2, 0.1], ax: 1, className: 'scene-tag key transition-opacity', style: { opacity: ck >= 1 ? 1 : 0 }, children: '射出的光和射来的光平行' },
    { id: 'm', at: [CORNER[0] + 0.12, CORNER[1] + 1.3, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '两面互相垂直的镜子' },
  ]
  const stage = sub === 'eclipse' ? (
    <Dark at="extra" labels={labels}>
      <Orrery sun={SUN} earth={EARTH} angle={moon} orbit={ORBIT} />
      {/* 太阳射向地球的那一片光；地球背后、月球背后各拖着一条影子 */}
      <Beam pts={[[SUN[0] + 0.25, AY + 0.1], [EARTH[0] + 1.1, AY + 0.34], [EARTH[0] + 1.1, AY - 0.34], [SUN[0] + 0.25, AY - 0.1]]} opacity={0.11} z={-0.03} />
      <mesh position={[EARTH[0] + 0.56, AY, -0.02]} renderOrder={6}><planeGeometry args={[1.1, 0.4]} /><meshBasicMaterial color="#05070a" transparent opacity={0.8} depthWrite={false} /></mesh>
      {solar && <mesh position={[(mx + EARTH[0] - 0.2) / 2, AY, -0.02]} renderOrder={6}><planeGeometry args={[EARTH[0] - 0.2 - mx, 0.1]} /><meshBasicMaterial color="#05070a" transparent opacity={0.85} depthWrite={false} /></mesh>}
    </Dark>
  ) : sub === 'wedge' ? (
    <Dark at="extraTop" labels={labels}>
      <HingedMirrors x={VX} z={VZ} alpha={alpha} len={0.95} h={0.42} />
      <Pawn x={VX} z={VZ + PR} />
      {images.map(m => { const [x, z] = spot(m.a); return <Pawn key={m.a} x={x} z={z} ghost /> })}
    </Dark>
  ) : (
    <Dark at="extra" labels={labels}>
      <CornerMirrors x={CORNER[0]} y={CORNER[1]} len={1.3} d={0.5} />
      <Post x={p0[0] - d[0] * 0.26} z={-0.1} y={p0[1] - d[1] * 0.26 + 0.04} />
      <Laser tip={p0} dir={d} on={step.corner > 0} />
      {ck > 0 && <Path pts={[p0, p1, p2, p3]} k={ck} r={0.008} />}
    </Dark>
  )

  return (
    <LabShell title={TITLE} lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={stage}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && <Finale kicker="三个专题都看完了" title="影子、万花筒、自行车尾灯，都是光走直线和反射" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <Readout label={SUBS[sub].name} value={SUBS[sub].title} text />
          {sub === 'wedge' && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="夹角" value={`${alpha.toFixed(0)}°`} unit="两面镜子之间" />
            <ParamTile symbol="像" value={still ? `${imageCount(WEDGES[step.wedge])} 个` : '—'} unit="镜子里的棋子" />
          </div>}
          {sub === 'corner' && step.corner > 0 && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="射来" value={`${(inc / RAD).toFixed(0)}°`} unit="和竖直方向的夹角" />
            <ParamTile symbol="射回" value={`${(Math.atan2(-out[0], out[1]) / RAD).toFixed(0)}°`} unit="和竖直方向的夹角" />
          </div>}
          {n > 0 && <Note>{SUBS[sub].say}</Note>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act}>{BUTTON[sub][Math.min(n, BUTTON[sub].length - 1)]}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
