import { type HTMLAttributes, type ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  title?: string
  subtitle?: string
  headerActions?: ReactNode
}

export function Card({ children, title, subtitle, headerActions, className = '', ...props }: CardProps) {
  return (
    <div className={`card-panel ${className}`} {...props}>
      {title || subtitle || headerActions ? (
        <div className="card-header">
          <div>
            {title ? <h3 className="card-title">{title}</h3> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          {headerActions ? <div className="card-actions">{headerActions}</div> : null}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </div>
  )
}
