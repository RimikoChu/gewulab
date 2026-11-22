// 光的反射和平面镜 · 第 4 课 镜中的像（探究平面镜成像的特点）
// 玻璃板里的像是真的按镜面对称画出来的：蜡烛 A 关于玻璃板对称的那一份放在板后，只有透过玻璃板才看得见（见 optics.tsx 的 Mirrored）。
import { useEffect, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Candle, Dark, Mirrored, useEase } from './optics'
import { PLATE_US, imageDistance } from './physics'
import { GlassPlate, GridPaper, Ruler } from './props'
import { DataTable, Finale, Readout } from './ui'
import { CM, ST, TOP, VIEWS } from './world'

type U = '6' | '9' | '12'
const TASKS: Task[] = [
  ...PLATE_US.map((u, n) => ({ id: String(u), text: `蜡烛 A 离玻璃板 ${u} cm：移动蜡烛 B，让它和 A 的像重合，记下来`, note: n === 0 ? `B 和像完全重合：像和物体一样大。像距 ${imageDistance(u)} cm，等于物距` : `像距 ${imageDistance(u)} cm，还是等于物距；连线和玻璃板垂直` })),
  { id: 'card', text: '在像的位置放一张白纸，绕过玻璃板直接看它', note: '白纸上没有像：平面镜成的是虚像' },
]
// 玻璃板立在 X0，前后从 Z0 到 Z1，高 PH；蜡烛连火焰高 8 cm。三个物距各用方格纸上的一行（前后错开），记下的点才不会叠在一起
const X0 = ST.plate, Z0 = -0.85, Z1 = 0.85, PH = 1.0, CH = 8 * CM, BASE = TOP + 0.04, PARK = 19
const LANE: Record<U, number> = { '6': 0.3, '9': 0, '12': -0.3 }
const X = (cm: number) => X0 + cm * CM

export default function Lesson4() {
  const [us, setUs] = useState<U>('6')
  const [find, setFind] = useState(false)
  const [card, setCard] = useState(false)
  const [rows, setRows] = useState<U[]>([])
  const T = useTasks('gewu:mirror:4', TASKS)
  const u = useEase(Number(us), 0.9), z = useEase(LANE[us], 0.9), steady = Math.abs(u - Number(us)) < 0.02
  const v = imageDistance(u), goal = find && !card ? Number(us) : PARK, bx = useEase(goal, 1.3), found = find && !card && steady && Math.abs(bx - v) < 0.02
  const ck = useEase(card ? 1 : 0, 1.5), dup = rows.includes(us)
  useEffect(() => { if (card && ck >= 1) T.check(id => id === 'card') }, [card, ck >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: U) => { setUs(k); setFind(false) }
  const record = () => { if (!found || dup) return; const next = [...rows, us]; setRows(next); T.check(id => next.includes(id as U)) }
  const resetAll = () => { setUs('6'); setFind(false); setCard(false); setRows([]); T.reset() }
  const task = T.current
  const { hint, next }: { hint: string; next: 'u' | 'find' | 'record' | 'card' | null } = !task ? { hint: '都做完了。像和物体等大、到镜面等距、连线垂直于镜面，是虚像。', next: null }
    : task.id === 'card' ? (card ? { hint: '绕过玻璃板直接看白纸：上面什么也没有', next: null } : { hint: '按“在像的位置放白纸”', next: 'card' })
    : card ? { hint: '按“拿走白纸”', next: 'card' }
    : us !== task.id ? { hint: `把蜡烛 A 移到离玻璃板 ${task.id} cm 的地方`, next: 'u' }
    : !find ? { hint: '透过玻璃板能看到 A 的像。按“移动蜡烛 B 找像”', next: 'find' }
    : found && !dup ? { hint: 'B 好像也被点着了：它和像完全重合。按“记录”', next: 'record' } : { hint: '蜡烛 B 在移…', next: null }
  const labels: Label[] = [
    { id: 'u', at: [X(-u / 2), TOP + 0.02, z + 0.3], ax: 1, className: 'scene-tag', children: <><small>物距</small>{u.toFixed(0)} cm</> },
    { id: 'v', at: [X(v / 2), TOP + 0.02, z + 0.3], ax: 0, className: 'scene-tag key transition-opacity', style: { opacity: found || (dup && !card && steady) ? 1 : 0 }, children: <><small>像距</small>{v.toFixed(0)} cm</> },
    { id: 'g', at: [X0, TOP + PH + 0.1, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '玻璃板' },
    { id: 'a', at: [X(-u), BASE + CH + 0.08, z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蜡烛 A（点着的）' },
    { id: 'b', at: [X(bx), BASE + CH + 0.08, z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蜡烛 B（没点，和 A 一样大）' },
    ...(card ? [{ id: 'c', at: [X(v) + 0.04, BASE + 0.62, z] as [number, number, number], ax: 0.5, className: 'scene-tag -translate-y-full', children: '白纸上没有像' }] : []),
  ]

  return (
    <LabShell title={TITLE} lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="蜡烛 B 和白纸"
      stage={<Dark at="plate" view={card ? VIEWS.card : undefined} labels={labels}>
        <GridPaper x={X0} z={0} cw={44} ch={32} scale={CM} />
        <Ruler x0={X(-20)} y={TOP + 0.004} z={0.8} cm={40} scale={CM} zero={20} />
        <GlassPlate x={X0} y={TOP} h={PH} z0={Z0} z1={Z1} />
        <Candle x={X(-u)} z={z} y={BASE} h={CH} />
        <Candle x={X(bx)} z={z} y={BASE} h={CH} lit={false} />
        {/* A 的像：按玻璃板对称的一份，只有透过玻璃板才看得见 */}
        <Mirrored x={X0} y0={TOP + 0.03} y1={TOP + 0.03 + PH} z0={Z0} z1={Z1}><Candle x={X(-u)} z={z} y={BASE} h={CH} image /></Mirrored>
        {/* 记下来的点：A 的位置、像的位置，和它们的连线 */}
        {rows.map(r => <group key={r}>
          {[-1, 1].map(s => <mesh key={s} position={[X(s * Number(r)), TOP + 0.005, LANE[r] + 0.11]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.022, 16]} /><meshBasicMaterial color={s < 0 ? '#c8372d' : '#1d6f8f'} /></mesh>)}
          <mesh position={[X0, TOP + 0.0045, LANE[r] + 0.11]} rotation-x={-Math.PI / 2}><planeGeometry args={[Number(r) * CM * 2, 0.008]} /><meshBasicMaterial color="#2b2f33" /></mesh>
          <mesh position={[X0 + 0.03, TOP + 0.0045, LANE[r] + 0.14]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.024, 0.03, 4, 1, Math.PI / 4, Math.PI * 2]} /><meshBasicMaterial color="#2b2f33" /></mesh>
        </group>)}
        {/* 白纸：一张立着的小卡片，放在像的位置 */}
        {ck > 0 && <group position={[X(v) + 0.03, TOP, z - (1 - ck) * 0.9]}>
          <RoundedBox args={[0.012, 0.56, 0.42]} radius={0.004} position={[0, 0.3, 0]} castShadow><meshStandardMaterial color="#bdb9ad" roughness={1} /></RoundedBox>
          <RoundedBox args={[0.14, 0.04, 0.3]} radius={0.008} position={[0, 0.02, 0]} castShadow><meshStandardMaterial color="#2a3036" metalness={0.7} roughness={0.45} /></RoundedBox>
        </group>}
      </Dark>}
      lesson={<LessonBlock no="4" title="镜中的像" concept="像和物体关于镜面对称" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>平面镜成像的特点：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>像和物体<b className="text-white">大小相等</b></li>
            <li>像和物体到平面镜的<b className="text-white">距离相等</b></li>
            <li>像和物体的<b className="text-white">连线与镜面垂直</b></li>
            <li>平面镜所成的像是<b className="text-white">虚像</b>：不是实际的光会聚成的，用光屏接不到</li>
          </ul>
          <p className="mt-3">也就是说，平面镜所成的像和物体关于镜面<b className="text-white">对称</b>。</p>
          <p className="mt-3 text-[13.5px] text-white/65">用玻璃板代替平面镜，是为了既能看到 A 的像，又能看到板后面的蜡烛 B，好确定像的位置。玻璃板要选薄的，并且和桌面垂直。用两支一样的蜡烛，是为了比较像和物体的大小。</p>
        </>} />}
      finale={T.finale && <Finale kicker="四件事都做完了" title="像和物体关于镜面对称" onClose={() => T.setFinale(false)}>等大、等距、连线垂直于镜面；像是虚像，白纸接不到。</Finale>}
      panel={
        <Glass className="px-4 py-4">
          <Readout label={`蜡烛 A 离玻璃板 ${Number(us)} cm · 像的位置`} value={card ? '白纸上没有像' : found || dup ? `板后 ${imageDistance(Number(us))} cm` : '还没找到'} text />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <ParamTile symbol="物距" value={`${Number(us)}`} unit="cm" />
            <ParamTile symbol="像距" value={found || dup ? `${imageDistance(Number(us))}` : '—'} unit="cm" />
            <ParamTile symbol="大小" value={found || dup ? '相等' : '—'} unit="B 和像重合" />
          </div>
          <DataTable head={['物距 / cm', '像距 / cm', '像和物体']} empty="每换一个物距，先让 B 和像重合，再按“记录”。" rows={rows.map(r => [r, String(imageDistance(Number(r))), '等大'])} />
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'find'} onClick={() => setFind(true)} disabled={find || card || !steady}>移动蜡烛 B 找像</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!found || dup}>记录</LabButton>
        <LabButton pulse={next === 'card'} onClick={() => setCard(c => !c)}>{card ? '拿走白纸' : '在像的位置放白纸'}</LabButton>
      </>}
      extras={<Control label="蜡烛 A 到玻璃板"><Segmented label="蜡烛 A 到玻璃板" pulse={next === 'u'} want={next === 'u' ? task!.id as U : null} value={us} disabled={card} onChange={pick} options={PLATE_US.map(x => ({ value: String(x) as U, label: `${x} cm` }))} /></Control>}
    />
  )
}
