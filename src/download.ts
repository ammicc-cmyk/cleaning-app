export function downloadText(name: string, text: string, type: string) {
  const a = document.createElement('a')
  const url = URL.createObjectURL(new Blob([text], { type }))
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
