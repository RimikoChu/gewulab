// 光的反射和平面镜 · 第 3 课 镜面和白纸（镜面反射和漫反射）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useTasks, type Label } from '@/lab-kit'
import { LESSONS, TITLE, goLesson } from './lessons'
import { Arc, Dark, Path, Ray, useEase, type V2 } from './optics'
import { BEAM_IN, SPOTS, SURFACES, scatter, type SurfaceKey } from './physics'
import { LightBox, MirrorSlab, PaperSlab, Platform, Post } from './props'
import { Finale, Note, Readout } from './ui'
import { ST, TOP } from './world'
import { voiced } from '@/lab-kit/narration'
import { NARRATION } from './narration'
import { VOICE } from './voice'

const KEYS = Object.keys(SURFACES) as SurfaceKey[]
const TASKS: Task[] = [
  { id: 'mirror', text: '让一束平行光射到镜面上，记下反射光的去向', note: '镜面反射：反射光线仍然平行，只朝一个方向' },
  { id: 'paper', text: '把镜面换成白纸，再记一次', note: '漫反射：反射光线射向四面八方，所以从各个方向都能看见白纸' },
  { id: 'normal', text: '在白纸上按“画出法线”，比一比每条光线的两个角', note: '每一条光线都遵守反射定律：表面凹凸不平，各处的法线方向不同' },
]
// 表面所在的高度 SY；落点的间距按 S 画（表面是放大了的）；光线在射到表面之前、之后各画多长
const X0 = ST.rough, SY = TOP + 0.34, S = 0.1, LIN = 1.38, LOUT = 1.05, RAD = Math.PI / 180
const D: V2 = [Math.sin(BEAM_IN * RAD), -Math.cos(BEAM_IN * RAD)]
const hit = (x: number): V2 => [X0 + x * S, SY]
/** 每条光线从灯箱前板的哪里出来：前板垂直于光的方向 */
const start = (x: number): V2 => { const l = LIN + x * S * D[0]; return [X0 + x * S - D[0] * l, SY - D[1] * l] }
const FRONT = start(0), BOX: V2 = [FRONT[0] - D[0] * 0.3, FRONT[1] - D[1] * 0.3]

export default function Lesson3() {
  const [kind, setKind] = useState<SurfaceKey>('mirror')
  const [normals, setNormals] = useState(false)
  const [rows, setRows] = useState<SurfaceKey[]>([])
  const T = useTasks('gewu:mirror:3', TASKS)
  const [shot, setShot] = useState(1)        // 每换一次表面加一：光路重新画一遍
  const sk = useEase(shot, 1.3), k = Math.max(0, Math.min(1, sk - (shot - 1))), nk = useEase(normals ? 1 : 0, 0.6)
  const bs = scatter(kind), dup = rows.includes(kind), drawn = k >= 1
  const pick = (v: SurfaceKey) => { if (v === kind) return; setKind(v); setNormals(false); setShot(n => n + 1) }
  const record = () => { if (!drawn || dup) return; const next = [...rows, kind]; setRows(next); T.check(id => next.includes(id as SurfaceKey)) }
  const draw = () => { const on = !normals; setNormals(on); if (on && kind === 'paper') T.check(id => id === 'normal') }
  const resetAll = () => { setKind('mirror'); setNormals(false); setRows([]); setShot(n => n + 1); T.reset() }
  const task = T.current, want: SurfaceKey = task?.id === 'mirror' ? 'mirror' : 'paper'
  const { hint, next }: { hint: string; next: 'kind' | 'record' | 'normal' | null } = !task ? { hint: '都做完了。镜面反射和漫反射都遵守光的反射定律。', next: null }
    : kind !== want ? { hint: `把表面换成“${SURFACES[want].name}”`, next: 'kind' }
    : !drawn ? { hint: '光射过来了…', next: null }
    : task.id === 'normal' ? { hint: '按“画出法线”', next: 'normal' } : { hint: '看五条反射光线往哪去，按“记录”', next: 'record' }
  const same = kind === 'mirror'
  const labels: Label[] = [
    { id: 'k', at: [X0 + 0.75, SY + 1.22, 0.3], ax: 0.5, className: 'scene-tag key -translate-y-full transition-opacity', style: { opacity: drawn ? 1 : 0 }, children: same ? '反射光线仍然平行' : '反射光线射向四面八方' },
    { id: 's', at: [X0 + 1.0, SY - 0.3, 0.5], ax: 0.5, name: true, className: 'scene-name', children: same ? '平面镜' : '白纸的表面（放大了很多倍的模型）' },
    { id: 'b', at: [BOX[0] - 0.2, BOX[1] + 0.62, 0.2], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '平行光源' },
  ]

  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title={TITLE} lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={SURFACES[kind].name}
      stage={<Dark at="rough" labels={labels}>
        <Platform x={X0} y={SY - 0.12} w={2.8} d={0.74} />
        {same ? <MirrorSlab x={X0} y={SY} w={2.5} d={0.6} t={0.12} /> : <PaperSlab x={X0} y={SY} s={S} d={0.6} t={0.12} />}
        <Post x={BOX[0]} z={-0.66} y={BOX[1] + 0.06} />
        <LightBox at={FRONT} dir={D} w={1.5} pin={0.52} slits={SPOTS.map(x => x * S * Math.cos(BEAM_IN * RAD))} />
        {bs.map((b, j) => {
          const p = hit(b.x)
          return <group key={j}>
            <Path pts={[start(b.x), p, [p[0] + b.out[0] * LOUT, p[1] + b.out[1] * LOUT]]} k={k} r={0.008} />
            {nk > 0 && <>
              <Ray a={p} b={[p[0] + b.n[0] * 0.5 * nk, p[1] + b.n[1] * 0.5 * nk]} color="#c9d2da" r={0.005} dash z={0.004} />
              {nk >= 1 && <Arc at={p} from={Math.atan2(b.n[1], b.n[0]) / RAD} to={Math.atan2(-D[1], -D[0]) / RAD} r={0.15} />}
              {nk >= 1 && <Arc at={p} from={Math.atan2(b.n[1], b.n[0]) / RAD} to={Math.atan2(b.out[1], b.out[0]) / RAD} r={0.19} color="#7fe3d4" />}
            </>}
          </group>
        })}
      </Dark>}
      lesson={<LessonBlock no="3" title="镜面和白纸" concept="镜面反射和漫反射都遵守反射定律" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <ul className="flex flex-col gap-2 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">镜面反射：</b>表面平滑。平行光射上去，反射光线仍然平行，只朝一个方向射出。正好迎着反射光看，很刺眼；换个位置就看不到了</li>
            <li><b className="text-[#7fe3d4]">漫反射：</b>表面凹凸不平。平行光射上去，反射光线射向四面八方。我们能从各个方向看见本身不发光的物体，靠的就是漫反射</li>
          </ul>
          <p className="mt-3">两种反射里，<b className="text-white">每一条光线都遵守光的反射定律</b>。漫反射的光线之所以乱，是因为表面各处的朝向不同，各处的法线不平行。</p>
          <p className="mt-3 text-[13.5px] text-white/65">白纸的表面是放大了很多倍画出来的模型：真的纸用眼睛看是平的，凹凸要在显微镜下才看得见。五处斜面各歪多少是为了看得清取的数。</p>
        </>} />}
      finale={T.finale && <Finale kicker="两种表面都看过了" title="镜面反射和漫反射都遵守反射定律" onClose={() => T.setFinale(false)}>镜面把光朝一个方向反射；白纸凹凸不平，把光反射到四面八方，所以坐在教室哪个位置都看得见它。</Finale>}
      panel={
        <Glass className="px-4 py-4">
          <Readout label={`${SURFACES[kind].name} · 平行光射上去`} value={drawn ? SURFACES[kind].kind : '…'} text />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="入射光" value={`${SPOTS.length} 条`} unit="互相平行" />
            <ParamTile symbol="反射光" value={drawn ? (same ? '仍然平行' : '各奔东西') : '—'} unit={same ? '只朝一个方向' : '射向四面八方'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">每条光线在落点处的两个角</h2>
          {nk < 1 ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">按“画出法线”，量一量每条光线的入射角和反射角。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">光线</th><th className="text-right font-normal">入射角</th><th className="text-right font-normal">反射角</th></tr></thead>
                <tbody>{bs.map((b, j) => <tr key={j} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">第 {j + 1} 条</td><td className="text-right tabular-nums">{b.i.toFixed(0)}°</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{b.r.toFixed(0)}°</td></tr>)}</tbody>
              </table>}
          {rows.includes(kind) && <Note>{SURFACES[kind].kind}：{SURFACES[kind].say}。</Note>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'normal'} onClick={draw} disabled={!drawn}>{normals ? '擦掉法线' : '画出法线'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!drawn || dup}>记录</LabButton>
      </>}
      extras={<Control label="表面"><Segmented label="表面" pulse={next === 'kind'} want={next === 'kind' ? want : null} value={kind} onChange={pick} options={KEYS.map(v => ({ value: v, label: SURFACES[v].name }))} /></Control>}
    />
  )
}
