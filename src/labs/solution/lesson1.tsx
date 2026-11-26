// 溶液 · 第 1 课 溶液的形成：化验台第 1 格，三只 250 mL 烧杯各盛半杯水，后面是蔗糖、泥沙、植物油和一瓶洗涤剂。
// 选一杯，把东西加进去搅拌，再静置：蔗糖溶得看不见、不分层；泥沙沉下去；油浮上来分层；滴洗涤剂再搅拌，乳化以后不再分层。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, Dish, GlassRod, Glove, JarBottle, NarrowBottle, SqueezeBottle, Spoon, WATER } from './gear'
import { Grains, Suspended } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { STUFF_NAME, mixKind, settles, type Stuff } from './physics'
import { BZ, M, ST, TOP, Place } from './world'

const X0 = ST.l1, Y = TOP, Z = BZ + 0.15
const R = BEAKER[250].r * M, H = BEAKER[250].h * M, LV = 0.055       // 水深（m）
const CUPS: Stuff[] = ['sugar', 'soil', 'oil']
const AT: Record<Stuff, P3> = { sugar: [X0 - 0.11 * M, Y, Z], soil: [X0, Y, Z], oil: [X0 + 0.11 * M, Y, Z] }
const SRC: Record<Stuff, P3> = { sugar: [X0 - 0.17 * M, Y, Z - 0.15 * M], soil: [X0 - 0.055 * M, Y, Z - 0.15 * M], oil: [X0 + 0.06 * M, Y, Z - 0.16 * M] }
const DET: P3 = [X0 + 0.17 * M, Y, Z - 0.15 * M]
const SPOON0: P3 = [X0 - 0.2 * M, Y + 0.004 * M, Z + 0.075 * M], ROD0: P3 = [X0 + 0.0 * M, Y + 0.004 * M, Z + 0.075 * M]
/** 清水的颜色往另一种颜色靠 k（0–1） */
const tint = (c: string, k: number) => `#${new THREE.Color(WATER.color).lerp(new THREE.Color(c), k).getHexString()}`
const ADD = 1.8, STIR = 2.8, REST = 3.6
const TASKS: Task[] = [
  { id: 'sugar', text: '把蔗糖加进水里搅拌，再静置', note: '蔗糖看不见了，静置也不分层：得到均一、稳定的溶液' },
  { id: 'soil', text: '把泥沙加进水里搅拌，再静置', note: '泥沙使水变浑，静置后沉到杯底：这是悬浊液' },
  { id: 'oil', text: '把植物油加进水里搅拌，再静置', note: '油成小液滴分散在水里，静置后又分成两层：这是乳浊液' },
  { id: 'det', text: '往油水里滴洗涤剂，再搅拌、静置', note: '洗涤剂使油分散成更细小的液滴，不再分层：这叫乳化' },
]
type Phase = 'empty' | 'mixed' | 'settled'

export default function Lesson1() {
  const [cup, setCup] = useState<Stuff>('sugar')
  const [ph, setPh] = useState<Record<Stuff, Phase>>({ sugar: 'empty', soil: 'empty', oil: 'empty' })
  const [det, setDet] = useState<Phase>('empty')
  const [act, setAct] = useState<Stuff>('sugar')         // 正在动的是哪一杯
  const [withDet, setWithDet] = useState(false)          // 这一次搅拌是不是滴了洗涤剂
  const T = useTasks('gewu:solution:1', TASKS)
  const add = useRun(ADD + STIR, () => { if (withDet) setDet('mixed'); else setPh(p => ({ ...p, [act]: 'mixed' })) })
  const rest = useRun(REST, () => {
    if (act === 'oil' && det === 'mixed') { setDet('settled'); T.check(id => id === 'det'); return }
    setPh(p => ({ ...p, [act]: 'settled' })); T.check(id => id === act)
  })
  const busy = add.busy || rest.busy
  const doAdd = () => { if (busy || ph[cup] !== 'empty') return; setAct(cup); setWithDet(false); add.run() }
  const doRest = () => { if (busy) return; const c = cup; if (!(ph[c] === 'mixed' || (c === 'oil' && det === 'mixed'))) return; setAct(c); rest.run() }
  const doDet = () => { if (busy || cup !== 'oil' || ph.oil !== 'settled' || det !== 'empty') return; setAct('oil'); setWithDet(true); add.run() }
  const resetAll = () => { add.snap(0); rest.snap(0); setCup('sugar'); setPh({ sugar: 'empty', soil: 'empty', oil: 'empty' }); setDet('empty'); T.reset() }

  const task = T.current
  const target: Stuff | null = task ? (task.id === 'det' ? 'oil' : task.id as Stuff) : null
  const { hint, next }: { hint: string; next: 'cup' | 'add' | 'rest' | 'det' | null } = !task ? { hint: '溶液均一、稳定；悬浊液、乳浊液静置会分层，洗涤剂能乳化油污。', next: null }
    : add.busy ? { hint: add.t < ADD ? (withDet ? '滴几滴洗涤剂…' : `把${STUFF_NAME[act]}加进水里…`) : '用玻璃棒搅拌…', next: null }
    : rest.busy ? { hint: '静置，看杯里有什么变化…', next: null }
    : cup !== target ? { hint: `选${STUFF_NAME[target!]}那一杯`, next: 'cup' }
    : task.id === 'det' && det === 'empty' ? { hint: '往油水里滴几滴洗涤剂，搅拌', next: 'det' }
    : ph[cup] === 'empty' ? { hint: `把${STUFF_NAME[cup]}加进水里，搅拌`, next: 'add' }
    : { hint: '静置一会儿，看看分不分层', next: 'rest' }

  // 每一杯的样子：搅拌进度 s（0–1）、静置进度 q（0–1）
  const s = (c: Stuff) => act === c && add.busy && !withDet ? seg(add.t, ADD, ADD + STIR) : ph[c] === 'empty' ? 0 : 1
  const q = (c: Stuff) => act === c && rest.busy && !(c === 'oil' && det === 'mixed') ? rest.k : ph[c] === 'settled' ? 1 : 0
  const ds = act === 'oil' && add.busy && withDet ? seg(add.t, ADD, ADD + STIR) : det === 'empty' ? 0 : 1      // 洗涤剂搅开的程度
  const stirring = add.busy && add.t > ADD
  const soilMud = (1 - q('soil')) * s('soil')
  const look: Record<Stuff, { color: string; opacity: number }> = {
    sugar: { color: WATER.color, opacity: WATER.opacity + 0.03 * s('sugar') },
    soil: { color: tint('#8a6438', Math.min(1, soilMud * 1.2 + 0.25 * s('soil'))), opacity: WATER.opacity + 0.62 * soilMud + 0.06 * s('soil') },
    oil: ds > 0 ? { color: tint('#f4f1e6', ds), opacity: WATER.opacity + 0.62 * ds } : { color: tint('#e4e2b8', 0.6 * s('oil') * (1 - q('oil'))), opacity: WATER.opacity + 0.2 * s('oil') * (1 - q('oil')) },
  }
  const oilIn = act === 'oil' && add.busy && !withDet ? seg(add.t, 0.6, ADD) : ph.oil === 'empty' ? 0 : 1
  const oilLayer = 0.006 * M * oilIn * (ds > 0 ? 1 - ds : 1 - s('oil') * (1 - q('oil')))

  // 动作：药匙舀固体送到杯口倒进去；油瓶提起来倒；洗涤剂挤瓶倒过来滴；玻璃棒搅拌
  const a = add.t, c0 = act
  const solid = add.busy && !withDet && c0 !== 'oil'
  const spoonHome: P3 = [SRC[c0][0] + 0.03 * M, Y + 0.03 * M, SRC[c0][2] + 0.06 * M], over: P3 = [AT[c0][0] - 0.02 * M, Y + H + 0.03 * M, AT[c0][2]]
  const sp: P3 = !solid ? SPOON0 : a < 0.5 ? liftPath(SPOON0, spoonHome, Y + 0.12 * M, seg(a, 0, 0.5)) : a < 1.1 ? liftPath(spoonHome, over, Y + H + 0.06 * M, seg(a, 0.5, 1.1)) : liftPath(over, SPOON0, Y + H + 0.06 * M, seg(a, 1.4, ADD))
  const flip = solid ? ease(seg(a, 1.05, 1.25)) * (1 - ease(seg(a, 1.35, 1.45))) : 0
  const pouring = add.busy && !withDet && c0 === 'oil'
  const bk = pouring ? ease(seg(a, 0, 0.6)) * (1 - ease(seg(a, ADD - 0.2, ADD + 0.4))) : 0
  const bottleAt: P3 = [SRC.oil[0] + (AT.oil[0] - 0.05 * M - SRC.oil[0]) * bk, Y + bk * (H + 0.02 * M), SRC.oil[2] + (AT.oil[2] - SRC.oil[2]) * bk]
  const dk = add.busy && withDet ? ease(seg(a, 0, 0.6)) * (1 - ease(seg(a, ADD - 0.2, ADD + 0.4))) : 0
  const detAt: P3 = [DET[0] + (AT.oil[0] + 0.03 * M - DET[0]) * dk, Y + dk * (H + 0.06 * M), DET[2] + (AT.oil[2] - DET[2]) * dk]
  const ang = (a - ADD) * 9
  const rodAt: P3 = stirring ? [AT[c0][0] + Math.cos(ang) * R * 0.45, Y + 0.01 * M, AT[c0][2] + Math.sin(ang) * R * 0.45] : ROD0

  const tag = (c: Stuff) => {
    const done = ph[c] === 'settled', kind = c === 'oil' && det === 'settled' ? mixKind('oil', true) : mixKind(c)
    return done ? `${kind}${settles(c, c === 'oil' && det === 'settled') ? ' · 分层' : ' · 不分层'}` : ph[c] === 'mixed' || (c === 'oil' && det === 'mixed') ? '搅拌过' : '水'
  }
  const labels: Label[] = [
    ...CUPS.map(c => ({ id: c, at: [AT[c][0], Y + H + 0.035 * M, AT[c][2]] as P3, ax: 0.5, className: `scene-tag ${cup === c ? 'key' : ''} -translate-y-full`, children: <><small>{STUFF_NAME[c]}</small>{tag(c)}</> })),
    { id: 'n1', at: [SRC.sugar[0], Y + 0.1 * M, SRC.sugar[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '蔗糖' },
    { id: 'n2', at: [SRC.soil[0], Y + 0.03 * M, SRC.soil[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '泥沙' },
    { id: 'n3', at: [SRC.oil[0], Y + 0.13 * M, SRC.oil[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '植物油' },
    { id: 'n4', at: [DET[0], Y + 0.15 * M, DET[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '洗涤剂' },
  ]
  const lvl = LV + (oilIn > 0 ? 0.004 : 0)
  return (
    <LabShell title="溶液" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['1'], VOICE)} actionsLabel="溶解"
      stage={<Place at="l1" labels={labels}>
        {CUPS.map(c => <group key={c} position={AT[c]}><Beaker vol={250} level={c === 'oil' ? lvl : LV} color={look[c].color} opacity={look[c].opacity}>
          {/* 油层：浮在水面上的一层淡黄 */}
          {c === 'oil' && oilLayer > 0.002 && <mesh position-y={LV * M + oilLayer / 2} renderOrder={5}><cylinderGeometry args={[R - 0.014, R - 0.014, oilLayer, 40]} /><meshPhysicalMaterial color="#e6c34a" transparent opacity={0.78} roughness={0.08} clearcoat={0.8} depthWrite={false} /></mesh>}
          {/* 泥层：沉到杯底的泥沙 */}
          {c === 'soil' && q('soil') > 0.02 && <mesh position-y={0.003 * M * q('soil')} renderOrder={4}><cylinderGeometry args={[R - 0.016, R - 0.016, 0.006 * M * q('soil'), 40]} /><meshStandardMaterial color="#6e5232" roughness={1} /></mesh>}
        </Beaker></group>)}
        <Grains at={AT.sugar} R={R * 0.8} H={LV * M} fall={act === 'sugar' && add.busy ? seg(a, 1.15, 2.2) : 0} left={act === 'sugar' && add.busy ? 1 - seg(a, 1.6, ADD + STIR - 0.4) : 0} size={0.0026 * M} swirl={act === 'sugar' && stirring ? 1 : 0} />
        <Suspended at={[AT.soil[0], Y + 0.003, AT.soil[2]]} R={R * 0.86} H={LV * M * 0.95} mix={s('soil')} settle={q('soil')} home="bottom" size={0.0018 * M} n={220} color="#7a5b36" swirl={act === 'soil' && stirring ? 1 : 0} />
        <Suspended at={[AT.oil[0], Y + 0.003, AT.oil[2]]} R={R * 0.8} H={LV * M * 0.98} mix={ds > 0 ? 0 : s('oil')} settle={q('oil')} home="top" size={0.0026 * M} n={120} color="#e8c64e" opacity={0.85} round merge swirl={act === 'oil' && stirring ? 1 : 0} seed={9} />
        <Suspended at={[AT.oil[0], Y + 0.003, AT.oil[2]]} R={R * 0.84} H={LV * M * 0.98} mix={ds} settle={0} home="top" size={0.0013 * M} n={260} color="#f7f2df" opacity={0.9} round swirl={act === 'oil' && stirring ? 1 : 0} seed={4} />
        {/* 试剂 */}
        <group position={SRC.sugar}><JarBottle label="蔗糖" amount={0.6} /></group>
        <group position={SRC.soil}><Dish /></group>
        <group position={bottleAt} rotation-z={Math.PI * 0.62 * bk}><NarrowBottle label="植物油" color="#e5c24c" />
          {pouring && bk > 0.9 && <mesh position={[0.012 * M, 0.1 * M, 0]} rotation-z={-Math.PI * 0.62}><cylinderGeometry args={[0.0012 * M, 0.0012 * M, 0.05 * M, 8]} /><meshPhysicalMaterial color="#e5c24c" transparent opacity={0.8} roughness={0.05} /></mesh>}
          {pouring && <group position={[0, 0.05 * M, -0.035 * M]} rotation={[-0.5, 0, 0]}><Glove /></group>}
        </group>
        <group position={detAt} rotation-z={Math.PI * 0.75 * dk}><SqueezeBottle label="洗涤剂" />
          {add.busy && withDet && <group position={[0, 0.06 * M, -0.03 * M]} rotation={[-0.5, 0, 0]}><Glove /></group>}
        </group>
        <group position={sp} rotation={[0, solid ? 0 : 0.5, Math.PI * 0.85 * flip]}><Spoon load={solid && a > 0.45 && a < 1.3 ? 1 - flip : 0} color={c0 === 'soil' ? '#7a5b36' : '#f7f7f2'} />
          {solid && <group position={[0.15 * M, 0.02 * M, -0.01 * M]} rotation={[-1.0, 0.3, -0.9]}><Glove /></group>}
        </group>
        <group position={rodAt} rotation={stirring ? [Math.sin(ang) * 0.18, 0, -Math.cos(ang) * 0.18] : [0, 0, Math.PI / 2 - 0.02]}><GlassRod len={0.2} />
          {stirring && <group position={[0, 0.16 * M, 0]} rotation={[-0.45, 0, 0]}><Glove /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="1" title="溶液的形成" concept="溶液是均一、稳定的混合物" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一种或几种物质分散到另一种物质里，形成<b className="text-white">均一的、稳定的混合物</b>，叫做溶液。能溶解其他物质的叫溶剂（这里是水），被溶解的叫溶质（蔗糖）。</p>
          <p className="mt-3">泥沙这样的固体小颗粒分散在水里形成的是<b className="text-white">悬浊液</b>；植物油这样的小液滴分散在水里形成的是<b className="text-white">乳浊液</b>。它们都不均一、不稳定，静置会分层。</p>
          <p className="mt-3">洗涤剂能使植物油分散成无数细小的液滴，而不聚成大的油珠，这叫<b className="text-white">乳化</b>。用洗涤剂洗油污就是这个道理。食盐溶进水里也得到溶液。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四杯都看过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">溶液是均一、稳定的混合物</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">蔗糖溶液静置不分层；泥沙水是悬浊液、油水是乳浊液，静置都会分层；洗涤剂能把油乳化，不再分层。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{STUFF_NAME[cup]}加进水里</div>
            <div className="mt-1 text-[40px] leading-none font-bold tracking-tight">{ph[cup] === 'settled' ? (cup === 'oil' && det === 'settled' ? mixKind('oil', true) : mixKind(cup)) : '—'}</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">三杯的对比</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 font-medium">是什么</th><th className="pb-1 font-medium">静置以后</th></tr></thead>
            <tbody>{CUPS.map(c => { const d = c === 'oil' && det === 'settled', ok = ph[c] === 'settled'; return <tr key={c} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{STUFF_NAME[c]}{d ? ' + 洗涤剂' : ''}</td><td>{ok ? mixKind(c, d) : '—'}</td><td className={`rounded-r-lg font-semibold ${ok && !settles(c, d) ? 'text-[#7fe3d4]' : ''}`}>{ok ? (settles(c, d) ? '分层' : '不分层') : '—'}</td></tr> })}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'add'} pulse={next === 'add'} onClick={doAdd} disabled={busy || ph[cup] !== 'empty'}>加入，搅拌</LabButton>
        <LabButton primary={next === 'rest'} pulse={next === 'rest'} onClick={doRest} disabled={busy || !(ph[cup] === 'mixed' || (cup === 'oil' && det === 'mixed'))}>静置</LabButton>
        <LabButton primary={next === 'det'} pulse={next === 'det'} onClick={doDet} disabled={busy || cup !== 'oil' || ph.oil !== 'settled' || det !== 'empty'}>滴洗涤剂，搅拌</LabButton>
      </>}
      extras={
        <Control label="选一杯">
          <Segmented label="选一杯" pulse={next === 'cup'} want={target} value={cup} disabled={busy} onChange={k => setCup(k as Stuff)} options={CUPS.map(c => ({ value: c, label: STUFF_NAME[c] }))} />
        </Control>
      }
    />
  )
}
