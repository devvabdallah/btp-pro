import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9 md:w-10 md:h-10',
    lg: 'w-12 h-12 md:w-16 md:h-16',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl md:text-3xl',
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
        <Image
          src="/brand/logo.png"
          alt="BTP PRO"
          width={40}
          height={40}
          className="w-full h-full object-contain"
          priority
        />
      </div>
      {showText && (
        <h1 className={`${textSizeClasses[size]} font-bold text-white`}>BTP PRO</h1>
      )}
    </div>
  )
}

