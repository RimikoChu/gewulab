// 神经调节 · 第 5 课 眼和视觉：展馆右边悬着一个放大的眼球剖面，前面一棵小树。看远处的树，光线经过角膜、瞳孔、晶状体，
// 在视网膜上成一个倒立的像，冲动再沿视神经传到大脑的视觉中枢；换成近视眼，像落到视网膜前面；戴上凹透镜，像又落回来；强光一照，瞳孔缩小。
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { EYE_AT, inHead } from './body'
import { LENS_Y, OPTIC } from './eye'
import { LESSONS, goLesson } from './lessons'
import { Place, seg, useRun } from './parts'
import { degree, eyeDraw, farPoint, focusGap, glassesFor, pupil as pupilOf, sharp, type EyeKey } from './physics'
import type { V3 } from './sdf'
import { Flash, Impulse, route } from './signal'
import { Big } from './ui'
import { EYE_W, TREE_AT, onBody, onEye } from './world'

const TASKS: Task[] = [
  { id: 'look', text: '正常眼看远处的树', note: '光线在视网膜上成一个倒立的像' },
  { id: 'brain', text: '跟着冲动到大脑', note: '冲动沿视神经传到大脑皮层的视觉中枢，在那里形成视觉' },
  { id: 'myopia', text: '换成近视眼，再看一次', note: '眼球前后径过长，像落在视网膜前方，看不清远处' },
  { id: 'glasses', text: '给近视眼戴上凹透镜', note: '凹透镜让光线先散开一点，像又落回视网膜上' },
  { id: 'light', text: '用强光照眼睛', note: '瞳孔缩小，进入眼内的光变少' },
]
const RET0 = -10.7                     // 正常眼视网膜（后极内面）在模型里的位置
const D0 = LENS_Y - RET0
const OBJ_Y = (TREE_AT[0] - EYE_W.at[0]) / EYE_W.s
const objX = (wy: number) => (EYE_W.at[1] - wy) / EYE_W.s
const OBJ = [objX(TREE_AT[1] + 5.0), objX(TREE_AT[1] + 0.3)]          // 树梢、树根
let ICON: THREE.Texture | null = null
/** 视网膜上那棵倒立的小树：一张发光的剪影（树干朝下画，贴上去以后树根朝上） */
const treeIcon = () => {
  if (ICON) return ICON
  const c = document.createElement('canvas'); c.width = 96; c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#d9b48a'; g.fillRect(43, 76, 10, 48)
  g.fillStyle = '#b8f59a'; for (const [x, y, r] of [[48, 44, 30], [28, 58, 20], [68, 58, 21], [48, 22, 20]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
  return (ICON = new THREE.CanvasTexture(c))
}

export default function Lesson5() {
  const [eye, setEye] = useState<EyeKey>('normal')
  const [glasses, setGlasses] = useState(false)
  const [light, setLight] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'look' | 'brain'>('idle')
  const T = useTasks('gewu:nerve:5', TASKS)
  const st = useRef({ eye, glasses }); st.current = { eye, glasses }
  const P = glasses ? glassesFor(eye) : 0
  const gap = focusGap(eye, P), ok = sharp(gap)
  const look = useRun(3, () => {
    const s = st.current
    if (s.eye === 'normal') { T.check(id => id === 'look'); if (!T.done.brain) { setPhase('brain'); brain.run() } else setPhase('idle') }
    else { T.check(id => (id === 'myopia' && !s.glasses) || (id === 'glasses' && s.glasses)); setPhase('idle') }
  })
  const brain = useRun(4.5, () => { T.check(id => id === 'brain'); setPhase('idle') })
  const pup = useRun(2.2, () => T.check(id => id === 'light'))
  const busy = look.busy || brain.busy || pup.busy
  const doLook = () => { if (busy) return; setLight(false); setPhase('look'); look.run() }
  const doGlasses = () => { if (busy || eye !== 'myopic') return; setGlasses(g => !g); if (!glasses) { setPhase('look'); look.run() } }
  const doLight = () => { if (busy || !T.done.glasses) return; setLight(l => !l); if (!light) pup.run() }
  const resetAll = () => { look.snap(0); brain.snap(0); pup.snap(0); setEye('normal'); setGlasses(false); setLight(false); setPhase('idle'); T.reset() }
  const task = T.current
  const wantEye: EyeKey | null = !task ? null : (task.id === 'look' ? 'normal' : task.id === 'myopia' || task.id === 'glasses' ? 'myopic' : null)
  const { hint, next }: { hint: string; next: 'eye' | 'look' | 'glasses' | 'light' | null } = !task ? { hint: '像落在视网膜上，视觉在大脑皮层形成。近视眼的像落在视网膜前方，用凹透镜矫正。', next: null }
    : look.busy ? { hint: '光线穿过角膜、瞳孔、晶状体和玻璃体…', next: null }
    : brain.busy ? { hint: '视网膜上的感光细胞产生冲动，沿视神经传到大脑…', next: null }
    : pup.busy ? { hint: '强光照进来，看瞳孔…', next: null }
    : wantEye && eye !== wantEye ? { hint: wantEye === 'normal' ? '选“正常眼”' : '选“近视眼”：眼球的前后径长了一点', next: 'eye' }
    : task.id === 'glasses' ? { hint: '像落在视网膜前面，看不清。按“戴上凹透镜”', next: 'glasses' }
    : task.id === 'light' ? { hint: '按“强光照眼睛”，看瞳孔怎样变化', next: 'light' }
    : { hint: '按“看远处的树”', next: 'look' }
  const d = eyeDraw(eye, P)
  const imgD = D0 * d.image, retD = D0 * d.retina
  const pr = 2.6 * pupilOf(light)
  const showRays = phase === 'look' || (!busy && (T.done.look || T.done.myopia)) || phase === 'brain'
  const rayK = phase === 'look' ? look.k : 1
  // ---------- 光线：从树梢、树根各三条，穿过瞳孔，会聚到像点（近视眼时过了像点再散开，落到视网膜上是一片） ----------
  const rays = useMemo(() => {
    const out: { pts: V3[]; c: string }[] = []
    OBJ.forEach((x0, i) => {
      const ix = -x0 * imgD / (OBJ_Y - LENS_Y), iy = LENS_Y - imgD
      for (const a of [-0.75, 0, 0.75]) {
        const pp: V3 = [a * pr, 8.3, 0.35], pts: V3[] = [[x0, OBJ_Y, 0.35], pp, [ix, iy, 0.35]]
        if (retD > imgD + 0.05) { const t = (retD - imgD) / (imgD - (LENS_Y - 8.3)); pts.push([ix + (ix - pp[0]) * t, LENS_Y - retD, 0.35]) }
        out.push({ pts, c: i ? '#ffe7a3' : '#b8ffcf' })
      }
    })
    return out
  }, [imgD, retD, pr])
  const rayGeo = useMemo(() => rays.map(r => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r.pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0), 64, 0.13, 6)), [rays])
  const imgTop = -OBJ[0] * imgD / (OBJ_Y - LENS_Y), imgBot = -OBJ[1] * imgD / (OBJ_Y - LENS_Y)
  // ---------- 冲动：视网膜 → 视神经 → 人体左眼 → 视觉中枢 ----------
  const PATH = useMemo(() => route(
    ([[imgBot * 0.3, RET0 + 0.3, 0.4], ...OPTIC] as V3[]).map(p => onEye(p)),
    [onEye(OPTIC.at(-1)!), [EYE_W.at[0] - 9, EYE_W.at[1] + 1.0, EYE_W.at[2]], [12, 18.4, -2.5], [5, 17.6, -1], onBody(EYE_AT(1))] as V3[],
    ([EYE_AT(1), [0.22, 16.6, 0.5], inHead([0.8, -1.4, 3.6]), inHead([1.6, -0.8, -2.5]), inHead([2.2, 0.8, -6.8])] as V3[]).map(onBody),
  ), [imgBot])
  const showImg = showRays && rayK >= 1
  const labels: Label[] = phase === 'brain' ? [
    { id: 'v', at: onBody(inHead([2.4, 2.0, -7])), ax: 0, className: `scene-tag ${brain.k > 0.85 ? 'key' : ''} -translate-y-1/2`, children: <><small>大脑皮层</small>视觉中枢</> },
    { id: 'o', at: onEye([-3.4, -19, 2]), ax: 0.5, className: 'scene-tag -translate-y-[140%]', children: '视神经' },
  ] : [
    { id: 'co', at: onEye([-4, 11.8, 1]), ax: 0.5, name: true, className: 'scene-name -translate-y-[150%]', children: '角膜' },
    { id: 'le', at: onEye([3.5, LENS_Y, 1]), ax: 0.5, name: true, className: 'scene-name translate-y-2', children: '晶状体' },
    { id: 'ir', at: onEye([-6.8, 8.6, 1]), ax: 0.5, name: true, className: 'scene-name -translate-y-[140%]', children: '虹膜' },
    { id: 'vi', at: onEye([3, -2, 1]), ax: 0.5, name: true, className: 'scene-name', children: '玻璃体' },
    { id: 're', at: onEye([7.5, LENS_Y - retD + 1.2, 1]), ax: 0.5, className: `scene-tag ${showImg ? 'key' : ''} translate-y-2`, children: <><small>视网膜</small>{showImg ? (ok ? '像落在这里' : '一片模糊') : ''}</> },
    ...(showImg && !ok ? [{ id: 'f', at: onEye([-5.5, LENS_Y - imgD, 1]), ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>像落在</small>视网膜前方</> }] : []),
    ...(light ? [{ id: 'pu', at: onEye([0, 9.2, 1]), ax: 0.5, className: 'scene-tag key -translate-y-[150%]', children: '瞳孔缩小' }] : []),
  ]
  return (
    <LabShell title="神经调节" lessons={LESSONS} current="5" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} narration={voiced(NARRATION['5'], VOICE)} actionsLabel="眼"
      stage={<Place at={phase === 'brain' ? 'eyeBrain' : 'eye'} labels={labels} want={{ eye: { pupil: pr, stretch: d.retina, glasses, light } }}>
        <group position={EYE_W.at} rotation-z={-Math.PI / 2} scale={EYE_W.s}>
          {showRays && rayGeo.map((g, i) => <RayTube key={i} g={g} k={rayK} color={rays[i].c} />)}
          {showImg && ok && <mesh position={[(imgTop + imgBot) / 2, LENS_Y - imgD + 1.1, 0.7]} rotation-z={-Math.PI / 2} renderOrder={10}><planeGeometry args={[(imgTop - imgBot) * 0.7, imgTop - imgBot]} /><meshBasicMaterial map={treeIcon()} transparent depthWrite={false} toneMapped={false} /></mesh>}
          {showImg && !ok && <mesh position={[(imgTop + imgBot) / 2, LENS_Y - retD + 0.9, 0.6]}><circleGeometry args={[Math.abs(imgTop - imgBot) * 0.62, 32]} /><meshBasicMaterial color="#d8f0b0" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>}
        </group>
        <Impulse path={PATH} s={phase === 'brain' ? brain.k : 0} size={0.12} />
        <Flash at={onBody(inHead([2.2, 0.8, -6.8]))} on={phase === 'brain' && brain.k > 0.9} r={0.3} />
      </Place>}
      lesson={<LessonBlock no="5" title="眼和视觉" concept="像落在视网膜上，视觉在大脑形成" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>外界物体反射的光线，经过<b className="text-white">角膜、房水，由瞳孔进入眼球内部，再经过晶状体和玻璃体</b>的折射，在<b className="text-white">视网膜</b>上形成一个物像。视网膜上的感光细胞受到刺激产生神经冲动，冲动沿<b className="text-white">视神经</b>传到<b className="text-white">大脑皮层的视觉中枢</b>，形成视觉。</p>
          <p className="mt-3">眼球的前后径过长，或者晶状体的曲度过大且不能恢复原状，远处物体的像就落在视网膜的前方，看不清远处的物体，这就是<b className="text-white">近视</b>。近视眼可以配戴<b className="text-white">凹透镜</b>加以矫正。</p>
          <p className="mt-3">虹膜中央的瞳孔能调节大小：强光下缩小，减少进入眼内的光。</p>
          <p className="mt-3 text-[13.5px] text-white/65">眼球放大了 25 倍。近视眼只比正常眼长了约 1 mm，画面上把这个差别放大了 3 倍；度数按把眼睛当成一个凸透镜的简化模型算，只是示意。</p>
        </>} />}
      finale={T.finale && <div>
        <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">眼看完了</p>
        <p className="mt-1 text-[19px] leading-snug font-bold">物像落在视网膜上，冲动经视神经传到大脑皮层的视觉中枢，形成视觉</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">近视眼的像落在视网膜前方，配戴凹透镜矫正；强光下瞳孔缩小。</p>
      </div>}
      panel={
        <Glass className="px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Big label="像落在" value={showImg ? (ok ? '视网膜上' : '视网膜前') : '—'} tone={showImg ? (ok ? 'good' : 'bad') : undefined} />
            <Big label="看得清吗" value={showImg ? (ok ? '清楚' : '模糊') : '—'} tone={showImg ? (ok ? 'good' : 'bad') : undefined} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Big label="眼镜" value={glasses ? '凹透镜' : '没戴'} />
            <Big label="瞳孔" value={light ? '缩小' : '较大'} />
          </div>
          {eye === 'myopic' && <p className="mt-3 rounded-xl bg-white/6 px-3 py-2.5 text-[13px] leading-relaxed text-white/70">这只近视眼看清的最远处约 {farPoint('myopic').toFixed(1)} m；矫正要戴约 {degree(glassesFor('myopic'))} 度的凹透镜（简化模型，示意）。</p>}
          {showImg && !ok && <p className="mt-2 text-center text-[12.5px] text-white/55">像在视网膜前面约 {(gap * 1000).toFixed(1)} mm</p>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'look'} pulse={next === 'look'} onClick={doLook} disabled={busy}>看远处的树</LabButton>
        <LabButton primary={next === 'glasses'} pulse={next === 'glasses'} onClick={doGlasses} disabled={busy || eye !== 'myopic' || !T.done.myopia}>{glasses ? '摘下眼镜' : '戴上凹透镜'}</LabButton>
        <LabButton primary={next === 'light'} pulse={next === 'light'} onClick={doLight} disabled={busy || !T.done.glasses}>{light ? '关掉强光' : '强光照眼睛'}</LabButton>
      </>}
      extras={
        <Control label="眼睛">
          <Segmented label="眼睛" pulse={next === 'eye'} want={next === 'eye' ? wantEye : null} value={eye} onChange={v => { setEye(v as EyeKey); if (v === 'normal') setGlasses(false); setPhase('idle') }} disabled={busy} options={[{ value: 'normal', label: '正常眼' }, { value: 'myopic', label: '近视眼' }]} />
        </Control>
      }
    />
  )
}
/** 一条光线：沿着走，k 是画到哪了 */
function RayTube({ g, k, color }: { g: THREE.TubeGeometry; k: number; color: string }) {
  useMemo(() => { const n = g.index!.count; g.setDrawRange(0, Math.floor(n * Math.min(1, k) / 6) * 6) }, [g, k])
  return <mesh geometry={g} renderOrder={9}><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.4)} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
}
