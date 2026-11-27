// 空气和氧气 · 拓展课：三个小实验共用一页。化验室里往密封盒里放一包脱氧剂，看盒里的氧气一天天变少；
// 灌装台上给三支稀有气体灯管通电、放开氦气球和空气球；厂门口和厂界各采一次样，比较两处的读数。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass as Panel, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, useSlide, useTasks, type Label } from '@/lab-kit'
import { Glass, Glove, Hose } from './gear'
import { LESSONS, goLesson } from './lessons'
import { bottleLabel, gaugeTex, makeSign } from './mats'
import { ease, liftPath, seg, useRun } from './parts'
import { DUST, RHO, SCAVENGE, floats, heliumRatio, type Site } from './physics'
import { BZ, KIOSK, M, Place, ST, TOP, type V3 } from './world'

const u = (v: number) => v * M
type Which = 'a' | 'b' | 'c'
const NAMES: Record<Which, string> = { a: '脱氧剂', b: '稀有气体', c: '空气检测' }
const TASKS: Task[] = [
  { id: 'a', text: '把脱氧剂放进密封盒，隔几天看氧气指示表', note: '脱氧剂里的铁粉和氧气发生缓慢氧化，盒里的氧气越来越少' },
  { id: 'b', text: '给稀有气体灯管通电，再放开氦气球和空气球', note: '稀有气体通电时发出不同颜色的光；氦气比空气轻得多' },
  { id: 'c', text: '在厂门口和厂界各采一次样，比较读数', note: '不同地点的空气质量不一样，要用仪器定点监测' },
]
/** 脱氧剂：盒子、指示表的位置（相对化验台这一格，m） */
const AX = ST.x1, AZ = BZ + 0.1
const a3 = (x: number, y: number, z = 0): V3 => [AX + u(x), TOP + u(y), AZ + u(z)]
/** 灌装台上的灯管架、两只气球 */
const BX = ST.fill, BY = 1, BZ0 = 3.4, TUBES = [{ k: 'he', name: '氦', c: '#ffb48f' }, { k: 'ne', name: '氖', c: '#ff4a22' }, { k: 'ar', name: '氩', c: '#a98bff' }] as const
/** 两处采样站的位置 */
const SITE: Record<Site, { at: V3; name: string }> = { gate: { at: [KIOSK.x - 14, 0, KIOSK.z + 5], name: '厂门口（靠近公路）' }, edge: { at: [ST.pole, 0, 6], name: '厂界（绿化带旁）' } }

/** 气球：一只略长的球，下面一个小结和一根线。原点在气球中心，线长 len */
function Balloon({ color, len }: { color: string; len: number }) {
  return <group>
    <mesh scale={[1, 1.18, 1]} castShadow><sphereGeometry args={[1.25, 32, 24]} /><meshPhysicalMaterial color={color} roughness={0.22} clearcoat={0.8} clearcoatRoughness={0.2} transparent opacity={0.93} /></mesh>
    <mesh position-y={-1.52}><coneGeometry args={[0.16, 0.22, 12]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
    {len > 0.05 && <mesh position-y={-1.6 - len / 2}><cylinderGeometry args={[0.018, 0.018, len, 6]} /><meshStandardMaterial color="#e8e6df" roughness={0.8} /></mesh>}
  </group>
}

export default function LessonX() {
  const [which, setWhich] = useState<Which>('a')
  const T = useTasks('gewu:air:x', TASKS)
  // 脱氧剂
  const [day, setDay] = useState(-1)                  // −1 还没放；0 刚放进去；1–5 第几天
  const putIn = useRun(2.6, () => setDay(0))
  useEffect(() => { if (day < 0 || day >= 5) { if (day >= 5) T.check(id => id === 'a'); return } const t = setTimeout(() => setDay(d => d + 1), 1300); return () => clearTimeout(t) }, [day])   // eslint-disable-line react-hooks/exhaustive-deps
  const o2 = useSlide(day < 0 ? SCAVENGE[0] : SCAVENGE[day], 0.35)
  // 稀有气体
  const [lit, setLit] = useState(false), [freed, setFreed] = useState(false)
  const fly = useRun(5, () => T.check(id => id === 'b'))
  const glow = useSlide(lit ? 1 : 0, 1.2)
  // 空气检测
  const [site, setSite] = useState<Site>('gate'), [read, setRead] = useState<Site[]>([])
  const pump = useRun(4.2, () => { const r = read.includes(site) ? read : [...read, site]; setRead(r); T.check(id => id === 'c' && r.length === 2) })
  const sample = (s: Site) => { if (pump.busy) return; setSite(s); pump.run() }
  const busy = putIn.busy || (day >= 0 && day < 5) || fly.busy || pump.busy
  const resetAll = () => { putIn.snap(0); fly.snap(0); pump.snap(0); setWhich('a'); setDay(-1); setLit(false); setFreed(false); setSite('gate'); setRead([]); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'one' | 'two' | 'which' | null } = !task ? { hint: '氧气会让铁慢慢生锈，稀有气体通电会发光，空气质量要靠仪器监测。', next: null }
    : putIn.busy ? { hint: '把脱氧剂放进盒里，盖紧盖子…', next: null }
    : which === 'a' && day >= 0 && day < 5 ? { hint: `脱氧剂里的铁粉慢慢和氧气反应：第 ${day} 天…`, next: null }
    : fly.busy ? { hint: '氦气球往上飘，空气球慢慢落到地上…', next: null }
    : pump.busy ? { hint: `采样泵把${site === 'gate' ? '厂门口' : '厂界'}的空气抽进仪器…`, next: null }
    : which !== task.id ? { hint: `选“${NAMES[task.id as Which]}”`, next: 'which' }
    : which === 'a' ? { hint: '把一包脱氧剂放进密封盒', next: 'one' }
    : which === 'b' ? (!lit ? { hint: '给三支稀有气体灯管通电', next: 'one' } : { hint: '灯管亮了，颜色各不相同。再放开两只气球', next: 'two' })
    : !read.includes('gate') ? { hint: '先在厂门口采一次样', next: 'one' } : { hint: '再到厂界采一次样', next: 'two' }

  const tex = useMemo(() => ({ dial: gaugeTex(), bag: bottleLabel('脱氧剂', '#3a7f5a'), names: TUBES.map(t => makeSign([t.name], '#20262b', '#f2f4f5', 128, 128)), board: makeSign(['稀有气体通电发光'], '#20262b', '#f2f4f5', 640, 96) }), [])
  // 脱氧剂小包：从台面放进盒里；盒盖先掀着，放好以后盖上
  const pk = putIn.busy ? putIn.k : day >= 0 ? 1 : 0
  const bag = liftPath([0.2, 0.006, 0.17], [0.02, 0.014, 0.01], 0.26, seg(pk, 0.1, 0.66))
  // 盒盖平时盖着；放脱氧剂时掀到后上方，放好再盖回去
  const lid = putIn.busy ? ease(seg(pk, 0, 0.14)) - ease(seg(pk, 0.7, 1)) : 0
  // 气球：氦气球加速上升，空气球慢慢落地
  const ft = fly.busy ? fly.t : freed ? 5 : 0
  const heY = BY + 4.2 + (floats(RHO.he) ? 1.1 * ft * ft : 0), airY = BY + 4.2 - (floats(RHO.air) ? 0 : (4.2 - 1.48) * ease(seg(ft, 0, 4)))
  const here = SITE[site], pt = pump.busy ? pump.t : 0

  const labels: Label[] = which === 'a' ? [
    { id: 'd', at: a3(-0.04, 0.25, 0), ax: 0.5, className: `scene-tag ${day >= 5 ? 'key' : ''} -translate-y-full transition-opacity`, style: { opacity: day >= 0 ? 1 : 0 }, children: <><small>密封以后</small>第 {Math.max(0, day)} 天</> },
    { id: 'n1', at: a3(0.23, 0.24, -0.02), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '氧气指示表' },
    { id: 'n2', at: a3(-0.19, 0.06, 0.12), ax: 1, name: true, className: 'scene-name -translate-y-1/2', children: '密封盒 · 里面一块月饼' },
  ] : which === 'b' ? [
    ...TUBES.map((t, i) => ({ id: t.k, at: [BX + (i - 1) * 1.7, BY + 0.55, BZ0 + 0.6] as V3, ax: 0.5, className: 'scene-name', children: `${t.name}气` } as Label)),
    { id: 'bhe', at: [BX + 5.2, Math.min(heY, BY + 11) + 2, BZ0], ax: 0.5, className: 'scene-name -translate-y-full', children: '氦气球' },
    { id: 'ab', at: [BX + 8.3, airY + 2, BZ0], ax: 0.5, className: 'scene-name -translate-y-full', children: '空气球' },
  ] : [
    { id: 's', at: [here.at[0] + 2.4, 9.5, here.at[2]], ax: 0, className: `scene-tag ${read.includes(site) && !pump.busy ? 'key' : ''} -translate-y-1/2`, children: <><small>{here.name}</small>{pump.busy ? '采样中' : read.includes(site) ? '读数已记下' : '还没采样'}</> },
    { id: 'n1', at: [here.at[0] - 1.1, 13.4, here.at[2] - 0.6], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '采样头' },
  ]
  return (
    <LabShell title="空气和氧气" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={NAMES[which]}
      stage={<Place at={which === 'a' ? 'x1' : which === 'b' ? 'x2' : site === 'gate' ? 'x3a' : 'x3b'} labels={labels} bloom={which === 'b' ? 1.1 : which === 'c' ? 0.12 : 0.4}>
        {/* 脱氧剂：透明的密封盒、盒盖、月饼、脱氧剂小包、氧气指示表 */}
        <group position={a3(-0.04, 0, 0)}>
          <RoundedBox args={[u(0.3), u(0.13), u(0.2)]} radius={u(0.012)} smoothness={3} position-y={u(0.066)} renderOrder={7}><Glass opacity={0.13} /></RoundedBox>
          <group position={[0, u(0.134 + 0.11 * lid), -u(0.2) * lid]} rotation-x={-0.5 * lid}><RoundedBox args={[u(0.32), u(0.016), u(0.22)]} radius={u(0.006)} smoothness={2} position={[0, u(0.008), 0]} castShadow><meshPhysicalMaterial color="#3f8fc8" roughness={0.35} clearcoat={0.5} transparent opacity={0.9} /></RoundedBox></group>
          <mesh position={[-u(0.07), u(0.012), 0]} receiveShadow><cylinderGeometry args={[u(0.052), u(0.046), u(0.008), 32]} /><meshPhysicalMaterial color="#f1f0ea" roughness={0.3} clearcoat={0.6} /></mesh>
          <mesh position={[-u(0.07), u(0.034), 0]} castShadow><cylinderGeometry args={[u(0.036), u(0.038), u(0.03), 28]} /><meshStandardMaterial color="#b77a34" roughness={0.6} /></mesh>
          <mesh position={[-u(0.07), u(0.0495), 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[u(0.014), u(0.03), 24]} /><meshStandardMaterial color="#8f5a22" roughness={0.7} /></mesh>
        </group>
        <group position={a3(bag[0], bag[1], bag[2])}>
          <RoundedBox args={[u(0.06), u(0.01), u(0.075)]} radius={u(0.004)} smoothness={2} castShadow><meshStandardMaterial color="#f3f2ec" roughness={0.85} /></RoundedBox>
          <mesh position-y={u(0.0054)} rotation-x={-Math.PI / 2}><planeGeometry args={[u(0.05), u(0.04)]} /><meshStandardMaterial map={tex.bag} roughness={0.8} /></mesh>
          {putIn.busy && pk < 0.66 && <group position={[u(0.02), u(0.085), 0]} rotation={[0.2, 0, -0.5]}><Glove s={u(0.0056)} /></group>}
        </group>
        <group position={a3(0.23, 0, -0.02)}>
          <RoundedBox args={[u(0.15), u(0.2), u(0.05)]} radius={u(0.01)} smoothness={3} position={[0, u(0.105), 0]} rotation-x={-0.22} castShadow><meshPhysicalMaterial color="#e9ebea" roughness={0.45} clearcoat={0.3} /></RoundedBox>
          <group position={[0, u(0.118), u(0.03)]} rotation-x={-0.22}>
            <mesh><planeGeometry args={[u(0.12), u(0.12)]} /><meshStandardMaterial map={tex.dial} roughness={0.5} /></mesh>
            <group position={[0, -u(0.0105), u(0.002)]} rotation-z={(0.5 - o2) * Math.PI * 0.94}><mesh position-y={u(0.024)}><boxGeometry args={[u(0.003), u(0.048), u(0.001)]} /><meshBasicMaterial color="#d03a2a" /></mesh></group>
            <mesh position={[0, -u(0.0105), u(0.003)]}><circleGeometry args={[u(0.006), 16]} /><meshStandardMaterial color="#2a2c2e" /></mesh>
          </group>
        </group>
        <Hose pts={[a3(0.17, 0.05, -0.03), a3(0.15, 0.02, -0.01), a3(0.13, 0.03, 0.0), a3(0.115, 0.07, 0.0)]} r={u(0.003)} color="#2c2f33" />
        {/* 稀有气体：一块深色的展示板，三支竖着的灯管，两头是电极帽；右边两只气球系在配重上 */}
        <group position={[BX, BY, BZ0]}>
          <RoundedBox args={[6.4, 5.6, 0.3]} radius={0.08} position={[0, 3.1, -0.3]} castShadow receiveShadow><meshStandardMaterial color="#20262b" roughness={0.6} /></RoundedBox>
          <mesh position={[0, 5.5, -0.14]}><planeGeometry args={[4.6, 0.62]} /><meshStandardMaterial map={tex.board} roughness={0.6} /></mesh>
          <RoundedBox args={[6.8, 0.3, 1.4]} radius={0.06} position={[0, 0.15, 0]} castShadow receiveShadow><meshStandardMaterial color="#3a4046" roughness={0.6} metalness={0.3} /></RoundedBox>
          {TUBES.map((t, i) => <group key={t.k} position={[(i - 1) * 1.7, 0, 0.1]}>
            {[0.75, 4.75].map(y => <mesh key={y} position-y={y} castShadow><cylinderGeometry args={[0.2, 0.2, 0.42, 20]} /><Metal kind="aluminum" grain="turned" /></mesh>)}
            <mesh position-y={2.75} renderOrder={7}><cylinderGeometry args={[0.15, 0.15, 3.7, 20]} /><Glass opacity={0.2} /></mesh>
            <mesh position-y={2.75}><cylinderGeometry args={[0.085, 0.085, 3.6, 12]} /><meshBasicMaterial color={new THREE.Color(t.c).multiplyScalar(0.12 + glow * 2.6)} toneMapped={false} transparent opacity={0.25 + 0.75 * glow} /></mesh>
            {glow > 0.05 && <pointLight position={[0, 2.75, 0.6]} color={t.c} intensity={glow * 26} distance={9} decay={1.7} />}
            <mesh position={[0, 0.38, 0.72]}><planeGeometry args={[0.5, 0.5]} /><meshStandardMaterial map={tex.names[i]} roughness={0.6} /></mesh>
          </group>)}
          {[{ x: 5.2, y: heY, c: '#f2c230' }, { x: 8.3, y: airY, c: '#4f9fe0' }].map((b, i) => <group key={i}>
            <mesh position={[b.x, 0.2, 0]} castShadow><cylinderGeometry args={[0.32, 0.38, 0.4, 20]} /><Metal kind="iron" grain="cast" /></mesh>
            <group position={[b.x, b.y - BY, 0]}><Balloon color={b.c} len={ft > 0 ? 0.9 : 4.2 - 2 - 0.2} /></group>
          </group>)}
        </group>
        {/* 空气检测：采样时仪器柜上的灯闪，采样头旁一圈圈吸进去的气流（示意） */}
        {which === 'c' && pump.busy && <>
          <mesh position={[here.at[0] + 0.95, 4.4, here.at[2] + 1.6]}><planeGeometry args={[0.9, 0.4]} /><meshBasicMaterial color={Math.sin(pt * 9) > 0 ? '#63e39a' : '#1c2a26'} toneMapped={false} /></mesh>
          {[0, 1, 2].map(i => { const k = (pt * 0.6 + i / 3) % 1; return <mesh key={i} position={[here.at[0] - 1.1, 12.5, here.at[2] - 0.6]} rotation-x={Math.PI / 2}><torusGeometry args={[0.9 + 1.5 * (1 - k), 0.035, 8, 40]} /><meshBasicMaterial color="#bfe9ff" transparent opacity={0.55 * k} toneMapped={false} /></mesh> })}
        </>}
      </Place>}
      lesson={<LessonBlock no="拓展" title="三个小实验" concept="课本之外：氧气、稀有气体、空气质量" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">脱氧剂</b>：食品包装里的小包，主要成分是铁粉。铁粉和包装里的氧气、水发生缓慢氧化，把氧气消耗掉，食品就不容易变质。</p>
          <p className="mt-2"><b className="text-white">稀有气体</b>：氦、氖、氩等，约占空气体积的 0.94%，化学性质很不活泼。它们在通电时能发出不同颜色的光，可以做霓虹灯、航标灯。氦气的密度很小，又不会燃烧，可以充气球和飞艇。</p>
          <p className="mt-2"><b className="text-white">空气质量</b>：目前计入空气质量评价的主要污染物有二氧化硫、一氧化碳、二氧化氮、可吸入颗粒物、细颗粒物和臭氧等，由监测站的仪器定点、连续地测量。</p>
          <p className="mt-2 text-[13px] text-white/60">画面里的指示表、灯管颜色和两处的读数都是示意，只用来比较，不是测量值。</p>
        </>} />}
      finale={T.finale && (
        <Panel className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个小实验都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">空气里的每一种成分都有用处</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">铁粉慢慢消耗氧气，是缓慢氧化；稀有气体通电发光，氦气比空气轻得多；空气好不好，要靠仪器监测。</p>
        </Panel>
      )}
      panel={
        <Panel className="px-4 py-4">
          {which === 'a' && <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">密封以后</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{day < 0 ? '—' : `第 ${day} 天`}</div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[12.5px] text-white/55"><span>盒里的氧气（示意）</span><span>{o2 > 0.8 ? '多' : o2 > 0.25 ? '变少了' : '很少'}</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#7fe3d4]" style={{ width: `${Math.round(o2 * 100)}%` }} /></div>
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-white/70">铁粉和氧气的反应很慢，看不见火焰，也不发光，这是缓慢氧化。</p>
          </>}
          {which === 'b' && <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">同样大的气球，空气球的质量约是氦气球的</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{heliumRatio().toFixed(1)}<span className="ml-1 text-[15px] font-medium text-white/55">倍</span></div>
              <div className="mt-1.5 text-[13px] text-white/60">只算球里的气体</div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ParamTile symbol="ρ(氦气)" value={RHO.he.toFixed(3)} unit="g/L" />
              <ParamTile symbol="ρ(空气)" value={RHO.air.toFixed(3)} unit="g/L" />
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-white/70">灯管的颜色是示意。稀有气体通电时发出不同颜色的光。</p>
          </>}
          {which === 'c' && <>
            <div className="text-center"><div className="text-[13px] text-white/60">颗粒物读数（示意，只比高低）</div></div>
            <div className="mt-4 flex flex-col gap-3">
              {(['gate', 'edge'] as Site[]).map(s => <div key={s}>
                <div className="flex justify-between text-[12.5px] text-white/55"><span>{SITE[s].name}</span><span>{read.includes(s) ? (DUST[s] > 0.5 ? '高一些' : '低一些') : '还没采样'}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ffcf5c] transition-[width] duration-500" style={{ width: `${read.includes(s) ? Math.round(DUST[s] * 100) : 0}%` }} /></div>
              </div>)}
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-white/70">监测站把空气抽进仪器，测出颗粒物、二氧化硫、二氧化氮、一氧化碳、臭氧等的含量。</p>
          </>}
        </Panel>
      }
      actions={<>
        <LabButton primary={next === 'one'} pulse={next === 'one'} disabled={busy || (which === 'a' ? day >= 0 : which === 'b' ? lit : false)}
          onClick={() => (which === 'a' ? putIn.run() : which === 'b' ? setLit(true) : sample('gate'))}>{which === 'a' ? '放入脱氧剂' : which === 'b' ? '通电' : '在厂门口采样'}</LabButton>
        <LabButton primary={next === 'two'} pulse={next === 'two'} disabled={busy || which === 'a' || (which === 'b' && (freed || !lit))}
          onClick={() => (which === 'b' ? (setFreed(true), fly.run()) : sample('edge'))}>{which === 'b' ? '放开气球' : which === 'c' ? '到厂界采样' : '等几天'}</LabButton>
      </>}
      extras={
        <Control label="小实验">
          <Segmented label="小实验" pulse={next === 'which'} want={(task?.id as Which) ?? null} value={which} disabled={busy} onChange={w => setWhich(w as Which)} options={(['a', 'b', 'c'] as Which[]).map(w => ({ value: w, label: NAMES[w] }))} />
        </Control>
      }
    />
  )
}
