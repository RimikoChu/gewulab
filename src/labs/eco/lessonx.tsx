// 生态系统 · 拓展课：不同的生态系统（飞到西北的小湖、北边的树林、南边的麦田各看一处）和生态瓶（观察桌上两只瓶，一只放到暗处，过几天比一比）。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { shell, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Fish } from './animals'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { BOTTLE_PARTS, STRONGEST, SYSTEMS, type SystemKey } from './physics'
import { Glass, ease, fuse, place, rng, tint, tube, useRun, type V3 } from './parts'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { LAKE, Room, SPOT, ST, TABLE_H, ground, type SpotKey } from './world'

type Sub = 'types' | 'bottle'
const PLACES: SystemKey[] = ['lake', 'forest', 'farm']
const SPOTS: Record<SystemKey, SpotKey> = { grass: 'q', lake: 'xLake', forest: 'xForest', farm: 'xFarm' }
const TAGS: Record<SystemKey, V3> = { grass: [0, 2, 0], lake: [LAKE.x + 3, LAKE.level + 1.6, LAKE.z + 6], forest: [ST.forest.x + 2, ground(ST.forest.x, ST.forest.z - 6) + 9, ST.forest.z - 6], farm: [ST.farm.x + 2, ground(ST.farm.x, ST.farm.z - 6) + 1.4, ST.farm.z - 6] }

const TASKS: Task[] = [
  { id: 'lake', text: '飞到湖边，看湖泊生态系统', note: SYSTEMS.lake.note },
  { id: 'forest', text: '飞到树林，看森林生态系统', note: SYSTEMS.forest.note },
  { id: 'farm', text: '飞到麦田，看农田生态系统', note: SYSTEMS.farm.note },
  { id: 'bottle', text: '两只生态瓶：一只放到暗处，过几天比一比', note: '光下的瓶里，水草进行光合作用放出氧气，小鱼活得好' },
]

// ---------- 生态瓶 ----------
const B0: V3 = [ST.table.x + 0.3, ground(ST.table.x, ST.table.z) + TABLE_H, ST.table.z - 0.02], B1: V3 = [B0[0] + 0.17, B0[1], B0[2]]
const JAR = shell([[0, 0], [0.05, 0], [0.054, 0.006], [0.054, 0.15], [0.046, 0.165], [0.044, 0.18]], 0.003, { segs: 48 })
function Bottle({ at, dead }: { at: V3; dead: number }) {
  const weeds = useMemo(() => {
    const r = rng((at[0] * 100) | 0), list: THREE.BufferGeometry[] = []
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 0.01 + r() * 0.025, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.07 + r() * 0.05; list.push(place(tube([[x, 0.02, z], [x + (r() - 0.5) * 0.02, 0.02 + h * 0.5, z], [x + (r() - 0.5) * 0.03, 0.02 + h, z + (r() - 0.5) * 0.02]], 0.0035, 0.0015, '#3e6a2a', '#6a9a3a', 4, 8), [0, 0, 0], 0, 0, [1, 1, 0.35])) }
    const snail = place(tint(new THREE.SphereGeometry(0.008, 12, 8), '#6a4a2a', '#9a7a4a'), [0.02, 0.026, -0.02], 0, 0, [1, 0.8, 1])
    return { weeds: fuse(list), snail }
  }, [at])
  const fish = useRef<THREE.Group>(null), k = ease(dead)
  useFrame(({ clock }) => {
    const g = fish.current; if (!g) return
    g.children.forEach((c, i) => {
      if (k > 0.5) { c.position.set(-0.012 + i * 0.022, 0.13 + Math.sin(clock.elapsedTime * 0.6 + i) * 0.002, 0.005 * i); c.rotation.set(0, i, 0); return }
      const t = clock.elapsedTime * (0.6 + i * 0.25) + i * 2; c.position.set(Math.cos(t) * 0.028, 0.06 + i * 0.03 + Math.sin(t * 1.7) * 0.008, Math.sin(t) * 0.028); c.rotation.set(0, -t - Math.PI / 2, 0)
    })
  })
  const water = new THREE.Color('#9fc7c4').lerp(new THREE.Color('#6a7a3a'), k)
  return (
    <group position={at}>
      <mesh geometry={JAR} renderOrder={6}><Glass opacity={0.16} /></mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.051, 0.051, 0.018, 32]} /><meshStandardMaterial color="#b9a07a" roughness={1} /></mesh>
      <mesh geometry={weeds.weeds} castShadow><meshStandardMaterial vertexColors color={new THREE.Color('#ffffff').lerp(new THREE.Color('#a08a4a'), k)} roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={weeds.snail}><meshStandardMaterial vertexColors roughness={0.5} /></mesh>
      <group ref={fish}><Fish dead={k > 0.5} /><Fish dead={k > 0.5} /></group>
      <mesh position={[0, 0.08, 0]} renderOrder={5}><cylinderGeometry args={[0.0505, 0.0505, 0.14, 32]} /><meshPhysicalMaterial color={water} transparent opacity={0.18 + k * 0.35} roughness={0.1} depthWrite={false} /></mesh>
      <mesh position={[0, 0.183, 0]}><cylinderGeometry args={[0.047, 0.047, 0.01, 32]} /><meshStandardMaterial color="#3a3a3a" roughness={0.6} /></mesh>
    </group>
  )
}
function Bottles({ cover, days }: { cover: number; days: number }) {
  const down = ease(cover) * (1 - ease((days - 0.85) / 0.15))
  return (
    <group>
      <Bottle at={B0} dead={0} />
      <Bottle at={B1} dead={days} />
      {cover > 0 && <RoundedBox args={[0.15, 0.24, 0.15]} radius={0.006} position={[B0[0] + 0.17, B0[1] + 0.12 + (1 - down) * 0.3, B0[2]]} castShadow><meshStandardMaterial color="#2a2622" roughness={0.9} transparent opacity={down < 0.02 ? 0 : 1} /></RoundedBox>}
    </group>
  )
}

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('types')
  const [at, setAt] = useState(-1), [cover, setCover] = useState(false), [wait, setWait] = useState(false)
  const T = useTasks('gewu:eco:x', TASKS)
  const cv = useRun(cover ? 1 : 0, 1.2), days = useRun(wait ? 1 : 0, 3.2)
  const [arrived, setArrived] = useState(-1)
  useEffect(() => { if (at < 0) return; const t = setTimeout(() => setArrived(at), 2600); return () => clearTimeout(t) }, [at])
  useEffect(() => { T.check(id => id === 'bottle' ? days >= 1 : PLACES.indexOf(id as SystemKey) >= 0 && PLACES.indexOf(id as SystemKey) <= arrived) }, [arrived, days >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setSub('types'); setAt(-1); setArrived(-1); setCover(false); setWait(false); T.reset() }
  const busy = (sub === 'types' && at !== arrived) || (cover && cv < 1) || (wait && days < 1)
  const task = T.current, want: Sub = task?.id === 'bottle' ? 'bottle' : 'types'
  const sys: SystemKey = at < 0 ? 'grass' : PLACES[at]
  const { hint, nx }: { hint: string; nx: 'sub' | 'go' | 'cover' | 'wait' | null } = (() => {
    if (!task) return { hint: '湖泊、森林、农田、草原都是生态系统。地球上所有的生物和它们的环境合起来，是最大的生态系统：生物圈。', nx: null }
    if (busy) return { hint: sub === 'types' ? '飞过去…' : wait ? '过了几天…' : '…', nx: null }
    if (sub !== want) return { hint: want === 'bottle' ? '换到“生态瓶”' : '换到“不同的生态系统”', nx: 'sub' }
    if (sub === 'types') return { hint: at < 0 ? '草原只是一种生态系统。按“去下一处”' : `这是${SYSTEMS[sys].name}。按“去下一处”`, nx: 'go' }
    if (!cover) return { hint: '两只生态瓶里有水草、小鱼、螺和泥沙，都密封好了。把一只放到暗处', nx: 'cover' }
    return { hint: '按“过几天”，比一比两只瓶', nx: 'wait' }
  })()
  const base = SPOT[sub === 'types' ? SPOTS[sys] : 'xBottle']
  const labels: Label[] = sub === 'types'
    ? (at >= 0 && arrived === at ? [{ id: 's', at: TAGS[sys], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>生产者：{SYSTEMS[sys].producer}</small>{SYSTEMS[sys].name}</> }] : [])
    : [{ id: 'a', at: [B0[0], B0[1] + 0.2, B0[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: '放在光下' }, { id: 'b', at: [B0[0] + 0.17, B0[1] + 0.27, B0[2]], ax: 0.5, className: 'scene-tag -translate-y-full', children: cover ? '放在暗处' : '另一只' }]
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={sub === 'types' ? '不同的生态系统' : '生态瓶'}
      stage={<Room at={sub === 'types' ? SPOTS[sys] : 'xBottle'} labels={labels} shift={[0, 0, 0]} span={base.span}><Bottles cover={cv} days={days} /></Room>}
      lesson={<LessonBlock no="拓展" title="不同的生态系统 · 生态瓶" concept="生物圈是最大的生态系统" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>地球上有多种多样的生态系统：森林、草原、海洋、湿地、农田、城市……它们彼此联系，合在一起就是<b className="text-white">生物圈</b>：地球上所有的生物与其环境的总和，是最大的生态系统。</p>
          <p className="mt-3">生态瓶是一个很小的人工生态系统。瓶里要有生产者（水草）、消费者（小鱼、螺）和分解者（泥沙里的细菌、真菌），还要放在有光的地方。</p>
        </>} />}
      finale={T.finale && <Finale kicker="四处都看过了" title="生物圈是最大的生态系统" text={`湖泊里的生产者是${SYSTEMS.lake.producer}，森林动植物种类多、自我调节能力最强，农田离不开人的管理。生态瓶放在暗处，水草不能进行光合作用，小鱼活不久。`} notes="生态瓶里过的“几天”是示意，没有写具体天数。" onClose={() => T.setFinale(false)} />}
      panel={sub === 'types' ? (
        <Card className="px-4 py-4">
          <div className="text-center"><div className="text-[13px] text-white/60">现在看的是</div><div className="mt-1 text-[26px] leading-tight font-bold">{SYSTEMS[sys].name}</div><div className="mt-1 min-h-[2.6em] text-[13.5px] leading-snug text-white/70">{SYSTEMS[sys].note}</div></div>
          <H>生产者</H>
          <div className="flex flex-col gap-1.5">{(['grass', ...PLACES] as SystemKey[]).map((k, i) => <Row key={k} name={SYSTEMS[k].name.replace('生态系统', '')} text={i === 0 || T.done[k] || arrived >= i - 1 ? SYSTEMS[k].producer : '…'} on={k === sys} seen={i === 0 || arrived >= i - 1} tag={k === STRONGEST && arrived >= 1 ? '调节能力最强' : undefined} />)}</div>
        </Card>
      ) : (
        <Card className="px-4 py-4">
          <H>瓶里有什么</H>
          <div className="flex flex-col gap-1.5">{(Object.keys(BOTTLE_PARTS) as (keyof typeof BOTTLE_PARTS)[]).map(k => <Row key={k} name={{ producer: '生产者', consumer: '消费者', decomposer: '分解者', abiotic: '非生物' }[k]} text={BOTTLE_PARTS[k]} seen />)}</div>
          <H>过几天以后</H>
          <div className="grid grid-cols-2 gap-2 text-center text-[13.5px]">
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-white/60">光下</div><div className="mt-1 font-semibold">{days >= 1 ? '水清，小鱼活着' : '—'}</div></div>
            <div className="rounded-xl bg-white/8 px-2 py-2.5"><div className="text-white/60">暗处</div><div className="mt-1 font-semibold">{days >= 1 ? '水草发黄，小鱼死了' : '—'}</div></div>
          </div>
        </Card>
      )}
      actions={sub === 'types' ? <>
        <LabButton primary pulse={nx === 'go'} onClick={() => setAt(a => Math.min(PLACES.length - 1, a + 1))} disabled={busy || at >= PLACES.length - 1}>去下一处</LabButton>
      </> : <>
        <LabButton pulse={nx === 'cover'} onClick={() => setCover(true)} disabled={busy || cover}>放到暗处</LabButton>
        <LabButton primary pulse={nx === 'wait'} onClick={() => setWait(true)} disabled={busy || !cover || wait}>过几天</LabButton>
      </>}
      extras={<Control label="看哪一个"><Segmented label="看哪一个" pulse={nx === 'sub'} want={nx === 'sub' ? want : null} value={sub} onChange={v => { if (!busy) setSub(v) }} options={[{ value: 'types', label: '不同的生态系统' }, { value: 'bottle', label: '生态瓶' }]} /></Control>}
    />
  )
}
