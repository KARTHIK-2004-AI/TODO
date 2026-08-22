import { type HTMLAttributes, type ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'badge-primary'
      case 'secondary':
        return 'badge-secondary'
      case 'success':
        return 'badge-success'
      case 'warning':
        return 'badge-warning'
      case 'danger':
        return 'badge-danger'
      case 'info':
        return 'badge-info'
      case 'neutral':
        return 'badge-neutral'
      default:
        return 'badge-neutral'
    }
  }

  return (
    <span className={`badge ${getVariantClass()} ${className}`} {...props}>
      {children}
    </span>
  )
}
