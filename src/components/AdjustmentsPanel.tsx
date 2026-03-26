import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import type { Adjustments, Layer, ImageLayer, TextLayer } from '../types/canvas'
import { DEFAULT_ADJUSTMENTS } from '../types/canvas'

/* ── Accordion ───────────────────────────────────────────────────── */

function Accordion({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full group"
        style={{ padding: '9px 14px', cursor: 'pointer', background: 'none', border: 'none' }}
      >
        <span
          className="text-[9.5px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'rgba(255,255,255,0.32)', transition: 'color 0.15s' }}
        >
          {title}
        </span>
        <motion.svg
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}
        >
          <path d="M5 7L1 3h8L5 7z" fill="currentColor" />
        </motion.svg>
      </button>

      <motion.div
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        initial={false}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{ overflow: 'hidden' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/* ── Quick style presets ─────────────────────────────────────────── */

interface PresetDef {
  id: string
  name: string
  adjustments: Adjustments
  preview: string
}

const QUICK_PRESETS: PresetDef[] = [
  {
    id: 'original',
    name: 'Original',
    adjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0 },
    preview: 'linear-gradient(135deg, #87CEEB 0%, #AED9B8 45%, #7B9E6E 75%, #5A7A4E 100%)',
  },
  {
    id: 'bw',
    name: 'N & B',
    adjustments: { exposure: 5, contrast: 20, saturation: -100, temperature: 0 },
    preview: 'linear-gradient(135deg, #E0E0E0 0%, #A8A8A8 40%, #606060 75%, #1A1A1A 100%)',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    adjustments: { exposure: -10, contrast: -15, saturation: -30, temperature: 40 },
    preview: 'linear-gradient(135deg, #EED5A8 0%, #D4A87A 38%, #9B7048 70%, #5C3E22 100%)',
  },
  {
    id: 'dramatic',
    name: 'Ciné',
    adjustments: { exposure: -25, contrast: 65, saturation: -25, temperature: -20 },
    preview: 'linear-gradient(135deg, #1C1F2E 0%, #0E1525 38%, #050C1A 70%, #010408 100%)',
  },
  {
    id: 'vivid',
    name: 'Éclatant',
    adjustments: { exposure: 15, contrast: 25, saturation: 55, temperature: 10 },
    preview: 'linear-gradient(135deg, #FF6B6B 0%, #FFD93D 28%, #6BCB77 58%, #4D96FF 100%)',
  },
  {
    id: 'cold',
    name: 'Glacé',
    adjustments: { exposure: 0, contrast: 10, saturation: -20, temperature: -65 },
    preview: 'linear-gradient(135deg, #C8E0F8 0%, #7EB4E8 38%, #3A7EC8 70%, #1048A0 100%)',
  },
  {
    id: 'golden',
    name: 'Doré',
    adjustments: { exposure: 12, contrast: 8, saturation: 22, temperature: 72 },
    preview: 'linear-gradient(135deg, #FFE580 0%, #FFBA30 38%, #E07010 70%, #963000 100%)',
  },
  {
    id: 'soft',
    name: 'Doux',
    adjustments: { exposure: 22, contrast: -20, saturation: -10, temperature: 12 },
    preview: 'linear-gradient(135deg, #FFF5EE 0%, #FFE4D0 40%, #EECAB0 72%, #D8A888 100%)',
  },
]

function adjustmentsMatch(a: Adjustments, b: Adjustments) {
  return a.exposure === b.exposure
      && a.contrast === b.contrast
      && a.saturation === b.saturation
      && a.temperature === b.temperature
}

function QuickStylesGrid({
  adjustments,
  onApply,
}: {
  adjustments: Adjustments
  onApply: (next: Adjustments) => void
}) {
  const activeId = QUICK_PRESETS.find(p => adjustmentsMatch(p.adjustments, adjustments))?.id

  return (
    <div style={{ padding: '4px 12px 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        {QUICK_PRESETS.map(preset => {
          const isActive = preset.id === activeId
          return (
            <motion.button
              key={preset.id}
              onClick={() => onApply(preset.adjustments)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              title={preset.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 9,
                  background: preset.preview,
                  border: isActive
                    ? '2px solid rgba(124,58,237,0.9)'
                    : '2px solid rgba(255,255,255,0.06)',
                  boxShadow: isActive
                    ? '0 0 0 1.5px rgba(124,58,237,0.3), 0 2px 8px rgba(0,0,0,0.5)'
                    : '0 1px 4px rgba(0,0,0,0.4)',
                  transition: 'border-color 0.13s ease, box-shadow 0.13s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.14)', borderRadius: 7 }} />
                )}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      width: 13,
                      height: 13,
                      borderRadius: 4,
                      background: 'rgba(124,58,237,0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>

              <span
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.33)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                  transition: 'color 0.13s ease',
                }}
              >
                {preset.name}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   IMAGE ADJUSTMENTS — Accordion sections
   ═══════════════════════════════════════════════════════════════════ */

interface SliderDef {
  key: keyof Adjustments
  label: string
  unit?: string
  min: number
  max: number
  temperatureTrack?: boolean
}

const LIGHT_SLIDERS: SliderDef[] = [
  { key: 'exposure', label: 'Exposition', unit: 'EV', min: -100, max: 100 },
  { key: 'contrast', label: 'Contraste',  unit: '%',  min: -100, max: 100 },
]

const COLOR_SLIDERS: SliderDef[] = [
  { key: 'saturation',  label: 'Saturation',  unit: '%', min: -100, max: 100 },
  { key: 'temperature', label: 'Température', unit: 'K', min: -100, max: 100, temperatureTrack: true },
]

function Slider({
  label, unit, min, max, value, onChange, onCommit, temperatureTrack,
}: SliderDef & { value: number; onChange: (v: number) => void; onCommit?: (v: number) => void }) {
  const [hovering, setHovering] = useState(false)
  const [dragging, setDragging] = useState(false)
  const draggingRef = { current: false }

  useEffect(() => {
    if (!dragging) return
    const onUp = () => { draggingRef.current = false; setDragging(false) }
    window.addEventListener('pointerup',     onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerup',     onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  const range     = max - min
  const thumbPct  = ((value - min) / range) * 100
  const centerPct = ((0 - min) / range) * 100
  const fillLeft  = value >= 0 ? centerPct : thumbPct
  const fillWidth = Math.abs(thumbPct - centerPct)
  const isZero    = value === 0
  const sign      = value > 0 ? '+' : ''

  const thumbScale  = dragging ? 0.82 : hovering ? 1.18 : 1
  const trackHeight = dragging ? 6 : hovering ? 5 : 4
  const thumbGlow   = dragging
    ? '0 0 0 7px rgba(124,58,237,0.18), 0 0 22px rgba(167,139,250,0.4), 0 2px 8px rgba(0,0,0,0.7)'
    : hovering
    ? '0 0 0 5px rgba(124,58,237,0.28), 0 0 14px rgba(167,139,250,0.3), 0 2px 6px rgba(0,0,0,0.6)'
    : isZero
    ? '0 2px 6px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.07)'
    : '0 0 0 3px rgba(124,58,237,0.38), 0 2px 6px rgba(0,0,0,0.55)'

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-baseline justify-between px-0.5 mb-0.5">
        <span
          className="text-[10.5px] font-semibold uppercase tracking-widest select-none"
          style={{ color: hovering || dragging ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)' }}
        >
          {label}
        </span>
        <div className="flex items-baseline gap-0.5">
          <motion.span
            animate={{ color: isZero ? 'rgba(255,255,255,0.22)' : dragging ? '#c4b5fd' : '#a78bfa' }}
            transition={{ duration: 0.1 }}
            className="text-[13px] font-mono tabular-nums font-bold leading-none"
          >
            {sign}{value}
          </motion.span>
          {unit && <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>{unit}</span>}
        </div>
      </div>

      <div className="relative flex items-center select-none" style={{ height: 44 }}>
        <div
          className="absolute left-0 right-0 rounded-full pointer-events-none"
          style={{
            height: trackHeight, top: '50%', transform: 'translateY(-50%)',
            background: temperatureTrack ? 'linear-gradient(to right, #3b82f6 0%, #222 50%, #f97316 100%)' : '#333',
            transition: 'height 0.15s ease',
          }}
        >
          {!temperatureTrack && fillWidth > 0.2 && (
            <div
              className="absolute top-0 h-full rounded-full"
              style={{
                left: `${fillLeft}%`, width: `${fillWidth}%`,
                background: dragging ? 'linear-gradient(90deg, #6d28d9, #a78bfa)' : '#7c3aed',
                transition: 'background 0.15s ease',
              }}
            />
          )}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${centerPct}%`, top: '50%', width: 1.5,
              height: hovering || dragging ? 16 : 10,
              background: 'rgba(255,255,255,0.18)',
              transform: 'translate(-50%, -50%)',
              transition: 'height 0.15s ease',
            }}
          />
        </div>

        <div
          className="absolute rounded-full bg-white pointer-events-none z-10"
          style={{
            width: 20, height: 20, top: '50%',
            left: `calc(${thumbPct}% - 10px)`,
            transform: `translateY(-50%) scale(${thumbScale})`,
            boxShadow: thumbGlow,
            transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease',
          }}
        />

        <input
          type="range" min={min} max={max} step={1} value={value}
          onChange={e => onChange(Number(e.target.value))}
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => { if (!draggingRef.current) setHovering(false) }}
          onPointerDown={() => { draggingRef.current = true; setDragging(true); setHovering(true) }}
          onPointerUp={e => { draggingRef.current = false; setDragging(false); onCommit?.(Number((e.target as HTMLInputElement).value)) }}
          onPointerCancel={() => { draggingRef.current = false; setDragging(false); setHovering(false) }}
          onDoubleClick={() => onChange(0)}
          className="px-range absolute inset-0 z-20"
          title="Double-clic pour réinitialiser"
        />
      </div>
    </div>
  )
}

function ImageAdjustments({
  layer,
  onChange,
  onCommit,
}: {
  layer: ImageLayer
  onChange: (next: Adjustments) => void
  onCommit?: (next: Adjustments) => void
}) {
  const { adjustments } = layer
  const isDirty = Object.values(adjustments).some(v => v !== 0)

  return (
    <>
      {/* ── Styles rapides ──────────────────────────────────────── */}
      <Accordion title="Styles rapides" defaultOpen={true}>
        <QuickStylesGrid
          adjustments={adjustments}
          onApply={next => { onChange(next); onCommit?.(next) }}
        />
      </Accordion>

      {/* ── Lumière ─────────────────────────────────────────────── */}
      <Accordion title="Lumière" defaultOpen={true}>
        <div className="flex flex-col px-3 pb-3" style={{ gap: 2 }}>
          {LIGHT_SLIDERS.map(def => (
            <Slider
              key={def.key}
              {...def}
              value={adjustments[def.key]}
              onChange={v => onChange({ ...adjustments, [def.key]: v })}
              onCommit={v => onCommit?.({ ...adjustments, [def.key]: v })}
            />
          ))}
        </div>
      </Accordion>

      {/* ── Couleur ─────────────────────────────────────────────── */}
      <Accordion title="Couleur" defaultOpen={true}>
        <div className="flex flex-col px-3 pb-3" style={{ gap: 2 }}>
          {COLOR_SLIDERS.map(def => (
            <Slider
              key={def.key}
              {...def}
              value={adjustments[def.key]}
              onChange={v => onChange({ ...adjustments, [def.key]: v })}
              onCommit={v => onCommit?.({ ...adjustments, [def.key]: v })}
            />
          ))}
        </div>
      </Accordion>

      {/* ── Reset + hint ────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-3">
        <AnimatePresence>
          {isDirty && (
            <motion.button
              key="reset"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              onClick={() => { onChange({ ...DEFAULT_ADJUSTMENTS }); onCommit?.({ ...DEFAULT_ADJUSTMENTS }) }}
              whileHover={{ scale: 1.03, background: 'rgba(124,58,237,0.2)' }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-[10.5px] font-semibold px-3 py-1.5 rounded-lg w-full justify-center"
              style={{
                background: 'rgba(124,58,237,0.1)',
                color: '#a78bfa',
                border: '1px solid rgba(124,58,237,0.25)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 7a6 6 0 1 0 1.2-3.6" />
                <path d="M1 3v4h4" />
              </svg>
              Réinitialiser les réglages
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-[9px] text-center" style={{ color: 'rgba(255,255,255,0.1)' }}>
          Double-clic sur un slider pour le remettre à zéro
        </p>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TEXT PROPERTIES — Accordion sections
   ═══════════════════════════════════════════════════════════════════ */

const FONT_OPTIONS = [
  { value: 'Arial',       label: 'Sans' },
  { value: 'Georgia',     label: 'Serif' },
  { value: 'Courier New', label: 'Mono' },
  { value: 'Impact',      label: 'Display' },
]

const ALIGN_OPTIONS: { value: 'left' | 'center' | 'right'; icon: React.ReactNode }[] = [
  {
    value: 'left',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>,
  },
  {
    value: 'center',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>,
  },
  {
    value: 'right',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>,
  },
]

const COLOR_PRESETS = [
  '#ffffff', '#000000', '#94a3b8',
  '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#a78bfa',
]

function toggleBold(style: string): string {
  const hasBold   = style.includes('bold')
  const hasItalic = style.includes('italic')
  if (!hasBold) return hasItalic ? 'bold italic' : 'bold'
  return hasItalic ? 'italic' : ''
}

function toggleItalic(style: string): string {
  const hasBold   = style.includes('bold')
  const hasItalic = style.includes('italic')
  if (!hasItalic) return hasBold ? 'bold italic' : 'italic'
  return hasBold ? 'bold' : ''
}

function TextProperties({
  layer,
  onChange,
}: {
  layer: TextLayer
  onChange: (updates: Partial<TextLayer>) => void
}) {
  const isBold   = layer.fontStyle.includes('bold')
  const isItalic = layer.fontStyle.includes('italic')

  const [fontSize, setFontSize] = useState(layer.fontSize)
  useEffect(() => setFontSize(layer.fontSize), [layer.fontSize])

  return (
    <>
      {/* ── Contenu ─────────────────────────────────────────────── */}
      <Accordion title="Contenu" defaultOpen={true}>
        <div style={{ padding: '4px 12px 12px' }}>
          <textarea
            value={layer.text}
            rows={3}
            onChange={e => onChange({ text: e.target.value })}
            className="w-full resize-none text-[12px] outline-none rounded-lg px-2.5 py-2"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: layer.fontFamily,
              lineHeight: 1.5,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          />
        </div>
      </Accordion>

      {/* ── Typographie ─────────────────────────────────────────── */}
      <Accordion title="Typographie" defaultOpen={true}>
        <div className="flex flex-col gap-3" style={{ padding: '4px 12px 12px' }}>

          {/* Font family */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Police
            </span>
            <div className="grid grid-cols-4 gap-1">
              {FONT_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => onChange({ fontFamily: f.value })}
                  className="py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{
                    fontFamily: f.value,
                    background: layer.fontFamily === f.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${layer.fontFamily === f.value ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    color: layer.fontFamily === f.value ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between px-0.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Taille
              </span>
              <span className="text-[13px] font-mono tabular-nums font-bold" style={{ color: '#a78bfa' }}>
                {fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={200}
              step={1}
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              onPointerUp={() => onChange({ fontSize })}
              className="simple-slider"
            />
          </div>

          {/* Style + Alignment */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => onChange({ fontStyle: toggleBold(layer.fontStyle) })}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold transition-all"
                style={{
                  background: isBold ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isBold ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: isBold ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                }}
                title="Gras"
              >
                B
              </button>
              <button
                onClick={() => onChange({ fontStyle: toggleItalic(layer.fontStyle) })}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] italic transition-all"
                style={{
                  background: isItalic ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isItalic ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: isItalic ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                }}
                title="Italique"
              >
                I
              </button>
            </div>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

            <div className="flex gap-1">
              {ALIGN_OPTIONS.map(a => (
                <button
                  key={a.value}
                  onClick={() => onChange({ align: a.value })}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: layer.align === a.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${layer.align === a.value ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    color: layer.align === a.value ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                  }}
                  title={a.value === 'left' ? 'Gauche' : a.value === 'center' ? 'Centre' : 'Droite'}
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Accordion>

      {/* ── Couleur ─────────────────────────────────────────────── */}
      <Accordion title="Couleur" defaultOpen={true}>
        <div style={{ padding: '4px 12px 14px' }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ fill: c })}
                className="rounded-md flex-shrink-0 transition-transform hover:scale-110"
                style={{
                  width: 18, height: 18,
                  background: c,
                  border: layer.fill === c
                    ? '2px solid rgba(124,58,237,0.9)'
                    : '1.5px solid rgba(255,255,255,0.12)',
                  boxShadow: layer.fill === c ? '0 0 0 1px rgba(124,58,237,0.4)' : 'none',
                }}
                title={c}
              />
            ))}

            <label
              className="relative flex-shrink-0 rounded-md overflow-hidden cursor-pointer transition-transform hover:scale-110"
              style={{
                width: 18, height: 18,
                border: '1.5px solid rgba(255,255,255,0.25)',
                background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              }}
              title="Couleur personnalisée"
            >
              <input
                type="color"
                value={layer.fill}
                onChange={e => onChange({ fill: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
                style={{ width: '100%', height: '100%' }}
              />
            </label>

            <div
              className="rounded-md flex-shrink-0 ml-1"
              style={{
                width: 34, height: 18,
                background: layer.fill,
                border: '1.5px solid rgba(255,255,255,0.12)',
              }}
            />
          </div>
        </div>
      </Accordion>

      <p className="text-[9px] text-center py-3" style={{ color: 'rgba(255,255,255,0.1)' }}>
        Glisse le calque sur le Canvas pour le déplacer
      </p>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ADJUSTMENTS PANEL — shell (dispatches image vs text)
   ═══════════════════════════════════════════════════════════════════ */

interface AdjustmentsPanelProps {
  layer: Layer
  onChangeAdjustments: (next: Adjustments) => void
  onCommitAdjustments: (next: Adjustments) => void
  onChangeText: (updates: Partial<TextLayer>) => void
}

export function AdjustmentsPanel({ layer, onChangeAdjustments, onCommitAdjustments, onChangeText }: AdjustmentsPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [hidden,    setHidden]    = useState(false)

  const isText = layer.type === 'text'
  const title  = isText ? 'Texte' : 'Réglages'

  return (
    <AnimatePresence>
      {!hidden ? (
        <motion.div
          key="panel"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-4 top-4 z-20 rounded-2xl overflow-hidden"
          style={{
            width: 280,
            background: 'rgba(8,8,8,0.72)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 56px rgba(0,0,0,0.75), inset 0 0 0 0.5px rgba(255,255,255,0.04)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4"
            style={{
              height: 44,
              borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={() => setCollapsed(c => !c)}
              className="flex items-center gap-2 group"
              title={collapsed ? 'Développer' : 'Réduire'}
            >
              <motion.svg
                animate={{ rotate: collapsed ? -90 : 0 }}
                transition={{ duration: 0.2 }}
                width="10" height="10" viewBox="0 0 10 10" fill="none"
                className="text-white/25 group-hover:text-white/50 transition-colors"
              >
                <path d="M5 7L1 3h8L5 7z" fill="currentColor" />
              </motion.svg>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {title}
              </span>
              {isText && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                  T
                </span>
              )}
            </button>

            <button
              onClick={() => setHidden(true)}
              className="text-white/20 hover:text-white/50 transition-colors text-[13px] leading-none pb-px"
              title="Masquer"
            >
              ✕
            </button>
          </div>

          {/* Body — collapse wrapper + inner scrollable div */}
          <motion.div
            animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                maxHeight: 'calc(100dvh - 80px)',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {isText ? (
                <TextProperties
                  layer={layer as TextLayer}
                  onChange={onChangeText}
                />
              ) : (
                <ImageAdjustments
                  layer={layer as ImageLayer}
                  onChange={onChangeAdjustments}
                  onCommit={onCommitAdjustments}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.button
          key="show"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          onClick={() => setHidden(false)}
          whileHover={{ scale: 1.04 }}
          className="absolute right-4 top-4 z-20 px-3 py-2 rounded-xl text-[11px] font-semibold"
          style={{
            color: 'rgba(255,255,255,0.45)',
            background: 'rgba(8,8,8,0.72)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {title}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
