// 天气和气候 · 第 3 课 气温的分布：先在科普广场的地球仪上看等温线——沿经线从赤道走到北极，再比较同纬度的海陆（7 月、1 月）；
// 然后飞到身后的大山，读山脚、山腰、山顶三座自动气象站，算出“越高越冷”。
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { LabStage, useSlide, useTasks, type Label } from '@/lab-kit'
import { voiced } from '@/lab-kit/narration'
import { GLOBE, globeFacing, globePoint, spinFor } from './globe'
import { LESSONS, goLesson } from './lessons'
import { NARRATION } from './narration'
import { Fin, Rows, nameTag, valTag } from './parts'
import { JULY, LAPSE, MOUNT, STATION_ALT, lapse, tempModel, type LL } from './physics'
import { VOICE } from './voice'
import { FAR, MT, NEAR, SPOT, type Want } from './world'

type Part = 'jul' | 'jan' | 'mount'
const PARTS: { value: Part; label: string }[] = [{ value: 'jul', label: '7 月' }, { value: 'jan', label: '1 月' }, { value: 'mount', label: '大山' }]
const TASKS: Task[] = [
  { id: 'lat', text: '沿经线从赤道往北走', note: '一路穿过好几条等温线：纬度越高，气温越低' },
  { id: 'jul', text: '7 月：比较同纬度的陆地和海洋', note: '7 月等温线在大陆上向北凸：同纬度陆地比海洋热' },
  { id: 'jan', text: '1 月：再比较一次', note: '1 月等温线在大陆上向南凸：同纬度陆地比海洋冷' },
  { id: 'mount', text: '到大山上，读山腰和山顶的气温', note: '' },
]
const FACE = 115, LAT = 45
const LAND: LL = [108, LAT], SEA: LL = [165, LAT]
const MID = lapse(JULY, STATION_ALT, MOUNT.mid), TOP = lapse(JULY, STATION_ALT, MOUNT.peak)

export default function Lesson3() {
  const [part, setPart] = useState<Part>('jul')
  const [walk, setWalk] = useState(false)
  const [cmp, setCmp] = useState(false)
  const [read, setRead] = useState(false)
  const lat = useSlide(walk ? 78 : 0, 16), walking = walk && lat < 78
  const shown = useSlide(read ? 3 : 0, 1.1)               // 山上依次亮起三座站
  const T = useTasks('gewu:climate:3', TASKS)
  useEffect(() => { if (walk && lat >= 78) T.check(id => id === 'lat') }, [walk, lat >= 78])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (read && shown >= 3) T.check(id => id === 'mount') }, [read, shown >= 3])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (p: Part) => { if (walking) return; setPart(p); setCmp(false) }
  const compare = () => { if (part === 'mount') return; setCmp(true); setTimeout(() => T.check(id => id === part), 1600) }
  const resetAll = () => { setPart('jul'); setWalk(false); setCmp(false); setRead(false); T.reset() }

  const task = T.current
  const { hint, next }: { hint: string; next: 'walk' | 'cmp' | 'read' | 'part' | null } = (() => {
    if (!task) return { hint: '都做完了。低纬热、高纬冷，海拔越高越冷。', next: null }
    if (walking) return { hint: '从赤道往北，一条条等温线被甩在身后…', next: null }
    if (read && shown < 3) return { hint: '三座自动气象站的读数传回来了…', next: null }
    if (task.id === 'lat') return part !== 'jul' ? { hint: '把地球仪换到“7 月”', next: 'part' } : { hint: '沿着经线，从赤道一直往北走', next: 'walk' }
    if (task.id === 'jul' || task.id === 'jan') {
      if (part !== task.id) return { hint: `把地球仪换到“${task.id === 'jul' ? '7 月' : '1 月'}”`, next: 'part' }
      return cmp ? { hint: '看北纬 45° 这一圈：陆地上和海洋上…', next: null } : { hint: task.id === 'jul' ? '纬度越高越冷。现在比一比北纬 45° 的陆地和海洋' : '比一比 1 月北纬 45° 的陆地和海洋', next: 'cmp' }
    }
    return part !== 'mount' ? { hint: '换到“大山”', next: 'part' } : { hint: '读山脚、山腰、山顶三座自动气象站', next: 'read' }
  })()

  const m = part === 'jan' ? 1 : 7, spin = spinFor(FACE), landHot = tempModel(LAT, 1, m) > tempModel(LAT, 0, m)
  const walker: LL = [FACE, lat]
  const labels: Label[] = part === 'mount' ? [
    valTag('foot', [60, 8, -60], `山脚 ${MOUNT.foot} m`, `${JULY} ℃`, false, true, 0.5),
    valTag('mid', [MT.mid[0] - 10, MT.mid[1] + 70, MT.mid[2]], `山腰 ${MOUNT.mid} m`, `${MID} ℃`, shown >= 2, shown >= 1.9, 1),
    valTag('top', [MT.peak[0], MT.peak[1] + 80, MT.peak[2]], `山顶 ${MOUNT.peak} m`, `${TOP} ℃`, shown >= 3, shown >= 2.9, 0.5),
  ] : [
    ...(walk || lat > 0 ? [{ ...valTag('w', globePoint(walker, spin, 1.03), `北纬 ${Math.round(lat)}°`, lat < 20 ? '热' : lat < 50 ? '温和' : '冷', true), ax: -0.1 }] : []),
    ...(cmp ? [valTag('l', globePoint(LAND, spin, 1.03), '陆地', landHot ? '更热' : '更冷', true, globeFacing(LAND, spin), 1), valTag('s', globePoint(SEA, spin, 1.03), '海洋', landHot ? '较凉' : '较暖', false, globeFacing(SEA, spin), 0)] : []),
    nameTag('ng', [GLOBE.x, GLOBE.y + GLOBE.r + 0.3, GLOBE.z], `等温线 · ${m} 月（示意）`),
  ]
  const s = part === 'mount' ? SPOT.slope : SPOT.globe
  return (
    <LabShell narration={voiced(NARRATION['3'], VOICE)} title="天气和气候" lessons={LESSONS} current="3" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel={part === 'mount' ? '大山' : '地球仪'}
      stage={<LabStage<Want> labels={labels} target={s.target} span={s.span} view={s.view} {...(part === 'mount' ? FAR : NEAR)}
        world={{ globe: { layer: part === 'jan' ? 'jan' : 'jul', spin }, mtn: 0.5 }}>
        {/* 地球仪上加亮北纬 45° 这一圈；沿经线走的小点 */}
        {cmp && part !== 'mount' && <mesh position={[GLOBE.x, GLOBE.y + GLOBE.r * Math.sin(LAT * Math.PI / 180), GLOBE.z]} rotation-x={Math.PI / 2}><torusGeometry args={[GLOBE.r * Math.cos(LAT * Math.PI / 180) + 0.006, 0.008, 8, 128]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} /></mesh>}
        {part !== 'mount' && lat > 0 && <mesh position={globePoint(walker, spin, 1.012)}><sphereGeometry args={[0.035, 16, 12]} /><meshBasicMaterial color="#35c7b3" toneMapped={false} /></mesh>}
      </LabStage>}
      lesson={<LessonBlock no="3" title="气温的分布" concept="低纬热高纬冷，越高越冷" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>把气温相同的各点连成线，就是<b className="text-white">等温线</b>。看等温线图，能看出气温在世界上的分布：</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li><b className="text-[#7fe3d4]">纬度：</b>气温从低纬度向两极逐渐降低。</li>
            <li><b className="text-[#7fe3d4]">海陆：</b>同纬度，夏季陆地比海洋热，冬季陆地比海洋冷。北半球 7 月等温线在陆地上向北凸，1 月向南凸。</li>
            <li><b className="text-[#7fe3d4]">地形：</b>海拔每升高 100 m，气温约降低 0.6 ℃。</li>
          </ul>
          <p className="mt-2 text-[13.5px] text-white/65">地球仪上的等温线是按纬度和海陆画的示意图，每条线相隔 10 ℃；大山的气温是 7 月平均，示意。</p>
        </>} />}
      finale={T.finale && <Fin kicker="三样都看过了" big="低纬热高纬冷，越高越冷" small={`从赤道往北越走越冷；同纬度夏季陆地热、冬季陆地冷；山顶比山脚高 ${MOUNT.peak - MOUNT.foot} m，气温低 ${JULY - TOP} ℃。`} />}
      panel={
        <Glass className="px-4 py-4">
          {part === 'mount' ? <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">山顶 {MOUNT.peak} m · 7 月平均气温</div>
              <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{shown >= 3 ? TOP : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">℃</span></div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ParamTile symbol="t₀" value={`${JULY} ℃`} unit={`山脚 ${MOUNT.foot} m`} />
              <ParamTile symbol="Δh" value={`${MOUNT.peak - MOUNT.foot} m`} unit="山顶比山脚高" />
            </div>
            <p className="mt-3 text-center font-formula text-[15px] text-white/80">t = {JULY} − {LAPSE} × {(MOUNT.peak - MOUNT.foot) / 100} = {TOP} ℃</p>
            <Rows head={['', '海拔', '气温']} rows={[['山脚', `${MOUNT.foot} m`, `${JULY} ℃`], ...(shown >= 2 ? [['山腰', `${MOUNT.mid} m`, `${MID} ℃`]] : []), ...(shown >= 3 ? [['山顶', `${MOUNT.peak} m`, `${TOP} ℃`]] : [])]} />
          </> : <>
            <div className="text-center">
              <div className="text-[13px] text-white/60">{cmp ? `北纬 ${LAT}°` : `沿东经 ${FACE}° 往北`} · {m} 月</div>
              <div className="mt-1 text-[34px] leading-tight font-bold">{cmp ? (landHot ? '陆地比海洋热' : '陆地比海洋冷') : walk ? (lat < 20 ? '赤道附近：热' : lat < 50 ? '中纬度：温和' : '高纬度：冷') : '—'}</div>
            </div>
            <h2 className="mt-5 text-[12.5px] text-white/55">关键参数</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ParamTile symbol="φ" value={walk ? `${Math.round(lat)}°N` : '0°'} unit="纬度" />
              <ParamTile symbol="月份" value={`${m} 月`} unit={m === 7 ? '北半球夏季' : '北半球冬季'} />
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">颜色越红越热、越蓝越冷；黑线是等温线，每条相隔 10 ℃（示意）。</p>
          </>}
        </Glass>
      }
      actions={<>
        <LabButton primary={next === 'walk'} pulse={next === 'walk'} onClick={() => setWalk(true)} disabled={part !== 'jul' || walk}>沿经线往北走</LabButton>
        <LabButton primary={next === 'cmp'} pulse={next === 'cmp'} onClick={compare} disabled={part === 'mount' || cmp || walking}>比一比海陆</LabButton>
        <LabButton primary={next === 'read'} pulse={next === 'read'} onClick={() => setRead(true)} disabled={part !== 'mount' || read}>读三座气象站</LabButton>
      </>}
      extras={
        <Control label="看哪一样">
          <Segmented label="看哪一样" pulse={next === 'part'} want={next === 'part' ? (task?.id === 'mount' ? 'mount' : task?.id === 'jan' ? 'jan' : 'jul') : null} value={part} onChange={v => pick(v as Part)} disabled={walking} options={PARTS} />
        </Control>
      }
    />
  )
}
