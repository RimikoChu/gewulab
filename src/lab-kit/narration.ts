// 自动演示的解说：每课写一份解说词，用脚本合成男声录音，自动演示时一句一句放。
//
// 解说词写在各实验室的 narration.ts 里，按课号分：
//   intro：开始演示时先说的话（这一课要做什么）
//   steps：键是提示语（hint）的原文，提示语换成这一句时，解说员就说对应的话；说完才替学生按下一步
//   outro：结论卡弹出时说的话
// 录音用 `npm run voice -- <实验室>` 生成，放在 public/assets/voice/<实验室>/，
// 同时生成 voice.ts（解说词原文 → 录音地址）。改了解说词要重新跑一次。

export interface Script { intro?: string; steps?: Record<string, string>; outro?: string }
/** 交给 LabShell 的解说：和 Script 同样的结构，值换成录音地址 */
export type Narration = Script

/** 把解说词换成录音地址；没有录音的句子去掉（演示照常进行，只是不出声） */
export function voiced(s: Script | undefined, voice: Record<string, string>): Narration | undefined {
  if (!s) return undefined
  const v = (t?: string) => (t ? voice[t] : undefined)
  const steps: Record<string, string> = {}
  for (const [hint, t] of Object.entries(s.steps ?? {})) { const u = v(t); if (u) steps[hint] = u }
  return { intro: v(s.intro), steps, outro: v(s.outro) }
}
