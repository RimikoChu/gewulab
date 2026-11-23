// 植物的一生 · 第 3 课 种子萌发的过程：观察箱里贴着玻璃种了一粒菜豆。浇水以后，看它吸水膨胀、胚根突破种皮、胚轴伸长把子叶带出土面、胚芽长成茎和叶。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Flesh, LeafMat, leafGeo, lerp, rng, seg, tube, useGeo, useRun, type V3 } from './parts'
import { BECOMES, FIRST_OUT, SEEDS, STAGES, feedsFrom } from './physics'
import { kidney, makeCoat } from './seeds'
import { Finale, H, Row } from './ui'
import { GERM, Room } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const X = GERM.x, Z = GERM.face, TOP = GERM.top - 0.12, SEED_Y = TOP - 1.45, S = 0.9
const TASKS: Task[] = STAGES.map((s, i) => ({ id: s.key, text: i === 0 ? '给种子浇水，看它吸水膨胀' : i === 1 ? '继续等，看哪一部分最先突破种皮' : i === 2 ? '继续等，看子叶是怎么出土的' : '继续等，看胚芽长成什么', note: s.what }))
const partName = (k: keyof typeof BECOMES) => SEEDS.bean.parts.find(p => p.key === k)!.name
/** 侧根：在主根的哪个深度岔出去、朝哪边、多长 */
const SIDE = (() => { const r = rng(12); return Array.from({ length: 8 }, (_, i) => ({ d: 0.35 + i * 0.32, s: i % 2 ? 1 : -1, L: 1.7 - i * 0.12 + r() * 0.6, dip: 0.3 + r() * 0.5 })) })()

/** 观察箱里的这棵苗。t：0 干种子，1 吸足了水，2 胚根长出来，3 子叶出土，4 茎和叶长成 */
function Seedling({ t }: { t: number }) {
  const g = useMemo(() => ({
    a: kidney(true, -1, '#e6d7a8', '#f1e6c2'), b: kidney(true, 1, '#e6d7a8', '#f1e6c2'),
    ca: kidney(false, -1, '#ffffff', '#ffffff', 1.04).dome, cb: kidney(false, 1, '#ffffff', '#ffffff', 1.04).dome,
    leaf: leafGeo({ len: 2.7, wid: 2.4, basePow: 0.6, tipPow: 0.8, curl: 0.14, fold: 0.22, wave: 0.07, base: '#3d7f33', tip: '#74ad48', nu: 14, nv: 4 }),
    side: SIDE.map(q => tube([[0, 0, 0], [q.s * q.L * 0.45, -q.L * q.dip * 0.3, 0], [q.s * q.L, -q.L * q.dip, 0]], 0.06, 0.015, '#eee4c8', '#f7f1e0', 6, 8)),
  }), [])
  const coat = useMemo(makeCoat, [])
  useEffect(() => () => coat.dispose(), [coat])
  const swell = 1 + 0.2 * seg(t, 0.1, 1)
  const rootL = 0.01 + 1.7 * seg(t, 1, 2.2) + 1.5 * seg(t, 2.2, 4)
  const hook = seg(t, 2, 2.35) - seg(t, 3.0, 3.55), rise = seg(t, 2, 3.05), tall = seg(t, 3, 4)
  const nodeY = lerp(SEED_Y - 0.5 * S * swell, TOP + 1.4, rise) + 1.5 * tall, nodeX = X + 0.6 * hook
  const above = seg(nodeY, TOP - 0.35, TOP + 0.5), opened = 1.15 * seg(t, 3.05, 3.65), spent = seg(t, 3.45, 4), grow = seg(t, 3.25, 4)
  const root = useGeo(() => tube([[0, 0, 0], [0.07, -rootL * 0.35, 0], [-0.1, -rootL * 0.7, 0], [0.05, -rootL, 0]], 0.15, 0.04, '#eee4c8', '#f8f3e4', 8, 16, 0.8), [Math.round(rootL * 50)])
  const stemPts: V3[] = [[X, SEED_Y - 0.5 * S - 0.1, 0], [X - 0.08 * rise, lerp(SEED_Y - 0.5 * S, nodeY, 0.5), 0], ...(hook > 0.04 ? [[X + 0.22 * hook, nodeY + 0.6 * hook, 0] as V3] : []), [nodeX, nodeY - 0.02, 0]]
  const stem = useGeo(() => tube(stemPts, 0.17, 0.15, '#efe6cc', hook > 0.5 ? '#dcdca0' : '#7fae4a', 9, 18, 0.6), [Math.round(nodeY * 60), Math.round(hook * 30)])
  const epi = useGeo(() => tube([[0, 0, 0], [0.05, 0.9 * grow, 0], [0, 1.8 * grow + 0.01, 0]], 0.12, 0.08, '#9dbf62', '#8fb657', 8, 8), [Math.round(grow * 40)])
  const cot = new THREE.Color('#ece0b4').lerp(new THREE.Color('#9fc070'), seg(t, 2.9, 3.4)).lerp(new THREE.Color('#c9b46a'), spent)
  const coatMat = <meshPhysicalMaterial map={coat} roughness={0.3} clearcoat={0.5} side={THREE.DoubleSide} color={new THREE.Color('#ffffff').lerp(new THREE.Color('#b79a8a'), seg(t, 2, 3))} />
  return (
    <group position={[0, 0, Z]}>
      {/* 浇过水的土：颜色变深 */}
      <mesh position={[X, (GERM.y0 + TOP) / 2, -0.2]}><planeGeometry args={[GERM.w - 0.4, TOP - GERM.y0 - 0.1]} /><meshBasicMaterial color="#140c08" transparent opacity={0.34 * seg(t, 0.05, 0.7)} depthWrite={false} /></mesh>
      {/* 土里的部分贴着玻璃，压扁了画 */}
      <group scale={[1, 1, 0.5]}>
        <group position={[X, SEED_Y - 0.5 * S - 0.05, 0]} visible={t > 1.02}>
          <mesh geometry={root}><Flesh rough={0.7} /></mesh>
          {SIDE.map((q, i) => rootL > q.d + 0.5 && <mesh key={i} geometry={g.side[i]} position={[(i % 3 - 1) * 0.03, -q.d, 0]} scale={seg(rootL, q.d + 0.5, q.d + 1.7) + 0.001}><Flesh rough={0.7} /></mesh>)}
        </group>
        {/* 留在土里的种皮 */}
        <group position={[X, SEED_Y - 0.25 * seg(t, 2.2, 3), 0]} rotation-x={Math.PI / 2} scale={[S * swell * (1 - 0.2 * seg(t, 2.2, 3)), S * swell, S * swell * (1 - 0.45 * seg(t, 2.2, 3))]}>
          <mesh geometry={g.ca} rotation-z={-0.35 * seg(t, 1.9, 2.5)}>{coatMat}</mesh>
          <mesh geometry={g.cb} rotation-z={0.35 * seg(t, 1.9, 2.5)}>{coatMat}</mesh>
        </group>
      </group>
      <mesh geometry={stem} visible={t > 1.5} castShadow><Flesh rough={0.55} /></mesh>
      {/* 两片子叶：先在种皮里，被弯成钩的胚轴拉出土，再向两边张开；营养用完以后变小变黄 */}
      <group position={[nodeX, nodeY, 0]} scale={[1, 1, lerp(0.5, 1, above)]}>
        <group rotation-z={-Math.PI * hook * 0.92}>
          <group rotation-y={(Math.PI / 2) * seg(t, 2.3, 3.2)}>
            <group rotation-x={Math.PI / 2} position={[0, 0.5 * S * swell, 0]} scale={S * swell * (1 - 0.34 * spent)}>
              <group position={[0, 0, 0.5]} rotation-x={-opened}><group position={[0, 0, -0.5]}><mesh geometry={g.a.dome} castShadow><Flesh color={`#${cot.getHexString()}`} rough={0.55} /></mesh><mesh geometry={g.a.cap!}><Flesh color={`#${cot.getHexString()}`} double /></mesh></group></group>
              <group position={[0, 0, 0.5]} rotation-x={opened}><group position={[0, 0, -0.5]}><mesh geometry={g.b.dome} castShadow><Flesh color={`#${cot.getHexString()}`} rough={0.55} /></mesh><mesh geometry={g.b.cap!}><Flesh color={`#${cot.getHexString()}`} double /></mesh></group></group>
            </group>
          </group>
        </group>
        {/* 胚芽长成的茎和一对真叶 */}
        {grow > 0.01 && <group>
          <mesh geometry={epi} castShadow><Flesh rough={0.55} /></mesh>
          {[-1, 1].map(s => <mesh key={s} geometry={g.leaf} position={[0, 1.8 * grow, 0]} rotation={[lerp(-1.1, 0.12, grow), s * Math.PI / 2 + 0.25, 0, 'YXZ']} scale={0.12 + 0.88 * grow} castShadow><LeafMat /></mesh>)}
        </group>}
      </group>
    </group>
  )
}
/** 浇水时落下来的水滴 */
function Drops({ k }: { k: number }) {
  const pts = useMemo(() => { const r = rng(2); return Array.from({ length: 26 }, () => [X - 1.6 + r() * 3.2, r(), Z + 0.2 - r() * 0.9] as V3) }, [])
  if (k <= 0 || k >= 1) return null
  return <>{pts.map((p, i) => { const f = (k * 2.2 + p[1]) % 1; return <mesh key={i} position={[p[0], TOP + 4.2 - f * 4.2, p[2]]} scale={[1, 1.8, 1]}><sphereGeometry args={[0.055, 8, 6]} /><meshPhysicalMaterial color="#9fd0e6" roughness={0.05} transparent opacity={0.8} /></mesh> })}</>
}

export default function Lesson3() {
  const [stage, setStage] = useState(0)
  const T = useTasks('gewu:plant:3', TASKS)
  const t = useRun(stage / 4, 15) * 4
  useEffect(() => { T.check(id => t >= STAGES.findIndex(s => s.key === id) + 1) }, [Math.floor(t + 1e-6)])   // eslint-disable-line react-hooks/exhaustive-deps
  const resetAll = () => { setStage(0); T.reset() }
  const busy = t < stage - 1e-6, task = T.current, now = STAGES[Math.max(0, Math.min(3, Math.ceil(t - 1e-6) - 1))]
  const { hint, next }: { hint: string; next: 'water' | 'go' | null } = !task ? { hint: '一粒种子长成了一棵幼苗。胚根成了根，胚芽成了茎和叶。', next: null }
    : busy ? { hint: `${STAGES[stage - 1].name}…`, next: null }
    : stage === 0 ? { hint: '干的种子不会萌发。按“浇水”', next: 'water' }
    : { hint: `${STAGES[stage - 1].what}。按“继续生长”`, next: 'go' }
  const labels: Label[] = [
    ...(t < 1.9 ? [{ id: 'seed', at: [X + 1.15, SEED_Y, Z] as V3, className: 'scene-tag -translate-y-1/2', children: t < 0.1 ? '菜豆种子' : '吸水膨胀' }] : []),
    ...(t >= 1.7 ? [{ id: 'root', at: [X + 0.5, SEED_Y - 1.6, Z] as V3, className: `scene-tag ${t < 2.6 ? 'key' : ''} -translate-y-1/2`, children: t < 2.6 ? <><small>最先突破种皮</small>胚根</> : <><small>胚根长成</small>根</> }] : []),
    ...(t >= 2.6 ? [{ id: 'hyp', at: [X - 0.45, TOP + 0.6, Z] as V3, ax: 1, className: 'scene-tag -translate-y-1/2', children: '胚轴' }] : []),
    ...(t >= 2.9 ? [{ id: 'cot', at: [X + 1.3, TOP + 1.6 + 1.5 * seg(t, 3, 4), Z] as V3, className: 'scene-tag -translate-y-1/2', children: t >= 3.9 ? <><small>营养用完，萎缩</small>子叶</> : '子叶' }] : []),
    ...(t >= 3.6 ? [{ id: 'plu', at: [X - 2.3, TOP + 5.0, Z] as V3, ax: 1, className: 'scene-tag key -translate-y-1/2', children: <><small>胚芽长成</small>茎和叶</> }] : []),
    { id: 'soil', at: [X - GERM.w / 2 + 0.5, TOP - 0.25, Z + 0.3], name: true, className: 'scene-name', children: '土面' },
  ]
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="3" narration={voiced(NARRATION['3'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="观察箱里的菜豆种子"
      stage={<Room at="s3" labels={labels}><Seedling t={t} /><Drops k={stage === 1 ? seg(t, 0, 0.6) : 0} /></Room>}
      lesson={<LessonBlock no="3" title="萌发的过程" concept="胚根最先突破种皮，发育成根" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>种子萌发时，先吸水膨胀；子叶或胚乳里的营养物质转运给胚根、胚芽、胚轴。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-white">胚根</b>最先突破种皮，发育成根。</li>
            <li><b className="text-white">胚轴</b>伸长，发育成连接根和茎的部位。</li>
            <li><b className="text-white">胚芽</b>发育成茎和叶。</li>
            <li>菜豆萌发时，营养物质来自{feedsFrom('bean')}；玉米来自{feedsFrom('corn')}。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="一粒种子长成了幼苗" title="胚根发育成根，胚芽发育成茎和叶" text="种子先吸水膨胀，胚根最先突破种皮；胚轴伸长，把子叶带出土面；胚芽长成茎和叶。子叶里的营养用完，就萎缩了。" notes="箱子里的种子和幼苗是放大了画的；实际萌发要好几天，这里把时间缩短了。" onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">现在这一步</div>
            <div className="mt-1 text-[28px] leading-tight font-bold">{t < 0.02 ? '干种子' : now.name}</div>
            <div className="mt-1 min-h-[2.6em] text-[13.5px] leading-snug text-white/70">{t < 0.02 ? '种皮包着胚，还没有动静' : now.what}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ParamTile symbol="最先突破种皮" value={t >= 2 ? partName(FIRST_OUT) : '—'} unit="做到第二步就知道" />
            <ParamTile symbol="营养物质来自" value={feedsFrom('bean')} unit="菜豆种子" />
          </div>
          <H>四步</H>
          <div className="flex flex-col gap-1.5">{STAGES.map((s, i) => <Row key={s.key} name={`${i + 1}`} text={s.name} on={Math.ceil(t - 1e-6) === i + 1} seen={t >= i + 1} />)}</div>
          <H>胚的各部分发育成什么</H>
          <div className="flex flex-col gap-1.5">{(['radicle', 'hypocotyl', 'plumule'] as const).map((k, i) => <Row key={k} name={partName(k)} text={BECOMES[k]} seen={t >= [2, 3, 4][i]} />)}</div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'water'} onClick={() => setStage(1)} disabled={stage > 0}>浇水</LabButton>
        <LabButton primary pulse={next === 'go'} onClick={() => setStage(s => Math.min(4, s + 1))} disabled={stage === 0 || stage >= 4 || busy}>继续生长</LabButton>
      </>}
      extras={<Control label="进度"><div className="flex h-11 items-center rounded-xl bg-white/8 px-3 text-[14px] text-white/80">{t < 0.02 ? '还没浇水' : `第 ${Math.min(4, Math.max(1, Math.ceil(t - 1e-6)))} 步 / 共 4 步`}</div></Control>}
    />
  )
}
