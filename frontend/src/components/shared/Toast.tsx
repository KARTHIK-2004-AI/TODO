import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose?: () => void
  duration?: number
}

export function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className={`toast toast-${type} animated-fade-in`}>
      <span className="toast-icon">{getIcon()}</span>
      <p className="toast-message">{message}</p>
      {onClose ? (
        <button type="button" className="toast-close" onClick={onClose} aria-label="Close message">
          &times;
        </button>
      ) : null}
    </div>
  )
}
