import { type ReactNode } from 'react'

interface HeroProps {
  image: 'stadium' | 'trophy' | 'ball' | 'pitch' | 'crowd'
  height?: 'sm' | 'md' | 'lg'
  overlay?: 'green' | 'amber' | 'dark' | 'blue'
  children: ReactNode
}

// High-res football images from Unsplash (free, hotlinked)
const IMAGES: Record<HeroProps['image'], string> = {
  stadium: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=1200&q=80&auto=format',  // Wembley stadium night
  trophy:  'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80&auto=format',    // Trophy / celebration
  ball:    'https://images.unsplash.com/photo-1614632537190-23e4146777db?w=1200&q=80&auto=format', // Soccer ball close-up
  pitch:   'https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1200&q=80&auto=format', // Pitch from above
  crowd:   'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80&auto=format', // Stadium crowd
}

const OVERLAYS: Record<NonNullable<HeroProps['overlay']>, string> = {
  green: 'bg-gradient-to-br from-emerald-900/95 via-green-800/85 to-emerald-950/95',
  amber: 'bg-gradient-to-br from-amber-900/95 via-orange-800/85 to-red-950/95',
  dark:  'bg-gradient-to-br from-slate-900/95 via-slate-800/85 to-slate-950/95',
  blue:  'bg-gradient-to-br from-blue-900/95 via-indigo-800/85 to-slate-950/95',
}

const HEIGHTS: Record<NonNullable<HeroProps['height']>, string> = {
  sm: 'min-h-[140px]',
  md: 'min-h-[180px]',
  lg: 'min-h-[240px]',
}

export default function Hero({
  image,
  height = 'md',
  overlay = 'green',
  children,
}: HeroProps) {
  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 ${HEIGHTS[height]} animate-fade-in-up`}>
      {/* Background image */}
      <img
        src={IMAGES[image]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />

      {/* Color overlay */}
      <div className={`absolute inset-0 ${OVERLAYS[overlay]}`} />

      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 40%),
                            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0%, transparent 40%)`,
        }}
      />

      {/* Animated soccer balls */}
      <div className="absolute top-4 left-6 text-3xl opacity-20 animate-spin-slow">⚽</div>
      <div className="absolute bottom-6 left-12 text-2xl opacity-15 animate-float">⚽</div>

      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Content */}
      <div className="relative h-full p-5 text-white flex flex-col">
        {children}
      </div>
    </div>
  )
}
