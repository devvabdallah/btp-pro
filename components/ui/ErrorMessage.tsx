interface ErrorMessageProps {
  message?: string
  variant?: 'light' | 'dark'
}

export default function ErrorMessage({ message, variant = 'light' }: ErrorMessageProps) {
  if (!message) return null

  const isDark = variant === 'dark'

  return (
    <div className={`mt-2 p-4 rounded-2xl ${
      isDark
        ? 'bg-red-500/10 border-2 border-red-500/30'
        : 'bg-red-50 border-2 border-red-200'
    }`}>
      <p className={`text-sm font-medium ${
        isDark ? 'text-red-400' : 'text-red-600'
      }`}>{message}</p>
    </div>
  )
}

