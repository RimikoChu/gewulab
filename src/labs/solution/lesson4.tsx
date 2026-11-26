// 溶液 · 第 4 课 溶解度：化验台第 4 格。两只烧杯各盛 100 g 水，左边的放在台面上溶氯化钠，右边的放在加热磁力搅拌器上溶硝酸钾；最右边一瓶汽水。
// 一勺勺加到饱和，读出 100 g 水里溶了多少克：20 ℃ 氯化钠 36.0 g、硝酸钾 31.6 g；升温到 60 ℃，硝酸钾能溶到 110 g。最后打开汽水瓶盖，看气体跑出来。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Led, Metal, disc, useTasks, type Label } from '@/lab-kit'
import { BEAKER, Beaker, Glove, JarBottle, SODA, SodaBottle, Spoon } from './gear'
import { Bubbles, Crystals, Grains, Steam } from './fx'
import { LESSONS, goLesson } from './lessons'
import { ease, liftPath, seg, useRun, type P3 } from './parts'
import { L4, ROOM, SALT_NAME, g1, solubility } from './physics'
import { BZ, M, ST, TOP, Place } from './world'

type K = 'NaCl' | 'KNO3'
const X0 = ST.l4, Y = TOP, Z = BZ + 0.15
const PLATE = 0.07                                      // 搅拌器台面的高度（m）
const R = BEAKER[250].r * M, H = BEAKER[250].h * M, LV = L4.water * 1e-6 / (Math.PI * (BEAKER[250].r - 0.002) ** 2)
const AT: Record<K, P3> = { NaCl: [X0 - 0.13 * M, Y, Z], KNO3: [X0 + 0.04 * M, Y + PLATE * M, Z] }
const JAR: Record<K, P3> = { NaCl: [X0 - 0.22 * M, Y, Z - 0.14 * M], KNO3: [X0 - 0.06 * M, Y, Z - 0.17 * M] }
const SODA_AT: P3 = [X0 + 0.19 * M, Y, Z - 0.04 * M]
const SPOON0: P3 = [X0 - 0.06 * M, Y + 0.004 * M, Z + 0.1 * M]
const FILL = 7.5, HOT = 5, OPEN = 4.5
const TASKS: Task[] = [
  { id: 'NaCl', text: '20 ℃ 时往 100 g 水里加氯化钠，加到饱和', note: `20 ℃ 时氯化钠的溶解度是 ${g1(solubility('NaCl', ROOM))} g` },
  { id: 'KNO3', text: '换硝酸钾，同样加到饱和', note: `20 ℃ 时硝酸钾的溶解度是 ${g1(solubility('KNO3', ROOM))} g，比氯化钠小` },
  { id: 'hot', text: '升温到 60 ℃，硝酸钾再加到饱和', note: `60 ℃ 时硝酸钾的溶解度是 ${solubility('KNO3', L4.hot).toFixed(0)} g` },
  { id: 'soda', text: '打开汽水瓶盖', note: '压强减小，二氧化碳的溶解度减小，气体从水里跑出来' },
]

/** 加热磁力搅拌器：白色机身、陶瓷加热面板，前面一块温度屏和两个旋钮。原点在底面正中，屏幕朝 +z */
function Stirrer({ temp, on }: { temp: number; on: boolean }) {
  const W = 0.18 * M, D = 0.24 * M, Hh = PLATE * M
  const knob = useMemo(() => disc(0.012 * M, 0.012 * M), [])
  return <group>
    <RoundedBox args={[W, Hh - 0.006 * M, D]} radius={0.008 * M} smoothness={4} position={[0, (Hh - 0.006 * M) / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial color="#e9ebea" roughness={0.38} clearcoat={0.4} /></RoundedBox>
    <RoundedBox args={[W * 0.92, 0.006 * M, W * 0.92]} radius={0.002 * M} position={[0, Hh - 0.003 * M, -D * 0.12]} receiveShadow><meshPhysicalMaterial color={on ? '#d7cfc8' : '#dcdcd8'} roughness={0.25} clearcoat={0.8} emissive="#ff5a20" emissiveIntensity={on ? Math.max(0, (temp - ROOM) / 40) * 0.25 : 0} /></RoundedBox>
    <group position={[0, Hh * 0.45, D / 2 + 0.001 * M]}>
      <Led text={`${Math.round(temp)}℃`} w={W * 0.34} h={Hh * 0.38} position={[-W * 0.24, 0, 0.001 * M]} />
      {[0, 1].map(i => <group key={i} position={[W * 0.1 + i * 0.045 * M, 0, 0]} rotation-x={Math.PI / 2}><mesh geometry={knob}><Metal kind="aluminum" grain="turned" /></mesh></group>)}
    </group>
  </group>
}

export default function Lesson4() {
  const [pick, setPick] = useState<K>('NaCl')
  const [sat, setSat] = useState<Record<K, boolean>>({ NaCl: false, KNO3: false })
  const [hot, setHot] = useState(false)                 // 升温了没有
  const [hotSat, setHotSat] = useState(false)           // 60 ℃ 时加到饱和了没有
  const [open, setOpen] = useState(false)
  const [act, setAct] = useState<K>('NaCl')
  const T = useTasks('gewu:solution:4', TASKS)
  const check = (s: Record<K, boolean>, h: boolean, o: boolean) => T.check(id => id === 'soda' ? o : id === 'hot' ? h : s[id as K])
  const fill = useRun(FILL, () => { if (act === 'KNO3' && hot) { setHotSat(true); check(sat, true, open) } else { const s = { ...sat, [act]: true }; setSat(s); check(s, hotSat, open) } })
  const warm = useRun(HOT, () => setHot(true))
  const pop = useRun(OPEN, () => { setOpen(true); check(sat, hotSat, true) })
  const busy = fill.busy || warm.busy || pop.busy
  const resetAll = () => { fill.snap(0); warm.snap(0); pop.snap(0); setPick('NaCl'); setSat({ NaCl: false, KNO3: false }); setHot(false); setHotSat(false); setOpen(false); T.reset() }

  const tK = warm.busy ? ROOM + (L4.hot - ROOM) * ease(seg(warm.t, 0.5, HOT - 0.3)) : hot ? L4.hot : ROOM
  // 每杯溶了多少：加到饱和的过程中一勺勺往上涨；升温时不变（升温以后还没加，就是不饱和）
  const S20 = (k: K) => solubility(k, ROOM)
  const solved = (k: K) => {
    if (fill.busy && act === k) { const from = k === 'KNO3' && hot ? S20('KNO3') : 0, to = k === 'KNO3' && hot ? solubility('KNO3', L4.hot) : S20(k); return from + (to - from) * Math.min(1, Math.floor(fill.t / FILL * 5 + 0.0001) / 4.4) }
    if (k === 'KNO3' && hotSat) return solubility('KNO3', L4.hot)
    return sat[k] ? S20(k) : 0
  }
  const task = T.current, want: K = task?.id === 'NaCl' ? 'NaCl' : 'KNO3'
  const { hint, next }: { hint: string; next: 'pick' | 'fill' | 'warm' | 'open' | null } = !task ? { hint: '溶解度：一定温度下，100 g 水里最多能溶多少克。', next: null }
    : fill.busy ? { hint: '一勺勺加，搅拌，直到杯底留下一点溶不了的…', next: null }
    : warm.busy ? { hint: '升温到 60 ℃…', next: null }
    : pop.busy ? { hint: '打开瓶盖，看看汽水…', next: null }
    : task.id === 'soda' ? { hint: '最后看看气体：打开汽水瓶盖', next: 'open' }
    : pick !== want ? { hint: `换成${SALT_NAME[want]}那一杯`, next: 'pick' }
    : task.id === 'hot' && !hot ? { hint: '硝酸钾饱和了。把它升温到 60 ℃', next: 'warm' }
    : task.id === 'hot' ? { hint: '60 ℃ 时又能溶了。再加到饱和', next: 'fill' }
    : { hint: `往 100 g 水里一勺勺加${SALT_NAME[pick]}，加到饱和`, next: 'fill' }

  // 药匙一趟趟从瓶里舀、倒进杯里（一共五趟）
  const ft = fill.t, trip = Math.min(4, Math.floor(ft / FILL * 5)), u = (ft / FILL * 5) - trip
  const jarTop: P3 = [JAR[act][0] + 0.03 * M, Y + 0.03 * M, JAR[act][2] + 0.06 * M], over: P3 = [AT[act][0] - 0.02 * M, AT[act][1] + H + 0.03 * M, AT[act][2]]
  const top = AT[act][1] + H + 0.06 * M
  const sp: P3 = !fill.busy ? SPOON0 : u < 0.4 ? liftPath(trip ? over : SPOON0, jarTop, top, seg(u, 0, 0.4)) : u < 0.75 ? liftPath(jarTop, over, top, seg(u, 0.4, 0.75)) : over
  const flip = fill.busy ? ease(seg(u, 0.75, 0.85)) * (1 - ease(seg(u, 0.92, 1))) : 0
  const sodaGas = pop.busy ? 1 - seg(pop.t, 1.2, OPEN) : open ? 0.12 : 0
  const capOff = pop.busy ? pop.t > 0.6 : open

  const labels: Label[] = [
    ...(['NaCl', 'KNO3'] as K[]).map(k => ({ id: k, at: [AT[k][0], AT[k][1] + H + 0.03 * M, AT[k][2]] as P3, ax: 0.5, className: `scene-tag ${pick === k ? 'key' : ''} -translate-y-full`, children: <><small>{SALT_NAME[k]} · 100 g 水 · {k === 'KNO3' ? Math.round(tK) : ROOM} ℃</small>溶了 {g1(solved(k))} g</> })),
    { id: 'soda', at: [SODA_AT[0], Y + 0.22 * M, SODA_AT[2]], ax: 0.5, className: `scene-tag ${open ? 'key' : ''} -translate-y-full`, children: <><small>汽水</small>{open ? '冒出气泡' : '瓶盖盖着'}</> },
    { id: 'j1', at: [JAR.NaCl[0], Y + 0.1 * M, JAR.NaCl[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '氯化钠' },
    { id: 'j2', at: [JAR.KNO3[0], Y + 0.1 * M, JAR.KNO3[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '硝酸钾' },
    { id: 'j3', at: [AT.KNO3[0], Y + 0.02 * M, AT.KNO3[2] + 0.13 * M], ax: 0.5, name: true, className: 'scene-name', children: '加热磁力搅拌器' },
  ]
  const big = solved(pick)
  return (
    <LabShell title="溶液" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['4'], VOICE)} actionsLabel="溶解度"
      stage={<Place at="l4" labels={labels}>
        {(['NaCl', 'KNO3'] as K[]).map(k => {
          const full = (sat[k] && !(k === 'KNO3' && hot && !hotSat)) || (k === 'KNO3' && hotSat)
          return <group key={k} position={AT[k]}><Beaker vol={250} level={LV + solved(k) * 0.00005}>
            {/* 饱和了：杯底留一小撮溶不了的 */}
            <Crystals at={[0, 0, 0]} R={R * 0.4} amount={full && !(fill.busy && act === k) ? 0.35 : 0} size={0.0022 * M} shape={k === 'NaCl' ? 'cube' : 'needle'} n={60} seed={k === 'NaCl' ? 2 : 5} heap={0.4} />
            {/* 搅拌子：白色的小胶囊在杯底转 */}
            {k === 'KNO3' && <StirBar on={fill.busy && act === 'KNO3' || warm.busy} />}
          </Beaker></group>
        })}
        {(['NaCl', 'KNO3'] as K[]).map(k => <Grains key={k} at={AT[k]} R={R * 0.6} H={LV * M} fall={fill.busy && act === k ? seg(u, 0.8, 1) : 0} left={fill.busy && act === k ? 1 - seg(u, 0.85, 1) : 0} size={0.0024 * M} n={30} seed={trip + (k === 'NaCl' ? 0 : 7)} swirl={1} />)}
        <group position={[AT.KNO3[0], Y, AT.KNO3[2] + 0.02 * M]}><Stirrer temp={tK} on={warm.busy || hot} /></group>
        {(['NaCl', 'KNO3'] as K[]).map(k => <group key={k} position={JAR[k]}><JarBottle label={SALT_NAME[k]} amount={0.6} stopper={false} /></group>)}
        <group position={SODA_AT}><SodaBottle capOn={!capOff} label="汽水" /></group>
        {pop.busy && !capOff && <group position={[SODA_AT[0] + 0.02 * M, Y + 0.17 * M, SODA_AT[2] + 0.02 * M]} rotation={[-0.3, 0, 0.6]}><Glove /></group>}
        <Bubbles at={[SODA_AT[0], Y + 0.01 * M, SODA_AT[2]]} top={(SODA.level - 0.012) * M} on={sodaGas > 0.05} rate={20 + 160 * sodaGas} r={0.0018 * M} spread={0.022 * M} speed={0.12 * M} seed={3} />
        <Steam at={[SODA_AT[0], Y + 0.205 * M, SODA_AT[2]]} on={pop.busy && pop.t > 0.6 && pop.t < 1.6} s={0.03 * M} rate={10} jitter={0.004 * M} opacity={0.35} />
        <group position={sp} rotation={[0, fill.busy ? 0 : 0.5, Math.PI * 0.85 * flip]}><Spoon load={fill.busy && u > 0.35 && u < 0.85 ? 1 - flip : 0} />
          {fill.busy && <group position={[0.15 * M, 0.02 * M, -0.01 * M]} rotation={[-1.0, 0.3, -0.9]}><Glove /></group>}
        </group>
      </Place>}
      lesson={<LessonBlock no="4" title="溶解度" concept="溶解度：一定温度下 100 g 水里最多溶多少克" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>固体物质的溶解度，表示在<b className="text-white">一定温度</b>下，某固态物质在 <b className="text-white">100 g 溶剂</b>里达到<b className="text-white">饱和状态</b>时所溶解的<b className="text-white">质量</b>。四个条件缺一不可。</p>
          <p className="mt-3">例如 20 ℃ 时氯化钠的溶解度是 36.0 g，意思是 20 ℃ 时 100 g 水里最多能溶解 36.0 g 氯化钠。</p>
          <p className="mt-3">气体的溶解度与温度、压强有关：压强越小，溶解度越小；温度越高，溶解度越小。打开汽水瓶盖，压强减小，二氧化碳就从水里冒出来。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个溶解度都读出来了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">溶解度：一定温度下，100 g 水里最多溶多少克</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">20 ℃：氯化钠 {g1(S20('NaCl'))} g，硝酸钾 {g1(S20('KNO3'))} g；60 ℃：硝酸钾 {solubility('KNO3', L4.hot).toFixed(0)} g。气体的溶解度随压强减小而减小。</p>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">100 g 水里溶了{SALT_NAME[pick]}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{big > 0 ? g1(big) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">g</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="m水" value="100" unit="g · 溶剂" />
            <ParamTile symbol="t" value={`${pick === 'KNO3' ? Math.round(tK) : ROOM}`} unit="℃" />
          </div>
          <h2 className="mt-4 text-[12.5px] text-white/55">读到的溶解度</h2>
          <table className="mt-2 w-full text-center text-[13.5px]">
            <thead><tr className="text-white/55"><th className="pb-1 text-left font-medium" /><th className="pb-1 font-medium">20 ℃</th><th className="pb-1 font-medium">60 ℃</th></tr></thead>
            <tbody>{(['NaCl', 'KNO3'] as K[]).map(k => <tr key={k} className="bg-white/[0.04]"><td className="rounded-l-lg px-2 py-1.5 text-left">{SALT_NAME[k]}</td><td className="tabular-nums">{sat[k] ? `${g1(S20(k))} g` : '—'}</td><td className="rounded-r-lg tabular-nums font-semibold">{k === 'KNO3' && hotSat ? `${solubility('KNO3', L4.hot).toFixed(0)} g` : '—'}</td></tr>)}</tbody>
          </table>
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'fill'} pulse={next === 'fill'} onClick={() => { if (busy || (pick === 'NaCl' ? sat.NaCl : hot ? hotSat : sat.KNO3)) return; setAct(pick); fill.run() }} disabled={busy || (pick === 'NaCl' ? sat.NaCl : hot ? hotSat : sat.KNO3)}>加到饱和</LabButton>
        <LabButton primary={next === 'warm'} pulse={next === 'warm'} onClick={() => { if (busy || pick !== 'KNO3' || !sat.KNO3 || hot) return; warm.run() }} disabled={busy || pick !== 'KNO3' || !sat.KNO3 || hot}>升温到 60 ℃</LabButton>
        <LabButton primary={next === 'open'} pulse={next === 'open'} onClick={() => { if (busy || open) return; pop.run() }} disabled={busy || open}>打开瓶盖</LabButton>
      </>}
      extras={
        <Control label="哪一杯">
          <Segmented label="哪一杯" pulse={next === 'pick'} want={want} value={pick} disabled={busy} onChange={k => setPick(k as K)} options={[{ value: 'NaCl', label: '氯化钠' }, { value: 'KNO3', label: '硝酸钾' }]} />
        </Control>
      }
    />
  )
}

/** 磁力搅拌子：白色聚四氟乙烯的小胶囊，躺在杯底转 */
function StirBar({ on }: { on: boolean }) {
  const a = on ? performance.now() / 1000 * 14 : 0.6
  return <mesh position-y={0.003 * M} rotation={[0, a, Math.PI / 2]}><capsuleGeometry args={[0.0035 * M, 0.02 * M, 6, 12]} /><meshStandardMaterial color="#f4f4f0" roughness={0.4} /></mesh>
}
