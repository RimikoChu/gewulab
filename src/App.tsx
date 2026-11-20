import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NumberTicker } from '@/components/ui/number-ticker'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { FeaturedLabCard, LabCard } from '@/components/lab-card'
import { LABS, SUBJECTS, type SubjectKey } from '@/labs'

/** 瀑布流列数：跟着容器宽度走 */
function useColumns() {
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(3)
  useEffect(() => {
    const el = ref.current!
    const ro = new ResizeObserver(() => { const w = el.clientWidth; setCols(w >= 900 ? 3 : w >= 560 ? 2 : 1) })
    ro.observe(el); return () => ro.disconnect()
  }, [])
  return [ref, cols] as const
}

export default function App() {
  const [subject, setSubject] = useState<'all' | SubjectKey>('all')
  const [grade, setGrade] = useState('all')
  const [q, setQ] = useState('')
  const [gridRef, cols] = useColumns()

  const pool = useMemo(() => LABS.filter(l =>
    (grade === 'all' || l.grade === grade) &&
    (!q.trim() || (l.name + l.desc + l.pts.join('') + l.book + SUBJECTS[l.s]).includes(q.trim()))), [grade, q])
  // 已经能进去做的排在前面，还没做的排在后面；各自保持清单里的顺序
  const list = pool.filter(l => subject === 'all' || l.s === subject).sort((a, b) => Number(!!b.href) - Number(!!a.href))
  // 只有“全部”视图才放主推卡
  const featured = subject === 'all' && grade === 'all' && !q.trim() ? list.find(l => l.featured && l.href && l.lessons) : undefined
  const columns = useMemo(() => {
    const out: (typeof LABS)[] = Array.from({ length: cols }, () => [])
    list.filter(l => l !== featured).forEach((l, i) => out[i % cols].push(l))   // 轮流分列，阅读顺序仍是从左到右
    return out
  }, [list, cols, featured])
  const count = (k: 'all' | SubjectKey) => pool.filter(l => k === 'all' || l.s === k).length

  return (
    <>
      <header className="sticky top-0 z-10 flex h-12 items-center gap-1.5 bg-background/90 px-4 backdrop-blur">
        <a href="#" className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[15px] font-semibold tracking-wide hover:bg-accent">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <rect width="24" height="24" rx="6.5" fill="var(--primary)" />
            <path d="M8.9 13.4h6.2l1.7 2.900a1.3 1.3 0 0 1-1.100 2H8.300a1.3 1.3 0 0 1-1.100-2z" fill="var(--brand-warm)" />
            <path d="M10 6.2h4M10.8 6.2v3.9l-3.5 6.100a1.3 1.3 0 0 0 1.100 2h7.200a1.3 1.3 0 0 0 1.100-2l-3.500-6.100V6.200" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          格物实验室
        </a>
        <span className="flex-1" />
        <a href="#" className="flex h-8 items-center rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent">嵌入课件</a>
        <a href="#" className="flex h-8 items-center rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent">更新日志</a>
      </header>

      <main className="mx-auto max-w-[1160px] px-4 pt-5 pb-24 sm:px-10 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <h1 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">实验室</h1>
            <p className="mt-1.5 text-base text-muted-foreground">课本里的每个单元，都有一间能动手的实验室。还没做的，欢迎一起来做。</p>
          </div>
          <dl className="flex gap-7 pb-0.5 text-sm text-muted-foreground">
            {[[LABS.filter(l => l.href).length, '间已上线'], [LABS.length, '间在规划'], [Object.keys(SUBJECTS).length, '个学科']].map(([n, t]) => (
              <div key={t as string} className="flex items-baseline gap-1.5">
                <dt className="order-2">{t}</dt>
                <dd className="text-[22px] font-bold text-foreground tabular-nums"><NumberTicker value={n as number} className="tracking-normal text-foreground" /></dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6 flex items-center gap-2 border-b">
          <Tabs value={subject} onValueChange={v => setSubject(v as typeof subject)} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            <TabsList variant="line" className="h-10 gap-1 p-0">
              {(['all', ...Object.keys(SUBJECTS)] as ('all' | SubjectKey)[]).map(k => (
                <TabsTrigger key={k} value={k} className="h-10 flex-none px-2.5 text-[14.5px] font-normal data-[state=active]:font-semibold after:bottom-[-1px]!">
                  {k === 'all' ? '全部' : SUBJECTS[k]}<span className="text-[12.5px] font-normal text-faint">{count(k)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ToggleGroup type="single" size="sm" value={grade} onValueChange={v => v && setGrade(v)} className="hidden md:flex" aria-label="学段">
            {[['all', '全部学段'], ['初中', '初中'], ['高中', '高中']].map(([v, t]) => (
              <ToggleGroupItem key={v} value={v} className="h-7 px-2.5 text-[13.5px] font-normal text-muted-foreground data-[state=on]:font-semibold data-[state=on]:text-foreground">{t}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索" aria-label="搜索实验"
              className="h-7 w-28 border-0 bg-transparent pl-7 text-[13.5px] shadow-none transition-[width,background] hover:bg-accent focus-visible:w-44 focus-visible:bg-accent focus-visible:ring-0" />
          </label>
        </div>

        {featured && <div className="mt-5"><FeaturedLabCard lab={featured} /></div>}
        <div ref={gridRef} className="mt-4 flex items-start gap-4">
          {list.length === 0
            ? <p className="w-full py-14 text-center text-faint">没有找到相关的实验</p>
            : columns.map((col, i) => <div key={i} className="flex min-w-0 flex-1 flex-col gap-4">{col.map(l => <LabCard key={l.id} lab={l} />)}</div>)}
        </div>
      </main>
    </>
  )
}
