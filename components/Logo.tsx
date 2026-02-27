'use client'

import { useState } from 'react'
import Image from 'next/image'
import { APP_NAME } from '@/lib/app-config'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-10 h-10 md:w-12 md:h-12',
  }

  const imageSizes = {
    sm: 32,
    md: 40,
    lg: 48,
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl md:text-3xl',
  }

  const fallbackTextSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl md:text-2xl',
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} relative flex-shrink-0 rounded-xl`}>
        {imageError ? (
          <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
            <span className={`${fallbackTextSize[size]} font-bold text-[#0a0e27]`}>B</span>
          </div>
        ) : (
          <Image
            src="/brand/logo.png"
            alt={APP_NAME}
            width={imageSizes[size]}
            height={imageSizes[size]}
            className="w-full h-full object-contain rounded-xl"
            quality={100}
            priority
            onError={() => setImageError(true)}
          />
        )}
      </div>
      {showText && (
        <h1 className={`${textSizeClasses[size]} font-bold text-white`}>{APP_NAME}</h1>
      )}
    </div>
  )
}

