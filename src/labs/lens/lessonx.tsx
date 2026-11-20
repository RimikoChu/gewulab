// 光的折射和凸透镜成像 · 拓展课：三个小专题。白光里藏着颜色（色散）、看见不存在的湖（海市蜃楼）、镜头怎样把远处拉近（变焦）。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import Bench, { benchAt } from './bench'
import { LESSONS, goLesson } from './lessons'
import { Dark, Ray } from './optics'
import { ZOOM, imageDistance, magnify } from './physics'
import { AXIS, ST, TOP } from './world'

type Sub = 'prism' | 'mirage' | 'zoom'
const SUBS: Record<Sub, { name: string; title: string; say: string; button: string }> = {
  prism: { name: '白光里藏着颜色', title: '白光是由各种色光混合成的', button: '让白光穿过三棱镜', say: '太阳光通过三棱镜后，分成红、橙、黄、绿、蓝、靛、紫的色带，这叫光的色散。不同颜色的光通过玻璃时偏折的程度不一样：红光偏得最少，紫光偏得最多。彩虹就是雨后空中的小水珠做的色散。' },
  mirage: { name: '看见不存在的湖', title: '空气不均匀，光就一路弯着走', button: '加热地面', say: '夏天的路面、沙漠的地表很烫，贴近地面的空气比上面的稀。远处景物射来的光经过这样的空气，一路发生折射，弯成一条向上的弧线射进眼睛。人顺着光射来的方向看过去，就像地上有一片水映着天空。' },
  zoom: { name: '镜头怎样把远处拉近', title: '焦距越长，同一个物体的像越大', button: '把焦距拉长', say: `物体在 ${ZOOM.u} cm 处不动。焦距 ${ZOOM.f[0]} cm 时，像是物体的 ${magnify(ZOOM.u, ZOOM.f[0]).toFixed(1)} 倍；把焦距拉到 ${ZOOM.f[1]} cm，像变成 ${magnify(ZOOM.u, ZOOM.f[1]).toFixed(1)} 倍。相机的“变焦”就是改变镜头的焦距，像距也要跟着变，所以镜头会伸出来。` },
}
const ORDER: Sub[] = ['prism', 'mirage', 'zoom']
const TASKS: Task[] = ORDER.map(k => ({ id: k, text: `${SUBS[k].name}：按“${SUBS[k].button}”`, note: SUBS[k].title }))
const COLORS = ['#ff4a3a', '#ff8a2a', '#ffd92a', '#4ad24a', '#3aa0ff', '#4a5aff', '#a04aff'], NAMES = '红橙黄绿蓝靛紫'
const PX = ST.tank, PY = AXIS
// 海市蜃楼的摆法：地面的高度、树梢和眼睛的位置；光线画成一条抛物线，最低处离地面一点点
const GY = TOP + 0.1, TREE: [number, number] = [PX + 1.35, GY + 0.95], EYE_AT: [number, number] = [PX - 1.35, GY + 0.5], LOW = GY + 0.05
const CY = 2 * LOW - (TREE[1] + EYE_AT[1]) / 2
/** 弯着走的那条光线：t = 0 在树梢，t = 1 在眼睛 */
const bend = (t: number): [number, number] => [TREE[0] + (EYE_AT[0] - TREE[0]) * t, (1 - t) ** 2 * TREE[1] + 2 * t * (1 - t) * CY + t * t * EYE_AT[1]]
/** 光线射进眼睛时的斜率：人顺着这个方向反着看过去 */
const SLOPE = (2 * (EYE_AT[1] - CY)) / (EYE_AT[0] - TREE[0])

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('prism')
  const [did, setDid] = useState<Sub[]>([])
  const T = useTasks('gewu:lens:x', TASKS)
  const on = did.includes(sub), f = sub === 'zoom' && on ? ZOOM.f[1] : ZOOM.f[0]
  const act = () => { if (on) return; const next = [...did, sub]; setDid(next); T.check(id => next.includes(id as Sub)) }
  const resetAll = () => { setSub('prism'); setDid([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const zl: Label[] = [{ id: 'f', at: benchAt(0, 9.5), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>焦距</small>{f} cm</> }, { id: 'm', at: benchAt(imageDistance(ZOOM.u, f) * 0.56, -16.6), ax: 0.5, className: 'scene-tag', children: <><small>像是物体的</small>{magnify(ZOOM.u, f).toFixed(1)} 倍</> }]
  const panel = (
    <Glass className="px-4 py-4">
      <div className="text-center">
        <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
        <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
      </div>
      {sub === 'zoom' && <div className="mt-4 grid grid-cols-2 gap-2">
        <ParamTile symbol="f" value={`${f} cm`} unit="焦距" />
        <ParamTile symbol="像的大小" value={`${magnify(ZOOM.u, f).toFixed(1)} 倍`} unit={`物距 ${ZOOM.u} cm 不变`} />
      </div>}
      {sub === 'prism' && on && <div className="row-in mt-4 flex overflow-hidden rounded-lg">{COLORS.map((c, i) => <span key={c} className="flex-1 py-2 text-center text-[13px] font-semibold text-black/75" style={{ background: c }}>{NAMES[i]}</span>)}</div>}
      {on && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
    </Glass>
  )
  const stage = sub === 'zoom' ? <Bench u={ZOOM.u} f={f} k={0.56} image rays={2} labels={zl} /> : (
    <Dark at="tank" labels={sub === 'prism' ? [{ id: 'p', at: [PX, PY + 0.75, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '三棱镜' }] : [{ id: 'g', at: [PX + 0.3, GY - 0.1, 0.34], ax: 0.5, className: 'scene-name', name: true, children: on ? '很烫的地面：贴地的空气稀' : '地面' }, { id: 'e', at: [EYE_AT[0], EYE_AT[1] + 0.14, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '眼睛' }, ...(on ? [{ id: 'm', at: [EYE_AT[0] + (GY - EYE_AT[1]) / SLOPE, GY + 0.02, 0.34] as [number, number, number], ax: 0.5, className: 'scene-tag key -translate-y-full', children: '看上去像这里有一片水' }] : [])]}>
      {sub === 'prism' ? <>
        <mesh position={[PX, PY, 0]} rotation-x={Math.PI / 2} rotation-y={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 0.4, 3]} /><meshStandardMaterial color="#cfe6ee" transparent opacity={0.3} roughness={0.05} depthWrite={false} /></mesh>
        <Ray a={[PX - 1.5, PY - 0.25]} b={[PX - 0.28, PY + 0.08]} color="#ffffff" r={0.014} />
        {on ? COLORS.map((c, i) => <group key={c}><Ray a={[PX - 0.28, PY + 0.08]} b={[PX + 0.3, PY + 0.06 - i * 0.012]} color={c} r={0.006} /><Ray a={[PX + 0.3, PY + 0.06 - i * 0.012]} b={[PX + 1.5, PY - 0.2 - i * 0.085]} color={c} r={0.012} /></group>) : null}
      </> : <>
        {/* 一条路面，右边远处一棵树，左边是眼睛 */}
        <mesh position={[PX, GY - 0.03, 0]}><boxGeometry args={[3.2, 0.06, 0.6]} /><meshStandardMaterial color={on ? '#8a4a2c' : '#4a4a48'} roughness={1} emissive={on ? '#7a2a10' : '#000000'} emissiveIntensity={on ? 0.5 : 0} /></mesh>
        <mesh position={[TREE[0], GY + 0.1, 0]}><cylinderGeometry args={[0.03, 0.04, 0.2, 8]} /><meshStandardMaterial color="#6b5236" /></mesh>
        <mesh position={[TREE[0], GY + (TREE[1] - GY + 0.2) / 2, 0]}><coneGeometry args={[0.2, TREE[1] - GY - 0.2, 10]} /><meshStandardMaterial color="#3f8a45" flatShading /></mesh>
        <mesh position={[EYE_AT[0], EYE_AT[1], 0]}><sphereGeometry args={[0.08, 16, 12]} /><meshStandardMaterial color="#f3e6da" roughness={0.6} /></mesh>
        <mesh position={[EYE_AT[0] + 0.07, EYE_AT[1], 0]}><sphereGeometry args={[0.03, 12, 8]} /><meshStandardMaterial color="#30343a" /></mesh>
        {on
          ? <>{Array.from({ length: 16 }, (_, i) => <Ray key={i} a={bend(i / 16)} b={bend((i + 1) / 16)} />)}<Ray a={EYE_AT} b={[EYE_AT[0] + (GY - EYE_AT[1]) / SLOPE, GY]} dash color="#9fd8ff" /></>
          : <Ray a={TREE} b={EYE_AT} />}
      </>}
    </Dark>
  )

  return (
    <LabShell title="折射和凸透镜" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={stage}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">彩虹、蜃景、变焦镜头，都是光在拐弯</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={panel}
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={on}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
