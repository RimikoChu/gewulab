// 植物的一生 · 第 2 课 种子萌发的环境条件：四个广口瓶的对照实验。2 号是对照组，1 号不洒水，3 号放在低温处，4 号用水淹没种子。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, disc, shell, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Flesh, Glass, blob, fuse, lerp, place, rng, seg, tube, useRun, type V3 } from './parts'
import { CONTROL, JARS, PER_JAR, envOf, lacking, sprouted, variable, type Jar } from './physics'
import { Finale, H } from './ui'
import { AT, BENCH, Room } from './world'

const J0: V3 = [AT.jars.x, BENCH.h, AT.jars.z + 0.3]
const JX = [-3.9, -1.3, 1.3, 3.9]
const JAR = shell([[0, 0], [0.92, 0], [1.0, 0.08], [1.0, 1.95], [0.8, 2.25], [0.8, 2.5], [0.87, 2.5], [0.87, 2.6]], 0.05, { segs: 48 })
const LID = disc(0.93, 0.2, { chamfer: 0.04 })
const SHORT = ['不洒水', '适量的水', '低温', '水没过种子']
const TASKS: Task[] = [
  { id: 'setup', text: '给四个瓶布置条件，拧紧瓶盖', note: '每瓶 10 粒种子；2 号是对照组，其余三瓶各只改一样' },
  { id: 'wait', text: '过几天，看哪个瓶里的种子萌发了', note: '只有 2 号瓶里的种子萌发了' },
  { id: 'ctrl', text: '记录 2 号瓶（对照组）', note: `水分、空气、温度都满足，${PER_JAR} 粒里萌发了 ${sprouted(JARS[1])} 粒` },
  { id: 'rest', text: '记录 1、3、4 号瓶，各和 2 号比一比', note: '缺水分、缺适宜的温度、缺空气，种子都不萌发' },
]
/** 一个瓶里的十粒种子，和萌发以后长出来的胚根 */
function useSeeds(seed: number) {
  return useMemo(() => {
    const r = rng(seed), at: V3[] = [], yaw: number[] = []
    for (let i = 0; i < PER_JAR; i++) { const ring = i < 7, a = i * (ring ? 0.9 : 2.1) + r(), d = ring ? 0.6 + r() * 0.08 : 0.2 + r() * 0.06; at.push([Math.cos(a) * d, 0, Math.sin(a) * d]); yaw.push(r() * 6.28) }
    const seeds = fuse(at.map((p, i) => place(blob(0.17, 0.105, 0.115, '#7a2d24', '#96443a', 12, 8), p, yaw[i])))
    const roots = at.map((p, i) => { const a = yaw[i] + 1.2, L = 0.42 + r() * 0.26; return place(tube([[0, 0.02, 0], [Math.cos(a) * L * 0.5, 0.1, Math.sin(a) * L * 0.5], [Math.cos(a) * L, 0.02, Math.sin(a) * L]], 0.05, 0.02, '#f3ecd8', '#fbf7ea', 6, 8), p) })
    return { seeds, roots }
  }, [seed])
}
const ICE = (() => { const r = rng(9), l: THREE.BufferGeometry[] = []; for (let i = 0; i < 60; i++) { const a = r() * 6.28, front = Math.sin(a) > 0.35, d = 1.14 + r() * 0.4, g = new THREE.BoxGeometry(0.3, 0.3, 0.3); l.push(place(g, [Math.cos(a) * d * 1.02, 0.1 + r() * (front ? 0.12 : 0.9), Math.sin(a) * d * 0.98], r() * 3, r() * 3)) } return fuse(l) })()
function JarView({ jar, x, setup, grow, on }: { jar: Jar; x: number; setup: number; grow: number; on: boolean }) {
  const { seeds, roots } = useSeeds(jar.no * 13)
  const wet = jar.water === 'none' ? 0 : seg(setup, 0.1, 0.6), flood = jar.water === 'flood' ? seg(setup, 0.15, 0.75) : 0, lid = seg(setup, 0.7, 1)
  const n = sprouted(jar), cold = jar.temp === 'cold', swell = 1 + 0.16 * wet * (cold ? 0.3 : 1)
  return (
    <group position={[x, 0, 0]}>
      {cold && <group>
        {/* 3 号瓶放在装着冰块的泡沫箱里：低温 */}
        <mesh geometry={TRAY} castShadow receiveShadow><meshStandardMaterial color="#dfe3e1" roughness={0.95} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={ICE} position={[0, 0.12, 0]} scale={[1, seg(setup, 0.2, 0.7) + 0.01, 1]}><meshPhysicalMaterial color="#cfe6ee" roughness={0.15} transparent opacity={0.72} clearcoat={1} /></mesh>
      </group>}
      <group position={[0, cold ? 0.14 : 0, 0]}>
        {/* 瓶底垫的纸巾：洒了水颜色变深 */}
        <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.9, 0.9, 0.05, 40]} /><meshStandardMaterial color={new THREE.Color('#f1efe6').lerp(new THREE.Color('#aab7b4'), wet * 0.7)} roughness={0.95} /></mesh>
        <mesh geometry={seeds} position={[0, 0.2, 0]} scale={swell}><Flesh rough={0.4} /></mesh>
        {roots.slice(0, n).map((g, i) => <mesh key={i} geometry={g} position={[0, 0.2, 0]} scale={seg(grow, i * 0.05, 0.55 + i * 0.05) + 0.001}><Flesh rough={0.6} /></mesh>)}
        {flood > 0 && <mesh position={[0, 0.06 + 0.42 * flood, 0]} renderOrder={2}><cylinderGeometry args={[0.93, 0.93, 0.84 * flood, 40]} /><meshPhysicalMaterial color="#4f8fa6" transparent opacity={0.4} roughness={0.05} depthWrite={false} /></mesh>}
        <mesh geometry={JAR} renderOrder={4}><Glass opacity={0.1} color="#7fa4ab" env={0.45} /></mesh>
        <mesh geometry={LID} position={[0, lerp(4.2, 2.52, lid), 0]} visible={setup > 0.6} castShadow><Metal kind="aluminum" grain="turned" /></mesh>
        {/* 选中的那个瓶，底下一圈亮环 */}
        {on && <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[1.12, 1.24, 48]} /><meshBasicMaterial color="#35c7b3" toneMapped={false} /></mesh>}
      </group>
    </group>
  )
}
/** 洒水用的小喷壶，放在一边 */
const TRAY = shell([[0, 0], [1.72, 0], [1.8, 0.08], [1.86, 0.62]], 0.12, { segs: 4 }).rotateY(Math.PI / 4).scale(1.32, 1, 1.25)
const SPRAY = shell([[0, 0], [0.55, 0], [0.6, 0.06], [0.6, 1.5], [0.3, 1.8], [0.3, 2.0]], 0.05, { segs: 32 })

export default function Lesson2() {
  const [no, setNo] = useState(CONTROL)
  const [set, setSet] = useState(false), [days, setDays] = useState(false)
  const [rows, setRows] = useState<number[]>([])
  const T = useTasks('gewu:plant:2', TASKS)
  const setup = useRun(set ? 1 : 0, 3.2), grow = useRun(days ? 1 : 0, 4.5)
  const jar = JARS.find(j => j.no === no)!, e = envOf(jar), dup = rows.includes(no)
  useEffect(() => { T.check(id => id === 'setup' ? setup >= 1 : id === 'wait' ? grow >= 1 : id === 'ctrl' ? rows.includes(CONTROL) : [1, 3, 4].every(n => rows.includes(n))) }, [setup >= 1, grow >= 1, rows])   // eslint-disable-line react-hooks/exhaustive-deps
  const record = () => { if (grow < 1 || dup) return; setRows(r => [...r, no]) }
  const resetAll = () => { setNo(CONTROL); setSet(false); setDays(false); setRows([]); T.reset() }
  const task = T.current, busy = (set && setup < 1) || (days && grow < 1)
  const wantNo = !rows.includes(CONTROL) ? CONTROL : [1, 3, 4].find(n => !rows.includes(n)) ?? null
  const { hint, next }: { hint: string; next: 'set' | 'days' | 'no' | 'rec' | null } = (() => {
    if (!task) return { hint: '四个瓶都记完了。种子萌发需要一定的水分、充足的空气和适宜的温度。', next: null }
    if (busy) return { hint: set && setup < 1 ? '洒水、加冰、盖上瓶盖…' : '一天天过去…', next: null }
    if (!set) return { hint: '四个瓶里各放了 10 粒种子。按“布置条件”', next: 'set' }
    if (!days) return { hint: '条件布置好了。按“过几天”', next: 'days' }
    if (wantNo !== null && no !== wantNo) return { hint: `选 ${wantNo} 号瓶`, next: 'no' }
    return { hint: `${no} 号瓶：${jar.waterText}，${jar.tempText}。数一数萌发了几粒，按“记录”`, next: 'rec' }
  })()
  const labels: Label[] = JARS.map((j, i) => ({ id: `j${j.no}`, at: [J0[0] + JX[i], J0[1] + 3.15, J0[2]] as V3, ax: 0.5, className: `scene-tag ${j.no === no ? 'key' : ''} -translate-y-full`, children: <><small>{j.no} 号</small>{set ? SHORT[i] : '10 粒'}</> }))
  if (grow >= 1) labels.push({ id: 'n', at: [J0[0] + JX[no - 1], J0[1] + 0.2, J0[2] + 1.9], ax: 0.5, className: 'scene-tag', children: <><small>萌发</small>{sprouted(jar)} 粒</> })
  const yes = (b: boolean) => <span className={b ? 'text-[#7fe3d4]' : 'text-[#ff9b8a]'}>{b ? '满足' : '不满足'}</span>
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="对照实验"
      stage={<Room at="s2" labels={labels}>
        <group position={J0}>
          {JARS.map((j, i) => <JarView key={j.no} jar={j} x={JX[i]} setup={setup} grow={grow} on={j.no === no} />)}
          <group position={[-6.3, 0, 0.4]}>
            <mesh geometry={SPRAY} renderOrder={4}><Glass opacity={0.22} color="#8fc0cf" /></mesh>
            <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.54, 0.54, 1.0, 28]} /><meshPhysicalMaterial color="#5a98ad" transparent opacity={0.45} roughness={0.05} depthWrite={false} /></mesh>
            <mesh position={[0, 2.15, 0]} castShadow><cylinderGeometry args={[0.34, 0.34, 0.36, 20]} /><meshStandardMaterial color="#2f6f8a" roughness={0.5} /></mesh>
            <mesh position={[0.3, 2.45, 0]} rotation-z={-1.3} castShadow><cylinderGeometry args={[0.1, 0.14, 0.9, 12]} /><meshStandardMaterial color="#2f6f8a" roughness={0.5} /></mesh>
          </group>
        </group>
      </Room>}
      lesson={<LessonBlock no="2" title="萌发的环境条件" concept="需要水分、空气和适宜的温度" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>种子萌发的环境条件：<b className="text-white">一定的水分、充足的空气和适宜的温度</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>对照实验里，实验组和对照组只能有一个条件不同，这个条件叫变量。</li>
            <li>2 号瓶是对照组。1 号和它比，变量是水分；3 号和它比，变量是温度；4 号和它比，变量是空气。</li>
            <li>4 号瓶里的水没过了种子，种子接触不到充足的空气。</li>
            <li>种子萌发还要满足自身条件：胚是完整的、活的，并且不在休眠期。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="四个瓶都记完了" title="种子萌发需要一定的水分、充足的空气和适宜的温度" text="只有 2 号瓶三个条件都满足，种子萌发了。1、3、4 号各缺一个条件，都没有萌发。" notes={`2 号瓶 ${PER_JAR} 粒里萌发 ${sprouted(JARS[1])} 粒是示意的数：个别种子自身不满足萌发的条件。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{no} 号瓶{no === CONTROL ? '（对照组）' : ''}{set ? ` · ${jar.waterText}，${jar.tempText}` : ''}</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{grow >= 1 ? sprouted(jar) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">/ {PER_JAR} 粒萌发</span></div>
          </div>
          <H>这个瓶的三个条件</H>
          <div className="grid grid-cols-3 gap-2 text-center text-[13.5px]">
            {([['一定的水分', e.water], ['充足的空气', e.air], ['适宜的温度', e.temp]] as const).map(([k, v]) => <div key={k} className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-[12px] text-white/55">{k}</div><div className="mt-1 text-[16px] font-bold">{set ? yes(v) : '—'}</div></div>)}
          </div>
          <H>记录</H>
          {rows.length === 0
            ? <p className="rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">过几天以后，选一个瓶，按“记录”。</p>
            : <table className="w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">瓶</th><th className="font-normal">萌发</th><th className="font-normal">缺什么</th><th className="text-right font-normal">和 2 号比的变量</th></tr></thead>
                <tbody>{[...rows].sort().map(n => { const j = JARS.find(q => q.no === n)!; return <tr key={n} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{n} 号</td><td className="font-semibold tabular-nums text-[#7fe3d4]">{sprouted(j)} 粒</td><td className="text-white/80">{lacking(j) ?? '都满足'}</td><td className="text-right text-white/80">{n === CONTROL ? '对照组' : variable(j, JARS[1])}</td></tr> })}</tbody>
              </table>}
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'set'} onClick={() => setSet(true)} disabled={set}>布置条件</LabButton>
        <LabButton pulse={next === 'days'} onClick={() => setDays(true)} disabled={!set || busy || days}>过几天</LabButton>
        <LabButton primary pulse={next === 'rec'} onClick={record} disabled={grow < 1 || dup}>记录</LabButton>
      </>}
      extras={<Control label="看哪个瓶"><Segmented label="看哪个瓶" pulse={next === 'no'} want={next === 'no' && wantNo !== null ? String(wantNo) : null} value={String(no)} onChange={v => setNo(Number(v))} options={JARS.map(j => ({ value: String(j.no), label: `${j.no} 号` }))} /></Control>}
    />
  )
}
