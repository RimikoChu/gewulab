// 光的折射和凸透镜成像 · 第 1 课 光在水面拐了弯（光的折射）
import { useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import { useSlide, useTasks, type Label } from '@/lab-kit'
import { LESSONS, goLesson } from './lessons'
import { Dark, Ray } from './optics'
import { ANGLES, N_WATER, refract, refractOut } from './physics'
import { AXIS, ST, TOP } from './world'

type A = '0' | '30' | '60'
type Dir = 'in' | 'out'
const NAME: Record<Dir, string> = { in: '从空气射进水里', out: '从水里射向空气' }
const TASKS: Task[] = [
  { id: 'in:30', text: '让光以 30° 的入射角斜射进水里，量出折射角', note: `约 ${refract(30).toFixed(1)}°：折射光线向法线偏折，折射角小于入射角` },
  { id: 'in:60', text: '把入射角加大到 60°，再量一次', note: `约 ${refract(60).toFixed(1)}°：入射角增大，折射角也增大，但总是小一些` },
  { id: 'in:0', text: '让光垂直射进水里', note: '传播方向不变：入射角和折射角都是 0°' },
  { id: 'out:30', text: '反过来：让光从水里以 30° 射向空气', note: `约 ${refractOut(30)!.toFixed(1)}°：这回折射角比入射角大，光线偏离法线` },
]
const RAD = Math.PI / 180, PX = ST.tank, PY = AXIS - 0.05, RED = '#ff5a4a'
// 水槽坐在台面上：槽底、水深、槽口比水面高出多少；光线在空气里和在水里各画多长
const BOTTOM = TOP + 0.03, DEEP = PY - BOTTOM, RIM = 0.4, LA = 0.85, LW = DEEP - 0.08

/** 标角度的一小段圆弧：圆心在入射点，从 from 度画到 to 度（从 +x 方向起、逆时针为正） */
function Arc({ from, to, r = 0.26, color = '#ffffff' }: { from: number; to: number; r?: number; color?: string }) {
  const a = Math.min(from, to), len = Math.abs(to - from)
  return len < 0.5 ? null : <mesh position={[PX, PY, 0.01]} rotation-z={a * RAD}><torusGeometry args={[r, 0.006, 6, 32, len * RAD]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
}

export default function Lesson1() {
  const [ang, setAng] = useState<A>('30')
  const [dir, setDir] = useState<Dir>('in')
  const [rows, setRows] = useState<string[]>([])
  const T = useTasks('gewu:lens:1', TASKS)
  const i = useSlide(Number(ang), 60), steady = Math.abs(i - Number(ang)) < 0.1, into = dir === 'in'
  const r = into ? refract(i) : refractOut(i), key = `${dir}:${ang}`, dup = rows.includes(key)
  const record = () => { if (!steady || dup) return; const next = [...rows, key]; setRows(next); T.check(id => next.includes(id)) }
  const flip = () => { setDir(d => d === 'in' ? 'out' : 'in'); setAng('30') }
  const resetAll = () => { setAng('30'); setDir('in'); setRows([]); T.reset() }
  const task = T.current, [td, ta] = (task?.id ?? ':').split(':') as [Dir, A]
  const { hint, next }: { hint: string; next: 'ang' | 'dir' | 'record' | null } = !task ? { hint: '都量完了。斜着进水，光向法线靠拢；斜着出水，光偏离法线。', next: null }
    : dir !== td ? { hint: `按“${td === 'out' ? '改成从水里射出' : '改回从空气射入'}”`, next: 'dir' }
    : ang !== ta ? { hint: `把入射角换成 ${ta}°`, next: 'ang' } : { hint: into ? '看水里的光线偏向哪边，按“记录”' : '看空气里的光线偏向哪边，按“记录”', next: 'record' }
  // 入射光线从哪来、折射光线往哪去、反射光线往哪去（单位向量）
  const s = into ? 1 : -1, src: [number, number] = [-Math.sin(i * RAD), s * Math.cos(i * RAD)], refl: [number, number] = [Math.sin(i * RAD), s * Math.cos(i * RAD)]
  const out: [number, number] | null = r == null ? null : [Math.sin(r * RAD), -s * Math.cos(r * RAD)]
  const P = (d: [number, number], k = d[1] > 0 ? LA : LW): [number, number] => [PX + d[0] * k, PY + d[1] * k]
  const pen = Math.atan2(-src[1], -src[0]) - Math.PI / 2
  const labels: Label[] = [
    { id: 'i', at: [PX - 0.34, PY + s * (into ? 0.5 : 0.36), 0.3], ax: 1, className: 'scene-tag -translate-y-1/2', children: <><small>入射角</small>{i.toFixed(0)}°</> },
    { id: 'r', at: [PX + 0.36, PY - s * (into ? 0.36 : 0.5), 0.3], className: `scene-tag -translate-y-1/2${r != null ? ' key' : ''}`, children: r != null ? <><small>折射角</small>{r.toFixed(1)}°</> : '没有折射光线了' },
    { id: 'n', at: [PX, PY + 0.97, 0.3], ax: 0.5, name: true, className: 'scene-name -translate-y-full', children: '法线' },
    { id: 'a', at: [PX - 1.25, PY + 0.2, 0.3], name: true, className: 'scene-name', children: '空气' }, { id: 'w', at: [PX - 1.25, PY - 0.3, 0.3], name: true, className: 'scene-name', children: '水' },
    ...(into ? [] : [{ id: 'pen', at: [PX - 0.62, PY - DEEP + 0.04, 0.3] as [number, number, number], ax: 1, name: true, className: 'scene-name', children: '激光笔（防水的，放在水里）' }]),
  ]

  return (
    <LabShell title="折射和凸透镜" lessons={LESSONS} current="1" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="激光笔"
      stage={<Dark at="tank" labels={labels}>
        {/* 水槽：坐在台面上的一只玻璃槽。水用普通的半透明材质，水里的光线才看得清、不走样 */}
        <mesh position={[PX, BOTTOM + DEEP / 2, 0]} renderOrder={2}><boxGeometry args={[2.9, DEEP, 0.56]} /><meshStandardMaterial color="#17548f" transparent opacity={0.2} roughness={0.15} depthWrite={false} /></mesh>
        <mesh position={[PX, PY, 0]} rotation-x={-Math.PI / 2} renderOrder={2}><planeGeometry args={[2.9, 0.56]} /><meshStandardMaterial color="#6fb4e6" transparent opacity={0.16} roughness={0.05} depthWrite={false} side={2} /></mesh>
        <mesh position={[PX, BOTTOM + (DEEP + RIM) / 2, 0]} renderOrder={3}><boxGeometry args={[2.96, DEEP + RIM, 0.62]} /><meshStandardMaterial color="#cfe6ee" transparent opacity={0.04} roughness={0.05} depthWrite={false} /></mesh>
        <mesh position={[PX, BOTTOM - 0.012, 0]}><boxGeometry args={[3.0, 0.024, 0.66]} /><meshStandardMaterial color="#aebfc7" transparent opacity={0.5} roughness={0.1} /></mesh>
        {/* 玻璃槽的棱：前后两个框 */}
        {[0.31, -0.31].map(z => [[-1.48, RIM, 1.48, RIM], [-1.48, -DEEP, 1.48, -DEEP], [-1.48, -DEEP, -1.48, RIM], [1.48, -DEEP, 1.48, RIM]].map(([x0, y0, x1, y1], j) => <Ray key={`${z}${j}`} a={[PX + x0, PY + y0]} b={[PX + x1, PY + y1]} color="#bcd3dc" r={0.005} glow={false} z={z} />))}
        <Ray a={[PX, PY - DEEP]} b={[PX, PY + 0.95]} color="#8a96a2" r={0.0035} dash z={-0.02} />
        <Ray a={P(src)} b={[PX, PY]} color={RED} />
        {out && <Ray a={[PX, PY]} b={P(out)} color={RED} />}
        <Ray a={[PX, PY]} b={P(refl, (refl[1] > 0 ? LA : LW) * (out ? 0.6 : 1))} color={RED} r={out ? 0.0035 : 0.009} glow={!out} />
        <Arc from={s * 90} to={s * 90 + s * i} />
        {r != null && <Arc from={-s * 90} to={-s * 90 + s * r} color="#7fe3d4" />}
        {/* 激光笔：在入射光线的起点，对着入射点 */}
        <group position={[...P(src, (src[1] > 0 ? LA : LW) + (into ? 0.13 : 0.02)), 0]} rotation-z={pen} scale={into ? 1 : 0.7}>
          <mesh><cylinderGeometry args={[0.035, 0.035, 0.26, 16]} /><meshStandardMaterial color="#30363c" metalness={0.7} roughness={0.35} /></mesh>
          <mesh position={[0, 0.135, 0]}><cylinderGeometry args={[0.022, 0.03, 0.02, 12]} /><meshBasicMaterial color={RED} toneMapped={false} /></mesh>
        </group>
      </Dark>}
      lesson={<LessonBlock no="1" title="光在水面拐了弯" concept="光斜着从一种介质进入另一种，方向会偏折" tasks={TASKS} done={T.done} current={task?.id}
        theory={<>
          <p>光从一种介质斜射入另一种介质时，传播方向发生偏折，叫<b className="text-white">光的折射</b>。</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-[14px] text-white/80">
            <li>折射光线、入射光线和法线在同一平面内，分居法线两侧</li>
            <li>光从空气斜射入水中，折射光线向法线偏折，<b className="text-white">折射角小于入射角</b></li>
            <li>光从水中斜射入空气，折射光线偏离法线，<b className="text-white">折射角大于入射角</b></li>
            <li>入射角增大，折射角也增大；垂直入射时方向不变</li>
            <li>折射时<b className="text-white">光路是可逆的</b>：空气里 30° 进去是约 {refract(30).toFixed(0)}°，水里约 {refract(30).toFixed(0)}° 出来就是 30°</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-white/65">折射角是用水的折射率 {N_WATER} 算出来的，这个算法初中不要求。细的那条光线是同时发生的反射。从水里射出时如果入射角太大，折射光线会消失，光全部反射回水里：这叫全反射，高中才学。</p>
        </>} />}
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">四次都量过了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">进水时折射角小，出水时折射角大</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">30° 进水变成约 {refract(30).toFixed(0)}°；30° 出水变成约 {refractOut(30)!.toFixed(0)}°。在水里的那个角总是小一些。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再看一看</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="text-[13px] text-white/60">{NAME[dir]} · 折射角</div>
            <div className="mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums">{r != null ? r.toFixed(1) : '—'}<span className="ml-1 text-[15px] font-medium text-white/55">°</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ParamTile symbol="入射角" value={`${i.toFixed(0)}°`} unit="入射光线和法线的夹角" />
            <ParamTile symbol="比一比" value={r == null ? '全部反射' : i < 0.5 ? '相等' : into ? '折射角小' : '折射角大'} unit={r == null ? '折射光线消失了' : i < 0.5 ? '垂直入射，不偏折' : into ? '向法线偏折' : '偏离法线'} />
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">数据表</h2>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">每换一个入射角，量一次、记一次。</p>
            : <table className="mt-1 w-full text-[13.5px]">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">光怎么走</th><th className="text-right font-normal">入射角</th><th className="text-right font-normal">折射角</th></tr></thead>
                <tbody>{rows.map(k => { const [d, a] = k.split(':') as [Dir, A], v = d === 'in' ? refract(Number(a)) : refractOut(Number(a)); return <tr key={k} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{NAME[d]}</td><td className="text-right tabular-nums">{a}°</td><td className="text-right font-semibold text-[#7fe3d4] tabular-nums">{v != null ? `${v.toFixed(1)}°` : '全反射'}</td></tr> })}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'dir'} onClick={flip}>{into ? '改成从水里射出' : '改回从空气射入'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!steady || dup}>记录</LabButton>
      </>}
      extras={<Control label="入射角"><Segmented label="入射角" pulse={next === 'ang'} want={next === 'ang' ? ta : null} value={ang} onChange={setAng} options={ANGLES.map(a => ({ value: String(a) as A, label: `${a}°` }))} /></Control>}
    />
  )
}
