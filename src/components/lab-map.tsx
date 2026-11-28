// 首页的实验室清单：一个学科一条“陈列架”，卡片是真实的场景图，横着翻；点“看全部”或者只看一个学科时排成网格。点一张卡片，在下面展开它的详情。
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { shotUrl } from '@/components/home-hero'
import { ART, PLACEHOLDER, SUBJECTS, hasOffline, issueUrl, offlineUrl, type Lab, type SubjectKey } from '@/labs'
import { cn } from '@/lib/utils'

// 每间实验室有哪几课：直接从它自己的课次表里取，新做一间不用另外登记
const TABLES = import.meta.glob<{ LESSONS: { no: string; name: string }[] }>('/src/labs/*/lessons.ts', { eager: true })
const COURSES: Record<string, string[]> = Object.fromEntries(Object.entries(TABLES).map(([path, m]) => [path.split('/')[3], m.LESSONS.filter(l => /^\d+$/.test(l.no)).map(l => l.name)]))

const subjectVars = (s: Lab['s']) => ({
  '--s-bg': `var(--${s}-bg)`, '--s-fg': `var(--${s}-fg)`, '--s-mid': `var(--${s}-mid)`, '--s-tile': `var(--${s}-tile)`,
}) as CSSProperties

/** 线稿封面：还没有场景图的（规划中的）用它 */
function Cover({ lab }: { lab: Lab }) {
  return (
    <svg
      viewBox={lab.wide ? '0 0 640 360' : ART[lab.id] ? lab.vb ?? '0 0 320 200' : '0 14 320 172'}
      className={cn('ill block h-auto w-full', lab.wide && 'wide')}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ART[lab.id] ?? PLACEHOLDER }}
    />
  )
}
/** 场景图：拍不到或者加载不出来就退回线稿 */
function Shot({ lab, className }: { lab: Lab; className?: string }) {
  const [bad, setBad] = useState(false)
  if (!lab.href || bad) return <div className={cn('flex items-center bg-(--s-tile)', className)}><Cover lab={lab} /></div>
  return <img src={shotUrl(lab.id)} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} className={cn('block bg-[#14181d] object-cover', className)} />
}

function Props({ lab }: { lab: Lab }) {
  return (
    <>
      <Badge className="rounded-sm border-0 bg-(--s-bg) px-1.5 font-normal text-(--s-fg)">{SUBJECTS[lab.s]}</Badge>
      <span>{lab.grade === '高中' ? '高中' : ''}{lab.book}</span>
      {lab.n != null && <span>{lab.n} 课</span>}
    </>
  )
}

/** 选中的那一间：场景图、说明、各课、入口。at 是小三角指在第几成的位置，不给就不画 */
function Detail({ lab, onClose, at }: { lab: Lab; onClose: () => void; at?: number }) {
  const live = !!lab.href
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [lab.id])
  return (
    <div ref={ref} className="relative col-span-full scroll-my-20 pt-2" style={subjectVars(lab.s)}>
      {at != null && <span aria-hidden="true" className="absolute top-[3px] z-10 size-3.5 -translate-x-1/2 rotate-45 border-t-2 border-l-2 border-(--s-mid) bg-card" style={{ left: `${at * 100}%` }} />}
      <div key={lab.id} className="grid animate-in overflow-hidden rounded-2xl border-2 border-(--s-mid) bg-card shadow-[0_12px_32px_rgb(15_15_15/0.1)] duration-200 fade-in-0 slide-in-from-top-1 md:grid-cols-[minmax(0,420px)_1fr]">
        <Shot lab={lab} className={cn('h-full min-h-[220px] w-full', !live && 'opacity-75')} />
        <div className="flex min-w-0 flex-col px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <h3 className="text-[24px] leading-tight font-bold tracking-tight">{lab.name}</h3>
              <p className="mt-1 text-[15px] font-medium text-(--s-fg)">{lab.hook}</p>
            </div>
            <button type="button" onClick={onClose} className="ml-auto flex-none rounded-md px-2 py-0.5 text-[13px] text-muted-foreground hover:bg-accent">收起</button>
          </div>
          <p className="mt-2.5 text-sm leading-[1.7] text-muted-foreground">{lab.desc}</p>
          {live && COURSES[lab.id]
            ? <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-[5px] border-t pt-3 text-[13px] leading-snug text-muted-foreground sm:grid-cols-4">
                {COURSES[lab.id].map((name, i) => <li key={name} className="flex gap-1.5"><span className="flex-none text-faint tabular-nums">{i + 1}</span><span className="min-w-0">{name}</span></li>)}
                <li className="flex gap-1.5 text-faint"><span className="flex-none">+</span>拓展和随堂检测</li>
              </ol>
            : <div className="mt-2.5 flex flex-wrap gap-1.5">{lab.pts.map(p => <Badge key={p} variant="secondary" className="rounded-sm px-1.5 font-normal text-muted-foreground">{p}</Badge>)}</div>}
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-[13px] text-muted-foreground">
            <Props lab={lab} />
            <span className="ml-auto flex items-center gap-3">
              {hasOffline(lab) && <a href={offlineUrl(lab.id)} className="underline-offset-2 hover:text-primary hover:underline">离线包</a>}
              {live
                ? <Button asChild><a href={lab.href}>进入实验</a></Button>
                : lab.issue != null ? <Button asChild size="sm" variant="outline"><a href={issueUrl(lab.issue)} target="_blank" rel="noreferrer">还没做，来认领</a></Button> : <span className="text-faint">即将上线</span>}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 一张卡片：场景图在上，名字和那句提问在下 */
function Card({ lab, open, dim, onPick, className }: { lab: Lab; open: boolean; dim: boolean; onPick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onPick} aria-expanded={open} className={cn('group min-w-0 text-left transition-opacity', dim && 'opacity-50 hover:opacity-100', className)}>
      <div className={cn('overflow-hidden rounded-xl outline-2 outline-offset-2 outline-transparent transition-[outline-color,box-shadow] group-hover:shadow-[0_10px_28px_rgb(15_15_15/0.18)] group-focus-visible:outline-(--s-mid)', open && 'outline-(--s-mid)')}>
        <Shot lab={lab} className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="mt-2.5 flex items-baseline gap-2 px-0.5">
        <span className="min-w-0 text-[16px] leading-snug font-semibold">{lab.name}</span>
        <span className="ml-auto flex-none text-[12px] text-faint">{lab.grade}{lab.n != null && ` · ${lab.n} 课`}</span>
      </div>
      <p className="mt-0.5 line-clamp-2 px-0.5 text-[13.5px] leading-snug text-muted-foreground">{lab.hook}</p>
    </button>
  )
}

/** 一行有几格：跟着网格的断点走（sm 640、lg 1024） */
function useCols(sm: number, lg: number) {
  const get = () => (typeof window === 'undefined' ? lg : window.matchMedia('(min-width: 1024px)').matches ? lg : window.matchMedia('(min-width: 640px)').matches ? sm : 2)
  const [n, setN] = useState(get)
  useEffect(() => { const on = () => setN(get()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) })   // eslint-disable-line react-hooks/exhaustive-deps
  return n
}
/** 详情插在哪一格后面（被点的那一行的最后一格），小三角指在第几列的正中 */
const slot = (i: number, len: number, cols: number) => ({ after: Math.min(len - 1, Math.floor(i / cols) * cols + cols - 1), at: ((i % cols) + 0.5) / cols })

/** 今天是第几天：陈列架上谁排在前面按天轮换，谁都轮得到 */
const TODAY = Math.floor(Date.now() / 86400000)
const GRID = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4'

/** 横着翻的一排 */
function Shelf({ labs, open, onPick }: { labs: Lab[]; open: string | null; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ l: false, r: true })
  const check = () => { const e = ref.current; if (e) setEdge({ l: e.scrollLeft > 8, r: e.scrollLeft + e.clientWidth < e.scrollWidth - 8 }) }
  useEffect(() => { check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check) }, [labs.length])
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.82, behavior: 'smooth' })
  const arrow = 'absolute top-[calc((100%-64px)/2)] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border bg-background shadow-[0_6px_18px_rgb(15_15_15/0.16)] hover:bg-accent md:grid'
  return (
    <div className="relative">
      <div ref={ref} onScroll={check} className="shelf -mx-4 flex snap-x gap-4 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-10 sm:scroll-px-10 sm:px-10">
        {labs.map(l => <Card key={l.id} lab={l} open={open === l.id} dim={!!open && labs.some(x => x.id === open) && open !== l.id} onPick={() => onPick(l.id)} className="w-[72vw] flex-none snap-start sm:w-[300px]" />)}
      </div>
      {edge.l && <button type="button" aria-label="往前翻" onClick={() => go(-1)} className={cn(arrow, '-left-5')}><ChevronLeft className="size-5" /></button>}
      {edge.r && <button type="button" aria-label="往后翻" onClick={() => go(1)} className={cn(arrow, '-right-5')}><ChevronRight className="size-5" /></button>}
    </div>
  )
}

/** labs：已经按学段和搜索筛过的清单；subject：只看哪个学科（all 是全部）；full：不用陈列架，全部排成网格（搜索时用） */
export function LabMap({ labs, subject, full = false }: { labs: Lab[]; subject: 'all' | SubjectKey; full?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const [more, setMore] = useState<SubjectKey[]>([])
  const keys = (Object.keys(SUBJECTS) as SubjectKey[]).filter(k => subject === 'all' || k === subject)
  const pick = (id: string) => setOpen(o => (o === id ? null : id))
  const cols = useCols(3, 4)
  return (
    <div className="mt-8 flex flex-col gap-12">
      {keys.map((k, ki) => {
        const all = labs.filter(l => l.s === k), live = all.filter(l => l.href), todo = all.filter(l => !l.href), sel = all.find(l => l.id === open)
        if (all.length === 0) return null
        const grid = subject !== 'all' || full || more.includes(k) || live.length <= cols
        const r = grid ? 0 : (TODAY + ki * 3) % live.length
        const turn = [...live.slice(r), ...live.slice(0, r)]
        const gi = grid ? [...live, ...todo].findIndex(l => l.id === open) : -1
        const gs = gi >= 0 ? slot(gi, live.length + todo.length, cols) : null
        return (
          <section key={k} style={subjectVars(k)}>
            <div className="mb-4 flex items-end gap-3">
              <h2 className="text-[30px] leading-none font-bold tracking-tight text-(--s-fg)">{SUBJECTS[k]}</h2>
              <p className="pb-0.5 text-[14px] text-muted-foreground">{live.length} 间实验室{todo.length > 0 && `，${todo.length} 间在规划`}</p>
              {subject === 'all' && !full && live.length > cols && (
                <button type="button" aria-expanded={grid} onClick={() => { setOpen(null); setMore(m => (m.includes(k) ? m.filter(x => x !== k) : [...m, k])) }}
                  className="ml-auto rounded-md px-2 pb-0.5 text-[14px] font-medium text-(--s-fg) underline-offset-4 hover:underline">
                  {grid ? '收起' : `看全部 ${live.length} 间`}
                </button>
              )}
            </div>
            {grid
              ? <div className={GRID}>
                  {[...live, ...todo].map((l, i) => (<Fragment key={l.id}>
                    <Card lab={l} open={open === l.id} dim={!!sel && open !== l.id} onPick={() => pick(l.id)} />
                    {gs && gs.after === i && sel && <Detail lab={sel} at={gs.at} onClose={() => setOpen(null)} />}
                  </Fragment>))}
                </div>
              : <>
                  <Shelf labs={turn} open={open} onPick={pick} />
                  {sel && <div className="mt-3"><Detail lab={sel} onClose={() => setOpen(null)} /></div>}
                </>}
          </section>
        )
      })}
    </div>
  )
}
