// 生态系统 · 第 2 课 生态系统的组成：在草原上逐类认生产者、消费者、分解者和非生物部分。
// 每认一个，镜头飞到那一处推近看（草、野花、灌木；兔、羊、鼠、蝗虫、狐、鹰；枯木上的蘑菇、土里的细菌；阳光、空气、水、土壤），
// 再让枯木边的一堆落叶“过一个月”，看分解者把它分解掉。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { Eagle, Fox, Hopper, Mouse, Rabbit } from './animals'
import { Halo } from './fx'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { MEMBERS, ROLE_JOB, ROLE_NAME, type Role } from './physics'
import { Flesh, Plant, ease, fuse, place, rng, tint, tube, useRun, type V3 } from './parts'
import { Finale, H, Row } from './ui'
import { VOICE } from './voice'
import { LAKE, LOG, Room, SPOT, ground, onGround, rockGeo, shrubGeo } from './world'

const ROLES: Role[] = ['producer', 'consumer', 'decomposer', 'abiotic']
/** 第 2 课里各样东西在草原上的位置 */
const P = {
  shrub: onGround(3.4, 2.0), flowers: onGround(1.8, 3.5), grass: onGround(1.1, 2.5),
  rabbit: onGround(-2.4, -6.4), rabbit2: onGround(-1.5, -7.1), mouse: onGround(-2.95, -5.9), stone: onGround(-2.0, -5.45), fox: onGround(0.5, -8.7), stump: onGround(-4.3, -8.3),
  litter: onGround(LOG.x + 0.55, LOG.z + 0.75), soil: onGround(0.5, 1.0),
}
const logAt = (lx: number, ly: number, lz: number): V3 => { const c = Math.cos(LOG.yaw), s = Math.sin(LOG.yaw), b = onGround(LOG.x, LOG.z, -0.04); return [b[0] + lx * c + lz * s, b[1] + ly, b[2] - lx * s + lz * c] }
interface Shot { at: V3; span: [number, number]; view?: [number, number]; tag?: V3 }
const STONE_TOP = 0.07
/** 每一样东西推近看的机位，和标签挂在哪 */
const SHOT: Record<string, Shot> = {
  草: { at: [P.grass[0], P.grass[1] + 0.12, P.grass[2]], span: [0.9, 0.45], view: [-0.35, 0.32] },
  野花: { at: [P.flowers[0], P.flowers[1] + 0.22, P.flowers[2]], span: [0.9, 0.45], view: [-0.35, 0.22], tag: [P.flowers[0], P.flowers[1] + 0.34, P.flowers[2]] },
  灌木: { at: [P.shrub[0], P.shrub[1] + 0.6, P.shrub[2]], span: [2.6, 1.4], view: [-0.35, 0.16], tag: [P.shrub[0], P.shrub[1] + 1.3, P.shrub[2]] },
  兔: { at: [P.rabbit[0] + 0.05, P.rabbit[1] + 0.16, P.rabbit[2]], span: [1.0, 0.5], view: [-0.5, 0.14], tag: [P.rabbit[0], P.rabbit[1] + 0.42, P.rabbit[2]] },
  羊: { at: onGround(-6.5, -17.5, 0.6), span: [8, 3.2], view: [-0.35, 0.14], tag: onGround(-5.5, -16, 1.2) },
  鼠: { at: [P.mouse[0], P.mouse[1] + 0.05, P.mouse[2]], span: [0.5, 0.24], view: [-0.6, 0.3], tag: [P.mouse[0], P.mouse[1] + 0.12, P.mouse[2]] },
  蝗虫: { at: [P.stone[0], P.stone[1] + STONE_TOP + 0.015, P.stone[2]], span: [0.2, 0.1], view: [-0.35, 0.4], tag: [P.stone[0], P.stone[1] + STONE_TOP + 0.05, P.stone[2]] },
  狐: { at: [P.fox[0], P.fox[1] + 0.35, P.fox[2]], span: [1.9, 0.8], view: [-0.35, 0.1], tag: [P.fox[0], P.fox[1] + 0.75, P.fox[2]] },
  鹰: { at: [P.stump[0], P.stump[1] + 1.08, P.stump[2]], span: [1.1, 1.15], view: [-0.25, 0.08], tag: [P.stump[0], P.stump[1] + 1.55, P.stump[2]] },
  蘑菇: { at: logAt(0.0, 0.3, 0.05), span: [1.1, 0.5], view: [-0.3, 0.3], tag: logAt(0.15, 0.45, 0.03) },
  细菌: { at: [P.litter[0], P.litter[1] + 0.06, P.litter[2]], span: [1.0, 0.45], view: [-0.3, 0.45], tag: [P.litter[0], P.litter[1] + 0.12, P.litter[2]] },
  阳光: { at: onGround(0, -2, 2), span: [26, 10], view: [-0.35, 0.1], tag: onGround(2, -6, 6) },
  空气: { at: onGround(-3, -8, 2.5), span: [18, 8], view: [-0.6, 0.12], tag: onGround(-3, -8, 4) },
  水: { at: [LAKE.x + 2, LAKE.level + 1, LAKE.z + 4], span: [30, 11], view: [0.5, 0.16], tag: [LAKE.x, LAKE.level + 0.4, LAKE.z] },
  土壤: { at: [P.soil[0], P.soil[1] + 0.06, P.soil[2]], span: [0.8, 0.38], view: [-0.35, 0.4], tag: [P.soil[0], P.soil[1] + 0.16, P.soil[2]] },
}
const OVER: Record<Role, Shot> = {
  producer: { at: onGround(2.3, 2.9, 0.4), span: [4.2, 2], view: [-0.35, 0.2] },
  consumer: { at: onGround(-2.6, -9, 0.5), span: [9.5, 4], view: [-0.35, 0.18] },
  decomposer: { at: logAt(0.3, 0.2, 0.3), span: [3.2, 1.4], view: [-0.3, 0.3] },
  abiotic: SHOT['阳光'],
}
const SPECIAL: Record<string, string> = { 细菌: '土壤和落叶里的细菌、真菌，太小，用肉眼看不见', 空气: '空气看不见，但到处都有', 阳光: '照在整片草原上' }

const TASKS: Task[] = [
  { id: 'producer', text: '在草原上认出生产者', note: '草、野花、灌木都能进行光合作用，制造有机物' },
  { id: 'consumer', text: '认出消费者', note: '动物直接或间接以植物为食' },
  { id: 'decomposer', text: '认出分解者', note: '蘑菇和细菌靠分解动植物的遗体生活' },
  { id: 'rot', text: '让枯枝落叶过一个月，看分解者在做什么', note: '落叶被分解了，有机物变成无机物，回到土壤里' },
  { id: 'abiotic', text: '认出非生物部分', note: '阳光、空气、水、土壤也是生态系统的一部分' },
]
const roleOfTask = (id?: string): Role | null => (id === 'rot' ? 'decomposer' : (id as Role) ?? null)

// ---------- 场景 ----------
/** 一堆枯叶和小枯枝：rot 从 0 到 1，叶子变暗、变碎、变少，长出白色的菌丝 */
function Litter({ rot }: { rot: number }) {
  const g = useMemo(() => {
    const r = rng(12), leaves: THREE.BufferGeometry[] = [], twigs: THREE.BufferGeometry[] = []
    for (let i = 0; i < 110; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.3, L = new THREE.CircleGeometry(0.025, 9); L.scale(0.5, 1, 1); const p = L.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, Math.abs(p.getX(k)) * (0.6 + r()) * 0.6); L.computeVertexNormals(); L.rotateX(-Math.PI / 2); leaves.push(place(tint(L, ['#6e4a2a', '#7d5a34', '#5a4026', '#8a6a3e', '#4e3a26'][i % 5]), [Math.cos(a) * d, 0.008 + r() * 0.04 * (1 - d / 0.3), Math.sin(a) * d], r() * 6.28, (r() - 0.5) * 0.9, 0.7 + r() * 0.7)) }
    for (let i = 0; i < 6; i++) { const a = r() * 6.28; twigs.push(tube([[Math.cos(a) * 0.2, 0.02, Math.sin(a) * 0.2], [0, 0.04, 0], [-Math.cos(a) * 0.15, 0.02, -Math.sin(a) * 0.15 + 0.05]], 0.006, 0.003, '#5d4632', '#6e5640', 4, 6)) }
    const hy: THREE.BufferGeometry[] = []
    for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = r() * 0.25, a2 = a + (r() - 0.5) * 2; hy.push(tube([[Math.cos(a) * d, 0.012, Math.sin(a) * d], [Math.cos(a2) * (d + 0.05), 0.02, Math.sin(a2) * (d + 0.05)], [Math.cos(a2) * (d + 0.1), 0.01, Math.sin(a2) * (d + 0.08)]], 0.0012, 0.0006, '#f2efe6', '#e8e2d4', 3, 6)) }
    return { leaves: fuse(leaves), twigs: fuse(twigs), hy: fuse(hy) }
  }, [])
  const k = ease(rot)
  return (
    <group position={P.litter}>
      <mesh geometry={g.leaves} scale={[1 - k * 0.45, 1 - k * 0.7, 1 - k * 0.45]} castShadow receiveShadow><meshStandardMaterial vertexColors color={new THREE.Color('#ffffff').lerp(new THREE.Color('#3a3026'), k * 0.75)} roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={g.twigs} scale={1 - k * 0.3} castShadow><Flesh rough={0.95} color={new THREE.Color('#ffffff').lerp(new THREE.Color('#5a5048'), k).getStyle()} /></mesh>
      {k > 0.05 && <mesh geometry={g.hy} scale={[k, 1, k]}><meshStandardMaterial vertexColors roughness={0.6} transparent opacity={Math.min(1, k * 1.5)} /></mesh>}
      {/* 下面一层深色的腐殖质 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} receiveShadow><circleGeometry args={[0.32, 24]} /><meshStandardMaterial color="#2e241c" roughness={1} transparent opacity={0.25 + k * 0.6} /></mesh>
    </group>
  )
}
function Scene2({ rot }: { rot: number }) {
  const g = useMemo(() => {
    const s = shrubGeo(42, 0.75, ['#3a5a24', '#7a9a44']), stone = rockGeo(5, [0.09, 0.07, 0.07], '#7d776c')
    const f: THREE.BufferGeometry[] = [], r = rng(31)
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 0.3, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.18 + r() * 0.14, petal = ['#f2c94a', '#f3f0ea', '#a487c8'][i % 3]
      f.push(tube([[x, 0, z], [x + 0.01, h * 0.6, z], [x, h, z + 0.01]], 0.0035, 0.0028, '#56712e', '#6d8a3b', 4, 6))
      for (let k = 0; k < 8; k++) { const pg = new THREE.CircleGeometry(0.02, 6, 0, Math.PI); pg.scale(0.5, 1, 1); pg.translate(0, 0.018, 0); pg.rotateX(-Math.PI / 2 + 0.3); f.push(place(tint(pg, petal, '#ffffff'), [x, h, z + 0.01], (k / 8) * 6.28, 0)) }
      f.push(place(tint(new THREE.SphereGeometry(0.009, 8, 6), '#d7861e'), [x, h + 0.004, z + 0.01], 0, 0, [1, 0.6, 1]))
    }
    const stump = tube([[0, -0.1, 0], [0.02, 0.4, 0], [0.0, 0.72, 0.01]], 0.16, 0.13, '#5b4a3a', '#6e5c48', 14, 6)
    return { s, stone, flowers: fuse(f), stump }
  }, [])
  return (
    <group>
      <group position={P.shrub} rotation-y={0.6}><mesh geometry={g.s.wood} castShadow><Flesh rough={0.9} /></mesh><mesh geometry={g.s.leaves} castShadow receiveShadow><Plant rough={0.7} /></mesh></group>
      <group position={P.flowers}><mesh geometry={g.flowers} castShadow><meshStandardMaterial vertexColors roughness={0.6} side={THREE.DoubleSide} /></mesh></group>
      <Rabbit position={P.rabbit} rotation-y={-1.0} seed={2} />
      <Rabbit position={P.rabbit2} rotation-y={-2.3} seed={5} act="hop" />
      <Mouse position={P.mouse} rotation-y={1.6} />
      <group position={P.stone}><mesh geometry={g.stone} castShadow receiveShadow><Flesh rough={0.9} /></mesh><Hopper position={[0, STONE_TOP - 0.004, 0]} rotation-y={0.7} /></group>
      <Fox position={P.fox} rotation-y={2.2} />
      <group position={P.stump}><mesh geometry={g.stump} castShadow receiveShadow><Flesh rough={0.95} /></mesh><mesh position={[0, 0.72, 0.01]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.13, 20]} /><meshStandardMaterial color="#9a7d58" roughness={1} /></mesh>
        <Eagle position={[0, 0.72, 0]} rotation-y={0.4} /></group>
      <Litter rot={rot} />
      {/* 一小堆刨开的土 */}
      <group position={P.soil}><mesh castShadow receiveShadow scale={[0.16, 0.06, 0.13]}><sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#4a3a2a" roughness={1} /></mesh></group>
    </group>
  )
}

export default function Lesson2() {
  const [role, setRole] = useState<Role>('producer')
  const [idx, setIdx] = useState<Record<Role, number>>({ producer: -1, consumer: -1, decomposer: -1, abiotic: -1 })
  const [rotOn, setRotOn] = useState(false)
  const T = useTasks('gewu:eco:2', TASKS)
  const rot = useRun(rotOn ? 1 : 0, 3.5)
  const list = MEMBERS[role], i = idx[role], name = i >= 0 ? list[i] : null
  const task = T.current, want = roleOfTask(task?.id)
  const next = () => {
    if (i >= list.length - 1) return
    const n = { ...idx, [role]: i + 1 }; setIdx(n)
    T.check(id => (ROLES as string[]).includes(id) && n[id as Role] >= MEMBERS[id as Role].length - 1)
  }
  useEffect(() => { if (rot >= 1) T.check(id => id === 'rot') }, [rot >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setRole('producer'); setIdx({ producer: -1, consumer: -1, decomposer: -1, abiotic: -1 }); setRotOn(false); T.reset() }
  const busy = rotOn && rot < 1
  const { hint, nx }: { hint: string; nx: 'role' | 'next' | 'rot' | null } = (() => {
    if (!task) return { hint: '都认完了。生物部分和非生物部分合在一起，就是一个生态系统。', nx: null }
    if (busy) return { hint: '一个月过去了…', nx: null }
    if (want && role !== want) return { hint: `换到“${ROLE_NAME[want]}”`, nx: 'role' }
    if (task.id === 'rot') return { hint: '枯枝落叶堆在枯木边。按“过一个月”，看分解者在做什么', nx: 'rot' }
    if (!name) return { hint: `按“看下一个”，在草原上找${ROLE_NAME[role]}`, nx: 'next' }
    return { hint: `这是${name}。按“看下一个”`, nx: 'next' }
  })()
  const shot = task?.id === 'rot' || (role === 'decomposer' && rotOn) ? SHOT['细菌'] : name ? SHOT[name] : OVER[role]
  const base = SPOT.s2.target
  const shift: V3 = [shot.at[0] - base.x, shot.at[1] - base.y, shot.at[2] - base.z]
  const labels: Label[] = name ? [{ id: 'm', at: shot.tag ?? [shot.at[0], shot.at[1] + 0.2, shot.at[2]], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>{ROLE_NAME[role]}</small>{name}</> }] : []
  const halo = name && !['阳光', '空气', '水', '羊', '细菌', '土壤'].includes(name) ? shot : null
  return (
    <LabShell title="生态系统" lessons={LESSONS} current="2" narration={voiced(NARRATION['2'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={ROLE_NAME[role]}
      stage={<Room at="s2" labels={labels} shift={shift} span={shot.span} view={shot.view}>
        <Scene2 rot={rot} />
        {halo && <Halo at={[halo.at[0], ground(halo.at[0], halo.at[2]), halo.at[2]]} r={Math.max(0.04, shot.span[0] * 0.13)} />}
      </Room>}
      lesson={<LessonBlock no="2" title="生态系统的组成" concept="生物和环境组成生态系统" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>在一定的地域内，<b className="text-white">生物与环境所形成的统一的整体</b>叫做生态系统。一片草原就是一个生态系统。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            {ROLES.map(r => <li key={r}><b className="text-white">{ROLE_NAME[r]}</b>：{ROLE_JOB[r]}。</li>)}
          </ul>
          <p className="mt-3 text-white/70">没有分解者，动植物的遗体就会堆积如山，生态系统就会崩溃。</p>
        </>} />}
      finale={T.finale && <Finale kicker="草原上的四类都认完了" title="生物部分加上非生物部分，组成生态系统" text="生产者制造有机物，消费者直接或间接以植物为食，分解者把遗体分解成无机物还给环境；阳光、空气、水、土壤为生物提供生存的条件。" notes="细菌、真菌的菌丝太小，画面上的白丝只是示意。" onClose={() => T.setFinale(false)} />}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{ROLE_NAME[role]}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold">{name ?? '找一找'}</div>
            <div className="mt-1 min-h-[2.6em] text-[13.5px] leading-snug text-white/70">{name && SPECIAL[name] ? SPECIAL[name] : ROLE_JOB[role]}</div>
          </div>
          <H>{ROLE_NAME[role]}有哪些</H>
          <div className="flex flex-col gap-1.5">{list.map((m, k) => <Row key={m} name={m} text={k <= i ? (SPECIAL[m] ?? ROLE_NAME[role]) : '…'} on={name === m} seen={k <= i} />)}</div>
          <H>四类都认了吗</H>
          <div className="grid grid-cols-4 gap-1.5 text-center text-[12.5px]">{ROLES.map(r => <div key={r} className={`rounded-lg px-1 py-1.5 ${T.done[r] ? 'bg-[#35c7b3]/25 text-white' : 'bg-white/6 text-white/45'}`}>{ROLE_NAME[r].replace('部分', '')}</div>)}</div>
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={nx === 'next'} onClick={next} disabled={busy || i >= list.length - 1}>看下一个</LabButton>
        {role === 'decomposer' && <LabButton pulse={nx === 'rot'} onClick={() => setRotOn(true)} disabled={busy || rotOn || i < list.length - 1}>过一个月</LabButton>}
      </>}
      extras={<Control label="看哪一类"><Segmented label="看哪一类" pulse={nx === 'role'} want={nx === 'role' ? want : null} value={role} onChange={v => { if (!busy) setRole(v) }} options={ROLES.map(r => ({ value: r, label: ROLE_NAME[r] }))} /></Control>}
    />
  )
}
