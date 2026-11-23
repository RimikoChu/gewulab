// 燃烧和灭火 · 第 6 课 灭火器的选择：训练场的灭火器训练区，一只灭火器架里放着水基型、干粉、二氧化碳三种灭火器；
// 前面三处火：一垛木柴、一只汽油油盘、一只档案柜。每处火选一只灭火器：手套把它从架上提过去，拔掉保险销，对准火焰根部，压下压把。
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Glove } from './gear'
import { ExtRack, Extinguisher, FileCabinet, OilPan, SteelTray, WoodCrib, extTop, nozzleAt } from './yardgear'
import { Blaze, Puffs, SMOKE, type PuffOpt } from './fx'
import { ease, liftPath, seg, useRun } from './parts'
import { EXTS, FIRES6, suits, type Ext, type Fire6 } from './physics'
import { M, YARD, Place, type V3 } from './world'

const POS: Record<Fire6, { x: number; z: number }> = { wood: YARD.wood6, oil: YARD.oil6, file: YARD.file }
const ORDER: Fire6[] = ['wood', 'oil', 'file']
const EXT_ORDER: Ext[] = ['water', 'powder', 'co2']
const SLOT: Record<Ext, number> = { water: -0.45, powder: 0, co2: 0.45 }
const TASKS: Task[] = [
  { id: 'wood', text: '木柴堆着火了：选一只灭火器', note: '木材着火，用水基型灭火器' },
  { id: 'oil', text: '油盘着火了：选一只灭火器', note: '油着火，用干粉灭火器' },
  { id: 'file', text: '档案柜着火了：选一只灭火器', note: '图书档案着火，用二氧化碳灭火器：不留痕迹' },
]
/** 一次灭火的过程（s）：提过去、拔保险销、拿起喷管对准、压下压把喷、放回去 */
const TT = { carry: [0, 1.6], pin: [1.6, 2.2], aim: [2.2, 2.6], spray: [2.6, 5.2], back: [5.4, 6.8] } as const
const TOTAL = 7.0
/** 火焰底部离地多高（m） */
const BASE: Record<Fire6, number> = { wood: 0.12, oil: 0.12, file: 1.12 }
const SPRAY: Record<Ext, PuffOpt> = {
  water: { rate: 60, life: 0.9, size: [0.05 * M, 0.4 * M], speed: 3.0 * M, spread: 0.08, color: '#e6f2f8', opacity: 0.95, accel: [0, -1.5 * M, 0], drag: 0.6 },
  powder: { rate: 60, life: 1.4, size: [0.08 * M, 0.9 * M], speed: 3.2 * M, spread: 0.12, color: '#f2ece6', opacity: 1, accel: [0, 0.1 * M, 0], drag: 1.1 },
  co2: { rate: 60, life: 1.1, size: [0.08 * M, 0.8 * M], speed: 3.0 * M, spread: 0.16, color: '#f6f9fb', opacity: 0.9, accel: [0, -0.3 * M, 0], drag: 1.3 },
}

export default function Lesson6() {
  const [fire, setFire] = useState<Fire6>('wood')
  const [out, setOut] = useState<Partial<Record<Fire6, Ext>>>({})
  const [tried, setTried] = useState<{ f: Fire6; e: Ext } | null>(null)
  const T = useTasks('gewu:fire:6', TASKS)
  const run = useRun(TOTAL, () => { if (!tried) return; if (suits(tried.f, tried.e).ok) { setOut(o => ({ ...o, [tried.f]: tried.e })); T.check(id => id === tried.f) } })
  const t = run.t, doing = run.busy ? tried : null
  const use = (e: Ext) => { if (run.busy || out[fire]) return; setTried({ f: fire, e }); run.run() }
  const pick = (f: Fire6) => { if (run.busy) return; run.snap(0); setTried(null); setFire(f) }
  const resetAll = () => { run.snap(0); setTried(null); setFire('wood'); setOut({}); T.reset() }
  const lvl = (f: Fire6) => {
    if (out[f]) return 0
    if (doing && doing.f === f) { const ok = suits(f, doing.e).ok; const sp = seg(t, TT.spray[0] + 0.3, TT.spray[1]); return ok ? 1 - ease(sp) : 1 - 0.45 * Math.sin(Math.PI * sp) }
    return 1
  }
  const result = tried && !run.busy ? suits(tried.f, tried.e) : null
  const task = T.current, want = (task?.id as Fire6 | undefined) ?? null
  const { hint, next }: { hint: string; next: 'fire' | null } = !task ? { hint: '木材用水基型，油、气用干粉，图书档案和精密仪器用二氧化碳。', next: null }
    : run.busy ? { hint: t < TT.carry[1] ? `提起${EXTS[doing!.e].full}…` : t < TT.pin[1] ? '拔掉保险销…' : t < TT.spray[0] ? '拿起喷管，对准火焰根部…' : t < TT.spray[1] ? '压下压把，喷射…' : '放回去…', next: null }
    : fire !== want ? { hint: `去“${FIRES6[want!].name}”那里`, next: 'fire' }
    : result && !result.ok ? { hint: '换一只灭火器试试', next: null }
    : { hint: `${FIRES6[fire].name}着火了。用哪一只灭火器？`, next: null }
  const autoStep = () => { if (run.busy) return true; if (task && fire === want && !out[fire]) { use(FIRES6[fire].best); return true } return false }

  // 灭火器的位置：架上 → 提到火的左前方 1.5 m 处，朝着火 → 放回架上
  const e = doing?.e ?? tried?.e ?? 'water'
  const F = POS[doing?.f ?? fire]
  const rackAt = (k: Ext): V3 => [YARD.rack.x + SLOT[k] * M, 0.04 * M, YARD.rack.z]
  const stand: V3 = [F.x - 1.6 * M, 0.3 * M, F.z + 0.9 * M]
  const away = seg(t, TT.carry[0], TT.carry[1]) - seg(t, TT.back[0], TT.back[1])
  const goingBack = t > TT.back[0]
  const ep = doing ? liftPath(goingBack ? stand : rackAt(e), goingBack ? rackAt(e) : stand, 0.5 * M, goingBack ? seg(t, TT.back[0], TT.back[1]) : seg(t, TT.carry[0], TT.carry[1])) : rackAt(e)
  const yaw = Math.atan2(-(F.z - stand[2]), F.x - stand[0]) * ease(Math.min(1, away * 1.4))
  const aim = !!doing && t > TT.aim[0] && t < TT.back[0]
  const press = doing && t > TT.spray[0] && t < TT.spray[1] ? 1 : 0
  const pinOut = !!doing && t > TT.pin[0] + 0.3 && t < TT.back[1]
  const spraying = !!doing && t > TT.spray[0] + 0.1 && t < TT.spray[1]
  const { noz, dir } = useMemo(() => {
    const n = new THREE.Vector3(...nozzleAt(e)).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(...ep))
    const d = new THREE.Vector3(F.x, BASE[doing?.f ?? fire] * M + 0.1 * M, F.z).sub(n).normalize()
    return { noz: n.toArray() as V3, dir: d.toArray() as V3 }
  }, [e, yaw, ep[0], ep[1], ep[2], F.x, F.z, doing?.f, fire])   // eslint-disable-line react-hooks/exhaustive-deps

  const fb = (f: Fire6): V3 => [POS[f].x, BASE[f] * M, POS[f].z]
  const labels: Label[] = [
    ...ORDER.filter(f => out[f]).map(f => ({ id: `o${f}`, at: [fb(f)[0] + 0.5 * M, fb(f)[1] + 0.7 * M, fb(f)[2]] as V3, className: 'scene-tag key -translate-y-1/2', children: <><small>{FIRES6[f].name}</small>{EXTS[out[f]!].full}</> })),
    ...EXT_ORDER.map(k => ({ id: `n${k}`, at: [YARD.rack.x + SLOT[k] * M, (extTop(k) + 0.08) * M, YARD.rack.z + 0.3] as V3, ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: EXTS[k].name })),
  ]
  return (
    <LabShell autoStep={autoStep} title="燃烧和灭火" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="用哪一只灭火器"
      stage={<Place at={fire === 'wood' ? 'wood6' : fire === 'oil' ? 'oil6' : 'file'} labels={labels}>
        <group position={[YARD.rack.x, 0, YARD.rack.z - 0.05 * M]}><ExtRack w={1.5} /></group>
        {EXT_ORDER.filter(k => !(doing && doing.e === k)).map(k => <group key={k} position={rackAt(k)}><Extinguisher e={k} /></group>)}
        {doing && <group position={ep} rotation-y={yaw}>
          <Extinguisher e={doing.e} pin={!pinOut} press={press} aim={aim} />
          <group position={[-0.05 * M, extTop(doing.e) * M + 0.065 * M, 0]} rotation={[0, 0, Math.PI / 2]}><group rotation-x={-0.4}><Glove kind="fire" s={0.009 * M} /></group></group>
          {aim && <group position={[nozzleAt(doing.e)[0] - 0.1 * M, nozzleAt(doing.e)[1] + 0.005 * M, 0.02 * M]} rotation={[0.7, 0, 0]}><Glove kind="fire" s={0.009 * M} /></group>}
        </group>}
        <Puffs at={noz} on={spraying} opt={{ ...SPRAY[e], dir }} seed={3} />
        {/* 三处火 */}
        <group position={[POS.wood.x, 0, POS.wood.z]}><SteelTray w={1.0} d={1.0} /></group>
        <group position={[POS.wood.x, 0.02 * M, POS.wood.z]}><WoodCrib n={5} len={0.7} sec={0.08} char={out.wood ? 0.8 : 0.5} glow={lvl('wood') * 0.8} /></group>
        <Blaze at={[POS.wood.x, 0.15 * M, POS.wood.z]} w={0.5 * M} h={1.0 * M} spread={0.25 * M} kind="wood" level={lvl('wood')} n={7} light={34} seed={2} />
        <Puffs at={[POS.wood.x, 1.1 * M, POS.wood.z]} on={lvl('wood') > 0.2} opt={SMOKE.dark(1.6)} seed={4} />
        <group position={[POS.oil.x, 0, POS.oil.z]}><OilPan dia={1.2} char={out.oil ? 1 : 0} /></group>
        <Blaze at={[POS.oil.x, 0.12 * M, POS.oil.z]} w={0.55 * M} h={1.5 * M} spread={0.4 * M} kind="oil" level={lvl('oil')} n={8} light={40} seed={5} />
        <Puffs at={[POS.oil.x, 1.6 * M, POS.oil.z]} on={lvl('oil') > 0.2} opt={SMOKE.dark(2.4)} seed={6} />
        <group position={[POS.file.x, 0, POS.file.z]} rotation-y={-0.5}><FileCabinet char={out.file ? 0.4 : 0.15} /></group>
        <Blaze at={[POS.file.x + 0.1 * M, BASE.file * M, POS.file.z + 0.18 * M]} w={0.25 * M} h={0.5 * M} spread={0.1 * M} kind="wood" level={lvl('file')} n={5} light={20} seed={7} />
        <Puffs at={[POS.file.x + 0.1 * M, 1.7 * M, POS.file.z + 0.18 * M]} on={lvl('file') > 0.2} opt={SMOKE.dark(1.0)} seed={8} />
        <Puffs at={[F.x, BASE[doing?.f ?? fire] * M + 0.3 * M, F.z]} on={!!doing && doing.e === 'water' && spraying && suits(doing.f, 'water').ok} opt={SMOKE.steam(1.0)} seed={9} />
      </Place>}
      lesson={<LessonBlock no="6" title="灭火器的选择" concept="不同的火，用不同的灭火器" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
            {EXT_ORDER.map(k => <li key={k}><b className="text-white">{EXTS[k].full}</b>：{EXTS[k].use}</li>)}
          </ul>
          <p className="mt-3">使用灭火器：提起灭火器，拔掉保险销，一手握住喷管对准火焰根部，一手压下压把。站在上风方向，离火两三米。</p>
          <p className="mt-3 text-[13.5px] text-white/65">二氧化碳灭火器喷出的是液态二氧化碳，喷完就变成气体散开，不留痕迹；使用时手不要握在喇叭筒上，防止冻伤。它没有压力表。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,460px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三处火都灭了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">根据着火的物质，选用合适的灭火器</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">木柴用水基型，油盘用干粉，档案柜用二氧化碳。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{FIRES6[fire].name}</div>
            <div className="mt-1 text-[38px] leading-none font-bold tracking-tight">{out[fire] ? '灭了' : '着火'}</div>
            {out[fire] && <div className="mt-1.5 text-[13px] text-[#7fe3d4]">{EXTS[out[fire]!].full}</div>}
          </div>
          {result && tried && tried.f === fire && <p className={`hint-in mt-4 rounded-xl px-3 py-3 text-[14px] leading-relaxed ${result.ok ? 'bg-[#35c7b3]/15 text-white/90' : 'bg-[#ff6b6b]/15 text-white/90'}`}>{result.why}</p>}
          <h2 className="mt-4 text-[12.5px] text-white/55">三种灭火器</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug">
            {EXT_ORDER.map(k => <li key={k} className="rounded-lg bg-white/[0.05] px-2.5 py-2"><b className="text-white">{EXTS[k].name}</b><span className="ml-2 text-white/65">{EXTS[k].use.replace('扑灭', '')}</span></li>)}
          </ul>
        </Glass>
      }
      actions={<>
        {EXT_ORDER.map(k => <LabButton key={k} onClick={() => use(k)} disabled={run.busy || !!out[fire]}>用{EXTS[k].name}</LabButton>)}
      </>}
      extras={
        <Control label="哪处火">
          <Segmented label="哪处火" pulse={next === 'fire'} want={next === 'fire' ? want : null} disabled={run.busy} value={fire} onChange={f => pick(f as Fire6)} options={ORDER.map(f => ({ value: f, label: FIRES6[f].name }))} />
        </Control>
      }
    />
  )
}
