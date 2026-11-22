// 声现象 · 第 4 课 音调的高低（音调由频率决定）：把钢尺压在木块边上，伸出不同的长度，拨一下
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, lathe, useSlide, useTasks, type Label } from '@/lab-kit'
import { ENV, Glove, Hall, Hose, Mic, P, Rings, Scope, ringing, useWood, type Hit, type Pose } from './gear'
import { LESSONS, goLesson } from './lessons'
import { HEAR, OVERHANG, pitchWord, rate } from './physics'

type L = '20' | '15' | '10'
const TASKS: Task[] = OVERHANG.map((l, i) => ({ id: String(l), text: i === 0 ? `钢尺伸出 ${l} cm：拨一下，看它振动得快还是慢，记录` : `伸出 ${l} cm：再拨、再记`, note: i === 0 ? '伸出得长：振动慢，音调低' : `振动的快慢是伸出 20 cm 时的${rate(l) === Math.round(rate(l)) ? ` ${rate(l)}` : `约 ${rate(l).toFixed(1)}`} 倍，音调${pitchWord(l)}` }))
/** 画面里 1 cm 画多长；木块右边沿在哪；木块顶面多高；钢尺全长（cm） */
const CM = 0.1, EDGE = -1.7, BY = 0.9, FULL = 30, TH = 0.022
const STUD = lathe([[0, 0], [0.03, 0], [0.03, 0.2], [0.075, 0.2], [0.085, 0.215], [0.085, 0.29], [0.075, 0.3], [0, 0.3]], { segs: 20 })
/** 钢尺上的刻度：0 到 30 cm */
function makeRule() {
  const W = 2048, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, px = W / FULL
  g.fillStyle = '#e9eaec'; g.fillRect(0, 0, W, H); g.fillStyle = '#15181b'; g.textAlign = 'center'; g.font = '600 26px sans-serif'
  for (let mm = 0; mm <= FULL * 10; mm += 2) { const x = mm / 10 * px; g.fillRect(x - 1, 0, mm % 10 ? 1.5 : 3, mm % 10 ? 12 : 24) }
  for (let cm = 1; cm < FULL; cm++) g.fillText(String(cm), cm * px, 54)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping
  return t
}
/** 钢尺的一段：从 a 厘米到 b 厘米。bend 给出时，这一段是伸在外面的，按一端固定的样子弯 */
function Strip({ a, b, base, bend }: { a: number; b: number; base: THREE.CanvasTexture; bend?: () => number }) {
  const len = (b - a) * CM, f = useRef(bend); f.current = bend
  const map = useMemo(() => { const t = base.clone(); t.needsUpdate = true; t.repeat.set((b - a) / FULL, 1); t.offset.set(a / FULL, 0); return t }, [base, a, b])
  const geo = useMemo(() => { const g = new THREE.BoxGeometry(Math.max(0.01, len), TH, 0.32, 28, 1, 1); g.translate(len / 2, 0, 0); g.userData.y0 = Float32Array.from(g.attributes.position.array); return g }, [len])
  useFrame(() => {
    const tip = f.current?.() ?? 0, p = geo.attributes.position, y0 = geo.userData.y0 as Float32Array
    for (let i = 0; i < p.count; i++) { const s = Math.max(0, y0[i * 3] / len); p.setY(i, y0[i * 3 + 1] + tip * s * s * (3 - s) / 2) }
    p.needsUpdate = true
  })
  return <mesh geometry={geo} castShadow><meshStandardMaterial map={map} color="#a4a7aa" metalness={0.7} roughness={0.38} envMapIntensity={1.4} /></mesh>
}

export default function Lesson4() {
  const [ls, setLs] = useState<L>('20')
  const [pull, setPull] = useState(false)
  const [hit, setHit] = useState<Hit | null>(null)
  const [rung, setRung] = useState(false)
  const [rows, setRows] = useState<L[]>([])
  const T = useTasks('gewu:sound:4', TASKS)
  const wood = useWood('beech'), rule = useMemo(makeRule, [])
  const Lg = Number(ls), Lc = useSlide(Lg, 9), moving = Math.abs(Lc - Lg) > 0.01, k = useSlide(pull ? 1 : 0, 2.6), dup = rows.includes(ls)
  // 手把尺头按下去，按到底就松开：钢尺开始振动
  useEffect(() => { if (pull && k >= 1) { setPull(false); setHit({ t: performance.now(), amp: 1 }); setRung(true) } }, [pull, k])
  const pluck = () => { if (moving || pull) return; setHit(null); setPull(true) }
  const pick = (v: L) => { if (pull) return; setLs(v); setHit(null); setRung(false) }
  const record = () => { if (!rung || dup) return; const n = [...rows, ls]; setRows(n); T.check(id => n.includes(id as L)) }
  const resetAll = () => { setLs('20'); setHit(null); setPull(false); setRung(false); setRows([]); T.reset() }
  const amp = 0.34 * (Lc / 20) ** 1.3, w = 13 * rate(Lc)
  const tip = () => pull ? -amp * k : hit ? -amp * ringing(hit, 2.2) * Math.cos((performance.now() - hit.t) / 1000 * w) : 0
  const level = () => ringing(hit, 2.2)
  const task = T.current
  const { hint, next }: { hint: string; next: 'l' | 'pluck' | 'record' | null } = !task ? { hint: '三种长度都试过了。伸出越短，振动越快，音调越高。', next: null }
    : moving ? { hint: '钢尺在挪…', next: null } : pull ? { hint: '把尺头按下去，一松手…', next: null }
    : ls !== task.id ? { hint: `把钢尺挪到伸出 ${task.id} cm`, next: 'l' }
    : rung && !dup ? { hint: '看清它振动得快还是慢，再看示波器上波形的疏密，按“记录”', next: 'record' } : { hint: '按“拨一下”', next: 'pluck' }
  const tipX = EDGE + Lc * CM, y = BY + TH / 2
  const REST: Pose = { p: [tipX + 0.6, 0.1, 0.8], a: -1.3, rx: -Math.PI / 2 }, HOLD: Pose = { p: [tipX - 0.12, y + 0.48 - amp, 0.02], a: 0, rx: 0 }
  const times = rate(Lg), timesText = times === Math.round(times) ? `${times}` : `约 ${times.toFixed(1)}`
  const labels: Label[] = [
    { id: 'l', at: P('ruler', EDGE + Lc * CM / 2, BY - 0.42, 0.2), ax: 0.5, className: 'scene-tag', children: <><small>伸出</small>{Lc.toFixed(0)} cm</> },
    { id: 'p', at: P('ruler', EDGE + 0.25, BY + 1.0), className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: rung ? 1 : 0 }, children: <><small>音调</small>{pitchWord(Lg)}</> },
    { id: 'r', at: P('ruler', EDGE - 1.0, BY + 0.5), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '钢尺压在木块边上' },
    { id: 'm', at: P('ruler', 1.2, 1.75), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '话筒' },
    { id: 's', at: P('ruler', 2.75, 1.95), ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '示波器' },
    { id: 'n', at: P('ruler', EDGE - 1.0, 0.05, 1.3), ax: 0.5, className: 'scene-name', children: '钢尺的振动是放慢了画的' },
  ]
  return (
    <LabShell title="声现象" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="钢尺"
      stage={<Hall at="ruler" labels={labels}>
        {/* 木块：当作桌边。钢尺压在上面，用一条压板和两只手拧螺母夹紧 */}
        <RoundedBox args={[2.0, BY, 1.6]} radius={0.04} position={[EDGE - 1.0, BY / 2, 0]} castShadow receiveShadow><meshPhysicalMaterial map={wood} roughness={0.55} clearcoat={0.3} /></RoundedBox>
        <group position={[tipX - FULL * CM, y, 0]}><Strip a={0} b={FULL - Lc} base={rule} /></group>
        <group position={[EDGE, y, 0]}><Strip a={FULL - Lc} b={FULL} base={rule} bend={tip} /></group>
        <RoundedBox args={[0.34, 0.1, 1.15]} radius={0.02} position={[EDGE - 0.19, BY + TH + 0.05, 0]} castShadow><Metal kind="aluminum" grain="brushed" env={ENV} /></RoundedBox>
        {[-0.42, 0.42].map(z => <mesh key={z} geometry={STUD} position={[EDGE - 0.19, BY + TH, z]} castShadow><Metal kind="brass" grain="turned" env={ENV} /></mesh>)}
        <Glove rest={REST} hold={HOLD} k={k} />
        <Rings at={[tipX - 0.2, y, 0]} level={level} r0={0.3} r1={1.9} speed={0.35 + 0.12 * rate(Lc)} n={Math.round(3 + rate(Lg))} />
        <Mic x={1.2} z={0.1} h={1.05} />
        <Hose r={0.018} pts={[[1.3, 0.05, 0.3], [1.6, 0.025, 0.95], [2.6, 0.025, 1.15], [3.3, 0.1, 1.0], [3.28, 0.42, 0.84]]} />
        <Scope x={2.75} trace={t => { const a = Math.min(1, level() * 1.6); return a < 0.02 ? null : u => 0.85 * a * Math.sin(Math.PI * 2 * 2 * rate(Lc) * u - t * 5) }} />
      </Hall>}
      lesson={<LessonBlock no="4" title="音调的高低" concept="振动越快，频率越高，音调越高" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>声音的高低叫<b className="text-white">音调</b>。物体每秒振动的次数叫<b className="text-white">频率</b>，单位是赫兹（Hz）。频率越高，音调越高。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>钢尺伸出得长，振动慢，音调低；伸出得短，振动快，音调高</li>
            <li>示波器上，相同时间里波的个数越多（波形越密），频率越高</li>
            <li>人能听到的频率大约从 {HEAR[0]} Hz 到 {HEAR[1]} Hz。钢尺伸出太长时，看得见它在振动却听不到声音，就是因为振动得太慢了</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">“是伸出 20 cm 时的几倍”是按一端固定的薄钢片算的：振动的快慢和伸出长度的平方成反比。这个算法初中不要求。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三种长度都试过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">振动越快，频率越高，音调越高</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">钢尺从伸出 20 cm 缩到 10 cm，振动快了 {rate(10)} 倍，示波器上的波形也密了 {rate(10)} 倍。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">振动的快慢 · 和伸出 20 cm 时比</div>
            <div className="mt-1 text-[42px] leading-none font-bold tracking-tight tabular-nums">{rung || dup ? timesText : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">倍</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="伸出" value={`${Lg} cm`} unit="露在木块外面的一段" />
            <ParamTile symbol="音调" value={rung || dup ? pitchWord(Lg) : '—'} unit="听到的声音" />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每换一个长度，拨一下，看清快慢再记。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">伸出 / cm</th><th className="font-normal">振动快慢</th><th className="font-normal">音调</th></tr></thead>
                <tbody>{rows.map(v => { const r = rate(Number(v)); return <tr key={v} className="row-in border-t border-white/12"><td className="py-1.5 tabular-nums text-white/80">{v}</td><td className="tabular-nums">{r === Math.round(r) ? r : `约 ${r.toFixed(1)}`} 倍</td><td className="font-semibold text-[#7fe3d4]">{pitchWord(Number(v))}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'pluck'} onClick={pluck} disabled={moving || pull}>拨一下</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!rung || dup}>记录</LabButton>
      </>}
      extras={<Control label="伸出的长度"><Segmented label="伸出的长度" pulse={next === 'l'} want={next === 'l' ? task!.id as L : null} value={ls} disabled={pull} onChange={pick} options={OVERHANG.map(x => ({ value: String(x) as L, label: `${x} cm` }))} /></Control>}
    />
  )
}
