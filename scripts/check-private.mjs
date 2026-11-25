// Проверяет всё, что попадёт в git: имена файлов и содержимое индекса.
// Значения найденного не печатает, чтобы секрет не попал в журнал сборки.
import { execFileSync } from 'node:child_process'

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const allowed = /^(\.gitignore|index\.html|package(-lock)?\.json|tsconfig\.json|vite\.config\.ts|(\.github\/workflows|\.githooks|scripts|src|public|tests)\/.+)$/
const badName = /(^|\/)\.env|\.(pem|key|p12|pfx|sqlite\w*|db|log|docx?|xlsx?|pdf)$|secret|credential|handover|mikrouborka-/i
const rules = [
  ['закрытый ключ', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['токен GitHub', /\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_\w{20,}/],
  ['токен Telegram', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/],
  ['ключ API', /\bsk-[A-Za-z0-9_-]{20,}|\bAKIA[0-9A-Z]{16}\b|\bAIza[\w-]{35}/],
  ['пароль или токен в коде', /(password|passwd|api_?key|access_?token|secret)["']?\s*[:=]\s*["'][^"'\s]{6,}["']/i],
  ['email', /[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/i],
  ['российский телефон', /(?<![\w.])(?:\+7|8)[ (-]*\d{3}[ )-]*\d{3}[ -]*\d{2}[ -]*\d{2}(?!\w)/],
  ['личный путь на диске', /[a-z]:[\\/]+Users[\\/]|\/(home|Users)\/\w+\//i],
]

const found = []
for (const f of git('ls-files', '-z').split('\0').filter(Boolean)) {
  if (!allowed.test(f)) found.push(`${f}: файла нет в белом списке`)
  if (badName.test(f)) found.push(`${f}: запрещённое имя`)
  // package-lock генерируется npm (там бывают хеши, похожие на что угодно);
  // этот файл сам содержит шаблоны.
  if (f === 'package-lock.json' || f === 'scripts/check-private.mjs') continue
  git('show', `:${f}`).split('\n').forEach((line, i) => {
    for (const [name, re] of rules) if (re.test(line)) found.push(`${f}:${i + 1}: ${name}`)
  })
}
if (found.length) {
  console.error('Публикация остановлена:\n' + found.join('\n'))
  process.exit(1)
}
console.log('Проверка на конфиденциальные данные пройдена')
