// 植物的一生 · 第 6 课 开花和传粉：推近看桃树上的一朵花，从外到里认出各部分，剖开看子房里的胚珠；再做一次自花传粉、一次异花传粉。
import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { Bee, F, Flower, type FlowerPart } from './flower'
import { LESSONS, goLesson } from './lessons'
import { lerp, rng, seg, useRun, type V3 } from './parts'
import { FLOWER, MAIN_PARTS, POLLINATION, pollinationOf, type Pollination } from './physics'
import { Finale, H, Row } from './ui'
import { FLOWER_A, FLOWER_B, Room, TREE } from './world'

const TASKS: Task[] = [
  { id: 'zoom', text: '推近，看桃树上的一朵花', note: '一朵花开在枝条上，下面连着花柄' },
  { id: 'parts', text: '从外到里，逐个认出花的六个部分', note: `${MAIN_PARTS.join('和')}是花的主要结构` },
  { id: 'cut', text: '把花剖开，看子房里面', note: '子房里有胚珠' },
  { id: 'self', text: '做一次自花传粉', note: POLLINATION.self.what },
  { id: 'cross', text: '换成异花传粉，再做一次', note: POLLINATION.cross.what },
]
/** 两朵花在枝上的姿态：A 朝镜头略仰，B 歪向一边 */
export const POSE_A: [number, number, number, 'YXZ'] = [0.28, -0.5, 0, 'YXZ'], POSE_B: [number, number, number, 'YXZ'] = [0.5, 0.6, -0.25, 'YXZ']
const mat = (p: V3, r: [number, number, number, 'YXZ'], s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(s, s, s))
export const MA = mat(FLOWER_A, POSE_A), MB = mat(FLOWER_B, POSE_B, 0.86)
/** 花 A 自己坐标里的一点，在世界里的位置 */
export const worldA = (p: V3): V3 => new THREE.Vector3(...p).applyMatrix4(MA).toArray() as V3
const B_ANTHER = new THREE.Vector3(...F.anther).applyMatrix4(MB).applyMatrix4(MA.clone().invert())
const V = (p: V3) => new THREE.Vector3(...p)
const bez = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number) => a.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(b, 2 * t * (1 - t)).addScaledVector(c, t * t)

/** 传粉的动画（画在花 A 自己的坐标里）。自花：花粉从自己的花药飘到柱头；异花：蜜蜂从另一朵花飞过来 */
function Pollen({ kind, k, stuck }: { kind: Pollination; k: number; stuck: number }) {
  const grains = useMemo(() => { const r = rng(8); return Array.from({ length: 9 }, (_, i) => ({ from: V([F.anther[0] + (r() - 0.5) * 0.5, F.anther[1] + (r() - 0.5) * 0.2, F.anther[2] + (r() - 0.5) * 0.7]), d: i * 0.05, off: V([(r() - 0.5) * 0.11, r() * 0.05, (r() - 0.5) * 0.11]) })) }, [])
  const stigma = V(F.stigma), flap = { t: 0 }
  const [, tick] = useState(0)
  useFrame(() => { if (kind === 'cross' && k > 0 && k < 1) tick(n => n + 1) })
  flap.t = performance.now() / 18
  const going = k > 0 && k < 1
  // 蜜蜂的路线：从另一朵花的花药起飞，落到这朵花的柱头上，再飞走
  const hover = stigma.clone().add(V([0.05, 0.16, 0.12])), away = stigma.clone().add(V([2.6, 2.2, 1.2]))
  const bee = k < 0.62 ? bez(B_ANTHER.clone().add(V([0, 0.2, 0.1])), B_ANTHER.clone().lerp(hover, 0.5).add(V([0, 1.3, 0.5])), hover, seg(k, 0.05, 0.6)) : bez(hover, hover.clone().add(V([0.6, 1.4, 0.4])), away, seg(k, 0.74, 1))
  const bob = Math.sin(performance.now() / 130) * 0.03
  return <group>
    {kind === 'self' && going && grains.map((g, i) => { const t = seg(k, g.d, g.d + 0.5), p = bez(g.from, g.from.clone().lerp(stigma, 0.5).add(V([0, 0.75, 0.2])), stigma.clone().add(g.off), t); return <mesh key={i} position={p}><sphereGeometry args={[0.034, 10, 8]} /><meshBasicMaterial color="#ffd23c" toneMapped={false} /></mesh> })}
    {kind === 'cross' && going && <group position={[bee.x, bee.y + bob, bee.z]} rotation-y={k < 0.62 ? -1.9 : 1.1} scale={1.5}><Bee flap={flap.t} /></group>}
    {/* 落在柱头上的花粉 */}
    {grains.slice(0, stuck).map((g, i) => <mesh key={i} position={stigma.clone().add(g.off)}><sphereGeometry args={[0.03, 10, 8]} /><meshStandardMaterial color="#f2c230" roughness={0.7} /></mesh>)}
  </group>
}

const SUB: Record<string, V3[]> = { stamen: [F.anther, F.filament], pistil: [F.stigma, F.style, F.ovary] }
export default function Lesson6() {
  const [zoom, setZoom] = useState(false), [cutOn, setCutOn] = useState(false)
  const [idx, setIdx] = useState(-1)
  const [kind, setKind] = useState<Pollination>('self'), [run, setRun] = useState<Pollination | null>(null), [did, setDid] = useState<Pollination[]>([])
  const T = useTasks('gewu:plant:6', TASKS)
  const show = useRun(zoom ? 1 : 0, 2.4), cut = useRun(cutOn ? 1 : 0, 1.6), k = useRun(run ? 1 : 0, run ? 5 : 0.01)
  useEffect(() => { if (run && k >= 1) { const n = did.includes(run) ? did : [...did, run]; setDid(n); setRun(null) } }, [k >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { T.check(id => id === 'zoom' ? show >= 1 : id === 'parts' ? idx >= FLOWER.length - 1 : id === 'cut' ? cut >= 1 : did.includes(id as Pollination)) }, [show >= 1, idx, cut >= 1, did])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setZoom(false); setCutOn(false); setIdx(-1); setKind('self'); setRun(null); setDid([]); T.reset() }
  const task = T.current, busy = (zoom && show < 1) || (cutOn && cut < 1) || !!run
  const part = idx >= 0 ? FLOWER[idx % FLOWER.length] : null, sel: FlowerPart = part ? part.key : null
  const wantKind: Pollination | null = task?.id === 'self' || task?.id === 'cross' ? task.id : null
  const { hint, next }: { hint: string; next: 'first' | 'part' | 'kind' | 'go' | null } = (() => {
    if (!task) return { hint: '花粉从花药落到雌蕊柱头上的过程，叫传粉。', next: null }
    if (busy) return { hint: run === 'self' ? '花药里的花粉散出来，落到同一朵花的柱头上…' : run === 'cross' ? '蜜蜂身上沾着另一朵花的花粉，落到这朵花的柱头上…' : zoom && show < 1 ? '镜头推近…' : '把朝外的两片花瓣和几根雄蕊拿开…', next: null }
    if (task.id === 'zoom') return { hint: '桃树正在开花。按“推近看花”', next: 'first' }
    if (task.id === 'parts') return { hint: part ? `这是${part.name}。按“看下一部分”` : '从最下面的花柄开始。按“看下一部分”', next: 'part' }
    if (task.id === 'cut') return { hint: '子房藏在花托里面。按“剖开这朵花”', next: 'first' }
    if (kind !== wantKind) return { hint: `在“传粉方式”里选“${POLLINATION[wantKind!].name}”`, next: 'kind' }
    return { hint: `按“传粉”，看花粉从哪里来、落到哪里`, next: 'go' }
  })()
  const subs = part?.sub && SUB[part.key]
  const labels: Label[] = show < 1 ? [{ id: 'tree', at: [TREE.x, 24, TREE.z], ax: 0.5, name: true, className: 'scene-name', children: '桃树' }] : [
    ...(part && !subs ? [{ id: 'sel', at: worldA(F[part.key as keyof typeof F]), ax: 1, className: 'scene-tag key -translate-x-3 -translate-y-1/2', children: part.name }] : []),
    ...(part && subs ? part.sub!.map((n, i) => ({ id: `sub${i}`, at: worldA(subs[i]), ax: part.key === 'stamen' ? 1 : 0, className: `scene-tag key ${part.key === 'stamen' ? '-translate-x-3' : 'translate-x-3'} -translate-y-1/2`, children: <><small>{part.name}</small>{n}</> })) : []),
    ...(cut >= 1 && !part ? [{ id: 'ovule', at: worldA(F.ovule), className: 'scene-tag translate-x-4 -translate-y-1/2', children: <><small>子房里的</small>胚珠</> }] : []),
    { id: 'b', at: [FLOWER_B[0] + 0.2, FLOWER_B[1] + 2.5, FLOWER_B[2]], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '另一朵花' },
  ]
  const last = did[did.length - 1]
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="桃花"
      stage={<Room at={zoom ? 's6b' : 's6'} labels={labels}>
        <group position={FLOWER_A} rotation={POSE_A}>
          <Flower cut={cut} sel={sel} />
          <Pollen kind={run ?? kind} k={run ? k : 0} stuck={run ? Math.round(lerp(0, 9, seg(k, run === 'self' ? 0.45 : 0.6, run === 'self' ? 0.95 : 0.7))) : did.length ? 9 : 0} />
        </group>
        <group position={FLOWER_B} rotation={POSE_B} scale={0.86}><Flower /></group>
      </Room>}
      lesson={<LessonBlock no="6" title="开花和传粉" concept="雄蕊和雌蕊是花的主要结构" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>一朵花由花柄、花托、萼片、花瓣、雄蕊、雌蕊等组成。<b className="text-white">雄蕊</b>的花药里有花粉，<b className="text-white">雌蕊</b>下部的子房里有胚珠，它们和结出果实、种子直接有关，是花的主要结构。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>花粉从花药落到雌蕊柱头上的过程，叫传粉。</li>
            <li>自花传粉：{POLLINATION.self.what}。</li>
            <li>异花传粉：{POLLINATION.cross.what}。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="两种传粉都做过了" title="花粉从花药落到柱头上，叫传粉" text="雄蕊的花药里有花粉，雌蕊的子房里有胚珠。花粉落到同一朵花的柱头上是自花传粉，传到另一朵花的柱头上是异花传粉。" notes="这朵花是放大了画的；花粉粒实际上很小，肉眼看是一层黄色的粉末。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{part ? '正在看' : '桃花'}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold">{part ? part.name : show >= 1 ? '认一认' : '先推近'}</div>
            <div className="mt-1 min-h-[2.6em] text-[13.5px] leading-snug text-white/70">{part ? `${part.sub ? `由${part.sub.join('、')}组成。` : ''}${part.job}` : '从外到里：花柄、花托、萼片、花瓣、雄蕊、雌蕊'}</div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="花粉来自" value={last ? '花药' : '—'} unit={last ? (last === 'self' ? '同一朵花的雄蕊' : '另一朵花的雄蕊') : '传粉以后就知道'} />
            <ParamTile symbol="花粉落到" value={last ? '柱头' : '—'} unit={last ? `这是${POLLINATION[pollinationOf(last === 'self')].name}` : '传粉以后就知道'} />
          </div>
          <H>花的各部分</H>
          <div className="flex flex-col gap-1.5">{FLOWER.map((q, i) => <Row key={q.key} name={q.name} text={q.sub ? q.sub.join('、') : q.job} on={sel === q.key} seen={idx >= i} tag={MAIN_PARTS.includes(q.name) ? '主要结构' : undefined} />)}</div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'first'} onClick={() => (zoom ? setCutOn(true) : setZoom(true))} disabled={busy || (zoom && cutOn)}>{zoom ? '剖开这朵花' : '推近看花'}</LabButton>
        <LabButton primary pulse={next === 'part'} onClick={() => setIdx(i => i + 1)} disabled={busy || show < 1}>看下一部分</LabButton>
        <LabButton pulse={next === 'go'} onClick={() => { setIdx(-1); setRun(kind) }} disabled={busy || show < 1}>传粉</LabButton>
      </>}
      extras={<Control label="传粉方式"><Segmented label="传粉方式" pulse={next === 'kind'} want={next === 'kind' ? wantKind : null} value={kind} onChange={v => { if (!run) setKind(v) }} disabled={show < 1} options={[{ value: 'self', label: POLLINATION.self.name }, { value: 'cross', label: POLLINATION.cross.name }]} /></Control>}
    />
  )
}
