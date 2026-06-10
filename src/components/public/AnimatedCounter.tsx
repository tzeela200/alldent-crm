import { useEffect, useRef, useState } from 'react'

interface Props {
  target: number
  duration?: number
  format?: (n: number) => string
  className?: string
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export default function AnimatedCounter({ target, duration = 1600, format, className = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || triggered) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setTriggered(true)
            io.disconnect()
            return
          }
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [triggered])

  useEffect(() => {
    if (!triggered) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = easeOutExpo(t)
      setValue(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [triggered, target, duration])

  const display = format ? format(value) : value.toLocaleString('en-US')

  return <span ref={ref} className={className}>{display}</span>
}
