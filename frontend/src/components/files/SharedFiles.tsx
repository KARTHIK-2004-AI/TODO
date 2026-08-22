import { useEffect, useMemo, useState } from 'react'
import type { TaskAttachment } from '../../types'
import { downloadAttachment, deleteAttachment } from '../../api'

interface SharedFilesProps {
  attachments: Array<TaskAttachment & { taskTitle: string; taskId: string }>
  onReload: () => void
}

export function FilePreview({ attachmentId, fileType }: { attachmentId: string; fileType: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const isImage = fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(fileType)
    if (!isImage) return

    setLoading(true)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
    
    fetch(`/api/attachments/${attachmentId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Preview load failed')
        return res.blob()
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [attachmentId, fileType])

  const isPdf = fileType.toLowerCase().includes('pdf') || /\.(pdf)$/i.test(fileType)

  if (loading) {
    return <div className="file-preview-placeholder animate-pulse">Loading...</div>
  }

  if (src) {
    return <img src={src} alt="Preview" className="file-preview-media" />
  }

  if (isPdf) {
    return (
      <div className="file-preview-placeholder pdf-preview flex flex-col items-center justify-center">
        <span className="text-3xl">📕</span>
        <span className="text-xs font-semibold mt-1">PDF</span>
      </div>
    )
  }

  return (
    <div className="file-preview-placeholder flex flex-col items-center justify-center">
      <span className="text-3xl">📄</span>
      <span className="text-xs font-semibold mt-1">FILE</span>
    </div>
  )
}

export function SharedFiles({ attachments, onReload }: SharedFilesProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // 1. Calculate Storage Stats (Max 100MB limit for demo)
  const storageLimit = 100 * 1024 * 1024 // 100 MB
  const totalSize = useMemo(() => {
    return attachments.reduce((acc, att) => acc + att.fileSize, 0)
  }, [attachments])

  const storagePercentage = Math.min(100, (totalSize / storageLimit) * 100)

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 2. Group files by name to build version history
  const groupedFiles = useMemo(() => {
    const groups: Record<string, Array<TaskAttachment & { taskTitle: string; taskId: string }>> = {}
    
    // Sort all attachments by date descending (newest first)
    const sorted = [...attachments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    sorted.forEach((file) => {
      const key = file.fileName.toLowerCase()
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(file)
    })

    return Object.values(groups)
  }, [attachments])

  const handleDownload = async (id: string, name: string) => {
    try {
      await downloadAttachment(id, name)
    } catch (err) {
      alert('Failed to download file: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    setDeletingId(id)
    try {
      await deleteAttachment(id)
      onReload()
    } catch (err) {
      alert('Failed to delete file: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDeletingId(null)
    }
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="shared-files-tab panel flex-col w-full h-[550px] overflow-hidden animated-fade-in">
      {/* Storage meter */}
      <div className="storage-meter-section border-b border-divider pb-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3>Shared Files & Storage</h3>
            <p className="eyebrow">Workspace file storage metrics</p>
          </div>
          <span className="text-sm font-semibold text-accent">
            {formatSize(totalSize)} of {formatSize(storageLimit)} used
          </span>
        </div>
        <div className="w-full bg-background h-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${storagePercentage}%`,
              background: storagePercentage > 85 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #6366f1, #a855f7)',
            }}
          ></div>
        </div>
      </div>

      {/* Files list */}
      <div className="files-list-container flex-grow overflow-y-auto pr-2 space-y-4">
        {groupedFiles.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <span className="text-5xl">📁</span>
            <p className="mt-3 text-secondary">No files shared in this workspace yet.</p>
          </div>
        )}

        {groupedFiles.map((versions) => {
          const latest = versions[0]
          const hasHistory = versions.length > 1
          const groupKey = latest.fileName.toLowerCase()
          const isExpanded = !!expandedGroups[groupKey]

          return (
            <div key={latest.id} className="file-row-card bg-card border border-divider rounded-xl overflow-hidden p-4 hover:shadow-sm transition-all">
              <div className="flex gap-4">
                {/* Visual Preview */}
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-divider bg-background flex-shrink-0 flex items-center justify-center">
                  <FilePreview attachmentId={latest.id} fileType={latest.fileType} />
                </div>

                {/* Details */}
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground break-all">{latest.fileName}</h4>
                    <p className="text-xs text-secondary mt-0.5 font-medium">
                      Task: <strong className="text-accent">{latest.taskTitle}</strong> · Size: {formatSize(latest.fileSize)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-secondary mt-2">
                    <span>Uploaded by: {latest.uploader?.name || 'Unknown'}</span>
                    <span>·</span>
                    <span>{new Date(latest.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 justify-center flex-shrink-0">
                  <button className="btn-primary py-1 px-3 text-xs rounded-lg" onClick={() => void handleDownload(latest.id, latest.fileName)}>
                    Download
                  </button>
                  <button
                    className="btn-danger py-1 px-3 text-xs rounded-lg secondary"
                    disabled={deletingId === latest.id}
                    onClick={() => void handleDelete(latest.id)}
                  >
                    {deletingId === latest.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Version History Toggle */}
              {hasHistory && (
                <div className="version-history-section mt-3 pt-3 border-t border-divider">
                  <button className="flex items-center gap-1.5 text-xs text-accent font-semibold" onClick={() => toggleGroup(groupKey)}>
                    <span>{isExpanded ? '▼ Hide version history' : `▶ Show version history (${versions.length - 1} older versions)`}</span>
                  </button>

                  {isExpanded && (
                    <ul className="version-history-list mt-2 pl-4 space-y-2 border-l-2 border-divider">
                      {versions.slice(1).map((oldVer) => (
                        <li key={oldVer.id} className="flex justify-between items-center text-xs py-1.5 text-secondary">
                          <div>
                            <span className="font-medium text-foreground">{oldVer.fileName}</span>
                            <span className="ml-2 font-mono text-[10px] bg-background border border-divider px-1.5 py-0.5 rounded">
                              v{new Date(oldVer.createdAt).toLocaleDateString()}
                            </span>
                            <span className="ml-2">({formatSize(oldVer.fileSize)})</span>
                          </div>
                          <div className="flex gap-2">
                            <button className="link-btn font-semibold text-accent" onClick={() => void handleDownload(oldVer.id, oldVer.fileName)}>
                              Download
                            </button>
                            <button
                              className="link-btn font-semibold text-danger"
                              disabled={deletingId === oldVer.id}
                              onClick={() => void handleDelete(oldVer.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
