import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Layer, ShapeLayer, DrawLayer } from '../types/canvas'

/* ── Props ───────────────────────────────────────────────────────── */

export interface TopBarProps {
  activeLayer:  Layer | null
  selectedCount: number
  page:         { width: number; height: number; fill: string }
  onPageChange: (p: { width: number; height: number; fill: string }) => void
  onUpdate:     (id: string, updates: Record<string, unknown>) => void
  onLiveUpdate: (id: string, updates: Record<string, unknown>) => void
}

/* ── Page format presets ─────────────────────────────────────────── */

const PAGE_PRESETS = [
  { label: '1:1',    w: 1080, h: 1080 },
  { label: '16:9',   w: 1920, h: 1080 },
  { label: '9:16',   w: 1080, h: 1920 },
  { label: 'A4',     w: 794,  h: 1123 },
]

/* ── Helpers ─────────────────────────────────────────────────────── */

function Divider() {
  return (
    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
  )
}

/* ── ColorSwatch ─────────────────────────────────────────────────── */

function ColorSwatch({
  label, value, onChange, onCommit,
}: {
  label: string
  value: string
  onChange: (c: string) => void
  onCommit: (c: string) => void
}) {
  const isTransparent = value === 'transparent' || value === 'none' || value === ''
  const pickerValue   = isTransparent ? '#ffffff' : value
  const commitTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (commitTimer.current) clearTimeout(commitTimer.current) }, [])

  const handleChange = (c: string) => {
    onChange(c)
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(() => onCommit(c), 600)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <label style={{ position: 'relative', cursor: 'pointer', display: 'block' }}>
        <div
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: isTransparent
              ? 'repeating-conic-gradient(#3a3a3a 0% 25%, #222 0% 50%) 0 0 / 10px 10px'
              : value,
            border: isTransparent
              ? '1.5px dashed rgba(255,255,255,0.22)'
              : '1.5px solid rgba(255,255,255,0.18)',
            boxShadow: isTransparent ? 'none' : '0 1px 8px rgba(0,0,0,0.45)',
            transition: 'background 0.15s',
          }}
        />
        <input
          type="color"
          value={pickerValue}
          onChange={e => handleChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </label>
      <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

/* ── StrokeWidthControl ──────────────────────────────────────────── */

function StrokeWidthControl({
  value, onChange, onCommit,
}: {
  value: number
  onChange: (v: number) => void
  onCommit: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="range" min={0} max={40} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          onPointerUp={e => onCommit(Number((e.target as HTMLInputElement).value))}
          className="simple-slider"
          style={{ width: 76, margin: 0 }}
        />
        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: 'rgba(255,255,255,0.45)', minWidth: 22, textAlign: 'right' }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Épaisseur
      </span>
    </div>
  )
}

/* ── Shared pill style ───────────────────────────────────────────── */

const pillStyle = {
  pointerEvents: 'auto' as const,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  height: 56,
  padding: '0 14px',
  background: 'rgba(12,12,14,0.86)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  boxShadow: '0 4px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
  userSelect: 'none' as const,
}

/* ── DimInput — small editable number field ──────────────────────── */

function DimInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(String(value))

  useEffect(() => { if (!editing) setDraft(String(value)) }, [value, editing])

  return editing ? (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseInt(draft, 10)
        if (!isNaN(n) && n > 0) onChange(n)
        setEditing(false)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') { const n = parseInt(draft,10); if(!isNaN(n)&&n>0) onChange(n); setEditing(false) }
        if (e.key === 'Escape') setEditing(false)
      }}
      style={{
        width: 48, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(124,58,237,0.6)',
        borderRadius: 5, color: '#fff', fontSize: 11, fontFamily: 'monospace',
        padding: '2px 4px', outline: 'none', textAlign: 'center',
      }}
    />
  ) : (
    <span
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      style={{
        fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)',
        cursor: 'text', minWidth: 32, textAlign: 'center',
        padding: '2px 4px', borderRadius: 4, border: '1px solid transparent',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.borderColor = 'transparent' }}
    >
      {value}
    </span>
  )
}

/* ── TopBar ──────────────────────────────────────────────────────── */

export function TopBar({ activeLayer, selectedCount, page, onPageChange, onUpdate, onLiveUpdate }: TopBarProps) {
  const showShape = selectedCount === 1 && activeLayer?.type === 'shape'
  const showBg    = selectedCount === 0
  const show      = showShape || showBg

  const shapeLayer = showShape ? (activeLayer as ShapeLayer) : null
  const drawLayer  = activeLayer?.type === 'draw' ? (activeLayer as DrawLayer) : null

  const strokeColor = shapeLayer?.stroke ?? drawLayer?.stroke ?? ''
  const strokeWidth = shapeLayer?.strokeWidth ?? drawLayer?.strokeWidth ?? 0

  const typeLabel =
    (activeLayer as ShapeLayer)?.shapeType === 'rect'   ? 'Rectangle' :
    (activeLayer as ShapeLayer)?.shapeType === 'circle' ? 'Cercle'    : 'Triangle'

  const activePreset = PAGE_PRESETS.find(p => p.w === page.width && p.h === page.height)

  return (
    <div
      style={{
        position: 'absolute', top: 16, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 20,
      }}
    >
      <AnimatePresence mode="wait">
        {show && (showBg ? (
          /* ── Page controls pill ── */
          <motion.div
            key="bg"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -8,   scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={pillStyle}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingRight: 2 }}>
              Page
            </span>
            <Divider />
            {/* Fill */}
            <ColorSwatch
              label="Fond"
              value={page.fill}
              onChange={fill => onPageChange({ ...page, fill })}
              onCommit={fill => onPageChange({ ...page, fill })}
            />
            <Divider />
            {/* Format presets */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {PAGE_PRESETS.map(p => {
                  const isActive = p.w === page.width && p.h === page.height
                  return (
                    <button
                      key={p.label}
                      onClick={() => onPageChange({ ...page, width: p.w, height: p.h })}
                      style={{
                        padding: '3px 7px', borderRadius: 6, fontSize: 9.5, fontWeight: 700,
                        cursor: 'pointer', border: 'none', letterSpacing: '0.04em',
                        background: isActive ? 'rgba(124,58,237,0.8)' : 'rgba(255,255,255,0.08)',
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                        transition: 'background 0.13s, color 0.13s',
                      }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Format
              </span>
            </div>
            <Divider />
            {/* Custom W × H */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <DimInput value={page.width}  onChange={w => onPageChange({ ...page, width: w })} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>×</span>
                <DimInput value={page.height} onChange={h => onPageChange({ ...page, height: h })} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {activePreset ? `${activePreset.w} × ${activePreset.h}` : `${page.width} × ${page.height}`}
              </span>
            </div>
          </motion.div>
        ) : shapeLayer ? (
          /* ── Shape controls pill ── */
          <motion.div
            key={shapeLayer.id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: -8,   scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={pillStyle}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingRight: 2 }}>
              {typeLabel}
            </span>
            <Divider />
            <ColorSwatch
              label="Fond"
              value={shapeLayer.fill}
              onChange={c => onLiveUpdate(shapeLayer.id, { fill: c })}
              onCommit={c => onUpdate(shapeLayer.id, { fill: c })}
            />
            <Divider />
            <ColorSwatch
              label="Contour"
              value={strokeColor}
              onChange={c => onLiveUpdate(shapeLayer.id, { stroke: c })}
              onCommit={c => onUpdate(shapeLayer.id, { stroke: c })}
            />
            <StrokeWidthControl
              value={strokeWidth}
              onChange={v => onLiveUpdate(shapeLayer.id, { strokeWidth: v })}
              onCommit={v => onUpdate(shapeLayer.id, { strokeWidth: v })}
            />
          </motion.div>
        ) : null)}
      </AnimatePresence>
    </div>
  )
}
