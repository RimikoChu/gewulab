// 压强 · 第 2 课 压强（p = F/S；增大和减小压强的办法）
import { useEffect, useState } from 'react'
import { Control, Glass, LabButton, LabShell, LessonBlock, ParamTile, Segmented, type Task } from '@/components/lab/lab-shell'
import Scene2 from './scene2'
import { LESSONS, goLesson } from './lessons'
import { CARS, G, kN, kPa, solve2, type CarKey } from './physics'
import { useTasks } from './world'

interface Row { id: number; car: CarKey; plates: boolean; F: number; S: number; p: number }
const TASKS: Task[] = [
  { id: 'truck', text: '让卡车开上软土，记下压强', note: '6 个轮子着地的面积很小，压强很大：陷进去了' },
  { id: 'digger', text: '换成一样重的挖掘机，再记一次', note: '一样重，履带的面积大得多，压强小：几乎不陷' },
  { id: 'plate', text: '给卡车垫上钢板，再开一次', note: '压力没变，受力面积大了，压强就小了' },
]

export default function Lesson2() {
  const [car, setCar] = useState<CarKey>('truck')
  const [plates, setPlates] = useState(false)
  const [onSoil, setOnSoil] = useState(false)
  const [there, setThere] = useState(false)
  const [rut, setRut] = useState<{ depth: number; car: CarKey } | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const T = useTasks('gewu:pressure:2', TASKS)
  const r = solve2(car, plates)

  useEffect(() => {
    setThere(false); if (!onSoil) return
    const t = setTimeout(() => { setThere(true); setRut({ depth: r.sink, car }) }, 2500)
    return () => clearTimeout(t)
  }, [onSoil, car, plates])   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (k: CarKey) => { if (k === car) return; setOnSoil(false); setCar(k); setRut(null); if (k === 'digger') setPlates(false) }
  const togglePlates = () => { setOnSoil(false); setRut(null); setPlates(v => !v) }
  const dup = rows.some(x => x.car === car && x.plates === plates)
  const record = () => {
    if (!there || dup) return
    const next = [...rows, { id: Date.now(), car, plates, F: r.F, S: r.S, p: r.p }]
    setRows(next)
    T.check(id => id === 'truck' ? next.some(x => x.car === 'truck' && !x.plates) : id === 'digger' ? next.some(x => x.car === 'digger') : next.some(x => x.car === 'truck' && x.plates))
  }
  const resetAll = () => { setCar('truck'); setPlates(false); setOnSoil(false); setRut(null); setRows([]); T.reset() }

  const task = T.current
  const want = task?.id === 'digger' ? { car: 'digger' as CarKey, plates: false } : { car: 'truck' as CarKey, plates: task?.id === 'plate' }
  const { hint, next }: { hint: string; next: 'go' | 'record' | 'car' | 'plate' | null } = (() => {
    if (!task) return { hint: '都做完了。两辆车一样重，压强差了十几倍。', next: null }
    if (car !== want.car) return { hint: `把车换成${CARS[want.car].name}`, next: 'car' }
    if (plates !== want.plates) return { hint: want.plates ? '先在软土上垫两块钢板' : '把钢板撤掉', next: 'plate' }
    if (!onSoil) return { hint: `先猜一猜它会不会陷进去，再让${CARS[car].name}开上软土`, next: 'go' }
    if (!there) return { hint: '开过去了…', next: null }
    return dup ? { hint: '这一组记过了', next: null } : { hint: '按“记录数据”', next: 'record' }
  })()

  return (
    <LabShell title="压强" lessons={LESSONS} current="2" onLesson={goLesson} banner={T.banner} onReset={resetAll} hint={hint} actionsLabel="开车"
      stage={<Scene2 car={car} plates={plates} onSoil={onSoil} sink={r.sink} p={r.p} rut={rut} />}
      lesson={
        <LessonBlock no="2" title="压强" concept="每一平方米上压着多大的力" tasks={TASKS} done={T.done} current={task?.id}
          theory={<>
            <p>物体所受<b className="text-white">压力的大小与受力面积之比</b>叫压强，用来表示压力的作用效果。</p>
            <p className="my-3 rounded-xl bg-white/8 py-3 text-center font-formula text-[21px] text-white italic">p = F / S</p>
            <ul className="flex flex-col gap-1.5 text-[14px] text-white/80">
              <li><b className="text-[#7fe3d4]">单位：</b>帕（Pa），1 Pa = 1 N/m²</li>
              <li><b className="text-[#7fe3d4]">减小压强：</b>减小压力，或增大受力面积（履带、垫钢板）</li>
              <li><b className="text-[#7fe3d4]">增大压强：</b>增大压力，或减小受力面积（刀刃、图钉尖）</li>
            </ul>
          </>} />
      }
      finale={T.finale && (
        <Glass className="w-[min(92vw,430px)] px-6 py-5 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#7fe3d4]">三组数据都记完了</p>
          <p className="mt-2 text-[21px] leading-snug font-bold">压强 = 压力 ÷ 受力面积</p>
          <p className="mt-2 font-formula text-[19px] italic text-white/85">p = F / S</p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">一样重的车，着地面积越大，压强越小，越不容易陷下去。</p>
          <LabButton primary className="mx-auto mt-4" onClick={() => T.setFinale(false)}>再试一试</LabButton>
        </Glass>
      )}
      panel={
        <Glass className="px-4 py-4">
          <div className="text-center">
            <div className="font-formula text-[18px] italic text-white/65">p = F / S</div>
            <div key={String(there)} className={there ? 'pop mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums text-[#7fe3d4]' : 'mt-1 text-[46px] leading-none font-bold tracking-tight tabular-nums'}>{kPa(r.p)}<span className="ml-1 text-[15px] font-medium text-white/55">kPa</span></div>
            <div className="mt-2 text-[13px] text-white/55 tabular-nums">{kN(r.F)} kN ÷ {r.S} m²</div>
          </div>
          <h2 className="mt-5 text-[12.5px] text-white/55">{CARS[car].name}（20 吨{plates ? '，垫了钢板' : ''}）</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <ParamTile symbol="F" value={kN(r.F)} unit="kN · 压力" />
            <ParamTile symbol="S" value={String(r.S)} unit="m² · 着地面积" />
            <ParamTile symbol="p" value={kPa(r.p)} unit="kPa · 压强" />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-white/65">{plates ? '车压在钢板上，钢板再压在土上：着地的是两块钢板，一共 12 m²。' : CARS[car].how + '。'}压力等于车的重力：{CARS[car].mass} × {G} N。</p>
          <div className="mt-5 flex items-baseline justify-between">
            <h2 className="text-[12.5px] text-white/55">数据表</h2>
            {rows.length > 0 && <button onClick={() => setRows([])} className="h-7 rounded-md px-2 text-[12.5px] text-white/55 hover:bg-white/10">清空</button>}
          </div>
          {rows.length === 0
            ? <p className="mt-2 rounded-xl bg-white/6 px-3 py-3 text-[13.5px] text-white/55">车开上软土以后按“记录数据”。</p>
            : <table className="mt-1 w-full text-[13.5px] tabular-nums">
                <thead><tr className="text-left text-[12px] text-white/50"><th className="py-1 font-normal">车</th><th className="text-right font-normal">F/kN</th><th className="text-right font-normal">S/m²</th><th className="text-right font-normal">p/kPa</th></tr></thead>
                <tbody>{rows.map(x => (
                  <tr key={x.id} className="row-in border-t border-white/12"><td className="py-1.5 text-white/80">{CARS[x.car].name}{x.plates ? '+钢板' : ''}</td><td className="text-right">{kN(x.F)}</td><td className="text-right">{x.S}</td><td className="text-right font-semibold text-[#7fe3d4]">{kPa(x.p)}</td></tr>
                ))}</tbody>
              </table>}
        </Glass>
      }
      actions={<>
        <LabButton pulse={next === 'go'} onClick={() => setOnSoil(v => !v)}>{onSoil ? '倒回硬地面' : '开上软土'}</LabButton>
        <LabButton pulse={next === 'plate'} onClick={togglePlates} disabled={car !== 'truck'}>{plates ? '撤掉钢板' : '垫上钢板'}</LabButton>
        <LabButton primary pulse={next === 'record'} onClick={record} disabled={!there || dup}>记录数据</LabButton>
      </>}
      extras={
        <Control label="哪辆车">
          <Segmented label="哪辆车" pulse={next === 'car'} value={car} onChange={k => pick(k as CarKey)} options={(Object.keys(CARS) as CarKey[]).map(k => ({ value: k, label: CARS[k].name }))} />
        </Control>
      }
    />
  )
}
