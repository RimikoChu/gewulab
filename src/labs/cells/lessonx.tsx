// 细胞 · 拓展课：三个小专题。细胞为什么长不大（表面积和体积的比）、多莉长得像谁（细胞核控制遗传）、长成不同的样子（细胞分化）。
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Cell } from './models'
import { CUBES, DOLLY, dollyLooksLike, surfaceToVolume } from './physics'
import { SPAN, SPOT, ST, TOP } from './world'

type Sub = 'grow' | 'dolly' | 'diff'
const SUBS: Record<Sub, { name: string; title: string; say: string; button: string }> = {
  grow: { name: '细胞为什么长不大', title: '个头越大，表面积相对越小', button: '再长大一倍', say: '细胞靠表面的细胞膜吸收养料、排出废物。边长每大一倍，体积变成 8 倍，表面积只变成 4 倍：表面积和体积的比越来越小，物质进出跟不上，所以细胞不能无限长大，长到一定大小就会分裂。' },
  dolly: { name: '多莉长得像谁', title: '遗传信息在细胞核里', button: '看结果', say: `多莉有三个“妈妈”：${DOLLY.nucleus}、${DOLLY.egg}、${DOLLY.womb}。多莉长得像提供细胞核的白面母羊：控制生物发育和遗传的信息在细胞核里。` },
  diff: { name: '长成不同的样子', title: '细胞分化形成不同的组织', button: '分化', say: '细胞分裂产生的新细胞，起初都差不多。后来它们在形态、结构和功能上变得各不相同，这叫细胞分化。形态相似、功能相同的细胞聚在一起，就成了组织。' },
}
const ORDER: Sub[] = ['grow', 'dolly', 'diff']
const TASKS: Task[] = [
  { id: 'grow', text: '长不大：让立方体长大两次，看表面积和体积的比', note: `边长 1、2、4，这个比是 ${CUBES.map(surfaceToVolume).join('、')}` },
  { id: 'dolly', text: '多莉：看它长得像哪只羊', note: '像提供细胞核的那只' },
  { id: 'diff', text: '分化：让一团相同的细胞长成不同的样子', note: '形态、结构、功能都变了，形成不同的组织' },
]
const X = ST.model

export default function LessonX() {
  const [sub, setSub] = useState<Sub>('grow')
  const [size, setSize] = useState(0)   // 立方体长大了几次
  const [dolly, setDolly] = useState(false)
  const [diff, setDiff] = useState(false)
  const T = useTasks('gewu:cells:x', TASKS)
  const a = CUBES[size], side = useSlide(0.3 * a, 0.5), spread = useSlide(diff ? 1 : 0, 0.7)
  const act = () => {
    if (sub === 'grow') { if (size >= CUBES.length - 1) return; const s = size + 1; setSize(s); if (s >= CUBES.length - 1) T.check(id => id === 'grow') }
    else if (sub === 'dolly') { setDolly(true); T.check(id => id === 'grow' ? size >= CUBES.length - 1 : id === 'dolly') }
    else { setDiff(true); T.check(id => id === 'grow' ? size >= CUBES.length - 1 : id === 'dolly' ? dolly : true) }
  }
  const resetAll = () => { setSub('grow'); setSize(0); setDolly(false); setDiff(false); T.reset() }
  const off = sub === 'grow' ? size >= CUBES.length - 1 : sub === 'dolly' ? dolly : diff
  const task = T.current
  const { hint, next }: { hint: string; next: 'sub' | 'act' | null } = !task ? { hint: '三个专题都看完了。', next: null }
    : sub !== task.id ? { hint: `接着看：${SUBS[task.id as Sub].name}`, next: 'sub' } : off ? { hint: SUBS[sub].title, next: null } : { hint: `按“${SUBS[sub].button}”`, next: 'act' }
  const labels: Label[] = sub === 'grow' ? [{ id: 'c', at: [X, TOP + 1.9, 0], ax: 0.5, className: 'scene-tag key -translate-y-full', children: <><small>边长 {a}</small>表面积 ÷ 体积 = {surfaceToVolume(a)}</> }]
    : sub === 'dolly' ? [{ id: 'd', at: [X, TOP + 1.85, 0], ax: 0.5, className: `scene-tag -translate-y-full${dolly ? ' key' : ''}`, children: dolly ? '多莉像提供细胞核的白面母羊' : '细胞核来自白面母羊' }]
    : (['上皮细胞', '肌肉细胞', '神经细胞', '红细胞'].map((n, i): Label => ({ id: n, at: [X + (i - 1.5) * 0.75 * spread, TOP + 0.5, 0.2], ax: 0.5, className: 'scene-name transition-opacity', style: { opacity: diff ? 1 : 0 }, children: n })))
  const tissue = (i: number) => i === 0 ? <mesh><boxGeometry args={[0.36, 0.3, 0.2]} /><meshStandardMaterial color="#f2c9a8" roughness={0.6} /></mesh>
    : i === 1 ? <mesh rotation-z={Math.PI / 2}><capsuleGeometry args={[0.07, 0.5, 6, 12]} /><meshStandardMaterial color="#d9606a" roughness={0.6} /></mesh>
    : i === 2 ? <group><mesh><sphereGeometry args={[0.13, 16, 12]} /><meshStandardMaterial color="#e8d27a" roughness={0.6} /></mesh>{[0, 1.2, 2.3, 3.6, 4.8].map(r => <mesh key={r} rotation-z={r} position={[Math.cos(r + Math.PI / 2) * 0.2, Math.sin(r + Math.PI / 2) * 0.2, 0]}><cylinderGeometry args={[0.012, 0.022, 0.3, 6]} /><meshStandardMaterial color="#e8d27a" /></mesh>)}</group>
    : <mesh scale={[1, 1, 0.35]}><sphereGeometry args={[0.16, 18, 12]} /><meshStandardMaterial color="#c9302c" roughness={0.5} /></mesh>

  return (
    <LabShell title="细胞" lessons={LESSONS} current="x" narration={voiced(NARRATION['x'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SUBS[sub].name}
      stage={<LabStage labels={labels} target={SPOT.model} span={SPAN.model}>
        {sub === 'grow' && <mesh position={[X, TOP + 0.3 + side / 2, 0]} castShadow><boxGeometry args={[side, side, side]} /><meshStandardMaterial color="#8fc7a0" transparent opacity={0.85} roughness={0.4} /></mesh>}
        {sub === 'dolly' && <Cell position={[X, TOP + 0.95, 0]} kind="animal" glow={['nucleus']} />}
        {sub === 'diff' && [0, 1, 2, 3].map(i => <group key={i} position={[X + (i - 1.5) * 0.75 * spread, TOP + 0.95, 0]}>{diff ? tissue(i) : <mesh><sphereGeometry args={[0.15, 16, 12]} /><meshStandardMaterial color="#f2d9c4" roughness={0.6} /></mesh>}</group>)}
      </LabStage>}
      lesson={<LessonBlock no="拓展" title={SUBS[sub].name} concept={SUBS[sub].title} tasks={TASKS} done={T.done} current={task?.id} theory={<p>{SUBS[sub].say}</p>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三个专题都看完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">细胞长大、分裂、分化，生物体才能由小长大</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{SUBS[sub].name}</div>
            <div className="mt-1 text-[22px] leading-snug font-bold tracking-tight text-[#7fe3d4]">{SUBS[sub].title}</div>
          </div>
          {sub === 'grow' && <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="边长" value={String(a)} unit="每按一次大一倍" />
            <ParamTile symbol="表面积 ÷ 体积" value={String(surfaceToVolume(a))} unit="越小，物质进出越跟不上" />
          </div>}
          {sub === 'dolly' && <ul className="mt-4 flex flex-col gap-1.5 text-[13.5px] text-white/80">{(Object.keys(DOLLY) as (keyof typeof DOLLY)[]).map(k => <li key={k} className={`rounded-xl px-3 py-2 ${dolly && k === dollyLooksLike() ? 'bg-[#35c7b3]/25 text-white' : 'bg-white/6'}`}>{DOLLY[k]}</li>)}</ul>}
          {off && <p className="row-in mt-4 rounded-xl bg-white/6 px-3 py-3 text-[14px] leading-relaxed text-white/80">{SUBS[sub].say}</p>}
        </Glass>
      }
      actions={<><LabButton primary pulse={next === 'act'} onClick={act} disabled={off}>{SUBS[sub].button}</LabButton></>}
      extras={<Control label="专题"><Segmented label="专题" pulse={next === 'sub'} want={next === 'sub' ? task!.id as Sub : null} value={sub} onChange={setSub} options={ORDER.map(k => ({ value: k, label: SUBS[k].name }))} /></Control>}
    />
  )
}
