// 电解和金属防护 · 第 5 课 电镀和精炼铜：电镀车间最前面那只前壁透明的镀槽。
// 槽里是 CuSO₄ 溶液，槽口横着三根铜排：两边的接整流柜正极，挂阳极板；中间的接负极，单轨吊把挂具（或纯铜薄片）吊进来搁在上面。
// 先给铁件镀铜，再换成粗铜做阳极精炼铜；各通电一次，记录两极质量的变化。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import { Glass as Panel, Control, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, disc, useSlide, useTasks, type Label } from '@/lab-kit'
import { Drift } from './fx'
import { ELECTRODE, Legend, Micro, SP, type MicroCfg } from './micro'
import { LESSONS, goLesson } from './lessons'
import { mixHex, useRun } from './parts'
import { Fin } from './fin'
import { PLATE_NE, PLATING, crudeFate, plating, type PlateKey } from './physics'
import { TANK as T } from './plant'
import { SPOT, Place, type V3 } from './world'

const BAR = T.y0 + T.h + 0.75 + 0.46, UP = T.rail - 5.5           // 挂具横杆搁在铜排上时的高度、吊起来时的高度
const TASKS: Task[] = [
  { id: 'dip', text: '把挂着铁件的挂具吊进镀槽', note: '铁件搁在中间的铜排上，接的是电源负极：它是阴极' },
  { id: 'plate', text: '通电，记录两极质量的变化', note: '阳极溶解多少铜，阴极就镀上多少：溶液里 Cu²⁺ 浓度不变' },
  { id: 'swap', text: '换成精炼铜：粗铜做阳极，吊进纯铜薄片通电', note: '粗铜溶解，纯铜在阴极上越长越厚' },
  { id: 'refine', text: '记录，看槽底多了什么', note: '比铜活泼的锌、铁成了离子留在溶液里；不活泼的银、金沉到槽底，叫阳极泥' },
]
const MICRO: Record<PlateKey, MicroCfg> = {
  plate: { left: { color: ELECTRODE.copper, tag: '阳极 铜 +', e: -1, emit: [{ sp: 'Cu2', rate: 1 }] }, right: { color: ELECTRODE.iron, tag: '阴极 铁件 −', e: 1, take: { Cu2: { to: 'coat', as: 'Cu' } } }, ions: { Cu2: 8, SO4: 8 }, field: -1 },
  refine: { left: { color: ELECTRODE.crude, tag: '阳极 粗铜 +', e: -1, emit: [{ sp: 'Cu2', rate: 0.9 }, { sp: 'Zn2', rate: 0.22 }, { sp: 'Fe2', rate: 0.18 }] }, right: { color: ELECTRODE.copper, tag: '阴极 纯铜 −', e: 1, take: { Cu2: { to: 'coat', as: 'Cu' } } }, ions: { Cu2: 8, SO4: 8 }, field: -1 },
}

export default function Lesson5() {
  const [mode, setMode] = useState<PlateKey>('plate')
  const [down, setDown] = useState(false)
  const [ran, setRan] = useState(false)
  const [rec, setRec] = useState<Record<PlateKey, boolean>>({ plate: false, refine: false })
  const T_ = useTasks('gewu:electrolysis:5', TASKS)
  const y = useSlide(down ? BAR : UP, 3.2), seated = down && Math.abs(y - BAR) < 0.01
  const run = useRun(7, () => { setRan(true); T_.check(id => id === 'swap' && mode === 'refine') })
  useEffect(() => { if (seated) T_.check(id => id === 'dip') }, [seated])   // eslint-disable-line react-hooks/exhaustive-deps
  const k = run.busy ? run.k : ran ? 1 : 0, on = run.busy
  const record = () => { if (!ran || rec[mode]) return; setRec(r => ({ ...r, [mode]: true })); T_.check(id => (id === 'plate' && mode === 'plate') || (id === 'refine' && mode === 'refine')) }
  const pick = (m: PlateKey) => { if (run.busy || m === mode) return; setMode(m); setDown(false); setRan(false); run.snap(0) }
  const resetAll = () => { setMode('plate'); setDown(false); setRan(false); setRec({ plate: false, refine: false }); run.snap(0); T_.reset() }
  const task = T_.current, wantMode: PlateKey = task && (task.id === 'swap' || task.id === 'refine') ? 'refine' : 'plate'
  const { hint, next }: { hint: string; next: 'dip' | 'on' | 'rec' | 'mode' | null } = !task ? { hint: '电镀和精炼都是：镀层金属或粗金属做阳极，镀件或纯金属做阴极。', next: null }
    : mode !== wantMode ? { hint: wantMode === 'refine' ? '换成电解精炼：选“精炼铜”' : '选回“铁件镀铜”', next: 'mode' }
    : !down ? { hint: mode === 'plate' ? '把挂着铁件的挂具吊进镀槽' : '把纯铜薄片吊进槽里', next: 'dip' }
    : !seated ? { hint: '慢慢落进槽里…', next: null }
    : run.busy ? { hint: mode === 'plate' ? '铜一层层镀到铁件上…' : '粗铜一点点溶解，纯铜越长越厚…', next: null }
    : !ran ? { hint: mode === 'plate' ? '铁件接在负极上，铜板接在正极上。通电' : '粗铜接正极，纯铜接负极。通电', next: 'on' }
    : { hint: mode === 'plate' ? '通电结束。记录两极质量的变化' : '通电结束。记录，再看看槽底', next: 'rec' }

  const P = PLATING[mode], res = plating(mode, PLATE_NE), refine = mode === 'refine'
  const g = useMemo(() => ({ part: disc(0.78, 0.26, { hole: 0.3, chamfer: 0.05 }) }), [])
  const partColor = mixHex('#8d949b', '#d0623a', k)
  const lvTop = T.y0 + T.wall + T.h * T.level, plateH = 5.4, plateY = lvTop - 0.4 - plateH / 2
  const aT = refine ? 1.1 - 0.45 * k : 0.5 - 0.2 * k, cT = 0.1 + 0.5 * k
  const yaw = SPOT.l5.view[0], MIC: V3 = [T.x - 0.5, 16.6, T.z + 3], mr = 2.6
  const mud = useMemo(() => { let s = 77; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: 46 }, (_, i) => [T.bars[i % 2 ? 0 : 2] + (r() - 0.5) * 2.4, r(), (r() - 0.5) * (T.d - 2), r()] as [number, number, number, number]) }, [])
  const labels: Label[] = [
    { id: 'a1', at: [T.x + T.bars[0], BAR + 1.3, T.z + T.d / 2], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>阳极 +</small>{refine ? '粗铜' : '铜板'}</> },
    { id: 'a2', at: [T.x + T.bars[2], BAR + 1.3, T.z + T.d / 2], ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>阳极 +</small>{refine ? '粗铜' : '铜板'}</> },
    { id: 'c', at: [T.x + 0.6, y + 2.2, T.z], ax: 0, className: 'scene-tag key -translate-y-full', children: <><small>阴极 −</small>{refine ? '纯铜' : '铁件'}{rec[mode] && <span className="delta">+{res.gain.toFixed(1)} g</span>}</> },
    { id: 'bath', at: [T.x + T.w / 2 - 3, T.y0 - 0.4, T.z + T.d / 2 + 0.4], ax: 0.5, name: true, className: 'scene-name', children: 'CuSO₄ 溶液' },
    { id: 'hoist', at: [T.x + 1.4, T.rail - 0.6, T.z], name: true, className: 'scene-name -translate-y-1/2', children: '单轨吊' },
    ...(rec[mode] ? [{ id: 'loss', at: [T.x + T.bars[0] - 0.8, lvTop - 3.2, T.z + T.d / 2] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: res.anodeLoss !== null ? <>阳极共 <span className="delta eq">−{res.anodeLoss.toFixed(1)} g</span></> : '阳极减少的不等于 6.4 g' }] : []),
    ...(refine && k > 0.6 ? [{ id: 'mud', at: [T.x + T.bars[2], T.y0 + T.wall + 0.9, T.z + T.d / 2] as V3, ax: 0.5, className: 'scene-tag -translate-y-full', children: <><small>银、金</small>阳极泥</> }] : []),
  ]
  return (
    <LabShell title="电解和金属防护" lessons={LESSONS} current="5" onLesson={goLesson} banner={T_.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel={P.name}
      stage={<Place at="l5" labels={labels}>
        {/* 两块阳极板：用铜钩挂在两边的铜排上 */}
        {[T.bars[0], T.bars[2]].map(bx => <group key={bx} position={[T.x + bx, 0, T.z]}>
          <mesh position-y={plateY} castShadow renderOrder={6}><boxGeometry args={[aT, plateH, T.d - 2.4]} />{refine ? <meshStandardMaterial color="#6a4230" emissive="#3a1c10" emissiveIntensity={0.4} roughness={0.9} metalness={0.3} transparent opacity={0.9} /> : <meshStandardMaterial color="#d0623a" emissive="#8a3214" emissiveIntensity={0.45} roughness={0.4} metalness={0.6} transparent opacity={0.9} />}</mesh>
          {[-1, 1].map(s => <mesh key={s} position={[0, (plateY + plateH / 2 + BAR - 0.46) / 2, s * (T.d / 2 - 2)]} castShadow><boxGeometry args={[0.16, BAR - 0.46 - plateY - plateH / 2 + 0.5, 0.5]} /><Metal kind="copper" /></mesh>)}
        </group>)}
        {/* 单轨吊：小车、电动葫芦、两根钢丝绳，吊着一根铜横杆；横杆下面挂着挂具或纯铜薄片 */}
        <group position={[T.x, 0, T.z]}>
          <mesh position={[0, T.rail - 0.7, 0]} castShadow><boxGeometry args={[2.6, 1.1, 1.5]} /><meshPhysicalMaterial color="#d9a520" roughness={0.45} clearcoat={0.4} /></mesh>
          <mesh position={[0, T.rail - 1.7, 0]} castShadow rotation-x={Math.PI / 2}><cylinderGeometry args={[0.75, 0.75, 2.2, 20]} /><meshPhysicalMaterial color="#3a4046" roughness={0.5} /></mesh>
          {[-1, 1].map(s => <mesh key={s} position={[s * 0.9, T.rail + 0.15, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.32, 0.32, 1.2, 14]} /><Metal kind="steel" /></mesh>)}
          {[-1, 1].map(s => <mesh key={s} position={[0, (T.rail - 2.2 + y) / 2, s * 2.4]}><cylinderGeometry args={[0.045, 0.045, T.rail - 2.2 - y, 6]} /><Metal kind="steel" /></mesh>)}
          <group position-y={y}>
            <mesh rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.22, 0.22, T.d + 0.9, 14]} /><Metal kind="copper" grain="brushed" /></mesh>
            {[-1, 1].map(s => <mesh key={s} position={[0, 0.3, s * 2.4]}><torusGeometry args={[0.2, 0.06, 6, 12]} /><Metal kind="steel" /></mesh>)}
            {refine
              ? <group>
                {[-1, 1].map(s => <mesh key={s} position={[0, -0.9, s * 1.8]}><boxGeometry args={[0.1, 1.8, 0.45]} /><Metal kind="copper" /></mesh>)}
                <mesh position-y={-1.7 - plateH / 2} castShadow renderOrder={6}><boxGeometry args={[cT, plateH, T.d - 2.6]} /><meshStandardMaterial color="#e07a4a" emissive="#9a3a18" emissiveIntensity={0.5} roughness={0.3} metalness={0.6} transparent opacity={0.92} /></mesh>
              </group>
              : <group>
                {[-1, 1].map(s => <mesh key={s} position={[0, -3.6, s * 1.7]}><boxGeometry args={[0.14, 7.2, 0.14]} /><Metal kind="brass" /></mesh>)}
                {[0, 1, 2].map(r => <group key={r} position-y={-2.1 - r * 2.2}>
                  <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 3.4, 8]} /><Metal kind="brass" /></mesh>
                  {[-1, 1].map(s => <mesh key={s} geometry={g.part} position={[-0.13, -0.95, s * 1.7 - 0.0]} rotation-z={Math.PI / 2} castShadow renderOrder={6}><meshStandardMaterial color={partColor} emissive={mixHex('#30343a', '#8a3214', k)} emissiveIntensity={0.3 + 0.2 * k} metalness={0.8} roughness={0.36 - 0.08 * k} transparent opacity={0.94} /></mesh>)}
                </group>)}
              </group>}
          </group>
        </group>
        {/* 溶液里的 Cu²⁺ 从两边的阳极漂向中间的阴极；精炼时槽底慢慢积起一层阳极泥 */}
        {[T.bars[0], T.bars[2]].map((bx, i) => <Drift key={bx} from={[T.x + bx * 0.86, plateY, T.z]} to={[T.x + bx * 0.1, plateY, T.z]} size={[0.3, plateH - 0.8, T.d - 3]} n={9} r={0.16} color={SP.Cu2.color} on={on} speed={0.22} seed={i + 2} />)}
        {refine && mud.map(([x, a, z, b], i) => <mesh key={i} position={[T.x + x, T.y0 + T.wall + 0.06 + b * 0.12, T.z + z]} scale={Math.max(0, Math.min(1, k * 1.6 - a * 0.6)) * (0.07 + b * 0.07)}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={i % 4 ? '#5c5f63' : '#c9a23a'} emissive={i % 4 ? '#000000' : '#6a4a10'} metalness={0.8} roughness={0.5} /></mesh>)}
        {(on || ran) && <Micro at={MIC} r={mr} yaw={yaw} from={[T.x + T.bars[0] * 0.5, lvTop - 1.4, T.z + T.d / 2]} cfg={MICRO[mode]} on={on} seed={refine ? 9 : 4} />}
      </Place>}
      lesson={<LessonBlock no="5" title="电镀和精炼铜" concept="镀层金属做阳极，镀件做阴极" tasks={TASKS} done={T_.done} current={task?.id}
        theory={<>
          <p>电镀是应用电解原理，在某些金属表面镀上一薄层其他金属或合金的方法。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>电镀：镀层金属做阳极，镀件做阴极，含镀层金属离子的溶液做电镀液。阳极 {PLATING.plate.anodeEq}，阴极 {PLATING.plate.cathodeEq}，电镀液里 Cu²⁺ 的浓度不变</li>
            <li>电解精炼铜：粗铜做阳极，纯铜做阴极。粗铜里比铜活泼的锌、铁等也失电子成为离子进入溶液，但它们不会在阴极析出；不如铜活泼的银、金不失电子，沉在槽底成为阳极泥</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">为了看得清，镀层的生长和阳极的变薄都画得比实际快、比实际厚。</p>
        </>} />}
      finale={T_.finale && <Fin tag="镀铜和精炼都做过了" big="阳极溶解，阴极析出，都是 Cu²⁺ + 2e⁻ = Cu">转移 {PLATE_NE} mol 电子，阴极都增重 {res.gain.toFixed(1)} g。电镀时阳极减轻同样多，Cu²⁺ 浓度不变；精炼时阳极还有锌、铁溶解，银、金{crudeFate('Ag') === 'mud' ? '成了阳极泥' : ''}。</Fin>}
      panel={
        <Panel className="px-4 py-4">
          <h2 className="text-[12.5px] text-white/55">{P.name}</h2>
          <table className="mt-2 w-full text-[14px] leading-snug">
            <tbody className="[&_td]:py-1.5 [&_td]:align-top [&_td:first-child]:w-[30%] [&_td:first-child]:text-white/55">
              <tr><td>阳极</td><td>{P.anode}<div className="text-[13px] text-white/60">{P.anodeEq}</div></td></tr>
              <tr><td>阴极</td><td>{P.cathode}<div className="text-[13px] text-white/60">{P.cathodeEq}</div></td></tr>
              <tr><td>电镀液</td><td>{P.bath}</td></tr>
            </tbody>
          </table>
          <h2 className="mt-4 text-[12.5px] text-white/55">通电一次</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol={<>n(e⁻)</>} value={String(PLATE_NE)} unit="mol · 转移的电子" />
            <ParamTile symbol="Δm(阴极)" value={rec[mode] ? `+${res.gain.toFixed(1)}` : '—'} unit="g" />
            <ParamTile symbol="Δm(阳极)" value={rec[mode] ? (res.anodeLoss !== null ? `−${res.anodeLoss.toFixed(1)}` : '≠ 6.4') : '—'} unit="g" />
            <ParamTile symbol={<>c(Cu²⁺)</>} value={rec[mode] ? res.cu : '—'} unit="电镀液" />
          </div>
          {(on || ran) && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">放大窗里的粒子（示意）</h2>
            <Legend items={refine ? ['Cu2', 'SO4', 'Zn2', 'Fe2', 'Cu', 'e'] : ['Cu2', 'SO4', 'Cu', 'e']} />
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'dip'} pulse={next === 'dip'} onClick={() => setDown(true)} disabled={down || mode !== wantMode && !!task}>吊进镀槽</LabButton>
        <LabButton primary={next === 'on'} pulse={next === 'on'} onClick={() => run.run()} disabled={!seated || run.busy || ran}>通电</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={!ran || rec[mode]}>记录</LabButton>
      </>}
      extras={
        <Control label="做哪一种">
          <Segmented label="做法" pulse={next === 'mode'} want={next === 'mode' ? wantMode : null} value={mode} onChange={m => pick(m as PlateKey)} disabled={run.busy} options={[{ value: 'plate', label: '铁件镀铜' }, { value: 'refine', label: '精炼铜' }]} />
        </Control>
      }
    />
  )
}
