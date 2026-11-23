// 打离线包：每间实验室打成一个独立的网页文件（脚本、样式、字体、贴图全部写在这一个文件里），
// 拷到 U 盘、双击就能打开，不需要联网，也不需要装任何东西。
// 再按“单间实验室”“一个学科”“全部”三种范围各打成压缩包，放在 dist-offline/ 里。
// 用法：npm run build:offline            全部实验室
//       npm run build:offline -- leaf    只打这一间（可以写多个目录名）
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = path.join(root, 'dist-offline'), tmp = path.join(out, '.tmp')
const SUBJECTS = { phys: '物理', chem: '化学', bio: '生物', geo: '地理', math: '数学' }
const MIME = { '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.hdr': 'application/hdr', '.svg': 'image/svg+xml' }

// ---------- 要打哪些实验室：labs/<名字>/index.html 存在的，名字和学科从首页清单 src/labs.ts 里取 ----------
const cards = fs.readFileSync(path.join(root, 'src/labs.ts'), 'utf8')
const meta = id => {
  const line = cards.split('\n').find(l => l.includes(`id: '${id}'`)) ?? ''
  const pick = k => line.match(new RegExp(`${k}: '((?:[^'\\\\]|\\\\.)*)'`))?.[1] ?? ''
  return { id, name: pick('name') || id, hook: pick('hook'), s: pick('s'), grade: pick('grade'), book: pick('book'), n: line.match(/\bn: (\d+)/)?.[1] }
}
const all = fs.readdirSync(path.join(root, 'labs')).filter(d => fs.existsSync(path.join(root, 'labs', d, 'index.html')))
const want = process.argv.slice(2)
for (const w of want) if (!all.includes(w)) { console.error(`没有这间实验室：${w}`); process.exit(1) }
const labs = (want.length ? want : all).map(meta)

// ---------- 把写死的 /assets/… 路径换成文件内容本身 ----------
const inlineAssets = () => ({
  name: 'gewu-offline-assets',
  enforce: 'pre',
  transform(code, id) {
    if (!/\/src\/.*\.(ts|tsx)$/.test(id.split('?')[0]) || !code.includes('/assets/')) return null
    return code.replace(/(['"])\/assets\/([\w./-]+)\1/g, (m, q, rel) => {
      const file = path.join(root, 'public/assets', rel)
      if (!fs.existsSync(file)) throw new Error(`${id} 引用的素材不存在：/assets/${rel}`)
      return `${q}data:${MIME[path.extname(file)] ?? 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}${q}`
    })
  },
})

async function buildOne(lab) {
  fs.rmSync(tmp, { recursive: true, force: true })
  process.env.VITE_GEWU_HOME = './index.html'
  await build({
    root, configFile: false, base: './', logLevel: 'warn', publicDir: false,
    plugins: [inlineAssets(), react(), tailwindcss()],
    resolve: { alias: { '@': path.join(root, 'src') } },
    build: {
      outDir: tmp, emptyOutDir: true, modulePreload: false, cssCodeSplit: false, chunkSizeWarningLimit: 1e9,
      assetsInlineLimit: () => true,                                    // 字体等一律写进文件
      rollupOptions: { input: path.join(root, 'labs', lab.id, 'index.html'), output: { codeSplitting: false } },
    },
  })
  // 入口页里把脚本和样式的引用换成内容本身
  let html = fs.readFileSync(path.join(tmp, 'labs', lab.id, 'index.html'), 'utf8')
  const read = href => fs.readFileSync(path.resolve(tmp, 'labs', lab.id, href), 'utf8')
  html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (m, href) => `<style>${read(href)}</style>`)
  html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (m, src) => `<script type="module">${read(src).replace(/<\/script/gi, '<\\/script')}</script>`)
  const left = html.match(/(?:src|href)="\.{1,2}\/[^"]+"/g)
  if (left) throw new Error(`${lab.id}：还有没写进文件的引用 ${left.join(' ')}`)
  const extra = fs.readdirSync(path.join(tmp, 'assets'), { withFileTypes: true }).filter(f => f.isFile() && !/\.(js|css)$/.test(f.name)).map(f => f.name)
  if (extra.length) throw new Error(`${lab.id}：有素材没有写进文件 ${extra.join(' ')}`)
  return Buffer.from(html)
}

// ---------- 包里的目录页 ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const indexPage = (title, list) => Buffer.from(`<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · 格物实验室（离线版）</title>
<style>
  body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#1f1f1e;background:#fbfbfa}
  main{max-width:860px;margin:0 auto;padding:48px 24px 80px}
  h1{margin:0;font-size:30px} p.sub{margin:6px 0 28px;color:#73726e}
  ul{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
  a{display:block;padding:16px 18px;border:1px solid #e6e5e0;border-radius:12px;background:#fff;color:inherit;text-decoration:none}
  a:hover{box-shadow:0 6px 20px rgb(15 15 15 / .08)} b{display:block;font-size:18px} small{display:block;margin-top:4px;color:#73726e;font-size:13.5px}
  i{display:inline-block;margin-top:10px;padding:1px 8px;border-radius:5px;background:#eef3f1;color:#0b6b62;font-style:normal;font-size:12.5px}
  footer{margin-top:36px;color:#8a8984;font-size:13.5px}
</style></head><body><main>
<h1>${esc(title)}</h1><p class="sub">格物实验室 · 离线版。点开一间就能用，不需要联网。</p>
<ul>${list.map(l => `<li><a href="./${l.id}.html"><b>${esc(l.name)}</b><small>${esc(l.hook)}</small><i>${esc([SUBJECTS[l.s], l.grade, l.book, l.n ? `${l.n} 课` : ''].filter(Boolean).join(' · '))}</i></a></li>`).join('')}</ul>
<footer>请用新一些的 Chrome、Edge 或 Safari 打开。做到哪一步会记在这台电脑的浏览器里。<br>格物实验室是开源项目（AGPL-3.0）：github.com/RimikoChu/gewulab</footer>
</main></body></html>`)
const README = Buffer.from(`格物实验室 · 离线版

怎么用
  1. 把这个压缩包完整解压出来（不要在压缩包里直接双击）。
  2. 双击 index.html，在目录里点开要用的实验室；也可以直接双击某一间的 .html 文件。
  3. 全程不需要联网，可以拷到 U 盘或教室的电脑上用。

浏览器
  请用新一些的 Chrome、Edge 或 Safari。IE 和很旧的浏览器打不开。
  画面是三维的，需要电脑的显卡能正常工作；如果打开是一片空白，换一个浏览器试试。

上课时
  每一课右上角有“自动演示”，按一下会自己把这一课从头走到结论。

许可
  开源项目，AGPL-3.0。源码和最新版本：https://github.com/RimikoChu/gewulab
`.replace(/\n/g, '\r\n'))

// ---------- 压缩包（标准 ZIP，文件名都用英文，免得在不同系统上乱码） ----------
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function zip(files) {
  const local = [], central = []; let offset = 0
  for (const { name, data } of files) {
    const nm = Buffer.from(name), z = zlib.deflateRawSync(data, { level: 9 }), crc = crc32(data)
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt32LE(0x00210000, 10)
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(z.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26)
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt32LE(0x00210000, 12)
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(z.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(offset, 42)
    local.push(h, nm, z); central.push(c, nm); offset += 30 + nm.length + z.length
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, cd, end])
}

// ---------- 开始 ----------
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true })
const pages = {}
for (const lab of labs) {
  process.stdout.write(`打包 ${lab.id}（${lab.name}）… `)
  pages[lab.id] = await buildOne(lab)
  console.log(`${(pages[lab.id].length / 1048576).toFixed(1)} MB`)
}
fs.rmSync(tmp, { recursive: true, force: true })
const pack = (file, title, list) => {
  const data = zip([{ name: 'index.html', data: indexPage(title, list) }, { name: 'README.txt', data: README }, ...list.map(l => ({ name: `${l.id}.html`, data: pages[l.id] }))])
  fs.writeFileSync(path.join(out, file), data); return { file, title, labs: list.map(l => l.id), size: data.length }
}
const made = labs.map(l => pack(`gewulab-${l.id}.zip`, l.name, [l]))
if (!want.length) {
  for (const [s, zh] of Object.entries(SUBJECTS)) { const list = labs.filter(l => l.s === s); if (list.length) made.push(pack(`gewulab-${s}.zip`, `${zh}实验室`, list)) }
  made.push(pack('gewulab-all.zip', '全部实验室', labs))
}
fs.writeFileSync(path.join(out, 'packs.json'), JSON.stringify(made, null, 2))
console.log('\n' + made.map(m => `${m.file.padEnd(26)} ${(m.size / 1048576).toFixed(1).padStart(5)} MB  ${m.title}`).join('\n') + `\n\n都在 ${path.relative(root, out)}/ 里。`)
