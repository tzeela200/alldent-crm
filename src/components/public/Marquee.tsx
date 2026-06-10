import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  direction?: 'ltr' | 'rtl'
  speed?: 'slow' | 'normal' | 'fast'
  className?: string
}

const SPEED_MAP = {
  slow: '60s',
  normal: '40s',
  fast: '24s',
}

export default function Marquee({ children, direction = 'ltr', speed = 'normal', className = '' }: Props) {
  const animation = direction === 'rtl' ? 'marquee-rtl' : 'marquee'

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <div
        className="marquee-track"
        style={{
          animation: `${animation} ${SPEED_MAP[speed]} linear infinite`,
        }}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0">{children}</div>
      </div>
    </div>
  )
}
