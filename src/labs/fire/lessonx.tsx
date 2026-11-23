// 燃烧和灭火 · 拓展课 训练场上的三件事：都在基地东边的训练塔一带。
// 隔离带：草坪着火，割出一条隔离带，火烧到那里就灭了。低姿逃生：烟热训练室里的烟往上聚，弯下腰才在烟层下面。水枪灭火：消防车的水炮对着训练塔窗口里的火喷水。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Dummy } from './yardgear'
import { Blaze, Puffs, SMOKE, type PuffOpt } from './fx'
import { ease, lerp, seg, useRun } from './parts'
import { M, YARD, Place, type V3 } from './world'
import { burntTex, makeSign } from './mats'

/** 枯草烧起来的烟：灰色半透明，往上升的同时被风往东吹 */
const GRASS_SMOKE: PuffOpt = { rate: 6, life: 6, size: [3, 24], speed: 3.4, spread: 0.3, color: '#78746e', opacity: 0.42, accel: [3.4, 0.8, -0.4], drag: 0.25, jitter: 2.5 }

type Topic = 'break' | 'escape' | 'hose'
const TOPICS: Record<Topic, { name: string; btn: string; sec: number }> = {
  break: { name: '隔离带', btn: '割出隔离带', sec: 9 },
  escape: { name: '低姿逃生', btn: '弯腰低姿，往外走', sec: 6 },
  hose: { name: '水枪灭火', btn: '打开水炮', sec: 7 },
}
const ORDER: Topic[] = ['break', 'escape', 'hose']
const TASKS: Task[] = [
  { id: 'break', text: '草坪着火了：割出一条隔离带', note: '火烧到隔离带，没有可燃物了，就停下来熄灭了' },
  { id: 'escape', text: '训练室里起烟了：弯腰低姿往外走', note: '热的烟往上走，越靠近地面烟越少' },
  { id: 'hose', text: '训练塔三楼的窗口着火了：打开水炮', note: '水蒸发时带走大量的热，温度降到着火点以下' },
]
/** 草坪：火线从北边（远处）往南（镜头这边）烧，隔离带是一条东西向的土路，在 BREAK_Z 到 BREAK_Z + 5 */
const L = YARD.lawn, LAWN = { x0: L.x - 30, x1: L.x + 30, z0: L.z - 18, z1: L.z + 18 }, START = L.z - 15, BREAK_Z = L.z + 4
/** 烟热训练室：一只剖开的集装箱（朝镜头的一面拿掉），里面靠右是出口 */
const ROOM = { x: YARD.room.x, z: YARD.room.z, w: 6 * M, h: 2.6 * M, d: 2.4 * M }
/** 训练塔三楼东边的窗口；消防车车顶的水炮 */
const WIN: V3 = [YARD.tower.x + 7, 2 * 18 + 4.5, YARD.tower.z + 12 + 0.2], CANNON: V3 = [168, 19.8, -6]

export default function LessonX() {
  const [topic, setTopic] = useState<Topic>('break')
  const T = useTasks('gewu:fire:x', TASKS)
  const run = useRun(TOPICS[topic].sec, () => T.check(id => id === topic))
  const t = run.t, done = !!T.done[topic], k = done ? TOPICS[topic].sec : t
  const pick = (v: Topic) => { if (run.busy) return; run.snap(0); setTopic(v) }
  const resetAll = () => { run.snap(0); setTopic('break'); T.reset() }
  const task = T.current, want = (task?.id as Topic | undefined) ?? null
  const { hint, next }: { hint: string; next: 'go' | 'topic' | null } = !task ? { hint: '隔离可燃物、隔绝氧气、降低温度：训练场上的每一种灭火办法，都是去掉燃烧的一个条件。', next: null }
    : run.busy ? { hint: topic === 'break' ? '割草机割出一条没有草的隔离带；火往这边烧过来…' : topic === 'escape' ? '弯下腰，捂住口鼻，沿着墙往出口走…' : '水炮把水喷进窗口…', next: null }
    : topic !== want ? { hint: `换到“${TOPICS[want!].name}”`, next: 'topic' }
    : done ? { hint: '', next: null } : { hint: `按“${TOPICS[topic].btn}”`, next: 'go' }

  // 隔离带：先割出隔离带（0–2.5 s），火线再往东推进到隔离带，熄灭
  const bk = topic === 'break' ? k : 0
  const strip = done && topic !== 'break' ? 1 : T.done.break ? 1 : ease(seg(bk, 0, 2.5))
  const front = T.done.break ? BREAK_Z : lerp(START, BREAK_Z - 0.5, ease(seg(bk, 2.5, 7.6)))
  const lineLevel = T.done.break ? 0 : 1 - seg(bk, 7.4, 8.8)
  const flames = useMemo(() => Array.from({ length: 11 }, (_, i) => LAWN.x0 + 3 + i * (LAWN.x1 - LAWN.x0 - 6) / 10), [])
  // 低姿逃生：烟层从顶棚往下压到 1.3 m；假人弯腰往出口走
  const ek = topic === 'escape' ? k : T.done.escape ? TOPICS.escape.sec : 0
  const crouch = ease(seg(ek, 0, 1.2)), walk = ease(seg(ek, 1.2, 5.6)), smoke = topic === 'escape' ? 1 : 0.4
  // 水炮：水沿抛物线喷进窗口；火慢慢变小
  const hk = topic === 'hose' ? k : T.done.hose ? TOPICS.hose.sec : 0
  const hoseOn = topic === 'hose' && run.busy && t > 0.4 && t < 6.2
  const winLevel = 1 - ease(seg(hk, 1.6, 6.2))
  const water = useMemo(() => {
    const g = -34, Tf = 1.25, d = new THREE.Vector3(...WIN).sub(new THREE.Vector3(...CANNON))
    const v = new THREE.Vector3(d.x / Tf, (d.y - 0.5 * g * Tf * Tf) / Tf, d.z / Tf)
    return { dir: v.clone().normalize().toArray() as V3, speed: v.length(), g }
  }, [])
  const exitSign = useMemo(() => makeSign(['安全出口'], '#1f8a4c', '#ffffff', 256, 96), [])
  const burnt = useMemo(burntTex, [])
  const spot = topic === 'break' ? 'break' : topic === 'escape' ? 'escape' : 'hose'
  const labels: Label[] = topic === 'break' ? (strip > 0.99 ? [
    { id: 'b', at: [LAWN.x0 + 16, 0.3, BREAK_Z + 5], ax: 0.5, className: 'scene-tag', children: <><small>隔离带</small>没有可燃物</> },
  ] : []) : topic === 'escape' ? [
    { id: 's', at: [ROOM.x + ROOM.w / 2 + 1, ROOM.h * 0.82, ROOM.z], className: 'scene-tag -translate-y-1/2', children: <><small>烟层</small>聚在上面</> },
    { id: 'f', at: [ROOM.x + ROOM.w / 2 + 1, 0.4 * M, ROOM.z], className: 'scene-tag -translate-y-1/2', children: <><small>贴近地面</small>烟少</> },
  ] : [
    { id: 'w', at: [WIN[0] + 6, WIN[1] + 4, WIN[2]], className: 'scene-tag -translate-y-1/2', children: <><small>窗口的火</small>{winLevel < 0.05 ? '灭了' : '在烧'}</> },
  ]
  return (
    <LabShell title="燃烧和灭火" lessons={LESSONS} current="x" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['x'], VOICE)} actionsLabel={TOPICS[topic].name}
      stage={<Place at={spot} labels={labels}>
        {/* 草坪上的火线、烧过的黑地、隔离带 */}
        <mesh rotation-x={-Math.PI / 2} position={[L.x, 0.06, (LAWN.z0 - 3 + front) / 2]}><planeGeometry args={[LAWN.x1 - LAWN.x0 + 4, Math.max(0.1, front - LAWN.z0 + 3)]} /><meshStandardMaterial map={burnt} transparent depthWrite={false} roughness={1} /></mesh>
        <mesh rotation-x={-Math.PI / 2} position={[LAWN.x0 + (LAWN.x1 - LAWN.x0) * strip / 2, 0.07, BREAK_Z + 2.5]}><planeGeometry args={[Math.max(0.01, (LAWN.x1 - LAWN.x0) * strip), 5]} /><meshStandardMaterial color="#7a6244" roughness={1} /></mesh>
        {flames.map((x, i) => <Blaze key={i} at={[x, 0.05, front - (i % 2) * 0.8]} w={3.6} h={4.5 + (i % 3)} spread={1.6} kind="oil" level={lineLevel} n={3} light={i % 3 === 0 ? 30 : 0} seed={i * 3} />)}
        {/* 沿整条火线升起的几股灰烟：越高越淡、越散，被风吹得往东斜 */}
        {[-24, -14, -4, 6, 16, 26].map((dx, i) => <Puffs key={dx} at={[L.x + dx, 3, front - 1]} on={lineLevel > 0.2} opt={GRASS_SMOKE} seed={20 + i} />)}
        {/* 割草机：沿着隔离带走过去 */}
        {topic === 'break' && run.busy && strip < 1 && <group position={[LAWN.x0 + (LAWN.x1 - LAWN.x0) * strip, 0, BREAK_Z + 2.5]} rotation-y={Math.PI / 2}>
          <mesh position={[0, 1.4, 0]} castShadow><boxGeometry args={[3.6, 1.6, 2.6]} /><meshPhysicalMaterial color="#c3281f" roughness={0.4} clearcoat={0.5} /></mesh>
          <mesh position={[0, 3.4, -2.2]} rotation-x={-0.5}><cylinderGeometry args={[0.12, 0.12, 4.6, 8]} /><meshStandardMaterial color="#222" /></mesh>
          {[-1, 1].flatMap(sx => [-1, 1].map(sz => <mesh key={`${sx}${sz}`} position={[sx * 1.7, 0.6, sz * 1.1]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.6, 0.6, 0.4, 14]} /><meshStandardMaterial color="#1a1a1a" /></mesh>))}
        </group>}
        {/* 烟热训练室：剖开的集装箱 */}
        <group position={[ROOM.x, 0, ROOM.z]}>
          <mesh position={[0, ROOM.h / 2, -ROOM.d / 2]} receiveShadow><boxGeometry args={[ROOM.w, ROOM.h, 0.3]} /><meshStandardMaterial color="#6d6a63" roughness={0.9} /></mesh>
          <mesh position={[0, ROOM.h + 0.15, 0]} castShadow><boxGeometry args={[ROOM.w + 0.4, 0.3, ROOM.d + 0.3]} /><meshStandardMaterial color="#8b2d22" roughness={0.6} metalness={0.4} /></mesh>
          {[-1, 1].map(s => <mesh key={s} position={[s * ROOM.w / 2, ROOM.h / 2, 0]} receiveShadow castShadow><boxGeometry args={[0.3, ROOM.h, ROOM.d]} /><meshStandardMaterial color="#8b2d22" roughness={0.6} metalness={0.4} /></mesh>)}
          <mesh position={[0, 0.15, 0]} receiveShadow><boxGeometry args={[ROOM.w, 0.3, ROOM.d]} /><meshStandardMaterial color="#3a3835" roughness={0.9} /></mesh>
          {/* 剖面上一道红色的切口边，看得出这是剖开的 */}
          {[0.15, ROOM.h].map(y => <mesh key={y} position={[0, y, ROOM.d / 2]}><boxGeometry args={[ROOM.w, 0.12, 0.12]} /><meshBasicMaterial color="#d2362f" /></mesh>)}
          {/* 出口：右边墙上一扇开着的门，门上一块绿色的“安全出口” */}
          <mesh position={[ROOM.w / 2 - 0.1, 1.05 * M, 0]}><boxGeometry args={[0.32, 2.1 * M, 0.9 * M]} /><meshBasicMaterial color="#d9e6ea" toneMapped={false} /></mesh>
          <mesh position={[ROOM.w / 2 - 0.2, 2.3 * M, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[0.7 * M, 0.26 * M]} /><meshBasicMaterial map={exitSign} toneMapped={false} /></mesh>
          {/* 烟层：顶棚下面一层灰黑的烟，越往下越淡 */}
          {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[0, ROOM.h - (0.12 + i * 0.24) * M, 0]}><boxGeometry args={[ROOM.w - 0.4, 0.24 * M, ROOM.d - 0.4]} /><meshBasicMaterial color="#2e2c2a" transparent opacity={[0.85, 0.75, 0.6, 0.42, 0.22][i] * (0.35 + 0.65 * smoke)} depthWrite={false} /></mesh>)}
          <Puffs at={[-ROOM.w / 2 + 2, ROOM.h - 0.8 * M, 0]} on opt={{ ...SMOKE.dark(1.2), accel: [1.2, 0, 0], speed: 1.2, dir: [1, 0.1, 0], life: 5 }} seed={4} />
          <group position={[lerp(-ROOM.w / 2 + 3, ROOM.w / 2 - 3, walk), 0.3, 0.2 * M]} rotation-y={0}><Dummy crouch={crouch} /></group>
        </group>
        {/* 训练塔三楼窗口里的火，和水炮喷出的水 */}
        <Blaze at={[WIN[0], WIN[1], WIN[2] - 1.5]} w={4} h={7} spread={2} kind="wood" level={winLevel} n={5} light={60} seed={8} />
        <Puffs at={[WIN[0], WIN[1] + 8, WIN[2]]} on={winLevel > 0.2} opt={{ ...SMOKE.dark(4.5), rate: 12 }} seed={9} />
        <Puffs at={[WIN[0], WIN[1] + 3, WIN[2]]} on={hoseOn && hk > 1.4} opt={SMOKE.steam(4)} seed={10} />
        <Puffs at={CANNON} on={hoseOn} opt={{ rate: 70, life: 1.3, size: [0.7, 2.6], speed: water.speed, dir: water.dir, spread: 0.025, color: '#e4f0f6', opacity: 0.7, accel: [0, water.g, 0] }} seed={11} />
        <group position={CANNON}>
          <mesh position={[0, -0.6, 0]}><cylinderGeometry args={[0.7, 0.9, 1.2, 16]} /><meshStandardMaterial color="#b9bcbe" metalness={0.8} roughness={0.35} /></mesh>
          <mesh quaternion={useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...water.dir)), [water])} position={[water.dir[0] * 1.2, water.dir[1] * 1.2, water.dir[2] * 1.2]}><cylinderGeometry args={[0.25, 0.4, 2.6, 14]} /><meshStandardMaterial color="#c9ccce" metalness={0.9} roughness={0.25} /></mesh>
        </group>
      </Place>}
      lesson={<LessonBlock no="拓展" title="训练场上的三件事" concept="每一种灭火办法，都是去掉一个燃烧条件" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">隔离带</b>：扑灭森林、草原火灾时，把火势前方的树木、草割掉，开辟一条隔离带。火烧到那里没有可燃物，就熄灭了。</p>
          <p className="mt-3"><b className="text-white">低姿逃生</b>：着火时烟和热空气往上走，屋里的烟一层层往下压。逃生时用湿毛巾捂住口鼻，弯下腰、贴近地面，沿着墙往安全出口走。</p>
          <p className="mt-3"><b className="text-white">水枪灭火</b>：水蒸发时要吸收大量的热，能使温度降到着火点以下。</p>
          <p className="mt-3 text-[13.5px] text-white/65">拓展课的内容，随堂检测不考。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,440px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三件事都做完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">隔离可燃物、隔绝氧气、降低温度</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">隔离带去掉了可燃物，水炮把温度降到着火点以下；逃生时弯腰低姿，避开往上聚的烟。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{TOPICS[topic].name}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold tracking-tight">{topic === 'break' ? '隔离可燃物' : topic === 'escape' ? '避开烟层' : '降低温度'}</div>
          </div>
          <p className="mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/75">{topic === 'break' ? '火线前面的草割掉了，火烧到这里，没有可燃物可烧。' : topic === 'escape' ? '热的烟比冷空气轻，聚在屋顶下面，越积越厚，慢慢往下压。弯下腰，口鼻就在烟层下面。' : '水落进火里变成水蒸气，吸收大量的热，木头的温度降到着火点以下。'}</p>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'go'} onClick={() => run.run()} disabled={run.busy || done}>{TOPICS[topic].btn}</LabButton>
      </>}
      extras={
        <Control label="专题">
          <Segmented label="专题" pulse={next === 'topic'} want={next === 'topic' ? want : null} disabled={run.busy} value={topic} onChange={v => pick(v as Topic)} options={ORDER.map(v => ({ value: v, label: TOPICS[v].name }))} />
        </Control>
      }
    />
  )
}
