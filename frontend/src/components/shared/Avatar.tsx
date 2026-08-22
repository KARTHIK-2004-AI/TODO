import { useEffect, useState } from 'react'

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

interface AvatarProps {
  src?: string
  name: string
  size?: number
  isOnline?: boolean
}

export function Avatar({ src, name, size = 36, isOnline }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [src])

  const renderImg = src && !imgError

  return (
    <div className="avatar-wrapper" style={{ width: `${size}px`, height: `${size}px`, position: 'relative', flexShrink: 0 }}>
      {renderImg ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="avatar-image"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1.5px solid var(--border)',
          }}
        />
      ) : (
        <div
          className="avatar-fallback"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: '600',
            fontSize: `${Math.max(11, Math.floor(size / 2.3))}px`,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            color: '#ffffff',
            border: '1.5px solid var(--border)',
          }}
        >
          {getInitials(name)}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className="avatar-status-dot"
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: `${Math.max(7, Math.floor(size / 4))}px`,
            height: `${Math.max(7, Math.floor(size / 4))}px`,
            borderRadius: '50%',
            background: isOnline ? 'var(--success)' : 'var(--text-muted)',
            border: '1.5px solid var(--bg-card)',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        />
      )}
    </div>
  )
}
