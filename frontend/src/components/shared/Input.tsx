import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

interface BaseInputProps {
  label?: string
  error?: string
  helperText?: string
  multiline?: boolean
  rows?: number
}

type InputProps = BaseInputProps &
  InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>

export const Input = forwardRef<HTMLInputElement & HTMLTextAreaElement, InputProps>(
  ({ label, error, helperText, multiline = false, rows = 3, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    const fieldClassName = `form-field ${error ? 'field-error' : ''} ${className}`

    return (
      <div className="input-group">
        {label ? (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        ) : null}

        {multiline ? (
          <textarea
            id={inputId}
            ref={ref as any}
            rows={rows}
            className={fieldClassName}
            {...(props as any)}
          />
        ) : (
          <input
            id={inputId}
            ref={ref as any}
            className={fieldClassName}
            {...(props as any)}
          />
        )}

        {error ? (
          <p className="field-error-message" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p className="field-helper-message">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
