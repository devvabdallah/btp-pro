import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 md:w-12 md:h-12',
    lg: 'w-16 h-16 md:w-20 md:h-20',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl md:text-3xl',
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Fallback statique - sera remplacé par Image si logo existe */}
        <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
          <span className={`${textSizeClasses[size]} font-bold text-[#0a0e27]`}>B</span>
        </div>
      </div>
      {showText && (
        <h1 className={`${textSizeClasses[size]} font-bold text-white`}>BTP PRO</h1>
      )}
    </div>
  )
}

