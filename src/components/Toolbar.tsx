import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Tool } from '../types/canvas'

/* ── Props ───────────────────────────────────────────────────────── */

interface ToolbarProps {
  activeTool: Tool
  onToolChange: (t: Tool) => void
  onOpenFile: () => void
  onExportOpen: () => void
  onAddShape: (s: 'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'heart') => void
  onAddText: () => void
  onClearAll?: () => void
}

/* ── Static data ─────────────────────────────────────────────────── */

const TOOLS: { id: Tool; label: string; shortcut: string; icon: React.ReactNode }[] = [
  {
    id: 'select', label: 'Sélection', shortcut: 'V',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-7 1-4 7z"/></svg>,
  },
  {
    id: 'crop', label: 'Recadrer', shortcut: 'C',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>,
  },
  {
    id: 'brush', label: 'Pinceau', shortcut: 'B',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19c2.5 0 4-1.5 4-4 0-3-4-8-4-8S8 12 8 15c0 2.5 1.5 4 4 4z"/><path d="M12 19v2"/><path d="M17 3l-9.5 9.5"/><path d="M14 3l3 3"/></svg>,
  },
]

const SHAPES: { type: 'rect'|'circle'|'triangle'|'star'|'arrow'|'heart'; label: string; icon: React.ReactNode }[] = [
  { type: 'rect',     label: 'Rectangle', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg> },
  { type: 'circle',   label: 'Cercle',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/></svg> },
  { type: 'triangle', label: 'Triangle',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L22 20H2L12 3z"/></svg> },
  { type: 'star',     label: 'Étoile',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { type: 'arrow',    label: 'Flèche',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg> },
  { type: 'heart',    label: 'Cœur',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
]

/* ── Tooltip via portal ──────────────────────────────────────────── */

function Tooltip({ label, shortcut, x, y }: { label: string; shortcut?: string; x: number; y: number }) {
  return createPortal(
    <div
      style={{
        position: 'fixed', left: x, top: y, transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', gap: 7,
        background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 9, padding: '5px 10px', whiteSpace: 'nowrap',
        pointerEvents: 'none', zIndex: 9999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.75)',
        fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)',
        letterSpacing: '0.01em',
        animation: 'toolFadeIn 0.12s ease',
      }}
    >
      <div style={{ position: 'absolute', right: '100%', top: '50%', marginTop: -3.5, width: 0, height: 0, borderTop: '3.5px solid transparent', borderBottom: '3.5px solid transparent', borderRight: '5px solid rgba(255,255,255,0.08)' }} />
      {label}
      {shortcut && (
        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.07)', borderRadius: 5, padding: '1px 5px', fontFamily: 'monospace' }}>
          {shortcut}
        </span>
      )}
    </div>,
    document.body
  )
}

/* ── ToolBtn ─────────────────────────────────────────────────────── */

function ToolBtn({ icon, label, shortcut, isActive, onClick }: {
  icon: React.ReactNode; label: string; shortcut?: string; isActive: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      onMouseEnter={() => {
        if (ref.current) {
          const r = ref.current.getBoundingClientRect()
          setTx(r.right + 10); setTy(r.top + r.height / 2)
        }
        setHovered(true)
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onClick}
        style={{
          width: 40, height: 40, borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive ? 'rgba(124,58,237,0.9)' : hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
          border: 'none', cursor: 'pointer',
          color: isActive ? '#fff' : hovered ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.42)',
          boxShadow: isActive ? '0 0 0 1px rgba(124,58,237,0.45),0 4px 14px rgba(124,58,237,0.38)' : 'none',
          transition: 'color 0.15s,background 0.15s,box-shadow 0.18s',
        }}
      >{icon}</motion.button>
      {hovered && <Tooltip label={label} shortcut={shortcut} x={tx} y={ty} />}
    </div>
  )
}

/* ── Divider ─────────────────────────────────────────────────────── */

function Sep() {
  return <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.07)', margin: '3px 0', flexShrink: 0 }} />
}

/* ── ClearBtn (Tout effacer — rouge) ─────────────────────────────── */

function ClearBtn({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      onMouseEnter={() => {
        if (ref.current) {
          const r = ref.current.getBoundingClientRect()
          setTx(r.right + 10); setTy(r.top + r.height / 2)
        }
        setHovered(true)
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onClick}
        style={{
          width: 40, height: 40, borderRadius: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hovered ? 'rgba(239,68,68,0.18)' : 'transparent',
          border: 'none', cursor: 'pointer',
          color: hovered ? '#ef4444' : 'rgba(239,68,68,0.55)',
          transition: 'color 0.15s,background 0.15s',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </motion.button>
      {hovered && <Tooltip label="Tout effacer" x={tx} y={ty} />}
    </div>
  )
}

/* ── Toolbar ─────────────────────────────────────────────────────── */

export function Toolbar({ activeTool, onToolChange, onOpenFile, onExportOpen, onAddShape, onAddText, onClearAll }: ToolbarProps) {
  const [shapesOpen, setShapesOpen] = useState(false)
  const [openHov, setOpenHov] = useState(false)
  const [openPos, setOpenPos] = useState({ x: 0, y: 0 })
  const openRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <style>{`@keyframes toolFadeIn{from{opacity:0;transform:translateY(-50%) translateX(-4px)}to{opacity:1;transform:translateY(-50%) translateX(0)}}`}</style>

      <div
        style={{
          position: 'fixed', left: 12, top: 8, bottom: 8, zIndex: 20, width: 52,
          borderRadius: 18,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '6px 0', gap: 2,
          background: 'rgba(14,14,16,0.88)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 40px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05)',
          overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none',
        }}
      >

        {/* ── Ouvrir fichier ── */}
        <div
          ref={openRef}
          onMouseEnter={() => {
            if (openRef.current) {
              const r = openRef.current.getBoundingClientRect()
              setOpenPos({ x: r.right + 10, y: r.top + r.height / 2 })
            }
            setOpenHov(true)
          }}
          onMouseLeave={() => setOpenHov(false)}
        >
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onOpenFile}
            style={{
              width: 40, height: 40, borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: openHov ? 'rgba(255,255,255,0.07)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: openHov ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.4)',
              transition: 'color 0.15s,background 0.15s',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
            </svg>
          </motion.button>
          {openHov && <Tooltip label="Ouvrir une image" x={openPos.x} y={openPos.y} />}
        </div>

        <Sep />

        {/* ── Outils (Sélection, Recadrer, Pinceau) ── */}
        {TOOLS.map(t => (
          <ToolBtn
            key={t.id} icon={t.icon} label={t.label} shortcut={t.shortcut}
            isActive={activeTool === t.id}
            onClick={() => onToolChange(t.id)}
          />
        ))}

        {/* ── Texte ── */}
        <ToolBtn
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>}
          label="Ajouter du texte" shortcut="T" isActive={false} onClick={onAddText}
        />

        <Sep />

        {/* ── Formes géométriques (accordéon inline) ── */}
        <ToolBtn
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><circle cx="17.5" cy="6.5" r="3.5"/><path d="M12 21l4-7H8l4 7z"/></svg>}
          label="Formes" shortcut="S"
          isActive={shapesOpen}
          onClick={() => setShapesOpen(o => !o)}
        />

        <AnimatePresence>
          {shapesOpen && (
            <motion.div
              key="shapes-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 4,
                  padding: '4px 4px 6px',
                  maxHeight: 220,
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                }}
              >
                {SHAPES.map(s => (
                  <button
                    key={s.type}
                    title={s.label}
                    onClick={() => onAddShape(s.type)}
                    style={{
                      width: '100%', minHeight: 40, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent',
                      border: '1px solid transparent',
                      cursor: 'pointer',
                      color: 'rgba(167,139,250,0.85)',
                      transition: 'background 0.13s, border-color 0.13s, color 0.13s',
                      padding: 0,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'rgba(124,58,237,0.18)'
                      el.style.borderColor = 'rgba(124,58,237,0.45)'
                      el.style.color = '#fff'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'transparent'
                      el.style.borderColor = 'transparent'
                      el.style.color = 'rgba(167,139,250,0.85)'
                    }}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Sep />

        {/* ── Export ── */}
        <ToolBtn
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          }
          label="Exporter" isActive={false} onClick={onExportOpen}
        />

        {/* ── Tout effacer ── */}
        {onClearAll && (
          <>
            <Sep />
            <ClearBtn onClick={onClearAll} />
          </>
        )}
      </div>
    </>
  )
}
