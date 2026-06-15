import { useState, useEffect, CSSProperties } from 'react'

interface TextCascadeProps {
  /** The text to animate character-by-character */
  text: string
  /** Main reveal color */
  color: string
  /** Accent color at sweep edge (defaults to semi-transparent color) */
  accent?: string
  /** Milliseconds between each character reveal */
  stagger?: number
  /** Duration in ms for the gradient sweep */
  duration?: number
  className?: string
  style?: CSSProperties
}

/**
 * TextCascade — replicates Framer's TextIlluminate component.
 * Each character reveals via a bottom-to-top gradient sweep with a glow flash.
 * Pure React + CSS transitions, no Framer-specific APIs.
 */
export function TextCascade({
  text,
  color,
  accent,
  stagger = 65,
  duration = 700,
  className,
  style,
}: TextCascadeProps) {
  const chars = [...text]
  const accentColor = accent ?? `${color}99`

  const [litSet, setLitSet] = useState<Set<number>>(new Set())
  const [glowSet, setGlowSet] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLitSet(new Set())
    setGlowSet(new Set())

    const timers: ReturnType<typeof setTimeout>[] = []
    let nonSpaceIdx = 0

    chars.forEach((ch, i) => {
      if (ch === ' ') return
      const delay = nonSpaceIdx * stagger
      nonSpaceIdx++

      timers.push(
        setTimeout(() => {
          setLitSet(prev => new Set([...prev, i]))
          setGlowSet(prev => new Set([...prev, i]))

          // Remove glow after flash
          timers.push(
            setTimeout(() => {
              setGlowSet(prev => {
                const s = new Set(prev)
                s.delete(i)
                return s
              })
            }, duration + 500)
          )
        }, delay)
      )
    })

    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, color, stagger, duration])

  return (
    <span className={className} style={{ display: 'inline-flex', ...style }}>
      {chars.map((ch, i) => {
        if (ch === ' ') {
          return (
            <span key={i} style={{ display: 'inline-block', width: '0.25em' }} />
          )
        }

        const lit = litSet.has(i)
        const glow = glowSet.has(i)
        const dur = `${duration}ms`

        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Ghost — barely visible placeholder so layout doesn't shift */}
            <span aria-hidden style={{ color, opacity: 0.07 }}>{ch}</span>

            {/* Gradient sweep reveal */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                background: `linear-gradient(
                  180deg,
                  ${color}    0%,
                  ${color}    28%,
                  ${accentColor} 50%,
                  transparent 70%,
                  transparent 100%
                )`,
                backgroundSize: '100% 300%',
                backgroundPosition: lit ? '0% 0%' : '0% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                transition: `background-position ${dur} cubic-bezier(0.2, 1, 0.3, 1)`,
              }}
            >
              {ch}
            </span>

            {/* Glow layer — flashes then settles to a soft glow */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                color,
                opacity: glow ? 0.55 : lit ? 0.18 : 0,
                textShadow: glow
                  ? `0 0 16px ${color}, 0 0 28px ${color}88`
                  : lit
                  ? `0 0 10px ${color}66`
                  : 'none',
                transition: 'opacity 0.4s ease, text-shadow 0.4s ease',
                pointerEvents: 'none',
              }}
            >
              {ch}
            </span>
          </span>
        )
      })}
    </span>
  )
}
