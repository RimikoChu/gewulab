// 遗传和变异 · 拓展：豆荚里的 3∶1 · 测交。都在温室的后台。
// 豆荚：子一代（Rr）自花传粉结的豆荚，剥开一个豆荚就同时看得到圆粒和皱粒。测交：两株高茎（甲、乙）各和矮茎杂交，看后代里有没有矮茎，就知道它是 DD 还是 Dd。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { useRun, type V3 } from './parts'
import { OpenPod, PeaPatch, podGeo, variant } from './pea'
import { MENDEL, PODS, TEST_PLANTS, isTall, podSeeds, ratio, testCross } from './physics'
import { Flesh } from './parts'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { BACK, Pot, Room } from './world'

type Exp = 'pod' | 'test'
type Plant = keyof typeof TEST_PLANTS
const SEEDS = podSeeds(PODS.reduce((a, b) => a + b, 0)), ROUND = SEEDS.filter(Boolean).length, WRINKLED = SEEDS.length - ROUND
const SPLIT = PODS.map((n, i) => SEEDS.slice(PODS.slice(0, i).reduce((a, b) => a + b, 0), PODS.slice(0, i).reduce((a, b) => a + b, 0) + n))
const KIDS = (p: Plant) => [...testCross(TEST_PLANTS[p].g), ...testCross(TEST_PLANTS[p].g)]
const TASKS: Task[] = [
  { id: 'pod', text: '剥开子一代的 4 个豆荚，数圆粒和皱粒', note: `圆粒 ${ROUND} 粒、皱粒 ${WRINKLED} 粒，约 3∶1` },
  { id: 'jia', text: '让高茎甲和矮茎杂交，看后代', note: '后代全是高茎：甲是 DD' },
  { id: 'yi', text: '让高茎乙和矮茎杂交，看后代', note: '后代一半矮茎：乙是 Dd' },
]
const DISH: V3 = [BACK.x, BACK.h + 0.05, BACK.z + 0.4]
const POT_Z = BACK.z + 5.2, KID_Z = BACK.z + 9.5
const POT_X = { jia: BACK.x - 6, yi: BACK.x - 1.5, short: BACK.x + 3 }
export default function LessonX() {
  const [exp, setExp] = useState<Exp>('pod')
  const [open, setOpen] = useState(false)
  const [crossed, setCrossed] = useState<Plant[]>([])
  const T = useTasks('gewu:gene:x', TASKS)
  const pk = useRun(open ? 1 : 0, 1.6), last = crossed[crossed.length - 1], grow = useRun(crossed.length, 3)
  const g = last ? Math.max(0, grow - (crossed.length - 1)) : 0
  useEffect(() => { T.check(id => id === 'pod' ? pk >= 1 : crossed.includes(id as Plant) && grow >= crossed.length) }, [pk >= 1, crossed, grow >= crossed.length])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setExp('pod'); setOpen(false); setCrossed([]); T.reset() }
  const task = T.current, busy = (open && pk < 1) || grow < crossed.length
  const wantExp: Exp | null = task ? (task.id === 'pod' ? 'pod' : 'test') : null
  const nextPlant: Plant = crossed.includes('jia') ? 'yi' : 'jia'
  const { hint, next }: { hint: string; next: 'exp' | 'open' | 'cross' | null } = (() => {
    if (!task) return { hint: '测交：和矮茎杂交，看后代里有没有矮茎。', next: null }
    if (busy) return { hint: open && pk < 1 ? '剥开豆荚…' : '收种、播种，后代长出来了…', next: null }
    if (wantExp && exp !== wantExp) return { hint: `在“实验”里选“${wantExp === 'pod' ? '豆荚里的 3∶1' : '测交'}”`, next: 'exp' }
    if (task.id === 'pod') return { hint: '这是子一代圆粒豌豆（Rr）自花传粉结的豆荚。按“剥开豆荚”', next: 'open' }
    return { hint: `高茎${TEST_PLANTS[nextPlant].name}是 DD 还是 Dd？按“让${TEST_PLANTS[nextPlant].name}和矮茎杂交”`, next: 'cross' }
  })()
  const kids = last ? KIDS(last) : []
  const kidSpots = useMemo(() => kids.map((k, i) => ({ x: BACK.x - 7 + i * 1.9, z: KID_Z, yaw: i * 2.1, s: 0.42, v: isTall(k) ? 0 : 1 })), [last])   // eslint-disable-line react-hooks/exhaustive-deps
  const vs = useMemo(() => [variant({ tall: true, stage: 2, seed: 101 }), variant({ tall: false, stage: 2, seed: 201 })], [])
  const parents = useMemo(() => [{ x: POT_X.jia, z: POT_Z, yaw: 0.4, s: 0.72, v: 0 }, { x: POT_X.yi, z: POT_Z, yaw: 2.4, s: 0.72, v: 0 }, { x: POT_X.short, z: POT_Z, yaw: 1.3, s: 1.0, v: 1 }], [])
  const closed = useMemo(() => podGeo(1.9, 0.4, 0.26, 7), [])
  const tallKids = kids.filter(isTall).length
  const labels: Label[] = exp === 'pod' ? [
    ...(pk >= 1 ? [{ id: 'c', at: [DISH[0], DISH[1] + 0.4, DISH[2] - 1.3] as V3, ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>圆粒</small>{ROUND} · <small>皱粒</small>{WRINKLED}</> }] : []),
  ] : [
    { id: 'j', at: [POT_X.jia, 5.6, POT_Z + 2], ax: 0.5, className: 'scene-tag', children: <><small>高茎</small>甲</> },
    { id: 'y', at: [POT_X.yi, 5.6, POT_Z + 2], ax: 0.5, className: 'scene-tag', children: <><small>高茎</small>乙</> },
    { id: 's', at: [POT_X.short, 5.6, POT_Z + 2], ax: 0.5, className: 'scene-tag', children: '矮茎' },
    ...(last && g >= 1 ? [{ id: 'k', at: [BACK.x, 2.4, KID_Z + 1.6] as V3, ax: 0.5, className: 'scene-tag key translate-y-2', children: <><small>{TEST_PLANTS[last].name} × 矮茎 的后代</small>高茎 {tallKids} · 矮茎 {kids.length - tallKids}</> }] : []),
  ]
  return (
    <LabShell title="遗传和变异" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="拓展"
      stage={<Room at={exp === 'pod' ? 'back' : 'test'} labels={labels}>
        <group position={DISH}>
          <mesh position={[0, 0.03, 0]} receiveShadow castShadow><boxGeometry args={[5.4, 0.06, 3.4]} /><meshPhysicalMaterial color="#f4f4f0" roughness={0.25} clearcoat={0.8} /></mesh>
          {SPLIT.map((s, i) => <group key={i} position={[(i % 2 ? 0.25 : -2.35), 0.08, (i < 2 ? -0.75 : 0.65)]}>
            {pk < 0.5 ? <mesh geometry={closed} position={[0, 0.08, 0]} castShadow><Flesh rough={0.5} /></mesh> : <OpenPod round={s} len={1.9} />}
          </group>)}
        </group>
        {exp === 'test' && <>
          {(['jia', 'yi', 'short'] as const).map(k => <Pot key={k} at={[POT_X[k], 0, POT_Z]} s={0.8} />)}
          <PeaPatch spots={parents} variants={vs} y={3.0} />
        </>}
        {/* 后代：一条长花槽里 8 株 */}
        <mesh position={[BACK.x - 0.35, 0.9, KID_Z]} castShadow receiveShadow><boxGeometry args={[16.4, 1.8, 1.6]} /><meshStandardMaterial color="#9a6a46" roughness={0.85} /></mesh>
        <mesh position={[BACK.x - 0.35, 1.81, KID_Z]} rotation-x={-Math.PI / 2}><planeGeometry args={[16, 1.3]} /><meshStandardMaterial color="#4a3829" roughness={1} /></mesh>
        {last && <PeaPatch spots={kidSpots} variants={vs} grow={g} y={1.8} />}
      </Room>}
      lesson={<LessonBlock no="拓展" title="豆荚里的 3∶1 · 测交" concept="和矮茎杂交，就能看出高茎的基因组成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>子一代圆粒豌豆是 Rr。它自花传粉，同一个豆荚里的种子就是子二代：有的圆、有的皱，圆粒和皱粒约 3∶1。孟德尔一共数了 {MENDEL.seed.a + MENDEL.seed.b} 粒。</p>
          <p className="mt-2">高茎可能是 DD，也可能是 Dd，从外表看不出来。让它和矮茎（dd）杂交：后代全是高茎，它是 DD；后代里有一半矮茎，它是 Dd。这种做法叫测交，育种的人常用。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两个拓展实验都做完了" title="和矮茎杂交，看出高茎是 DD 还是 Dd" text={`豆荚里圆粒 ${ROUND}、皱粒 ${WRINKLED}；孟德尔数的是 ${MENDEL.seed.a}∶${MENDEL.seed.b}，约 ${ratio(MENDEL.seed.a, MENDEL.seed.b)}∶1。甲和矮茎的后代全是高茎，甲是 DD；乙和矮茎的后代一半是矮茎，乙是 Dd。`} notes="豆荚放大了画；后代的株数是示意，画的是刚开花时的样子。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center text-[13px] text-white/60">豆荚里的种子</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="圆粒" value={pk >= 1 ? String(ROUND) : '—'} unit="粒" />
            <ParamTile symbol="皱粒" value={pk >= 1 ? String(WRINKLED) : '—'} unit="粒" />
          </div>
          <div className="mt-2 text-center text-[13.5px] text-white/70 tabular-nums">孟德尔：{MENDEL.seed.a} ∶ {MENDEL.seed.b}，约 {ratio(MENDEL.seed.a, MENDEL.seed.b)} ∶ 1</div>
          <H>测交：和矮茎（dd）杂交</H>
          <div className="flex flex-col gap-1.5">
            {(Object.keys(TEST_PLANTS) as Plant[]).map(p => { const ks = KIDS(p), t = ks.filter(isTall).length, seen = crossed.includes(p) && (p !== last || g >= 1)
              return <Row key={p} name={`高茎${TEST_PLANTS[p].name}`} text={seen ? `后代 高 ${t} · 矮 ${ks.length - t} → ${TEST_PLANTS[p].g}` : '还没做'} on={p === last} seen={seen} /> })}
          </div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'open'} onClick={() => setOpen(true)} disabled={exp !== 'pod' || open}>剥开豆荚</LabButton>
        <LabButton primary pulse={next === 'cross'} onClick={() => setCrossed(c => [...c, nextPlant])} disabled={exp !== 'test' || busy || crossed.length >= 2}>让{TEST_PLANTS[nextPlant].name}和矮茎杂交</LabButton>
      </>}
      extras={<Control label="实验"><Segmented label="实验" pulse={next === 'exp'} want={next === 'exp' ? wantExp : null} value={exp} onChange={v => { if (!busy) setExp(v) }} options={[{ value: 'pod', label: '豆荚里的 3∶1' }, { value: 'test', label: '测交' }]} /></Control>}
    />
  )
}
