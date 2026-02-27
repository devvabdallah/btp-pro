import { InputHTMLAttributes, LabelHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  labelProps?: LabelHTMLAttributes<HTMLLabelElement>
  error?: string
  variant?: 'light' | 'dark'
}

export default function Input({
  label,
  labelProps,
  error,
  className = '',
  variant = 'light',
  ...props
}: InputProps) {
  const isDark = variant === 'dark'
  
  return (
    <div className="w-full">
      {label && (
        <label
          {...labelProps}
          className={`block mb-3 ${isDark 
            ? 'text-sm font-medium tracking-wide text-white/80' 
            : 'text-sm font-medium tracking-wide text-gray-700'
          } ${labelProps?.className || ''}`}
        >
          {label}
        </label>
      )}
      <input
        className={`w-full px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 transition-all text-base ${
          isDark
            ? `bg-[#0f1429] border border-[#2a2f4a] text-white placeholder:text-gray-500 focus:ring-yellow-400 focus:border-transparent ${error ? 'border-red-500' : ''}`
            : `bg-white border-2 text-gray-900 placeholder-gray-400 focus:ring-orange-500 focus:border-orange-500 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`
        } ${className}`}
        {...props}
      />
      {error && (
        <p className={`mt-2 text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </p>
      )}
    </div>
  )
}

