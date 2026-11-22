// 植物的一生 · 第 4 课 根的生长：观察箱里看得见菜豆的根。用立式放大镜推近看一段根尖，画上等距的线过一天再量，逐个看四个区，再浇水看根毛吸水。
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass as Card, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { Metal, Rod, disc, makeGround, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Flesh, Glass, ease, fuse, lerp, rng, seg, tube, useGeo, useRun, type V3 } from './parts'
import { MARK_GAP, ZONES, absorber, fastest, gapAfter, zone, type ZoneKey } from './physics'
import { Finale, H, Row } from './ui'
import { LENS, ROOT, Room } from './world'

const TASKS: Task[] = [
  { id: 'zoom', text: '用放大镜推近，看幼根最前端的一段', note: '从根的顶端到长着根毛的地方，这一段叫根尖' },
  { id: 'grow', text: '在根尖上画等距的线，过一天再量间距', note: `${fastest().name}的线间距变得最大：这里长得最快` },
  { id: 'zones', text: '从尖端往上，逐个看根尖的四个区', note: `${ZONES.map(z => z.name).join('、')}，各有各的作用` },
  { id: 'water', text: '浇水，看水从哪里进入根', note: `水主要从${absorber().name}的根毛进入根` },
]
// 根尖模型：s 是沿着根量的长度（从尖端起，没长之前），U 是画面上 2 mm 画多长
const U = 0.42, GAPS: Record<ZoneKey, number> = { cap: 1, meristem: 2, elong: 2, mature: 6 }, R = 0.62
const S0 = ZONES.map((_, i) => ZONES.slice(0, i).reduce((a, z) => a + GAPS[z.key] * U, 0)), SMAX = ZONES.reduce((a, z) => a + GAPS[z.key] * U, 0)
const YTOP = LENS.y + 3.75
/** 长了 g（0–1）以后，原来在 s 处的那一点离尖端多远：每个区按自己的倍数拉长 */
const stretch = (s: number, g: number) => ZONES.reduce((a, z, i) => a + Math.min(Math.max(0, s - S0[i]), GAPS[z.key] * U) * (1 + (z.grow - 1) * g), 0)
/** 那一点在画面上的高度：根的上端不动，尖端往下长 */
const yAt = (s: number, g: number) => YTOP - (stretch(SMAX, g) - stretch(s, g))
const radius = (s: number) => (s < U ? R * 1.06 * Math.sqrt(Math.max(0, 1 - Math.pow(1 - s / U, 2))) : R * (1.06 - 0.06 * Math.min(1, (s - U) / 0.3)))
/** 根尖的一段表面（从 s0 到 s1），dr 是比根粗多少 */
function rootSkin(g: number, s0 = 0, s1 = SMAX, dr = 0, rings = 90) {
  const seg = 40, pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let i = 0; i <= rings; i++) { const s = lerp(s0, s1, i / rings), r = radius(s) + (radius(s) > 0.01 ? dr : 0), y = yAt(s, g); for (let j = 0; j <= seg; j++) { const a = j / seg * Math.PI * 2; pos.push(Math.cos(a) * r, y, Math.sin(a) * r); uv.push(j / seg, s / SMAX) } }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, b, a + 1, a + 1, b, b + 1) }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals()
  return geo
}
/** 根尖表面的细胞：根冠的大而乱，分生区的小而密（看得见细胞核），伸长区的长一些，成熟区的最长 */
function makeCells() {
  const W = 1024, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!, r = rng(17)
  g.fillStyle = '#eadfbe'; g.fillRect(0, 0, W, H)
  const spec: Record<ZoneKey, { h: number; n: number; fill: string; jit: number; nucleus: boolean }> = {
    cap: { h: 0.2, n: 11, fill: '#d9c595', jit: 0.5, nucleus: false }, meristem: { h: 0.07, n: 30, fill: '#e6d28e', jit: 0.1, nucleus: true },
    elong: { h: 0.15, n: 22, fill: '#efe5c2', jit: 0.12, nucleus: false }, mature: { h: 0.5, n: 18, fill: '#f1ead0', jit: 0.15, nucleus: false },
  }
  ZONES.forEach((z, zi) => {
    const sp = spec[z.key], a = S0[zi], b = a + GAPS[z.key] * U, rows = Math.max(1, Math.round((b - a) / sp.h)), y = (s: number) => H - (s / SMAX) * H
    g.fillStyle = sp.fill; g.fillRect(0, y(b), W, y(a) - y(b))
    for (let k = 0; k < rows; k++) {
      const y0 = y(a + (b - a) * k / rows), y1 = y(a + (b - a) * (k + 1) / rows), off = (k % 2) * 0.5 + r() * sp.jit
      for (let m = -1; m <= sp.n; m++) {
        const x0 = (m + off) * W / sp.n, w = W / sp.n
        g.fillStyle = `rgba(${r() < 0.5 ? '255,250,225' : '170,140,80'},${r() * 0.16})`; g.fillRect(x0, y1, w, y0 - y1)
        g.strokeStyle = 'rgba(110,80,38,0.85)'; g.lineWidth = z.key === 'meristem' ? 1.4 : 2.6; g.strokeRect(x0 + (r() - 0.5) * sp.jit * 8, y1, w, y0 - y1)
        if (sp.nucleus) { g.fillStyle = 'rgba(120,84,40,0.6)'; g.beginPath(); g.arc(x0 + w / 2, (y0 + y1) / 2, Math.min(w, y0 - y1) * 0.24, 0, 6.3); g.fill() }
      }
    }
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
/** 成熟区的根毛：表皮细胞向外伸出去的细丝 */
const HAIRS = (() => {
  const r = rng(23), list: THREE.BufferGeometry[] = [], tips: V3[] = []
  for (let i = 0; i < 120; i++) {
    const s = S0[3] + 0.25 + r() * (GAPS.mature * U - 0.3), a = r() * Math.PI * 2, y = yAt(s, 0), L = 0.45 + r() * 0.85 * Math.min(1, (s - S0[3]) / 0.9 + 0.3), dx = Math.cos(a), dz = Math.sin(a) * 0.55
    const tip: V3 = [dx * (R + L), y + (r() - 0.5) * 0.3, dz * (R + L)]
    list.push(tube([[dx * R * 0.96, y, dz * R * 0.96 / 0.55 * 0.55], [dx * (R + L * 0.5), y + (r() - 0.5) * 0.12, dz * (R + L * 0.5)], tip], 0.03, 0.012, '#f3ecd6', '#fbf7ec', 5, 6))
    if (Math.abs(dx) > 0.75) tips.push(tip)
  }
  return { geo: fuse(list), tips }
})()

/** 立式放大镜，和镜片里放大了的根尖。show：推近了没有（0–1）；g：长了多少；marks：画了线没有；sel：正在看哪个区；wet：浇水进行到哪 */
function Scope({ show, g, marks, sel, wet }: { show: number; g: number; marks: number; sel: ZoneKey | ''; wet: number }) {
  const soil = useMemo(() => { const t = makeGround('#3c2c22', '28,20,15', '96,76,56', 14); t.repeat.set(1.6, 1.6); return t }, [])
  const cells = useMemo(makeCells, [])
  useEffect(() => () => { soil.dispose(); cells.dispose() }, [soil, cells])
  const gq = Math.round(g * 80) / 80
  const skin = useGeo(() => rootSkin(gq), [gq])
  const zi = sel ? ZONES.findIndex(z => z.key === sel) : -1
  const band = useGeo(() => (zi < 0 ? new THREE.BufferGeometry() : rootSkin(gq, S0[zi], S0[zi] + GAPS[ZONES[zi].key] * U, 0.035, 24)), [gq, zi])
  const drops = useMemo(() => { const r = rng(5); return HAIRS.tips.slice(0, 46).map(t => ({ t, from: [t[0] + Math.sign(t[0]) * (0.7 + r() * 1.3), t[1] + (r() - 0.3) * 1.6, 0.25] as V3, d: r() * 0.45 })) }, [])
  const k = ease(show)
  return (
    <group position={[LENS.x, 0, LENS.z]}>
      {/* 支架：底座、立杆、托着镜框的短臂 */}
      <mesh geometry={BASE} position={[5.6, 0, -0.4]} castShadow receiveShadow><Metal kind="iron" grain="cast" /></mesh>
      <Rod from={[5.6, 0.3, -0.4]} to={[5.6, LENS.y + 0.6, -0.4]} r={0.2}><Metal kind="steel" grain="brushed" /></Rod>
      <Rod from={[5.6, LENS.y, -0.4]} to={[LENS.r + 0.1, LENS.y, -0.05]} r={0.14}><Metal kind="steel" grain="brushed" /></Rod>
      <mesh position={[5.6, LENS.y, -0.4]} castShadow><sphereGeometry args={[0.32, 20, 14]} /><meshPhysicalMaterial color="#1b1d20" roughness={0.35} clearcoat={0.6} /></mesh>
      <group position={[0, LENS.y, 0]}>
        <mesh castShadow><torusGeometry args={[LENS.r, 0.24, 16, 72]} /><meshPhysicalMaterial color="#1b1d20" roughness={0.3} clearcoat={0.7} /></mesh>
        <mesh><torusGeometry args={[LENS.r - 0.2, 0.07, 10, 72]} /><Metal kind="brass" grain="turned" /></mesh>
        {/* 镜片里看到的：放大了的土 */}
        <mesh position={[0, 0, -0.5]}><circleGeometry args={[LENS.r - 0.05, 64]} /><meshStandardMaterial map={soil} roughness={1} /></mesh>
        <mesh position={[0, 0, 0.75]} renderOrder={6}><circleGeometry args={[LENS.r - 0.1, 64]} /><Glass opacity={0.05} /></mesh>
      </group>
      {/* 从镜框引到箱子里那条根的两根细线 */}
      <Rod from={[-LENS.r * 0.72, LENS.y + LENS.r * 0.7, 0]} to={[ROOT.x + 4.6 - LENS.x, 2.4, ROOT.face - LENS.z + 0.15]} r={0.03}><meshBasicMaterial color="#f4f1e6" /></Rod>
      <Rod from={[-LENS.r * 0.72, LENS.y - LENS.r * 0.7, 0]} to={[ROOT.x + 4.6 - LENS.x, 2.4, ROOT.face - LENS.z + 0.15]} r={0.03}><meshBasicMaterial color="#f4f1e6" /></Rod>
      {/* 根尖：贴着镜片里的土，压扁一点画 */}
      <group scale={[k, k, 0.55 * k + 0.001]} position={[0, LENS.y * (1 - k), 0]} visible={show > 0.01}>
        <mesh geometry={skin} castShadow><meshStandardMaterial map={cells} roughness={0.7} /></mesh>
        <mesh geometry={HAIRS.geo}><Flesh rough={0.6} /></mesh>
        {zi >= 0 && <mesh geometry={band} renderOrder={3}><meshBasicMaterial color="#35e0c8" transparent opacity={0.3} depthWrite={false} /></mesh>}
        {/* 画的线：每隔 2 mm 一道 */}
        {marks > 0 && Array.from({ length: Math.round(SMAX / U) }, (_, i) => (i + 1) * U).filter(s => s < SMAX - 0.6).map(s => <mesh key={s} position={[0, yAt(s, g), 0]} rotation-x={Math.PI / 2} scale={[1, 1, 1]}><torusGeometry args={[radius(s) + 0.012, 0.022, 6, 48]} /><meshBasicMaterial color="#16181c" transparent opacity={marks} /></mesh>)}
        {/* 水：从土里到根毛，进到根里，再往上走 */}
        {wet > 0 && wet < 1 && drops.map((d, i) => {
          const a = seg(wet, d.d, d.d + 0.3), b = seg(wet, d.d + 0.3, d.d + 0.45), c = seg(wet, d.d + 0.45, d.d + 0.75), sx = Math.sign(d.t[0])
          const x = lerp(lerp(d.from[0], d.t[0], a), sx * R * 0.35, b), y = lerp(lerp(d.from[1], d.t[1], a), d.t[1], b) + c * 2.6
          return <mesh key={i} position={[x, y, 1.3]} scale={1 - c * 0.5}><sphereGeometry args={[0.085, 10, 8]} /><meshBasicMaterial color="#5cc4f2" transparent opacity={0.9 * (1 - seg(wet, d.d + 0.65, d.d + 0.78))} toneMapped={false} /></mesh>
        })}
      </group>
    </group>
  )
}
const BASE = disc(1.5, 0.3, { chamfer: 0.08 })

export default function Lesson4() {
  const [zoom, setZoom] = useState(false), [drawn, setDrawn] = useState(false), [day, setDay] = useState(false), [watered, setWatered] = useState(false)
  const [sel, setSel] = useState<ZoneKey | ''>(''), [seen, setSeen] = useState<ZoneKey[]>([])
  const T = useTasks('gewu:plant:4', TASKS)
  const show = useRun(zoom ? 1 : 0, 1.6), marks = useRun(drawn ? 1 : 0, 1.2), g = ease(useRun(day ? 1 : 0, 5)), wet = useRun(watered ? 1 : 0, 6)
  useEffect(() => { T.check(id => id === 'zoom' ? show >= 1 : id === 'grow' ? g >= 1 : id === 'zones' ? seen.length >= ZONES.length : wet >= 1) }, [show >= 1, g >= 1, seen.length, wet >= 1])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: ZoneKey | '') => { if (!k || show < 1) return; setSel(k); setSeen(s => s.includes(k) ? s : [...s, k]) }
  const resetAll = () => { setZoom(false); setDrawn(false); setDay(false); setWatered(false); setSel(''); setSeen([]); T.reset() }
  const task = T.current, busy = (zoom && show < 1) || (drawn && marks < 1) || (day && g < 1) || (watered && wet < 1)
  const wantZone = ZONES.find(z => !seen.includes(z.key))?.key ?? null
  const { hint, next }: { hint: string; next: 'zoom' | 'mark' | 'zone' | 'water' | null } = (() => {
    if (!task) return { hint: '根靠分生区增加细胞数量、伸长区细胞变长来生长；水和无机盐主要从成熟区进入。', next: null }
    if (busy) return { hint: day && g < 1 ? '一天过去，根尖往下长，看哪里的线拉开了…' : watered && wet < 1 ? '水渗下来，看它从哪里进到根里…' : zoom && show < 1 ? '镜头推近…' : '画线…', next: null }
    if (task.id === 'zoom') return { hint: '箱子里白色的是菜豆的根。按“推近看根尖”', next: 'zoom' }
    if (task.id === 'grow') return drawn ? { hint: `线画好了，相邻两条线相距 ${MARK_GAP} mm。按“过一天”`, next: 'mark' } : { hint: '用细线蘸墨水，在根尖上画等距的线。按“画线”', next: 'mark' }
    if (task.id === 'zones') return { hint: wantZone ? `在“根尖的四个区”里选“${zone(wantZone).name}”` : '', next: 'zone' }
    return { hint: '按“浇水”，看水从哪一段进入根', next: 'water' }
  })()
  const P = (x: number, y: number): V3 => [LENS.x + x, y, LENS.z + 0.5]
  const labels: Label[] = show >= 1 ? [
    ...ZONES.map((z, i) => ({ id: z.key, at: P(z.key === 'mature' ? 2.1 : 1.05, yAt(S0[i] + GAPS[z.key] * U * (z.key === 'mature' ? 0.3 : 0.5), g)), className: `scene-tag ${sel === z.key ? 'key' : ''} -translate-y-1/2`, children: marks >= 1 ? <>{z.name}<small className="ml-2">{g >= 1 ? `${gapAfter(z.key)} mm` : `${MARK_GAP} mm`}</small></> : z.name })),
    { id: 'hair', at: P(-1.9, yAt(S0[3] + 1.5, g) + 0.5), ax: 1, className: 'scene-tag -translate-y-1/2', children: '根毛' },
  ] : [
    { id: 'box', at: [ROOT.x - 3, ROOT.top + 0.5, ROOT.z + 1.6], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '观察箱里的菜豆' },
    { id: 'lens', at: [LENS.x, LENS.y + LENS.r + 0.5, LENS.z], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '立式放大镜' },
  ]
  const z = sel ? zone(sel) : null
  return (
    <LabShell title="植物的一生" lessons={LESSONS} current="4" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="幼根"
      stage={<Room at={zoom ? 's4b' : 's4'} labels={labels}><Scope show={show} g={g} marks={marks} sel={sel} wet={wet} /></Room>}
      lesson={<LessonBlock no="4" title="根的生长" concept="根尖伸长区长得最快" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>从根的顶端到生有根毛的一段叫<b className="text-white">根尖</b>，从尖端往上依次是根冠、分生区、伸长区、成熟区。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>根的生长，一方面靠分生区细胞的分裂增加细胞的数量，一方面靠伸长区细胞体积的增大。</li>
            <li>成熟区的表皮细胞向外突出形成根毛，是根吸收水和无机盐的主要部位。</li>
          </ul>
        </>} />}
      finale={T.finale && <Finale kicker="根尖的四个区都看过了" title="根靠分生区和伸长区生长，靠成熟区吸收" text="分生区的细胞不断分裂，伸长区的细胞迅速伸长，根就往下长。成熟区长着大量根毛，水和无机盐主要从这里进入根。" notes={`线的间距（${MARK_GAP} mm、${gapAfter('elong')} mm 等）和各区的长短是示意的数，不同植物、不同条件下不一样。根尖是放大了画的。`} onClose={() => T.setFinale(false)} />}
      panel={
        <Card className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{z ? '正在看' : '根尖的四个区'}</div>
            <div className="mt-1 text-[30px] leading-tight font-bold">{z ? z.name : show >= 1 ? '选一个区' : '先推近'}</div>
            <div className="mt-1 min-h-[3.9em] text-[13.5px] leading-snug text-white/70">{z ? `${z.cells}。${z.job}。` : '从尖端往上：根冠、分生区、伸长区、成熟区'}</div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ParamTile symbol="长得最快" value={g >= 1 ? fastest().name : '—'} unit="过一天再量就知道" />
            <ParamTile symbol="吸收的主要部位" value={wet >= 1 ? absorber().name : '—'} unit="浇水以后就知道" />
          </div>
          <H>相邻两条线的间距（示意）</H>
          <table className="w-full text-[13.5px]">
            <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">区</th><th className="text-right font-normal">画线时</th><th className="text-right font-normal">一天后</th></tr></thead>
            <tbody>{[...ZONES].reverse().map(q => <tr key={q.key} className="border-t border-white/12"><td className="py-1.5 text-white/80">{q.name}</td><td className="text-right tabular-nums">{marks >= 1 ? `${MARK_GAP} mm` : '—'}</td><td className={`text-right font-semibold tabular-nums ${q.key === fastest().key ? 'text-[#ffe9a8]' : 'text-[#7fe3d4]'}`}>{g >= 1 ? `${gapAfter(q.key)} mm` : '—'}</td></tr>)}</tbody>
          </table>
          <H>四个区</H>
          <div className="flex flex-col gap-1.5">{[...ZONES].reverse().map(q => <Row key={q.key} name={q.name} text={q.job} on={sel === q.key} seen={seen.includes(q.key)} />)}</div>
        </Card>
      }
      actions={<>
        <LabButton pulse={next === 'zoom'} onClick={() => setZoom(v => !v)} disabled={busy}>{zoom ? '拉远看整株' : '推近看根尖'}</LabButton>
        <LabButton primary pulse={next === 'mark'} onClick={() => (drawn ? setDay(true) : setDrawn(true))} disabled={busy || show < 1 || day}>{drawn ? '过一天' : '画线'}</LabButton>
        <LabButton pulse={next === 'water'} onClick={() => setWatered(true)} disabled={busy || show < 1 || watered}>浇水</LabButton>
      </>}
      extras={<Control label="根尖的四个区"><Segmented label="根尖的四个区" pulse={next === 'zone'} want={next === 'zone' ? wantZone : null} value={sel} onChange={pick} disabled={show < 1} options={ZONES.map(q => ({ value: q.key, label: q.name }))} /></Control>}
    />
  )
}
