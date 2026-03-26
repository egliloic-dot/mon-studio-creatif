import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface UndoRedoBarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onJumpTo: (stepsBack: number) => void
  pastSnapshots: (string | null)[]
  currentSnapshot: string | null
  pastCount: number
}

export function UndoRedoBar({
  canUndo, canRedo, onUndo, onRedo,
  onJumpTo, pastSnapshots, currentSnapshot, pastCount,
}: UndoRedoBarProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!historyOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setHistoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [historyOpen])

  // Build entries: current state (index 0) + past states newest-first
  const entries: { label: string; snapshot: string | null; stepsBack: number }[] = [
    { label: 'État actuel', snapshot: currentSnapshot, stepsBack: 0 },
    ...[...pastSnapshots].reverse().map((snap, i) => ({
      label: `Il y a ${i + 1} action${i > 0 ? 's' : ''}`,
      snapshot: snap,
      stepsBack: i + 1,
    })),
  ]

  const hasHistory = pastCount > 0

  return (
    <div ref={dropdownRef} style={{ position: 'fixed', top: 16, left: 76, zIndex: 25 }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-0.5 p-1 rounded-xl"
        style={{
          background: 'rgba(12,12,14,0.84)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 2px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Undo */}
        <BarButton
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M3 13C5.333 8.667 9 6 13 6c4.667 0 8 3.333 8 8s-3.333 8-8 8c-2.667 0-5-.667-6-2" />
            </svg>
          }
        />

        {/* History toggle */}
        <BarButton
          onClick={() => setHistoryOpen(v => !v)}
          disabled={!hasHistory}
          title="Historique des actions"
          active={historyOpen}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          }
        />

        {/* Redo */}
        <BarButton
          onClick={onRedo}
          disabled={!canRedo}
          title="Rétablir (Ctrl+Shift+Z)"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M21 13C18.667 8.667 15 6 11 6c-4.667 0-8 3.333-8 8s3.333 8 8 8c2.667 0 5-.667 6-2" />
            </svg>
          }
        />
      </motion.div>

      {/* History dropdown */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div
            key="history-panel"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: 220,
              maxHeight: 340,
              overflowY: 'auto',
              background: 'rgba(14,14,18,0.96)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14,
              boxShadow: '0 8px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
              padding: '6px',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '6px 8px 8px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 6,
            }}>
              Historique — {pastCount} action{pastCount !== 1 ? 's' : ''}
            </div>

            {entries.map((entry, idx) => (
              <HistoryEntry
                key={idx}
                label={entry.label}
                snapshot={entry.snapshot}
                isCurrent={idx === 0}
                onClick={() => {
                  if (entry.stepsBack > 0) {
                    onJumpTo(entry.stepsBack)
                    setHistoryOpen(false)
                  }
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── BarButton ─────────────────────────────────────────────── */

function BarButton({
  onClick, disabled, title, icon, active = false,
}: {
  onClick: () => void
  disabled: boolean
  title: string
  icon: React.ReactNode
  active?: boolean
}) {
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.9 }}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled
          ? 'rgba(255,255,255,0.15)'
          : active
          ? 'rgba(167,139,250,0.9)'
          : 'rgba(255,255,255,0.55)',
        transition: 'color 0.15s ease, background 0.15s ease',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          ;(e.currentTarget as HTMLElement).style.color = active
            ? 'rgba(167,139,250,1)'
            : 'rgba(255,255,255,0.9)'
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.12)'
        }
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.color = disabled
          ? 'rgba(255,255,255,0.15)'
          : active
          ? 'rgba(167,139,250,0.9)'
          : 'rgba(255,255,255,0.55)'
        ;(e.currentTarget as HTMLElement).style.background = active
          ? 'rgba(124,58,237,0.18)'
          : 'transparent'
      }}
    >
      {icon}
    </motion.button>
  )
}

/* ─── HistoryEntry ──────────────────────────────────────────── */

function HistoryEntry({
  label, snapshot, isCurrent, onClick,
}: {
  label: string
  snapshot: string | null
  isCurrent: boolean
  onClick: () => void
}) {
  const [hov, setHov] = useState(false)

  return (
    <div
      onClick={isCurrent ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 8px',
        borderRadius: 8,
        cursor: isCurrent ? 'default' : 'pointer',
        background: isCurrent
          ? 'rgba(124,58,237,0.14)'
          : hov
          ? 'rgba(255,255,255,0.06)'
          : 'transparent',
        transition: 'background 0.12s ease',
        border: isCurrent ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 56, height: 36, flexShrink: 0,
        borderRadius: 5,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#1a1a1e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {snapshot ? (
          <img
            src={snapshot}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          /* Checkerboard placeholder */
          <div style={{
            width: '100%', height: '100%',
            backgroundImage:
              'linear-gradient(45deg, #222 25%, transparent 25%),' +
              'linear-gradient(-45deg, #222 25%, transparent 25%),' +
              'linear-gradient(45deg, transparent 75%, #222 75%),' +
              'linear-gradient(-45deg, transparent 75%, #222 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
            opacity: 0.5,
          }} />
        )}
      </div>

      {/* Label */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: isCurrent ? 700 : 500,
          color: isCurrent ? 'rgba(167,139,250,0.95)' : 'rgba(255,255,255,0.7)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label}
        </p>
        {isCurrent && (
          <span style={{
            display: 'inline-block', marginTop: 2,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: 'rgba(124,58,237,0.35)',
            color: 'rgba(167,139,250,0.9)',
            borderRadius: 3, padding: '1px 5px',
          }}>
            Actuel
          </span>
        )}
      </div>
    </div>
  )
}
