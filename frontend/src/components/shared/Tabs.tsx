interface TabOption {
  id: string
  label: string
  icon?: string
  badge?: number | string
}

interface TabsProps {
  options: TabOption[]
  activeId: string
  onChange: (id: any) => void
  className?: string
}

export function Tabs({ options, activeId, onChange, className = '' }: TabsProps) {
  return (
    <div className={`tabs-list ${className}`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`tab-btn ${activeId === option.id ? 'active' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.icon ? <span className="tab-icon">{option.icon}</span> : null}
          <span className="tab-label">{option.label}</span>
          {option.badge ? (
            <span className="tab-badge">{option.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
