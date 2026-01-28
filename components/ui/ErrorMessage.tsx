interface ErrorMessageProps {
  message?: string
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div className="mt-2 p-3 bg-red-500/10 border border-red-500/50 rounded-2xl">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  )
}

