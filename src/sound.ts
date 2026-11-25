let ctx: AudioContext | null = null

/** Вызывать из нажатия: иначе браузер не разрешит звук. */
export function prepareSound() {
  try { ctx ??= new AudioContext(); void ctx.resume() } catch { ctx = null }
}
export function playSignal() {
  navigator.vibrate?.([200, 100, 200])
  if (!ctx) return
  void ctx.resume()
  for (const [i, f] of [523, 659, 784].entries()) {
    const at = ctx.currentTime + i * 0.35
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(0.25, at + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.8)
    o.connect(g).connect(ctx.destination)
    o.start(at)
    o.stop(at + 0.85)
  }
}
