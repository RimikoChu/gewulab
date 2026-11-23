// 给自动演示的解说词合成录音（男声）。
// 用法：npm run voice -- <实验室目录名>
// 读 src/labs/<名字>/narration.ts，每句合成一个 mp3 放进 public/assets/voice/<名字>/，
// 再写出 src/labs/<名字>/voice.ts（解说词原文 → 录音地址）。已经有的录音不重复合成，不再用到的录音删掉。
// 合成用 MiniMax 语音合成；密钥从环境变量 MINIMAX_API_KEY 读，或者用 MINIMAX_ENV 指向一个写着 MINIMAX_API_KEY=… 的文件。密钥不要放进仓库。
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const VOICE_ID = 'Chinese (Mandarin)_Male_Announcer'   // 男播音员
const SPEED = 1                                         // 语速：1 是正常
const KBPS = 32000                                      // 人声 32 kbps 足够清楚，录音会打进离线包，越小越好
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const lab = process.argv[2]
if (!lab) { console.error('用法：npm run voice -- <实验室目录名>'); process.exit(1) }
const src = path.join(root, 'src/labs', lab, 'narration.ts')
if (!fs.existsSync(src)) { console.error(`没有 ${path.relative(root, src)}`); process.exit(1) }

let key = process.env.MINIMAX_API_KEY
if (!key && process.env.MINIMAX_ENV) key = fs.readFileSync(process.env.MINIMAX_ENV, 'utf8').match(/^MINIMAX_API_KEY=(.*)$/m)?.[1]?.trim()
if (!key) { console.error('缺少密钥：设置 MINIMAX_API_KEY，或用 MINIMAX_ENV 指向写着密钥的文件'); process.exit(1) }

async function tts(text) {
  const res = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'speech-02-hd', text, stream: false, voice_setting: { voice_id: VOICE_ID, speed: SPEED, vol: 1, pitch: 0 }, audio_setting: { sample_rate: 24000, bitrate: KBPS, format: 'mp3', channel: 1 } }),
  })
  const j = await res.json().catch(() => ({}))
  if (!j?.data?.audio) throw new Error(`合成失败：${res.status} ${j?.base_resp?.status_code ?? ''} ${j?.base_resp?.status_msg ?? ''}`)
  return Buffer.from(j.data.audio, 'hex')
}

const { NARRATION } = await import(pathToFileURL(src).href)
const texts = new Set()
for (const s of Object.values(NARRATION)) { if (s.intro) texts.add(s.intro); for (const t of Object.values(s.steps ?? {})) texts.add(t); if (s.outro) texts.add(s.outro) }

const dir = path.join(root, 'public/assets/voice', lab)
fs.mkdirSync(dir, { recursive: true })
const map = {}
let made = 0, bytes = 0
for (const t of texts) {
  const name = crypto.createHash('md5').update(`${VOICE_ID}|${SPEED}|${KBPS}|${t}`).digest('hex').slice(0, 10) + '.mp3'
  const file = path.join(dir, name)
  if (!fs.existsSync(file)) { fs.writeFileSync(file, await tts(t)); made++ }
  bytes += fs.statSync(file).size
  map[t] = `/assets/voice/${lab}/${name}`
}
const keep = new Set(Object.values(map).map(u => path.basename(u)))
for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.rmSync(path.join(dir, f))

const out = ['// 由 scripts/voice.mjs 生成，不要手改。解说词原文 → 录音地址', 'export const VOICE: Record<string, string> = {',
  ...Object.entries(map).map(([t, u]) => `  ${JSON.stringify(t)}: '${u}',`), '}', ''].join('\n')
fs.writeFileSync(path.join(root, 'src/labs', lab, 'voice.ts'), out)
console.log(`${lab}：${texts.size} 句，新合成 ${made} 句，录音共 ${(bytes / 1024).toFixed(0)} KB`)
