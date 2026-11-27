// 空气和氧气 · 第 3 课 氧气里的燃烧：化验室的台式通风橱里并排两只集气瓶（氧气、空气），中间一盏酒精灯，左边白瓷片上摆着木炭、硫、铁丝。
// 样品先在酒精灯上加热，再伸进瓶里：同一样东西，在空气里和在氧气里烧起来是两副样子。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { AlcoholLamp, GasJar, GlassPlate, Glove, JAR, LAMP_TOP, LiquidBody, Tile } from './gear'
import { Hood, IronSpiral, Powder, Spoon, Tongs } from './kit'
import { Drips, Flame, Puffs, type PuffOpt } from './fx'
import { LESSONS, goLesson } from './lessons'
import { bottleLabel } from './mats'
import { ease, liftPath, seg, useRun } from './parts'
import { GAS_NAME, O2_FRAC, SAMPLES, burnAt, phenomenon, type Gas, type Sample } from './physics'
import { BZ, M, Place, ST, TOP, type V3 } from './world'

const u = (v: number) => v * M
const X0 = ST.l3, Z0 = BZ - 0.15, FLOOR = 0.012
const at = (x: number, y: number, z = 0): V3 => [X0 + u(x), TOP + u(y), Z0 + u(z)]
const JX: Record<Gas, number> = { o2: -0.085, air: 0.085 }
const REST: Record<Sample, V3> = { c: [-0.27, 0.03, 0.16], s: [-0.22, 0.03, 0.09], fe: [-0.3, 0.024, 0.03] }
const FIRE: V3 = [0, FLOOR + LAMP_TOP + 0.04, 0.14], HIGH = 0.33
const inJar = (g: Gas): V3 => [JX[g], FLOOR + JAR.h - 0.065, 0]
const TASKS: Task[] = [
  { id: 'c', text: '把木炭送进氧气瓶，记下现象', note: '木炭在氧气里剧烈燃烧，发出白光' },
  { id: 'fe', text: '换铁丝（绕成螺旋、末端系火柴），记下现象', note: '铁丝在氧气里剧烈燃烧，火星四射，生成黑色固体' },
  { id: 'air', text: '同样两样在空气里再做一次，比一比', note: '在空气里，木炭只是红热，铁丝烧不起来' },
]
/** 铁丝燃烧溅出的火星 */
const SPARK: PuffOpt = { rate: 70, life: 0.55, size: [u(0.012), u(0.003)], speed: u(0.5), spread: 1, color: '#ffe2a8', opacity: 1, accel: [0, -u(0.9), 0], drag: 0.6, additive: true }

export default function Lesson3() {
  const [sample, setSample] = useState<Sample>('c')
  const [gas, setGas] = useState<Gas>('o2')
  const [shown, setShown] = useState<string | null>(null)     // 刚做完、还没记录的那一次
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:air:3', TASKS)
  const run = useRun(8.4, () => setShown(`${sample}-${gas}`))
  const busy = run.busy
  const send = (g: Gas) => { if (busy) return; setGas(g); setShown(null); run.run() }
  const record = () => {
    if (!shown || rows.includes(shown)) return
    const next = [...rows, shown]; setRows(next)
    T.check(id => (id === 'c' ? next.includes('c-o2') : id === 'fe' ? next.includes('fe-o2') : next.includes('c-air') && next.includes('fe-air')))
  }
  const resetAll = () => { run.snap(0); setSample('c'); setGas('o2'); setShown(null); setRows([]); T.reset() }
  const pick = (s: Sample) => { if (busy) return; setSample(s); setShown(null) }

  const task = T.current
  /** 这一步该做哪一样、送进哪一瓶 */
  const need = !task ? null : task.id === 'c' ? { s: 'c' as Sample, g: 'o2' as Gas } : task.id === 'fe' ? { s: 'fe' as Sample, g: 'o2' as Gas } : !rows.includes('c-air') ? { s: 'c' as Sample, g: 'air' as Gas } : { s: 'fe' as Sample, g: 'air' as Gas }
  const S = SAMPLES[sample], tier = burnAt(O2_FRAC[gas]), t = busy ? run.t : 0, inside = busy && t > 3.9 && t < 7.2
  const fresh = !!shown && !rows.includes(shown)
  const { hint, next }: { hint: string; next: Gas | 'rec' | 'sample' | null } = !task || !need ? { hint: '氧气能支持燃烧：在氧气里，木炭发白光，硫的火焰是蓝紫色，铁丝火星四射。', next: null }
    : busy ? { hint: t < 2.7 ? `夹起${S.name}，先在酒精灯上加热…` : `${S.name}在${GAS_NAME[gas]}里：${phenomenon(sample, gas)}`, next: null }
    : fresh ? { hint: '记下看到的现象', next: 'rec' }
    : sample !== need.s ? { hint: `样品换成${SAMPLES[need.s].name}`, next: 'sample' }
    : { hint: `把${S.name}送进${GAS_NAME[need.g]}瓶`, next: need.g }

  // 夹着样品的工具：瓷片 → 酒精灯火焰上 → 瓶里 → 回瓷片
  const rest = REST[sample], J = inJar(gas)
  const tip: V3 = !busy ? rest : t < 2.7 ? liftPath(rest, FIRE, HIGH, seg(t, 0, 1.2)) : t < 7.2 ? liftPath(FIRE, J, HIGH, seg(t, 2.7, 3.9)) : liftPath(J, rest, HIGH, seg(t, 7.2, 8.4))
  const heat = busy ? ease(seg(t, 1.3, 2.6)) : 0                      // 在酒精灯上烧热的程度
  const k = inside ? ease(seg(t, 3.9, 4.5)) * (1 - ease(seg(t, 6.6, 7.2))) : 0   // 在瓶里烧得多旺
  const rich = tier === 'o2'
  const afterglow = busy ? heat * (1 - ease(seg(t, 7.2, 8.2))) : 0
  const slide = (g: Gas) => (busy && g === gas ? ease(seg(t, 2.9, 3.5)) - ease(seg(t, 7.4, 8.1)) : 0)
  const burnt = sample === 'fe' && rich && busy ? 0.75 * seg(t, 4.2, 6.9) : 0
  const tp = at(tip[0], tip[1], tip[2])

  const labels: Label[] = [
    { id: 'o2', at: at(JX.o2, FLOOR - 0.012, 0.06), ax: 0.5, className: 'scene-name', children: '氧气 100%' },
    { id: 'air', at: at(JX.air, FLOOR - 0.012, 0.06), ax: 0.5, className: 'scene-name', children: '空气 · 氧气 21%' },
    ...(inside ? [{ id: 'ph', at: at(JX[gas], FLOOR + JAR.h + 0.06, 0), ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{S.name}在{GAS_NAME[gas]}里</small>{phenomenon(sample, gas).split('，')[rich && sample !== 's' ? 1 : 0]}</> } as Label] : []),
    { id: 'n1', at: at(-0.25, FLOOR - 0.012, 0.22), ax: 0.5, name: true, className: 'scene-name', children: '木炭 · 硫 · 铁丝' },
    { id: 'n2', at: at(0.05, FLOOR + 0.02, 0.2), ax: 0, name: true, className: 'scene-name -translate-y-1/2', children: '酒精灯' },
  ]
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['3'], VOICE)} actionsLabel="把样品送进瓶里"
      stage={<Place at="l3" labels={labels} bloom={0.6}>
        <group position={at(0, 0)}><Hood /></group>
        {/* 两只集气瓶：瓶底留一点水；玻璃片在样品伸进去时推开 */}
        {(['o2', 'air'] as Gas[]).map(g => <group key={g} position={at(JX[g], FLOOR)} onClick={e => { e.stopPropagation(); send(g) }}>
          <GasJar />
          <group position-y={u(0.004)}><LiquidBody r={u(JAR.r - 0.003)} h={u(0.012)} color="#bfe0ea" opacity={0.4} /></group>
          <mesh position-y={u(0.05)} rotation-y={0.45}><cylinderGeometry args={[u(JAR.r + 0.0006), u(JAR.r + 0.0006), u(0.032), 32, 1, true, -0.8, 1.6]} /><meshStandardMaterial map={bottleLabel(GAS_NAME[g], g === 'o2' ? '#2f6fb3' : '#7b8085')} roughness={0.7} side={THREE.DoubleSide} /></mesh>
          <group position={[u(0.055) * slide(g) * (g === 'o2' ? -1 : 1), u(JAR.h), -u(0.01) * slide(g)]}><GlassPlate s={0.078} /></group>
        </group>)}
        {/* 酒精灯一直点着 */}
        <group position={at(0, FLOOR, 0.14)}><AlcoholLamp /></group>
        <Flame at={at(0, FLOOR + LAMP_TOP, 0.14)} w={u(0.03)} h={u(0.062)} kind="alcohol" level={1} seed={1} light={0.5} />
        {/* 白瓷片上的三样样品：正在用的那一样被夹走 */}
        <group position={at(-0.25, FLOOR, 0.1)}><Tile w={0.14} d={0.2} /></group>
        {(busy && sample === 'c') || <mesh position={at(REST.c[0], FLOOR + 0.016, REST.c[2])} rotation={[0.3, 0.5, 0.1]} onClick={e => { e.stopPropagation(); pick('c') }} castShadow><dodecahedronGeometry args={[u(0.012), 0]} /><meshStandardMaterial color="#1a1817" roughness={0.9} flatShading /></mesh>}
        {(busy && sample === 's') || <group position={at(REST.s[0], FLOOR + 0.007, REST.s[2])} onClick={e => { e.stopPropagation(); pick('s') }}><Powder r={0.014} color="#e3c93a" /></group>}
        {(busy && sample === 'fe') || <group position={at(REST.fe[0] + 0.05, FLOOR + 0.012, REST.fe[2])} rotation-z={Math.PI / 2} onClick={e => { e.stopPropagation(); pick('fe') }}><IronSpiral /></group>}
        {/* 手里的工具和样品 */}
        {busy && <group position={tp}>
          {sample === 'c' && <>
            <Tongs />
            <mesh rotation={[0.3, 0.5, 0.1]}><dodecahedronGeometry args={[u(0.012), 0]} /><meshStandardMaterial color="#1a1817" roughness={0.9} flatShading emissive={rich && k > 0.1 ? '#fff4e0' : '#ff3a10'} emissiveIntensity={Math.max(afterglow * 1.6, k * (rich ? 4.5 : 2.2))} /></mesh>
            {rich && k > 0.05 && <pointLight color="#fff6e6" intensity={k * 5} distance={u(0.8)} decay={1.8} />}
          </>}
          {sample === 's' && <Spoon len={0.2}><group position-y={-u(0.004)}><Powder r={0.0105} color="#e3c93a" /></group></Spoon>}
          {sample === 'fe' && <IronSpiral hot={Math.max(afterglow, k)} burnt={burnt} match={t < 2.2} />}
        </group>}
        {/* 硫的火焰：空气里微弱的淡蓝色，氧气里明亮的蓝紫色 */}
        {sample === 's' && <Flame at={[tp[0], tp[1] + u(0.004), tp[2]]} w={u(rich && k > 0.3 ? 0.05 : 0.02)} h={u(rich && k > 0.3 ? 0.085 : 0.03)} kind={rich && k > 0.3 ? 'sulfurO2' : 'sulfurAir'} level={busy ? Math.max(heat * (t < 7.2 ? 1 : 1 - seg(t, 7.2, 8)), 0) : 0} seed={4} light={rich ? k * 2.4 : 0.2} lightColor="#8a7dff" />}
        {/* 铁丝：火柴先着；氧气里火星四射，熔化的黑色小球掉进水里 */}
        {sample === 'fe' && <Flame at={[tp[0] + u(0.006), tp[1] - u(0.03), tp[2]]} w={u(0.016)} h={u(0.035)} kind="wood" level={busy && t > 1.4 && t < 4.3 ? 1 : 0} seed={6} light={0.4} />}
        <Puffs at={[tp[0] + u(0.006), tp[1] + u(0.07 * burnt / 0.75), tp[2]]} on={sample === 'fe' && rich && k > 0.4} opt={SPARK} seed={8} />
        <Drips at={[tp[0] + u(0.006), tp[1] + u(0.06 * burnt / 0.75), tp[2]]} drop={u(0.05)} on={sample === 'fe' && rich && k > 0.4} every={0.5} r={u(0.0028)} color="#1b1a1c" />
      </Place>}
      lesson={<LessonBlock no="3" title="氧气里的燃烧" concept="氧气自己不烧，但能让别的东西烧得更旺" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>氧气的化学性质比较活泼，能<b className="text-white">支持燃烧</b>（有助燃性），但它本身不能燃烧。同一种物质，在氧气里比在空气里燃烧得更剧烈。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>木炭：在空气里持续红热；在氧气里剧烈燃烧，发出白光，生成的气体能使澄清石灰水变浑浊</li>
            <li>硫：在空气里发出微弱的淡蓝色火焰；在氧气里发出明亮的蓝紫色火焰，生成有刺激性气味的气体</li>
            <li>铁丝：在空气里只能烧到红热；在氧气里剧烈燃烧，火星四射，生成黑色固体</li>
          </ul>
          <p className="mt-3">做铁丝实验时，铁丝绕成螺旋状，末端系一根火柴引燃；集气瓶底要留少量水或铺一层细沙，防止溅落的熔化物炸裂瓶底。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">氧气瓶和空气瓶都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">氧气能支持燃烧，氧气越浓，烧得越旺</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">木炭在氧气里发出白光，在空气里只是红热；铁丝在氧气里火星四射，在空气里烧不起来。硫可以自己再试一试。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">瓶里氧气的体积分数</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{O2_FRAC[gas]}<span className="ml-1 text-[15px] font-medium text-white/55">%</span></div>
            <div className="mt-1.5 text-[13px] text-white/60">{GAS_NAME[gas]}瓶 · 样品：{S.name}</div>
          </div>
          <div className="mt-4 min-h-[64px] rounded-xl bg-white/8 px-3.5 py-3 text-[14.5px] leading-relaxed">{inside || shown === `${sample}-${gas}` ? phenomenon(sample, gas) : <span className="text-white/45">样品伸进瓶里以后，这里写出看到的现象</span>}</div>
          <h2 className="mt-5 text-[12.5px] text-white/55">记录</h2>
          <table className="mt-2 w-full text-[13px]">
            <thead><tr className="text-white/50"><th className="pb-1 text-left font-normal">样品</th><th className="pb-1 text-left font-normal">空气里</th><th className="pb-1 text-left font-normal">氧气里</th></tr></thead>
            <tbody>{(['c', 's', 'fe'] as Sample[]).map(s => <tr key={s} className="border-t border-white/10 align-top"><td className="py-1.5 pr-2 whitespace-nowrap">{SAMPLES[s].name}</td>{(['air', 'o2'] as Gas[]).map(g => <td key={g} className="py-1.5 pr-1.5 text-white/80">{rows.includes(`${s}-${g}`) ? phenomenon(s, g).split('，').slice(0, 2).join('，') : <span className="text-white/30">—</span>}</td>)}</tr>)}</tbody>
          </table>
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'o2'} pulse={next === 'o2'} onClick={() => send('o2')} disabled={busy}>送进氧气瓶</LabButton>
        <LabButton primary={next === 'air'} pulse={next === 'air'} onClick={() => send('air')} disabled={busy}>送进空气瓶</LabButton>
        <LabButton primary={next === 'rec'} pulse={next === 'rec'} onClick={record} disabled={busy || !fresh}>记录现象</LabButton>
      </>}
      extras={
        <Control label="样品">
          <Segmented label="样品" pulse={next === 'sample'} want={need?.s ?? null} value={sample} disabled={busy} onChange={s => pick(s as Sample)} options={(['c', 's', 'fe'] as Sample[]).map(s => ({ value: s, label: SAMPLES[s].name }))} />
        </Control>
      }
    />
  )
}
