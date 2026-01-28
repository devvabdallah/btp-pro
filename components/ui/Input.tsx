import { InputHTMLAttributes, LabelHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  labelProps?: LabelHTMLAttributes<HTMLLabelElement>
  error?: string
}

export default function Input({
  label,
  labelProps,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      <label
        {...labelProps}
        className={`block text-sm font-medium text-gray-300 mb-2 ${labelProps?.className || ''}`}
      >
        {label}
      </label>
      <input
        className={`w-full px-4 py-3 bg-[#1a1f3a] border border-gray-600 rounded-2xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}

