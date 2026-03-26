import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { Layer, ImageLayer, TextLayer, DrawLayer, Adjustments, Tool } from '../types/canvas'
import { DEFAULT_ADJUSTMENTS } from '../types/canvas'

/* ── Accordion ───────────────────────────────────────────────────── */

function Accordion({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full"
        style={{ padding: '9px 14px', cursor: 'pointer', background: 'none', border: 'none' }}
      >
        <span className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.32)' }}>
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

/* ── Quick presets ───────────────────────────────────────────────── */

const QUICK_PRESETS: { id: string; name: string; adjustments: Adjustments; preview: string }[] = [
  { id: 'original', name: 'Original',  adjustments: { exposure: 0,   contrast: 0,   saturation: 0,    temperature: 0  }, preview: 'linear-gradient(135deg, #87CEEB 0%, #AED9B8 45%, #7B9E6E 75%, #5A7A4E 100%)' },
  { id: 'bw',       name: 'N & B',     adjustments: { exposure: 5,   contrast: 20,  saturation: -100, temperature: 0  }, preview: 'linear-gradient(135deg, #E0E0E0 0%, #A8A8A8 40%, #606060 75%, #1A1A1A 100%)' },
  { id: 'vintage',  name: 'Vintage',   adjustments: { exposure: -10, contrast: -15, saturation: -30,  temperature: 40 }, preview: 'linear-gradient(135deg, #EED5A8 0%, #D4A87A 38%, #9B7048 70%, #5C3E22 100%)' },
  { id: 'dramatic', name: 'Ciné',      adjustments: { exposure: -25, contrast: 65,  saturation: -25,  temperature: -20}, preview: 'linear-gradient(135deg, #1C1F2E 0%, #0E1525 38%, #050C1A 70%, #010408 100%)' },
  { id: 'vivid',    name: 'Éclatant',  adjustments: { exposure: 15,  contrast: 25,  saturation: 55,   temperature: 10 }, preview: 'linear-gradient(135deg, #FF6B6B 0%, #FFD93D 28%, #6BCB77 58%, #4D96FF 100%)' },
  { id: 'cold',     name: 'Glacé',     adjustments: { exposure: 0,   contrast: 10,  saturation: -20,  temperature: -65}, preview: 'linear-gradient(135deg, #C8E0F8 0%, #7EB4E8 38%, #3A7EC8 70%, #1048A0 100%)' },
  { id: 'golden',   name: 'Doré',      adjustments: { exposure: 12,  contrast: 8,   saturation: 22,   temperature: 72 }, preview: 'linear-gradient(135deg, #FFE580 0%, #FFBA30 38%, #E07010 70%, #963000 100%)' },
  { id: 'soft',     name: 'Doux',      adjustments: { exposure: 22,  contrast: -20, saturation: -10,  temperature: 12 }, preview: 'linear-gradient(135deg, #FFF5EE 0%, #FFE4D0 40%, #EECAB0 72%, #D8A888 100%)' },
]

function adjMatch(a: Adjustments, b: Adjustments) {
  return a.exposure === b.exposure && a.contrast === b.contrast
      && a.saturation === b.saturation && a.temperature === b.temperature
}

function QuickStylesGrid({ adjustments, onApply }: { adjustments: Adjustments; onApply: (next: Adjustments) => void }) {
  const activeId = QUICK_PRESETS.find(p => adjMatch(p.adjustments, adjustments))?.id
  return (
    <div style={{ padding: '4px 12px 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
        {QUICK_PRESETS.map(preset => {
          const isActive = preset.id === activeId
          return (
            <motion.button
              key={preset.id}
              onClick={() => onApply(preset.adjustments)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
              title={preset.name}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: 9, background: preset.preview,
                border: isActive ? '2px solid rgba(124,58,237,0.9)' : '2px solid rgba(255,255,255,0.06)',
                boxShadow: isActive ? '0 0 0 1.5px rgba(124,58,237,0.3), 0 2px 8px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.4)',
                transition: 'border-color 0.13s, box-shadow 0.13s', position: 'relative', overflow: 'hidden',
              }}>
                {isActive && <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.14)', borderRadius: 7 }} />}
                {isActive && (
                  <div style={{ position: 'absolute', top: 3, right: 3, width: 13, height: 13, borderRadius: 4, background: 'rgba(124,58,237,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.33)', whiteSpace: 'nowrap', letterSpacing: '0.02em', transition: 'color 0.13s' }}>
                {preset.name}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Slider ──────────────────────────────────────────────────────── */

interface SliderDef { key: keyof Adjustments; label: string; unit?: string; min: number; max: number; temperatureTrack?: boolean }

function Slider({ label, unit, min, max, value, onChange, onCommit, temperatureTrack }: SliderDef & { value: number; onChange: (v: number) => void; onCommit?: (v: number) => void }) {
  const [hovering, setHovering] = useState(false)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)

  useEffect(() => {
    if (!dragging) return
    const up = () => { draggingRef.current = false; setDragging(false) }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
  }, [dragging])

  const range     = max - min
  const thumbPct  = ((value - min) / range) * 100
  const centerPct = ((0   - min) / range) * 100
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
        <span className="text-[10.5px] font-semibold uppercase tracking-widest select-none" style={{ color: hovering || dragging ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)' }}>
          {label}
        </span>
        <div className="flex items-baseline gap-0.5">
          <motion.span animate={{ color: isZero ? 'rgba(255,255,255,0.22)' : dragging ? '#c4b5fd' : '#a78bfa' }} transition={{ duration: 0.1 }} className="text-[13px] font-mono tabular-nums font-bold leading-none">
            {sign}{value}
          </motion.span>
          {unit && <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.18)' }}>{unit}</span>}
        </div>
      </div>

      <div className="relative flex items-center select-none" style={{ height: 44 }}>
        <div className="absolute left-0 right-0 rounded-full pointer-events-none" style={{ height: trackHeight, top: '50%', transform: 'translateY(-50%)', background: temperatureTrack ? 'linear-gradient(to right, #3b82f6 0%, #222 50%, #f97316 100%)' : '#333', transition: 'height 0.15s' }}>
          {!temperatureTrack && fillWidth > 0.2 && (
            <div className="absolute top-0 h-full rounded-full" style={{ left: `${fillLeft}%`, width: `${fillWidth}%`, background: dragging ? 'linear-gradient(90deg,#6d28d9,#a78bfa)' : '#7c3aed', transition: 'background 0.15s' }} />
          )}
          <div className="absolute rounded-full pointer-events-none" style={{ left: `${centerPct}%`, top: '50%', width: 1.5, height: hovering || dragging ? 16 : 10, background: 'rgba(255,255,255,0.18)', transform: 'translate(-50%,-50%)', transition: 'height 0.15s' }} />
        </div>
        <div className="absolute rounded-full bg-white pointer-events-none z-10" style={{ width: 20, height: 20, top: '50%', left: `calc(${thumbPct}% - 10px)`, transform: `translateY(-50%) scale(${thumbScale})`, boxShadow: thumbGlow, transition: 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s' }} />
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

const LIGHT_SLIDERS: SliderDef[] = [
  { key: 'exposure', label: 'Exposition', unit: 'EV', min: -100, max: 100 },
  { key: 'contrast', label: 'Contraste',  unit: '%',  min: -100, max: 100 },
]
const COLOR_SLIDERS: SliderDef[] = [
  { key: 'saturation',  label: 'Saturation',  unit: '%', min: -100, max: 100 },
  { key: 'temperature', label: 'Température', unit: 'K', min: -100, max: 100, temperatureTrack: true },
]

/* ── ImageAdjustments ────────────────────────────────────────────── */

function ImageAdjustments({ layer, onChange, onCommit }: { layer: ImageLayer; onChange: (next: Adjustments) => void; onCommit?: (next: Adjustments) => void }) {
  const { adjustments } = layer
  const isDirty = Object.values(adjustments).some(v => v !== 0)
  return (
    <>
      <Accordion title="Styles rapides">
        <QuickStylesGrid adjustments={adjustments} onApply={next => { onChange(next); onCommit?.(next) }} />
      </Accordion>
      <Accordion title="Lumière">
        <div className="flex flex-col px-3 pb-3" style={{ gap: 2 }}>
          {LIGHT_SLIDERS.map(def => (
            <Slider key={def.key} {...def} value={adjustments[def.key]}
              onChange={v => onChange({ ...adjustments, [def.key]: v })}
              onCommit={v => onCommit?.({ ...adjustments, [def.key]: v })}
            />
          ))}
        </div>
      </Accordion>
      <Accordion title="Couleur">
        <div className="flex flex-col px-3 pb-3" style={{ gap: 2 }}>
          {COLOR_SLIDERS.map(def => (
            <Slider key={def.key} {...def} value={adjustments[def.key]}
              onChange={v => onChange({ ...adjustments, [def.key]: v })}
              onCommit={v => onCommit?.({ ...adjustments, [def.key]: v })}
            />
          ))}
        </div>
      </Accordion>
      <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-3">
        <AnimatePresence>
          {isDirty && (
            <motion.button
              key="reset"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              onClick={() => { onChange({ ...DEFAULT_ADJUSTMENTS }); onCommit?.({ ...DEFAULT_ADJUSTMENTS }) }}
              whileHover={{ scale: 1.03, background: 'rgba(124,58,237,0.2)' }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-[10.5px] font-semibold px-3 py-1.5 rounded-lg w-full justify-center"
              style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 7a6 6 0 1 0 1.2-3.6" /><path d="M1 3v4h4" />
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

/* ── TextProperties ──────────────────────────────────────────────── */

const FONT_OPTIONS = [
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Kanit',
  'Oswald',
  'Playfair Display',
  'Lora',
  'Bebas Neue',
  'Abril Fatface',
  'Lobster',
  'Dancing Script',
  'Pacifico',
]

/* ── Custom font picker ──────────────────────────────────────────── */

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10,
          color: 'rgba(255,255,255,0.82)',
          fontSize: 14,
          padding: '9px 12px',
          cursor: 'pointer',
          outline: 'none',
          minHeight: 40,
        }}
      >
        <span style={{ fontFamily: value, fontSize: 14 }}>{value}</span>
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M1 1l4 4 4-4" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 999,
            background: 'rgba(18,18,22,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {FONT_OPTIONS.map(font => {
            const isActive = font === value
            return (
              <button
                key={font}
                type="button"
                onClick={() => { onChange(font); setOpen(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontFamily: font,
                  fontSize: 15,
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.78)',
                  background: isActive ? 'rgba(124,58,237,0.14)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderLeft: isActive ? '3px solid rgba(124,58,237,0.85)' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {font}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ALIGN_OPTIONS: { value: 'left' | 'center' | 'right'; icon: React.ReactNode }[] = [
  { value: 'left',   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg> },
  { value: 'center', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg> },
  { value: 'right',  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg> },
]

const COLOR_PRESETS = ['#ffffff','#000000','#94a3b8','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a78bfa']

function toggleBold(s: string)   { const b = s.includes('bold'), i = s.includes('italic'); return b ? (i ? 'italic' : '') : (i ? 'bold italic' : 'bold') }
function toggleItalic(s: string) { const b = s.includes('bold'), i = s.includes('italic'); return i ? (b ? 'bold' : '') : (b ? 'bold italic' : 'italic') }

function TextProperties({ layer, onChange, onLiveChange }: { layer: TextLayer; onChange: (updates: Partial<TextLayer>) => void; onLiveChange?: (updates: Partial<TextLayer>) => void }) {
  const isBold   = layer.fontStyle.includes('bold')
  const isItalic = layer.fontStyle.includes('italic')
  const rafRef   = useRef<number | null>(null)

  return (
    <>
      <Accordion title="Contenu">
        <div style={{ padding: '4px 12px 12px' }}>
          <textarea
            value={layer.text} rows={3}
            onChange={e => onChange({ text: e.target.value })}
            className="w-full resize-none text-[12px] outline-none rounded-lg px-2.5 py-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontFamily: layer.fontFamily, lineHeight: 1.5 }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)' }}
            onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          />
        </div>
      </Accordion>

      <Accordion title="Typographie">
        <div className="flex flex-col gap-3" style={{ padding: '4px 12px 12px' }}>
          {/* Font family */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Police</span>
            <FontPicker
              value={layer.fontFamily}
              onChange={font => onChange({ fontFamily: font })}
            />
          </div>
          {/* Font size */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between px-0.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Taille</span>
              <span className="text-[13px] font-mono tabular-nums font-bold" style={{ color: '#a78bfa' }}>{layer.fontSize}px</span>
            </div>
            <input type="range" min={8} max={200} step={1} value={layer.fontSize}
              onChange={e => {
                const v = Number(e.target.value)
                if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
                rafRef.current = requestAnimationFrame(() => { onLiveChange?.({ fontSize: v }); rafRef.current = null })
              }}
              onPointerUp={e => {
                if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
                onChange({ fontSize: Number((e.target as HTMLInputElement).value) })
              }}
              className="simple-slider"
            />
          </div>
          {/* Style + Alignment */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button onClick={() => onChange({ fontStyle: toggleBold(layer.fontStyle) })} title="Gras"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold transition-all"
                style={{ background: isBold ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isBold ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`, color: isBold ? '#c4b5fd' : 'rgba(255,255,255,0.45)' }}
              >B</button>
              <button onClick={() => onChange({ fontStyle: toggleItalic(layer.fontStyle) })} title="Italique"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] italic transition-all"
                style={{ background: isItalic ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isItalic ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`, color: isItalic ? '#c4b5fd' : 'rgba(255,255,255,0.45)' }}
              >I</button>
            </div>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
            <div className="flex gap-1">
              {ALIGN_OPTIONS.map(a => (
                <button key={a.value} onClick={() => onChange({ align: a.value })}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: layer.align === a.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${layer.align === a.value ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`, color: layer.align === a.value ? '#c4b5fd' : 'rgba(255,255,255,0.45)' }}
                  title={a.value === 'left' ? 'Gauche' : a.value === 'center' ? 'Centre' : 'Droite'}
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Accordion>

      <Accordion title="Couleur">
        <div style={{ padding: '4px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Preset swatches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_PRESETS.map(c => (
              <button key={c} onClick={() => onChange({ fill: c })}
                className="rounded-md flex-shrink-0 transition-transform hover:scale-110"
                style={{ width: 20, height: 20, background: c, border: layer.fill === c ? '2px solid rgba(124,58,237,0.9)' : '1.5px solid rgba(255,255,255,0.14)', boxShadow: layer.fill === c ? '0 0 0 1px rgba(124,58,237,0.4)' : 'none' }}
                title={c}
              />
            ))}
          </div>

          {/* Colour swatch · hex input · rainbow picker */}
          <div className="flex items-center gap-2">
            <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 7, background: layer.fill, border: '1.5px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
            <input
              type="text" value={layer.fill} maxLength={7} spellCheck={false}
              onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange({ fill: v }) }}
              onBlur={e => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange({ fill: layer.fill }) }}
              className="flex-1 min-w-0 text-[11px] font-mono outline-none rounded-lg px-2 py-1"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', caretColor: '#a78bfa', letterSpacing: '0.05em' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)' }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
            />
            <label className="relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer"
              style={{ width: 28, height: 28, border: '1.5px solid rgba(255,255,255,0.2)', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}
              title="Sélecteur de couleur"
            >
              <input type="color" value={layer.fill} onChange={e => onChange({ fill: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" style={{ width: '100%', height: '100%' }} />
            </label>
          </div>

        </div>
      </Accordion>

      <p className="text-[9px] text-center py-3" style={{ color: 'rgba(255,255,255,0.1)' }}>
        Glisse le calque sur le Canvas pour le déplacer
      </p>
    </>
  )
}

/* ── BrushSettings ───────────────────────────────────────────────── */

const BRUSH_COLOR_PRESETS = ['#ffffff','#000000','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a78bfa','#ec4899']

interface BrushSettingsProps {
  color: string
  size: number
  onColorChange: (c: string) => void
  onSizeChange: (s: number) => void
  label?: string
}

function BrushSettings({ color, size, onColorChange, onSizeChange, label = 'Pinceau' }: BrushSettingsProps) {
  return (
    <>
      <Accordion title={label}>
        <div className="flex flex-col gap-3" style={{ padding: '4px 12px 14px' }}>
          {/* Color swatches */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Couleur</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {BRUSH_COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => onColorChange(c)}
                  className="rounded-md flex-shrink-0 transition-transform hover:scale-110"
                  style={{ width: 20, height: 20, background: c, border: color === c ? '2px solid rgba(124,58,237,0.9)' : '1.5px solid rgba(255,255,255,0.14)', boxShadow: color === c ? '0 0 0 1px rgba(124,58,237,0.4)' : 'none' }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Hex + rainbow picker */}
          <div className="flex items-center gap-2">
            <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 7, background: color, border: '1.5px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
            <input
              type="text" value={color} maxLength={7} spellCheck={false}
              onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onColorChange(v) }}
              onBlur={e => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onColorChange(color) }}
              className="flex-1 min-w-0 text-[11px] font-mono outline-none rounded-lg px-2 py-1"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', caretColor: '#a78bfa', letterSpacing: '0.05em' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)' }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
            />
            <label className="relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer"
              style={{ width: 28, height: 28, border: '1.5px solid rgba(255,255,255,0.2)', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}>
              <input type="color" value={color} onChange={e => onColorChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" style={{ width: '100%', height: '100%' }} />
            </label>
          </div>

          {/* Size slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between px-0.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Épaisseur</span>
              <span className="text-[13px] font-mono tabular-nums font-bold" style={{ color: '#a78bfa' }}>{size}px</span>
            </div>
            <input type="range" min={1} max={80} step={1} value={size}
              onChange={e => onSizeChange(Number(e.target.value))}
              className="simple-slider"
            />
          </div>

          {/* Preview */}
          <div className="flex items-center justify-center" style={{ height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <svg width="200" height="30" viewBox="0 0 200 30">
              <path d="M10 20 Q50 10 100 15 Q150 20 190 10" fill="none" stroke={color} strokeWidth={Math.min(size, 20)} strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </Accordion>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   AdjustmentPanels — dispatches to ImageAdjustments or TextProperties
   with animated placeholder when nothing is selected
   ═══════════════════════════════════════════════════════════════════ */

export interface AdjustmentPanelsProps {
  activeLayer: Layer | null
  activeTool: Tool
  onChangeAdjustments: (next: Adjustments) => void
  onCommitAdjustments: (next: Adjustments) => void
  onChangeText: (updates: Partial<TextLayer>) => void
  onLiveChangeText?: (updates: Partial<TextLayer>) => void
  brushColor: string
  brushSize: number
  onBrushColorChange: (color: string) => void
  onBrushSizeChange: (size: number) => void
  onDrawLayerUpdate: (updates: Record<string, unknown>) => void
}

export function AdjustmentPanels({
  activeLayer, activeTool,
  onChangeAdjustments, onCommitAdjustments, onChangeText, onLiveChangeText,
  brushColor, brushSize, onBrushColorChange, onBrushSizeChange, onDrawLayerUpdate,
}: AdjustmentPanelsProps) {
  const isBrushTool = activeTool === 'brush'
  const title = activeLayer?.type === 'text' ? 'Texte'
    : activeLayer?.type === 'draw' ? 'Dessin'
    : activeLayer?.type === 'shape' ? 'Forme'
    : isBrushTool ? 'Pinceau'
    : 'Réglages'

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4" style={{ height: 38, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {title}
        </span>
        {activeLayer?.type === 'text' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>T</span>
        )}
        {(activeLayer?.type === 'draw' || isBrushTool) && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>✏</span>
        )}
      </div>

      {/* Scrollable content with AnimatePresence transitions */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <AnimatePresence mode="wait">
          {activeLayer?.type === 'draw' ? (
            <motion.div
              key={activeLayer.id + '-draw'}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <BrushSettings
                label="Trait"
                color={(activeLayer as DrawLayer).stroke}
                size={(activeLayer as DrawLayer).strokeWidth}
                onColorChange={c => onDrawLayerUpdate({ stroke: c })}
                onSizeChange={s => onDrawLayerUpdate({ strokeWidth: s })}
              />
            </motion.div>
          ) : isBrushTool ? (
            <motion.div
              key="brush-settings"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <BrushSettings
                color={brushColor}
                size={brushSize}
                onColorChange={onBrushColorChange}
                onSizeChange={onBrushSizeChange}
              />
            </motion.div>
          ) : !activeLayer ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center gap-3"
              style={{ padding: '32px 20px' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-[10.5px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Sélectionnez un élément<br />pour voir ses réglages
              </p>
            </motion.div>
          ) : activeLayer.type === 'image' ? (
            <motion.div
              key={activeLayer.id + '-img'}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <ImageAdjustments layer={activeLayer} onChange={onChangeAdjustments} onCommit={onCommitAdjustments} />
            </motion.div>
          ) : activeLayer.type === 'shape' ? (
            <motion.div
              key={activeLayer.id + '-shape'}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center gap-3"
              style={{ padding: '32px 20px' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="17.5" cy="6.5" r="3.5" fill="rgba(124,58,237,0.25)" stroke="rgba(124,58,237,0.5)" />
              </svg>
              <p className="text-[10.5px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Couleur et contour<br />dans la barre du haut
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeLayer.id + '-txt'}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <TextProperties layer={activeLayer as TextLayer} onChange={onChangeText} onLiveChange={onLiveChangeText} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
