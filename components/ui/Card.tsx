import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-[#1a1f3a] rounded-3xl p-6 border border-[#2a2f4a] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

