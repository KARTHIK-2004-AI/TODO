import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary'
      case 'secondary':
        return 'btn-secondary'
      case 'danger':
        return 'btn-danger'
      case 'ghost':
        return 'btn-ghost'
      case 'link':
        return 'btn-link'
      default:
        return 'btn-primary'
    }
  }

  const getSizeClass = () => {
    switch (size) {
      case 'xs':
        return 'btn-xs'
      case 'sm':
        return 'btn-sm'
      case 'md':
        return 'btn-md'
      case 'lg':
        return 'btn-lg'
      default:
        return 'btn-md'
    }
  }

  return (
    <button
      className={`btn ${getVariantClass()} ${getSizeClass()} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="btn-spinner" aria-hidden="true">
          ⌛
        </span>
      ) : null}
      <span className={isLoading ? 'btn-content-loading' : ''}>{children}</span>
    </button>
  )
}
