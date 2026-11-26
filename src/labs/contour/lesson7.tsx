// 等高线地形图 · 第 7 课 分层设色地形图和地形剖面图：给地图按海拔上色，认出平原、丘陵、山地、高原、盆地；再沿 MN 竖起一块剖面板，画出剖面图。
import { useEffect, useMemo, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import Spot from './stage'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { VOICE } from './voice'
import { Curtain, OnLand, Trail } from './marks'
import { LAYER_STOPS } from './world'
import { LANDFORMS, PROFILE, Y, landRange, levels, profile, type LandKey } from './physics'

const KEYS = Object.keys(LANDFORMS) as LandKey[]
const TASKS: Task[] = [
  { id: 'tint', text: '把地图换成分层设色', note: '按海拔分层上色：绿色低，黄色、棕色高' },
  { id: 'lands', text: '依次看平原、丘陵、山地、高原、盆地', note: '五种地形，海拔和起伏各不相同' },
  { id: 'profile', text: '沿 MN 画出地形剖面图', note: '剖面图上看得出哪里高、哪里低，哪里陡、哪里缓' },
]
/** 每种地形在教材上的特点（见规格卡） */
const FEATURE: Record<LandKey, string> = {
  plain: '海拔较低，地面平坦开阔',
  hill: '海拔不高，起伏不大，坡度和缓',
  mount: '海拔较高，峰峦起伏，坡度陡峭',
  plateau: '海拔较高，地面坦荡，边缘比较陡峭',
  basin: '四周高、中间低',
}
const LINES = levels(100, 1600)
const PRO = profile(160)
const ring = (k: LandKey) => Array.from({ length: 41 }, (_, i) => { const a = (i / 40) * Math.PI * 2, { at, r } = LANDFORMS[k]; return [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r] as [number, number] })

export default function Lesson7() {
  const [tint, setTint] = useState(false)
  const [land, setLand] = useState<LandKey>('plain')
  const [seen, setSeen] = useState<LandKey[]>([])
  const [pro, setPro] = useState(false)
  const T = useTasks('gewu:contour:7', TASKS)
  const rise = useSlide(pro ? 1 : 0, 0.5)
  useEffect(() => { if (pro && rise >= 1) T.check(id => id === 'profile') }, [rise, pro])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: LandKey) => { setLand(k); if (!tint) return; const n = seen.includes(k) ? seen : [...seen, k]; setSeen(n); if (KEYS.every(x => n.includes(x))) T.check(id => id === 'lands') }
  const toTint = () => { setTint(t => !t); if (!tint) { T.check(id => id === 'tint'); setSeen(s => s.includes(land) ? s : [...s, land]) } }
  const resetAll = () => { setTint(false); setLand('plain'); setSeen([]); setPro(false); T.reset() }

  const task = T.current, nextLand = KEYS.find(k => !seen.includes(k))
  const { hint, next }: { hint: string; next: 'tint' | 'land' | 'pro' | null } = (() => {
    if (!task) return { hint: '都做完了。分层设色看高低，剖面图看起伏。', next: null }
    if (task.id === 'tint') return { hint: '给地图按海拔分层上色', next: 'tint' }
    if (task.id === 'lands') return { hint: `看看“${LANDFORMS[nextLand!].name}”在哪里、是什么颜色`, next: 'land' }
    return pro ? { hint: '剖面板正在竖起来…', next: null } : { hint: '沿 MN 这条线竖起一块剖面板，画出剖面图', next: 'pro' }
  })()

  const r = landRange(land), [M, N] = PROFILE
  const labels: Label[] = [
    ...KEYS.map((k): Label => ({ id: k, at: [LANDFORMS[k].at[0], 0.4, LANDFORMS[k].at[1]], ax: 0.5, className: `scene-tag -translate-y-1/2 transition-opacity${k === land ? ' key' : ''}`, style: { opacity: tint && seen.includes(k) ? 1 : 0 }, children: LANDFORMS[k].name })),
    { id: 'M', at: [M[0], 0.5, M[1]], ax: 0.5, className: 'scene-tag -translate-y-full', children: 'M' },
    { id: 'N', at: [N[0], 0.5, N[1]], ax: 0.5, className: 'scene-tag -translate-y-full', children: 'N' },
  ]
  const chart = useMemo(() => {
    const L = PRO[PRO.length - 1][0], W = 290, H = 120, x = (d: number) => 30 + (d / L) * (W - 36), y = (h: number) => H - 18 - (Math.max(0, h) / 1600) * (H - 30)
    const pts = PRO.map(([d, h]) => `${x(d).toFixed(1)},${y(h).toFixed(1)}`).join(' ')
    return { L, W, H, x, y, pts }
  }, [])
  return (
    <LabShell title="等高线地形图" lessons={LESSONS} current="7" narration={voiced(NARRATION['7'], VOICE)} onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="地图"
      stage={<Spot at={pro ? 'profile' : 'layers'} labels={labels} want={{ flat: true, tint: tint ? 'layers' : 'nature', lines: LINES }}>
        <OnLand lift={0.1}>
          <Trail pts={[M, N]} color="#ffffff" width={3} dash drape={0.05} />
          {tint && <Trail key={land} pts={ring(land)} color="#35c7b3" width={4} drape={0.05} />}
        </OnLand>
        <Curtain a={M} b={N} samples={PRO} show={rise} />
      </Spot>}
      lesson={<LessonBlock no="7" title="分层设色和剖面" concept="颜色看海拔高低，剖面图看地势起伏" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p><b className="text-white">分层设色地形图</b>：在等高线地形图上，把不同海拔范围涂上不同的颜色。</p>
          <p className="mt-2">平原、丘陵、山地、高原、盆地是陆地上五种基本地形。看海拔高低、地面起伏大小、坡的陡缓来区分。</p>
          <p className="mt-2"><b className="text-white">地形剖面图</b>：沿图上一条线，把地面的高低起伏画成侧面的轮廓，横轴是水平距离，纵轴是海拔。</p>
          <p className="mt-3 text-[13.5px] text-white/65">剖面图的纵轴放大了，看起来比实际陡。</p>
        </>} />}
      finale={T.finale && <>
        <p className="text-[17px] leading-snug font-bold">MN 剖面：从平原登上高原，再翻过 A 峰、鞍部到 B 峰</p>
        <p className="mt-1 text-[14px] text-white/70">分层设色看出海拔高低；剖面图看出地势起伏和坡的陡缓。</p>
      </>}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{LANDFORMS[land].name} · 海拔</div>
            <div className="mt-1 text-[38px] leading-none font-bold tracking-tight tabular-nums">{tint ? `${r.lo} ~ ${r.hi}` : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">m</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="起伏" value={tint ? String(r.relief) : '—'} unit="m · 最高减最低" />
            <ParamTile symbol="看过" value={`${seen.length} / 5`} unit="种地形" />
          </div>
          <p className="mt-2 rounded-xl bg-white/8 px-3 py-2.5 text-[14px] text-white/85">{tint ? FEATURE[land] : '先给地图分层上色'}</p>
          <div className="mt-3 flex items-center gap-1 text-[11.5px] text-white/60">
            {LAYER_STOPS.map(s => <div key={s.h} className="flex-1"><div className="h-2.5 rounded-sm" style={{ background: s.color }} /><div className="mt-0.5 tabular-nums">{s.h}</div></div>)}
            <span className="ml-1 self-end">m</span>
          </div>
          {pro && <>
            <h2 className="mt-4 text-[12.5px] text-white/55">MN 地形剖面图</h2>
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="mt-1 w-full">
              {[0, 500, 1000, 1500].map(h => <g key={h}><line x1={30} x2={chart.W - 6} y1={chart.y(h)} y2={chart.y(h)} stroke="rgb(255 255 255 / 0.12)" /><text x={26} y={chart.y(h) + 3} textAnchor="end" fontSize="9" fill="rgb(255 255 255 / 0.55)">{h}</text></g>)}
              <polygon points={`${chart.x(0)},${chart.y(0)} ${chart.pts} ${chart.x(chart.L)},${chart.y(0)}`} fill="#c8925a" opacity={0.75} />
              <polyline points={chart.pts} fill="none" stroke="#ffe28a" strokeWidth={1.6} />
              <text x={chart.x(0)} y={chart.H - 4} fontSize="10" fill="white">M</text>
              <text x={chart.x(chart.L) - 6} y={chart.H - 4} fontSize="10" fill="white">N</text>
              <text x={chart.W / 2} y={chart.H - 4} textAnchor="middle" fontSize="9" fill="rgb(255 255 255 / 0.55)">水平距离 {chart.L.toFixed(1)} km · 海拔 m</text>
            </svg>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'tint'} onClick={toTint}>{tint ? '换回等高线图' : '分层设色'}</LabButton>
        <LabButton primary pulse={next === 'pro'} onClick={() => setPro(true)} disabled={pro || !T.done.lands}>画剖面图</LabButton>
      </>}
      extras={<Control label="地形"><Segmented label="地形" pulse={next === 'land'} want={next === 'land' ? nextLand! : null} value={land} disabled={!tint} onChange={pick} options={KEYS.map(k => ({ value: k, label: LANDFORMS[k].name }))} /></Control>}
    />
  )
}
