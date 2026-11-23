// 物态变化 · 第 6 课 升华和凝华（碘在热水里升华、遇冷凝华；干冰升华吸热，罐壁上结霜）
import { useEffect, useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, shell, useTasks, type Label } from '@/lab-kit'
import { Frost, Micro, Puffs } from './fx'
import { Block, Flask, Liquid, TROUGH, Trough } from './gear'
import { LESSONS, goLesson } from './lessons'
import { Big, Carry, Done, H2, Room, useRun } from './parts'
import { CHANGES, DRYICE, IODINE, dryIceLeft, frostOn, iodineBack, iodineGas } from './physics'
import { Triangle } from './views'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Exp = 'iodine' | 'dryice'
const SEG: Record<Exp, string> = { iodine: '碘', dryice: '干冰' }
const TASKS: Task[] = [
  { id: 'sub', text: '把装着碘的锥形瓶放进热水，看瓶里出现什么', note: '瓶里充满紫色的碘蒸气，没有出现液态的碘：固态直接变成气态，是升华' },
  { id: 'dep', text: '再把它移到冷水里，看瓶壁上出现什么', note: '紫色褪去，瓶壁上长出黑色的碘晶体：气态直接变成固态，是凝华' },
  { id: 'frost', text: '换成干冰：把干冰放进金属罐，看罐的外壁', note: '外壁结了一层白霜：空气里的水蒸气遇到很冷的罐壁，凝华成小冰晶' },
  { id: 'ice', text: '等干冰全部消失，看罐里有没有留下液体', note: '罐里是干的：干冰直接变成了气体，是升华，要吸热' },
]
const X = ST.s6, Z = 0.4, HOT: [number, number, number] = [X - 0.85, TOP, Z], COLD: [number, number, number] = [X + 0.85, TOP, Z], REST: [number, number, number] = [X, TOP, Z + 0.95]
const CAN = { r: 0.24, h: 0.62 }, CAN_AT: [number, number, number] = [X - 0.15, TOP + 0.12, Z], DISH: [number, number, number] = [X + 0.95, TOP, Z + 0.35]
const CAN_G = shell([[0, 0], [0.22, 0], [0.24, 0.02], [0.24, 0.6], [0.245, 0.62]], 0.012, { segs: 48 })
const DISH_G = shell([[0, 0], [0.3, 0], [0.32, 0.015], [0.32, 0.1]], 0.012, { segs: 48 })
const rnd = (i: number, k: number) => { const s = Math.sin(i * 12.9 + k * 78.2) * 43758.5; return s - Math.floor(s) }
const GRAINS = Array.from({ length: 22 }, (_, i) => ({ p: [(rnd(i, 1) - 0.5) * 0.36, 0.012 + rnd(i, 2) * 0.03, (rnd(i, 3) - 0.5) * 0.36] as [number, number, number], s: 0.02 + rnd(i, 4) * 0.022, r: rnd(i, 5) * 3 }))
/** 凝华出来的碘：长在瓶壁上半截和瓶颈里 */
const SEEDS = Array.from({ length: 46 }, (_, i) => { const y = 0.3 + rnd(i, 1) * 0.42, a = rnd(i, 2) * Math.PI * 2, r = y < 0.57 ? 0.27 - (y - 0.06) / 0.52 * 0.19 : 0.085; return { p: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number], s: 0.012 + rnd(i, 3) * 0.018, r: rnd(i, 4) * 3, th: rnd(i, 5) * 0.7 } })
const ICE = Array.from({ length: 7 }, (_, i) => ({ p: [(rnd(i, 6) - 0.5) * 0.24, 0.05 + (i % 3) * 0.07, (rnd(i, 7) - 0.5) * 0.24] as [number, number, number], r: rnd(i, 8) * 3 }))

export default function Lesson6() {
  const [exp, setExp] = useState<Exp>('iodine')
  const [where, setWhere] = useState<'rest' | 'hot' | 'cold'>('rest')
  const [put, setPut] = useState(false)
  const [t1, setT1] = useRun(where === 'hot', 1, IODINE.up + 1.6), [t2, setT2] = useRun(where === 'cold', 1, IODINE.down + 1.6)
  const [t3, setT3] = useRun(put, 1, DRYICE.gone + 0.5)
  const T = useTasks('gewu:phase:6', TASKS)
  // 搬过去要一秒半，到了水里才开始变
  const up = iodineGas(t1 - 1.6), gas = where === 'cold' ? iodineBack(up, t2 - 1.6) : up, back = (up - gas) / IODINE.most
  const left = dryIceLeft(t3 - 0.5), frost = frostOn(t3 - 0.5)
  useEffect(() => { T.check(id => id === 'sub' ? where === 'hot' && gas >= IODINE.most - 1e-6 : id === 'dep' ? where === 'cold' && t2 >= IODINE.down + 1.6 : id === 'frost' ? frost >= 1 : put && left <= 0) })
  const pick = (e: Exp) => setExp(e)
  const resetAll = () => { setExp('iodine'); setWhere('rest'); setPut(false); setT1(0); setT2(0); setT3(0); T.reset() }
  const task = T.current, need: Exp = task && (task.id === 'frost' || task.id === 'ice') ? 'dryice' : 'iodine'
  const { hint, next }: { hint: string; next: 'exp' | 'a' | 'b' | null } = !task ? { hint: '升华吸热，凝华放热：固态和气态之间可以直接变，不经过液态。', next: null }
    : exp !== need ? { hint: `换成“${SEG[need]}”`, next: 'exp' }
    : task.id === 'sub' ? (where === 'rest' ? { hint: '瓶底有几粒黑色的碘。按“放进热水”', next: 'a' } : { hint: '热水的温度比碘的熔点低，碘不会熔化。看瓶里的颜色…', next: null })
    : task.id === 'dep' ? (where === 'hot' ? { hint: '瓶里全是紫色的碘蒸气了。按“移到冷水里”', next: 'b' } : { hint: '碘蒸气遇冷，看瓶壁的上半截…', next: null })
    : !put ? { hint: '盘子里是干冰（固态的二氧化碳），温度很低。按“放入干冰”', next: 'a' }
    : { hint: task.id === 'frost' ? '罐壁越来越冷，外面开始发白…' : '干冰越来越小，罐底一滴液体也没有…', next: null }
  const at = where === 'hot' ? [HOT[0], TOP + 0.02, HOT[2]] as [number, number, number] : where === 'cold' ? [COLD[0], TOP + 0.02, COLD[2]] as [number, number, number] : REST
  const lens = useMemo<[number, number, number]>(() => exp === 'iodine' ? [X + 0.05, TOP + 1.3, Z - 0.5] : [X + 1.0, TOP + 0.95, Z - 0.5], [exp])
  const labels: Label[] = exp === 'iodine' ? [
    { id: 'h', at: [HOT[0], TOP + 0.02, Z + 0.62], ax: 0.5, name: true, className: 'scene-name translate-y-2', children: '热水' },
    { id: 'c', at: [COLD[0], TOP + 0.02, Z + 0.62], ax: 0.5, name: true, className: 'scene-name translate-y-2', children: '冷水' },
    { id: 'g', at: [at[0] + 0.32, at[1] + 0.45, at[2]], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: gas > 0.05 || back > 0.3 ? 1 : 0 }, children: where === 'cold' && back > 0.5 ? '瓶壁上的碘晶体' : '紫色的碘蒸气' },
    { id: 'm', at: [lens[0], lens[1] + 0.5, lens[2]], ax: 0.5, className: 'scene-name -translate-y-full', children: '放大看：碘的粒子' },
  ] : [
    { id: 'f', at: [CAN_AT[0] - CAN.r - 0.02, CAN_AT[1] + 0.34, Z], ax: 1, className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: frost > 0.3 ? 1 : 0 }, children: '白霜' },
    { id: 'd', at: [DISH[0] + 0.36, TOP + 0.1, DISH[2]], name: true, className: 'scene-name', children: '干冰' },
    { id: 'm', at: [lens[0], lens[1] + 0.5, lens[2]], ax: 0.5, className: 'scene-name -translate-y-full', children: '放大看：干冰的粒子' },
  ]
  const ice = <meshPhysicalMaterial color="#f2f7fa" roughness={0.45} clearcoat={0.3} />
  return (
    <LabShell title="物态变化" lessons={LESSONS} current="6" narration={voiced(NARRATION['6'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={exp === 'iodine' ? '装着碘的锥形瓶' : '干冰'}
      stage={<Room at={exp === 'iodine' ? 's6' : 's6b'} labels={labels}>
        {exp === 'iodine' ? <>
          <Trough at={HOT} level={0.3} color="#e9a878" o={0.2} /><Puffs at={[HOT[0], TOP + TROUGH.h, Z]} on={1} n={14} len={0.7} size={0.42} spread={0.3} dense={0.9} speed={0.25} color="#e6ecf0" />
          <Trough at={COLD} level={0.3} color="#3b8fcf">{[[-0.3, 0.1], [0.28, -0.2], [0.1, 0.33], [-0.2, -0.3]].map(([ix, iz], i) => <RoundedBox key={i} args={[0.13, 0.12, 0.12]} radius={0.02} smoothness={2} position={[ix, 0.3, iz]} rotation={[i, i * 2, i * 0.7]}><meshPhysicalMaterial color="#eef7fb" transparent opacity={0.85} roughness={0.2} clearcoat={0.8} /></RoundedBox>)}</Trough>
          <Carry at={at}>
            <Flask plug="glass">
              {GRAINS.map((g, i) => <mesh key={i} position={g.p} rotation={[g.r, g.r * 2, g.r]} scale={g.s * (1 - 0.75 * up / IODINE.most)}><octahedronGeometry args={[1, 0]} /><meshPhysicalMaterial color="#1c1424" roughness={0.25} metalness={0.5} clearcoat={0.6} flatShading /></mesh>)}
              {SEEDS.map((g, i) => { const k = Math.min(1, Math.max(0, (back * 1.7 - g.th) / 0.5)); return k > 0.02 && <mesh key={i} position={g.p} rotation={[g.r, g.r * 2, g.r]} scale={g.s * k}><octahedronGeometry args={[1, 0]} /><meshPhysicalMaterial color="#1c1424" roughness={0.25} metalness={0.5} clearcoat={0.6} flatShading /></mesh> })}
              {gas > 0.01 && <mesh position-y={0.33} renderOrder={2}><cylinderGeometry args={[0.085, 0.27, 0.62, 32]} /><Liquid color="#8a3fb8" o={0.55 * gas / IODINE.most} /></mesh>}
            </Flask>
            <Puffs at={[0, 0.12, 0]} on={gas / IODINE.most} n={12} len={0.4} size={0.3} spread={0.14} color="#9a4fd0" dense={0.5} swirl order={2} />
          </Carry>
          <Micro at={lens} R={0.44} liquid={0} gas={0.8 * gas / IODINE.most} tone="#b06fe0" />
        </> : <>
          <Block at={[CAN_AT[0], TOP, Z]} size={[0.8, 0.12, 0.8]} />
          <group position={CAN_AT}>
            <mesh geometry={CAN_G} castShadow><Metal kind="aluminum" grain="brushed" rough={0.45} env={1.4} /></mesh>
            <Frost r={CAN.r} h={CAN.h * 0.8} grow={frost} />
            {put && left > 0.01 && ICE.slice(0, 4).map((c, i) => <RoundedBox key={i} args={[0.13, 0.11, 0.12]} radius={0.02} smoothness={2} position={[c.p[0] * 0.8, c.p[1] + 0.02, c.p[2] * 0.8]} rotation={[c.r, c.r * 2, c.r]} scale={Math.cbrt(left)}>{ice}</RoundedBox>)}
            <Puffs at={[0, CAN.h, 0]} on={put && left > 0 ? 1 : 0} dir={[0.5, -0.55, 0.5]} len={0.9} size={0.5} spread={0.26} dense={1.8} speed={0.3} n={26} color="#eef2f5" />
            <Puffs at={[0, CAN.h - 0.1, 0]} on={put && left > 0 ? 1 : 0} n={10} len={0.3} size={0.34} spread={0.12} dense={1.2} speed={0.3} color="#eef2f5" />
          </group>
          <mesh geometry={DISH_G} position={DISH} renderOrder={3}><meshPhysicalMaterial color="#1b2a31" transparent opacity={0.3} roughness={0.03} clearcoat={1} depthWrite={false} side={THREE.DoubleSide} /></mesh>
          {ICE.map((c, i) => (!put || i >= 4) && <RoundedBox key={i} args={[0.13, 0.11, 0.12]} radius={0.02} smoothness={2} position={[DISH[0] + c.p[0] * 1.5, TOP + c.p[1] - 0.03, DISH[2] + c.p[2] * 1.5]} rotation={[c.r, c.r * 2, c.r]}>{ice}</RoundedBox>)}
          <Puffs at={[DISH[0], TOP + 0.1, DISH[2]]} on={1} n={10} dir={[0.3, -0.1, 0.6]} len={0.7} size={0.36} spread={0.25} dense={0.3} speed={0.2} />
          <Micro at={lens} R={0.44} liquid={0} gas={put ? 1 - left : 0} tone="#cfe6f5" from={[CAN_AT[0] + 0.1, CAN_AT[1] + 0.5, Z]} />
        </>}
      </Room>}
      lesson={<LessonBlock no="6" title="升华和凝华" concept="固态和气态之间可以直接变" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>物质从固态直接变成气态叫<b className="text-white">升华</b>，从气态直接变成固态叫<b className="text-white">凝华</b>。升华吸热，凝华放热。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>升华：樟脑丸越放越小；冰冻的衣服也能晾干；用久了的灯泡，灯丝变细</li>
            <li>凝华：霜；冬天窗玻璃上的冰花；雾凇</li>
            <li>干冰升华时从周围吸收大量的热，可以用来冷藏食物、人工降雨</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">加热碘用热水而不直接用酒精灯：热水的温度低于碘的熔点，可以确定紫色的蒸气是固态的碘直接变成的。干冰周围的“白气”不是二氧化碳，是空气里的水蒸气遇冷液化成的小水滴。</p>
        </>} />}
      finale={T.finale && <Done head="四步都做完了" title="升华吸热，凝华放热" onClose={() => T.setFinale(false)}>碘受热直接变成紫色的蒸气，遇冷又直接变回晶体；干冰直接变成气体，把罐壁冷得结了霜。这两种变化都不经过液态。</Done>}
      panel={
        <Glass className="px-4 py-4">
          {exp === 'iodine'
            ? <><Big label="瓶里的碘蒸气" value={gas < 0.03 ? '没有' : gas < IODINE.most * 0.6 ? '淡紫色' : '深紫色'} unit="" />
                <div className="mt-4 grid grid-cols-2 gap-2"><ParamTile symbol="瓶底的碘" value={up > 0.3 ? '变少了' : '几小粒'} unit="固态" /><ParamTile symbol="瓶壁上" value={back > 0.5 ? '长出晶体' : '干净'} unit="上半截和瓶颈" /></div></>
            : <><Big label="干冰还剩" value={put ? String(Math.round(left * 100)) : '100'} unit="%" />
                <div className="mt-4 grid grid-cols-2 gap-2"><ParamTile symbol="罐里的液体" value="没有" unit="始终是干的" /><ParamTile symbol="罐外壁" value={frost <= 0 ? '干净' : frost < 1 ? '开始发白' : '一层白霜'} unit="水蒸气凝华" /></div></>}
          <H2>固态和气态之间</H2>
          <Triangle shown={[...(T.done.sub || T.done.ice ? ['sublime' as const] : []), ...(T.done.dep || T.done.frost ? ['deposit' as const] : [])]} />
          <p className="mt-2 text-[12.5px] text-white/55">{CHANGES.sublime.name}{CHANGES.sublime.heat}，{CHANGES.deposit.name}{CHANGES.deposit.heat}。</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'a'} onClick={() => exp === 'iodine' ? setWhere('hot') : setPut(true)} disabled={exp === 'iodine' ? where !== 'rest' : put}>{exp === 'iodine' ? '放进热水' : '放入干冰'}</LabButton>
        {exp === 'iodine' && <LabButton pulse={next === 'b'} onClick={() => setWhere('cold')} disabled={where !== 'hot' || gas < IODINE.most - 1e-6}>移到冷水里</LabButton>}
      </>}
      extras={<Control label="用什么做"><Segmented label="用什么做" pulse={next === 'exp'} want={next === 'exp' ? need : null} value={exp} onChange={pick} options={(['iodine', 'dryice'] as Exp[]).map(k => ({ value: k, label: SEG[k] }))} /></Control>}
    />
  )
}
