interface LoadingSkeletonProps {
  type?: 'line' | 'card' | 'list'
  count?: number
  height?: string
}

export function LoadingSkeleton({ type = 'line', count = 1, height }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="skeleton-card">
            <div className="skeleton-line skeleton-title" style={{ width: '40%' }}></div>
            <div className="skeleton-line" style={{ width: '85%' }}></div>
            <div className="skeleton-line" style={{ width: '60%' }}></div>
          </div>
        )
      case 'list':
        return (
          <div className="skeleton-list">
            {Array.from({ length: count }).map((_, idx) => (
              <div key={idx} className="skeleton-list-item">
                <div className="skeleton-circle"></div>
                <div className="skeleton-list-content">
                  <div className="skeleton-line" style={{ width: '70%', height: '14px' }}></div>
                  <div className="skeleton-line" style={{ width: '40%', height: '10px', marginTop: '6px' }}></div>
                </div>
              </div>
            ))}
          </div>
        )
      case 'line':
      default:
        return (
          <div className="skeleton-lines">
            {Array.from({ length: count }).map((_, idx) => (
              <div
                key={idx}
                className="skeleton-line"
                style={{ height: height || '16px', width: idx === count - 1 && count > 1 ? '60%' : '100%' }}
              ></div>
            ))}
          </div>
        )
    }
  }

  return <div className="skeleton-container">{renderSkeleton()}</div>
}
