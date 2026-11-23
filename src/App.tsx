import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NumberTicker } from '@/components/ui/number-ticker'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LabMap } from '@/components/lab-map'
import { SiteFooter } from '@/components/site-footer'
import { CHANGES } from '@/changelog'
import { LABS, SUBJECTS, type SubjectKey, hasOffline, offlineUrl } from '@/labs'

export default function App() {
  const [subject, setSubject] = useState<'all' | SubjectKey>('all')
  const [grade, setGrade] = useState('all')
  const [q, setQ] = useState('')
  const [log, setLog] = useState(false)
  useEffect(() => {
    if (!log) return
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') setLog(false) }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [log])
  const day = (d: string) => `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8, 10))} 日`

  const pool = useMemo(() => LABS.filter(l =>
    (grade === 'all' || l.grade === grade) &&
    (!q.trim() || (l.name + l.desc + l.pts.join('') + l.book + SUBJECTS[l.s]).includes(q.trim()))), [grade, q])
  // 离线包的下载入口：看着哪个学科就给哪个学科的包；看“全部”时给全部和各学科的
  const packs: [string, string][] = subject === 'all'
    ? [['all', '全部'], ...(Object.keys(SUBJECTS) as SubjectKey[]).filter(k => LABS.some(l => l.s === k && hasOffline(l))).map((k): [string, string] => [k, SUBJECTS[k]])]
    : LABS.some(l => l.s === subject && hasOffline(l)) ? [[subject, `${SUBJECTS[subject]}（${LABS.filter(l => l.s === subject && hasOffline(l)).length} 间）`]] : []
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
        <button type="button" onClick={() => setLog(true)} className="flex h-8 items-center rounded-md px-2.5 text-sm text-muted-foreground hover:bg-accent">更新记录</button>
      </header>

      <main className="mx-auto max-w-[1160px] px-4 pt-5 pb-24 sm:px-10 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <h1 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">实验室</h1>
            <p className="mt-1.5 text-base text-muted-foreground">课本里的每个单元，都有一间能动手的实验室。</p>
            <button type="button" onClick={() => setLog(true)} className="mt-2 text-left text-[13.5px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
              最近更新 · {day(CHANGES[0].date)}：{CHANGES[0].title}
            </button>
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

        {packs.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span>离线包：下载后解压，双击就能用，不用联网</span>
            {packs.map(([k, t]) => <a key={k} href={offlineUrl(k)} className="text-foreground underline-offset-2 hover:text-primary hover:underline">{t}</a>)}
          </p>
        )}
        {pool.some(l => subject === 'all' || l.s === subject) ? <LabMap labs={pool} subject={subject} /> : <p className="w-full py-14 text-center text-faint">没有找到相关的实验</p>}
        <SiteFooter />
      </main>
      {log && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" onClick={() => setLog(false)}>
          <div role="dialog" aria-modal="true" aria-label="更新记录" onClick={e => e.stopPropagation()} className="flex max-h-[84vh] w-full max-w-[600px] flex-col overflow-hidden rounded-xl border bg-background shadow-[0_18px_50px_rgb(15_15_15/0.2)]">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-[19px] font-bold tracking-tight">更新记录</h2>
              <button type="button" onClick={() => setLog(false)} aria-label="关闭" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"><X className="size-4.5" /></button>
            </div>
            <ol className="overflow-y-auto px-6 py-2">
              {CHANGES.map((c, i) => (
                <li key={i} className="border-b py-4 last:border-b-0">
                  <div className="flex items-baseline gap-3">
                    <time dateTime={c.date} className="flex-none text-[13px] tabular-nums text-faint">{day(c.date)}</time>
                    <h3 className="text-[15.5px] font-semibold">{c.title}</h3>
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1 text-[14px] leading-[1.65] text-muted-foreground">{c.notes.map(n => <li key={n}>{n}</li>)}</ul>
                  {c.labs && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {c.labs.map(id => LABS.find(l => l.id === id)).filter(l => l?.href).map(l => <a key={l!.id} href={l!.href} className="rounded-md border px-2.5 py-1 text-[13px] hover:border-primary hover:text-primary">{l!.name}</a>)}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
