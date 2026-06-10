import { useRef, type ReactNode, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react'

interface CommonProps {
  children: ReactNode
  className?: string
  strength?: number
}

type Props =
  | (CommonProps & { as: 'a' } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | (CommonProps & { as?: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>)

export default function MagneticButton(props: Props) {
  const { children, className = '', strength = 0.25 } = props
  const ref = useRef<HTMLElement | null>(null)

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * strength
    const y = (e.clientY - rect.top - rect.height / 2) * strength
    el.style.transform = `translate(${x}px, ${y}px)`
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'translate(0, 0)'
  }

  if (props.as === 'a') {
    const { as, strength: _s, children: _c, className: _cn, ...rest } = props
    void as; void _s; void _c; void _cn
    return (
      <a
        {...rest}
        ref={ref as React.RefObject<HTMLAnchorElement>}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={`magnetic ${className}`}
      >
        {children}
      </a>
    )
  }

  const { strength: _s2, children: _c2, className: _cn2, as: _as2, ...rest } = props as CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' }
  void _s2; void _c2; void _cn2; void _as2
  return (
    <button
      {...rest}
      ref={ref as React.RefObject<HTMLButtonElement>}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`magnetic ${className}`}
    >
      {children}
    </button>
  )
}
