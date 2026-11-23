// 光的反射和平面镜 · 第 6 课 潜望镜 · 穿衣镜（平面镜的应用：改变光路、成像）
import { useMemo, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Arc, Dark, Eye, Path, Ray, useEase, type V2 } from './optics'
import { DOLL, DOLL_US, PERISCOPE, hitHeight, mirrorNeed, turnAngle } from './physics'
import { Doll, Lighthouse, Periscope, UprightMirror } from './props'
import { Finale, Note, Readout } from './ui'
import { CM, ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

type Sub = 'peri' | 'mirror'
const NAME: Record<Sub, string> = { peri: '潜望镜', mirror: '穿衣镜' }
const NEED = mirrorNeed()
const TASKS: Task[] = [
  { id: 'p', text: '潜望镜：画出灯塔的光怎样拐进眼睛', note: `两面镜子各把光拐 ${turnAngle(PERISCOPE)}°：隔着墙也能看见灯塔` },
  { id: 'rays', text: '穿衣镜：画出人偶看见自己头顶和脚尖的光路', note: '镜子上只有两个落点之间的那一段用得上' },
  { id: 'cut', text: '把用不上的镜面遮起来，量一量剩下多长', note: `剩下 ${NEED.length} cm，正好是身高 ${DOLL.height} cm 的一半，人偶照样看得见全身` },
  { id: 'back', text: '让人偶退后几步，看两个落点动不动', note: '落点没有动：要多长的镜子和人离镜子多远无关' },
]
// 潜望镜：筒的中线在 PX，上下两面镜子的中心高 YT、YB；灯塔在左边，中间隔一堵墙，眼睛在右边
const PX = ST.use, YT = TOP + 1.65, YB = TOP + 0.55, A = 0.17
const TOWER = PX - 1.4, WALL = PX - 0.66, EYE: V2 = [PX + 1.08, YB]
// 穿衣镜：镜面在 MX，下沿（也是人偶的脚底）在 Y0，镜子高 18 cm
const MX = ST.use + 0.3, Y0 = TOP + 0.06, MH = 18 * CM
const Y = (cm: number) => Y0 + cm * CM

/** 一堵砖墙：挡在灯塔和眼睛之间 */
function Wall({ x, h }: { x: number; h: number }) {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256
    const g = c.getContext('2d')!
    let s = 3; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296
    g.fillStyle = '#8f8a80'; g.fillRect(0, 0, 256, 256)
    for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) { const v = 120 + rnd() * 50; g.fillStyle = `rgb(${v},${v * 0.52},${v * 0.4})`; g.fillRect(k * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, h / 0.55)
    return t
  }, [h])
  return <group position={[x, TOP, -0.02]}>
    <RoundedBox args={[0.2, h, 0.95]} radius={0.01} position={[0, h / 2, 0]} castShadow receiveShadow><meshStandardMaterial map={map} color="#9a958c" roughness={0.95} /></RoundedBox>
    <RoundedBox args={[0.26, 0.04, 1.0]} radius={0.008} position={[0, h + 0.02, 0]} castShadow><meshStandardMaterial color="#45484b" roughness={0.9} /></RoundedBox>
  </group>
}

export default function Lesson6() {
  const [sub, setSub] = useState<Sub>('peri')
  const [pr, setPr] = useState(false)
  const [mr, setMr] = useState(false)
  const [cut, setCut] = useState(false)
  const [back, setBack] = useState(false)
  const T = useTasks('gewu:mirror:6', TASKS)
  const pk = useEase(pr ? 1 : 0, 1.6), mk = useEase(mr ? 1 : 0, 1.2), ck = useEase(cut ? 1 : 0, 1.0), u = useEase(DOLL_US[back ? 1 : 0], 1.4)
  const ok = (s: { pr: boolean; mr: boolean; cut: boolean; back: boolean }) => T.check(id => (id === 'p' && s.pr) || (id === 'rays' && s.mr) || (id === 'cut' && s.mr && s.cut) || (id === 'back' && s.mr && s.cut && s.back))
  const now = { pr, mr, cut, back }
  const draw = () => { if (sub === 'peri') { setPr(!pr); ok({ ...now, pr: !pr }) } else { setMr(!mr); ok({ ...now, mr: !mr }) } }
  const doCut = () => { setCut(!cut); ok({ ...now, cut: !cut }) }
  const doBack = () => { setBack(!back); ok({ ...now, back: !back }) }
  const resetAll = () => { setSub('peri'); setPr(false); setMr(false); setCut(false); setBack(false); T.reset() }
  const task = T.current, want: Sub = task?.id === 'p' ? 'peri' : 'mirror', on = sub === 'peri' ? pr : mr
  const { hint, next }: { hint: string; next: 'sub' | 'draw' | 'cut' | 'back' | null } = !task ? { hint: '都做完了。平面镜能改变光的传播方向，也能成像。', next: null }
    : sub !== want ? { hint: `换成“${NAME[want]}”`, next: 'sub' }
    : task.id === 'p' || task.id === 'rays' || !mr ? { hint: '按“画出光路”', next: 'draw' }
    : task.id === 'cut' ? { hint: '按“遮住用不上的镜面”', next: 'cut' }
    : !cut ? { hint: '按“遮住用不上的镜面”', next: 'cut' } : { hint: '按“人偶退后”', next: 'back' }
  // 穿衣镜：人偶的头顶、脚尖、眼睛，和两条光线在镜面上的落点（高度由计算给出）
  const xd = MX - u * CM, head: V2 = [xd, Y(DOLL.height)], toe: V2 = [xd, Y(0)], eye: V2 = [xd, Y(DOLL.eye)]
  const hTop = hitHeight([-u, DOLL.height], [-u, DOLL.eye]), hBot = hitHeight([-u, 0], [-u, DOLL.eye])
  const mTop: V2 = [MX, Y(hTop)], mBot: V2 = [MX, Y(hBot)], gx = MX + u * CM
  const labels: Label[] = sub === 'peri' ? [
    { id: 'a1', at: [PX - 0.26, YT + 0.34, 0.2], ax: 0.5, className: 'scene-tag -translate-y-full transition-opacity', style: { opacity: pk > 0.45 ? 1 : 0 }, children: <><small>入射角</small>{PERISCOPE}°<small className="ml-2">反射角</small>{PERISCOPE}°</> },
    { id: 'a2', at: [PX + 0.3, YB - 0.3, 0.2], className: 'scene-tag key transition-opacity', style: { opacity: pk >= 1 ? 1 : 0 }, children: <>光又拐了 {turnAngle(PERISCOPE)}°</> },
    { id: 'n1', at: [TOWER, YT + 0.3, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '灯塔' },
    { id: 'n2', at: [WALL, TOP + 1.5, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '墙' },
    { id: 'n3', at: [EYE[0], EYE[1] + 0.16, 0.1], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '眼睛' },
    { id: 'n4', at: [PX + 0.3, (YT + YB) / 2 + 0.2, 0.2], name: true, className: 'scene-name', children: '潜望镜（剖开的）' },
  ] : [
    { id: 'len', at: [MX + 0.22, Y((hTop + hBot) / 2), 0.36], className: 'scene-tag key -translate-y-1/2 transition-opacity', style: { opacity: ck >= 1 ? 1 : 0 }, children: <><small>用到的镜面</small>{(hTop - hBot).toFixed(1)} cm</> },
    { id: 'u', at: [(xd + MX) / 2, TOP + 0.14, 0.42], ax: 0.5, className: 'scene-tag', children: <><small>人偶到镜面</small>{u.toFixed(0)} cm</> },
    { id: 'd', at: [xd - 0.2, Y(DOLL.height / 2), 0.2], ax: 1, name: true, className: 'scene-name', children: `人偶（身高 ${DOLL.height} cm）` },
    { id: 'm', at: [MX + 0.1, Y0 + MH + 0.06, 0], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '穿衣镜' },
  ]

  return (
    <LabShell narration={voiced(NARRATION['6'], VOICE)} title={TITLE} lessons={LESSONS} current="6" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={NAME[sub]}
      stage={sub === 'peri' ? <Dark at="use" labels={labels}>
        <Lighthouse x={TOWER} y0={TOP} h={YT - TOP} />
        <Wall x={WALL} h={1.42} />
        <Periscope x={PX} yT={YT} yB={YB} a={A} />
        <Eye at={EYE} look={[-1, 0]} r={0.11} />
        {pk > 0 && <Path pts={[[TOWER + 0.1, YT], [PX, YT], [PX, YB], [EYE[0] - 0.12, YB]]} k={pk} color="#ffd24a" r={0.008} z={0.02} />}
        {pk > 0.45 && <><Ray a={[PX, YT]} b={[PX - 0.3, YT - 0.3]} color="#c9d2da" r={0.005} dash z={0.03} /><Arc at={[PX, YT]} from={180} to={225} r={0.14} z={0.03} /><Arc at={[PX, YT]} from={225} to={270} r={0.17} color="#7fe3d4" z={0.03} /></>}
        {pk >= 1 && <><Ray a={[PX, YB]} b={[PX + 0.3, YB + 0.3]} color="#c9d2da" r={0.005} dash z={0.03} /><Arc at={[PX, YB]} from={45} to={90} r={0.14} z={0.03} /><Arc at={[PX, YB]} from={0} to={45} r={0.17} color="#7fe3d4" z={0.03} /></>}
      </Dark> : <Dark at="use2" labels={labels}>
        <UprightMirror x={MX} y={Y0} h={MH} d={0.7} cover={[hBot * CM * ck, MH - (MH - hTop * CM) * ck]} />
        <Doll x={xd - 0.05} y={Y0} H={DOLL.height * CM} />
        {mk > 0 && <>
          <Path pts={[head, mTop, eye]} k={mk} color="#ffd24a" r={0.007} z={0.3} />
          <Path pts={[toe, mBot, eye]} k={mk} color="#ff8fb3" r={0.007} z={0.3} />
        </>}
        {mk >= 1 && <>
          {/* 镜后的像，和两条反向延长线 */}
          <Doll x={gx + 0.05} y={Y0} H={DOLL.height * CM} face={-1} ghost />
          <Ray a={mTop} b={[gx, Y(DOLL.height)]} color="#ffd24a" r={0.006} dash z={0.3} />
          <Ray a={mBot} b={[gx, Y(0)]} color="#ff8fb3" r={0.006} dash z={0.3} />
        </>}
      </Dark>}
      lesson={<LessonBlock no="6" title={NAME[sub]} concept="平面镜能改变光路，也能成像" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-2 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">改变光路：</b>潜望镜里两面平面镜都和筒壁成 45°。光射到第一面镜子上，入射角 {PERISCOPE}°、反射角 {PERISCOPE}°，拐了 {turnAngle(PERISCOPE)}° 朝下走；到第二面镜子再拐 {turnAngle(PERISCOPE)}°，射进眼睛</li>
            <li><b className="text-[#7fe3d4]">成像：</b>照镜子时看到的是自己的虚像。来自头顶的光在镜面上的落点，在头顶和眼睛的正中那么高；来自脚尖的，在眼睛高度的一半。两个落点之间的镜面长度正好是身高的一半</li>
          </ul>
          <p className="mt-3">人退后时，像也退后同样的距离，光路的形状等比例拉长，两个落点的高度不变。</p>
          <p className="mt-3 text-[13.5px] text-white/65">人偶身高 {DOLL.height} cm、眼睛高 {DOLL.eye} cm 是器材自己取的数；“镜长至少是身高的一半”是由对称和反射定律推出来的，课本一般放在练习里。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两种用法都看过了" title="平面镜能改变光路，也能成像" onClose={() => T.setFinale(false)}>潜望镜用两面镜子把光拐两次弯；照全身只要身高一半长的镜子，站远站近都一样。</Finale>}
      panel={
        <Glass className="px-4 py-4">
          {sub === 'peri' ? <>
            <Readout label="潜望镜 · 每面镜子把光拐了" value={pk >= 1 ? `${turnAngle(PERISCOPE)}` : '—'} unit="°" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ParamTile symbol="入射角" value={`${PERISCOPE}°`} unit="镜面和筒壁成 45°" />
              <ParamTile symbol="反射角" value={pk > 0.45 ? `${PERISCOPE}°` : '—'} unit="等于入射角" />
            </div>
            {pk >= 1 && <Note>灯塔的光水平射进上口，被第一面镜子反射向下，再被第二面镜子反射成水平，从下口射进眼睛。眼睛看到的是灯塔的像。</Note>}
          </> : <>
            <Readout label="照见全身 · 用到的镜面" value={mk >= 1 ? (hTop - hBot).toFixed(1) : '—'} unit="cm" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ParamTile symbol="身高" value={`${DOLL.height}`} unit="cm" />
              <ParamTile symbol="上落点" value={mk >= 1 ? hTop.toFixed(1) : '—'} unit="cm · 离地" />
              <ParamTile symbol="下落点" value={mk >= 1 ? hBot.toFixed(1) : '—'} unit="cm · 离地" />
            </div>
            {mk >= 1 && <Note>人偶离镜面 {u.toFixed(0)} cm。用到的镜面长 {(hTop - hBot).toFixed(1)} cm，是身高的一半。</Note>}
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary pulse={next === 'draw'} onClick={draw}>{on ? '擦掉光路' : '画出光路'}</LabButton>
        <LabButton pulse={next === 'cut'} onClick={doCut} disabled={sub !== 'mirror' || !mr}>{cut ? '露出整面镜子' : '遮住用不上的镜面'}</LabButton>
        <LabButton pulse={next === 'back'} onClick={doBack} disabled={sub !== 'mirror'}>{back ? '人偶走回来' : '人偶退后'}</LabButton>
      </>}
      extras={<Control label="用法"><Segmented label="用法" pulse={next === 'sub'} want={next === 'sub' ? want : null} value={sub} onChange={setSub} options={(['peri', 'mirror'] as Sub[]).map(k => ({ value: k, label: NAME[k] }))} /></Control>}
    />
  )
}
