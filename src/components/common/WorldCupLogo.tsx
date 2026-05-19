/**
 * Official FIFA World Cup 2026 emblem from Wikimedia Commons (public domain).
 *  - /wc2026-icon.svg  → emblem only (square)
 *  - /wc2026-logo.svg  → emblem + wordmark
 */
interface WorldCupLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon'
  className?: string
}

const SIZES = {
  sm: 'h-7',
  md: 'h-12',
  lg: 'h-20',
  xl: 'h-28',
}

export default function WorldCupLogo({ size = 'md', variant = 'full', className = '' }: WorldCupLogoProps) {
  const src = variant === 'icon' ? '/wc2026-icon.svg' : '/wc2026-logo.svg'

  return (
    <img
      src={src}
      alt="FIFA World Cup 2026"
      className={`${SIZES[size]} w-auto object-contain drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)] ${className}`}
      draggable={false}
    />
  )
}
