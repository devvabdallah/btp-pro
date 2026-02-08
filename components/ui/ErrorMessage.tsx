interface ErrorMessageProps {
  message?: string
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div className="mt-2 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
      <p className="text-sm text-red-600 font-medium">{message}</p>
    </div>
  )
}

