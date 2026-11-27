// 空气和氧气 · 第 4 课 多变一：化验室墙上的一面反应墙。上面一排牌架挂着四块反应牌，下面是“化合反应”槽。
// 把牌放进槽里：几种物质变成一种的留下、亮起来；石蜡燃烧生成两种物质，被退回牌架。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { cardTex, corkTex, makeSign } from './mats'
import { ease, seg, useRun } from './parts'
import { REACTIONS, combines, isOxidation, type Reaction } from './physics'
import { BENCH, Place, ST, TOP, type V3 } from './world'

const ORDER: Reaction[] = ['c', 's', 'fe', 'wax']
/** 反应墙：板的中心、宽高；牌架那一排和槽那一排的高度；牌的大小 */
const C: V3 = [ST.l4, TOP + 4.1, BENCH.z0 + 0.2], BW = 9.4, BH = 4.9, RACK_Y = 1.02, SLOT_Y = -1.3, CW = 1.95, CH = 1.28
const rackAt = (r: Reaction): V3 => [(ORDER.indexOf(r) - 1.5) * 2.24, RACK_Y, 0.16]
const slotAt = (i: number): V3 => [(i - 1) * 2.24, SLOT_Y, 0.2]
const TASKS: Task[] = [
  { id: 'c', text: '把木炭燃烧那块牌归到“化合”', note: '碳和氧气两种物质，生成二氧化碳一种物质' },
  { id: 'fe', text: '把铁丝燃烧那块牌归到“化合”', note: '铁和氧气两种物质，生成四氧化三铁一种物质' },
  { id: 'wax', text: '把石蜡燃烧那块牌放进去，看它为什么被退回来', note: '石蜡燃烧生成二氧化碳和水两种物质，不是化合反应' },
]

/** 一块反应牌：木牌、牌面、顶上两只挂环。lit：放进槽里亮起来的一圈 */
function Card({ r, lit, sel }: { r: Reaction; lit: boolean; sel: boolean }) {
  const R = REACTIONS[r], map = useMemo(() => cardTex(R.name, R.reactants, R.products, isOxidation(r)), [R, r])
  return <group>
    {(lit || sel) && <mesh position-z={-0.03}><planeGeometry args={[CW + 0.2, CH + 0.2]} /><meshBasicMaterial color={lit ? '#5ff0d8' : '#ffe9a8'} toneMapped={false} /></mesh>}
    <RoundedBox args={[CW, CH, 0.09]} radius={0.035} smoothness={3} castShadow><meshStandardMaterial color="#c9a674" roughness={0.75} /></RoundedBox>
    <mesh position-z={0.047}><planeGeometry args={[CW - 0.06, CH - 0.06]} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>
    {[-0.6, 0.6].map(x => <mesh key={x} position={[x, CH / 2 + 0.07, 0]}><torusGeometry args={[0.07, 0.016, 8, 20]} /><Metal kind="brass" /></mesh>)}
  </group>
}

export default function Lesson4() {
  const [sel, setSel] = useState<Reaction>('c')
  const [placed, setPlaced] = useState<Reaction[]>([])
  const [mv, setMv] = useState<{ r: Reaction; kind: 'in' | 'out' | 'bounce'; slot: number } | null>(null)
  const [bounced, setBounced] = useState(false)
  const T = useTasks('gewu:air:4', TASKS)
  const run = useRun(3.4, () => {
    if (!mv) return
    const next = mv.kind === 'in' ? [...placed, mv.r] : mv.kind === 'out' ? placed.filter(x => x !== mv.r) : placed
    setPlaced(next); if (mv.kind === 'bounce') setBounced(true); setMv(null)
    T.check(id => id !== 'wax' && next.includes(id as Reaction))
  })
  const busy = run.busy
  const putIn = () => { if (busy || placed.includes(sel)) return; setMv({ r: sel, kind: combines(sel) ? 'in' : 'bounce', slot: [0, 1, 2].find(i => !placed.some(p => slotOf[p] === i)) ?? 0 }); run.run() }
  // 每块牌在槽里固定占一格：按放进去的先后
  const slotOf = useMemo(() => Object.fromEntries(placed.map((p, i) => [p, i])) as Record<string, number>, [placed])
  const takeOut = () => { if (busy || !placed.includes(sel)) return; setMv({ r: sel, kind: 'out', slot: slotOf[sel] }); run.run() }
  const canRec = placed.includes('c') && placed.includes('fe') && bounced
  const record = () => { if (canRec) T.check(id => id === 'wax') }
  const resetAll = () => { run.snap(0); setSel('c'); setPlaced([]); setMv(null); setBounced(false); T.reset() }

  const task = T.current, R = REACTIONS[sel]
  const want: Reaction | null = !task ? null : (task.id as Reaction)
  const { hint, next }: { hint: string; next: 'in' | 'rec' | 'sel' | null } = !task ? { hint: '由两种或两种以上物质生成另一种物质的反应，叫做化合反应。', next: null }
    : busy && mv ? { hint: mv.kind === 'bounce' ? `${REACTIONS[mv.r].name}：生成物有 ${REACTIONS[mv.r].products.length} 种，被退了回来…` : mv.kind === 'in' ? `${REACTIONS[mv.r].name}：反应物 ${REACTIONS[mv.r].reactants.length} 种，生成物 ${REACTIONS[mv.r].products.length} 种，留在槽里…` : `把${REACTIONS[mv.r].name}放回牌架…`, next: null }
    : task.id === 'wax' && bounced ? { hint: '石蜡燃烧生成两种物质，不是化合反应。记录结论', next: 'rec' }
    : sel !== want ? { hint: `选“${REACTIONS[want!].name}”这块牌`, next: 'sel' }
    : { hint: task.id === 'wax' ? '把石蜡燃烧也放进“化合反应”槽，看看会怎样' : `把${R.name}放进“化合反应”槽`, next: 'in' }

  /** 一块牌现在的位置（相对板心）：挂在牌架上、待在槽里，或者正在路上 */
  const where = (r: Reaction): V3 => {
    const a = rackAt(r)
    if (mv?.r === r && busy) {
      const b = slotAt(mv.slot), t = run.t
      if (mv.kind === 'bounce') {
        const k = ease(seg(t, 0, 1.1)) - ease(seg(t, 2.3, 3.3)), shake = t > 1.2 && t < 2.2 ? Math.sin(t * 34) * 0.08 * (1 - seg(t, 1.2, 2.2)) : 0
        return [a[0] + (b[0] - a[0]) * k + shake, a[1] + (b[1] - a[1]) * k, a[2] + 0.5 * Math.sin(Math.min(1, k) * Math.PI) + 0.04 * k]
      }
      const k = mv.kind === 'in' ? ease(seg(t, 0, 1.4)) : 1 - ease(seg(t, 0, 1.4))
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + 0.5 * Math.sin(k * Math.PI) + 0.04 * k]
    }
    if (placed.includes(r) && mv?.r !== r) return slotAt(slotOf[r])
    return r === sel && !busy ? [a[0], a[1], a[2] + 0.12] : a
  }
  const tex = useMemo(() => {
    const cork = corkTex().clone(); cork.repeat.set(5, 2.6); cork.needsUpdate = true
    return { cork, title: makeSign(['燃烧反应归类'], '#1f6f7a', '#ffffff', 640, 96), slot: makeSign(['化合反应', '由两种或两种以上物质生成另一种物质'], '#154f47', '#bff7ec', 768, 150), rack: makeSign(['牌架'], '#6b5136', '#f4e6cf', 256, 96) }
  }, [])
  const labels: Label[] = [
    ...(busy && mv?.kind === 'bounce' && run.t > 1.1 && run.t < 2.6 ? [{ id: 'no', at: [C[0] + slotAt(mv.slot)[0], C[1] + SLOT_Y + 0.95, C[2] + 0.4] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>生成物</small>2 种 · 不是化合</> } as Label] : []),
    { id: 'n1', at: [C[0], C[1] - BH / 2 - 0.3, C[2] + 0.2], ax: 0.5, name: true, className: 'scene-name', children: '点一块牌，选中它' },
  ]
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="选中的牌"
      stage={<Place at="l4" labels={labels} bloom={0.35}>
        <group position={C}>
          {/* 软木板、木框、顶上的标题条 */}
          <mesh receiveShadow><boxGeometry args={[BW, BH, 0.12]} /><meshStandardMaterial map={tex.cork} roughness={0.95} /></mesh>
          {[[0, BH / 2 + 0.09, BW + 0.36, 0.18], [0, -BH / 2 - 0.09, BW + 0.36, 0.18], [-BW / 2 - 0.09, 0, 0.18, BH], [BW / 2 + 0.09, 0, 0.18, BH]].map(([x, y, w, h], i) => <RoundedBox key={i} args={[w, h, 0.26]} radius={0.04} position={[x, y, 0.04]} castShadow><meshStandardMaterial color="#7a5a3a" roughness={0.6} /></RoundedBox>)}
          <mesh position={[0, BH / 2 - 0.36, 0.07]}><planeGeometry args={[3.6, 0.52]} /><meshStandardMaterial map={tex.title} roughness={0.6} /></mesh>
          {/* 牌架：一根黄铜横杆，两头的托 */}
          <mesh position={[0, RACK_Y + CH / 2 + 0.14, 0.2]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.035, 0.035, BW - 0.7, 12]} /><Metal kind="brass" grain="brushed" /></mesh>
          {[-1, 1].map(s => <mesh key={s} position={[s * (BW / 2 - 0.35), RACK_Y + CH / 2 + 0.14, 0.13]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.16, 12]} /><Metal kind="brass" /></mesh>)}
          {/* “化合反应”槽：一条深色的浅托盘，左边一块说明牌，槽底一道灯带 */}
          <RoundedBox args={[7.1, CH + 0.5, 0.1]} radius={0.04} position={[0, SLOT_Y, 0.08]} receiveShadow><meshStandardMaterial color="#1d3a38" roughness={0.6} /></RoundedBox>
          <RoundedBox args={[7.1, 0.12, 0.42]} radius={0.03} position={[0, SLOT_Y - CH / 2 - 0.2, 0.26]} castShadow><meshStandardMaterial color="#2a4f4b" roughness={0.5} /></RoundedBox>
          <mesh position={[0, SLOT_Y - CH / 2 - 0.13, 0.3]}><boxGeometry args={[6.9, 0.03, 0.3]} /><meshBasicMaterial color={placed.length ? '#5ff0d8' : '#2f6f66'} toneMapped={false} /></mesh>
          <mesh position={[0, SLOT_Y + CH / 2 + 0.52, 0.07]}><planeGeometry args={[4.6, 0.6]} /><meshStandardMaterial map={tex.slot} roughness={0.6} /></mesh>
          {ORDER.map(r => <group key={r} position={where(r)} onClick={e => { e.stopPropagation(); if (!busy) setSel(r) }}><Card r={r} lit={placed.includes(r) && mv?.r !== r} sel={r === sel && !busy && !placed.includes(r)} /></group>)}
        </group>
        {/* 板上方的一条照画灯 */}
        <mesh position={[C[0], C[1] + BH / 2 + 0.75, C[2] + 0.7]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.08, 0.08, 6, 12]} /><Metal kind="aluminum" grain="brushed" /></mesh>
        <mesh position={[C[0], C[1] + BH / 2 + 0.68, C[2] + 0.7]}><boxGeometry args={[5.8, 0.03, 0.1]} /><meshBasicMaterial color="#fff3da" toneMapped={false} /></mesh>
        <pointLight position={[C[0], C[1] + BH / 2 + 0.4, C[2] + 1.6]} intensity={14} distance={12} decay={1.6} color="#fff0d8" />
      </Place>}
      lesson={<LessonBlock no="4" title="多变一" concept="几种物质变成一种，就叫化合" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>由<b className="text-white">两种或两种以上</b>物质生成<b className="text-white">另一种</b>物质的反应，叫做化合反应。特点是“多变一”。</p>
          <p className="mt-2">物质与氧气发生的反应属于<b className="text-white">氧化反应</b>。木炭、硫、铁丝、石蜡的燃烧都是氧化反应，牌上都有“有氧气参加”的标记；但石蜡燃烧生成二氧化碳和水两种物质，不是化合反应。</p>
          <p className="mt-2">燃烧是剧烈的氧化反应。有些氧化反应进行得很慢，不容易被察觉，叫做缓慢氧化，例如动植物的呼吸、食物的腐烂、铁生锈。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">几块牌都归好了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">多变一，是化合反应</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">木炭、铁丝的燃烧都是两种物质生成一种物质，是化合反应。石蜡燃烧生成二氧化碳和水，不是化合反应；它们都有氧气参加，都是氧化反应。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{R.name}</div>
            <div className="mt-1.5 flex items-end justify-center gap-3 text-[40px] leading-none font-bold tabular-nums">{R.reactants.length}<span className="pb-1 text-[14px] font-medium text-white/55">种</span><span className="pb-1 text-[22px] text-white/50">→</span>{R.products.length}<span className="pb-1 text-[14px] font-medium text-white/55">种</span></div>
            <div className="mt-2 text-[13px] text-white/60">反应物 → 生成物</div>
          </div>
          <p className="mt-4 rounded-xl bg-white/8 px-3 py-2.5 text-center font-formula text-[16px]">{R.formula}</p>
          <h2 className="mt-5 text-[12.5px] text-white/55">四个反应</h2>
          <div className="mt-2 flex flex-col gap-1.5 text-[13.5px]">
            {ORDER.map(r => <div key={r} className={`flex items-center justify-between rounded-lg px-3 py-2 ${r === sel ? 'bg-white/14' : 'bg-white/6'}`}>
              <span>{REACTIONS[r].name}<span className="ml-2 text-white/45">{REACTIONS[r].reactants.length} → {REACTIONS[r].products.length}</span></span>
              <span className={placed.includes(r) ? 'font-semibold text-[#7fe3d4]' : r === 'wax' && bounced ? 'font-semibold text-[#ffb38a]' : 'text-white/35'}>{placed.includes(r) ? '化合反应' : r === 'wax' && bounced ? '不是化合' : '还没归类'}</span>
            </div>)}
          </div>
          <p className="mt-3 text-[12.5px] text-white/50">四个反应都有氧气参加，都是氧化反应</p>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'in'} pulse={next === 'in'} onClick={putIn} disabled={busy || placed.includes(sel)}>放入“化合”槽</LabButton>
        <LabButton onClick={takeOut} disabled={busy || !placed.includes(sel)}>放回牌架</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={busy || !canRec || !task}>记录结论</LabButton>
      </>}
      extras={
        <Control label="反应牌">
          <Segmented label="反应牌" pulse={next === 'sel'} want={want} value={sel} disabled={busy} onChange={r => setSel(r as Reaction)} options={ORDER.map(r => ({ value: r, label: REACTIONS[r].name }))} />
        </Control>
      }
    />
  )
}
