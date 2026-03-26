import { motion, AnimatePresence } from 'framer-motion'
import type { Adjustments, ImageLayer } from '../types/canvas'

/* ── Preset definitions ──────────────────────────────────────────── */

export interface FilterPreset {
  id: string
  name: string
  adjustments: Adjustments
  /** CSS gradient that visually represents the color mood of this filter */
  preview: string
  /** Small SVG icon for the preview badge */
  icon: React.ReactNode
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'original',
    name: 'Original',
    adjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0 },
    preview: 'linear-gradient(135deg, #87CEEB 0%, #AED9B8 40%, #7B9E6E 70%, #5A7A4E 100%)',
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="6" cy="6" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'bw',
    name: 'N & B',
    adjustments: { exposure: 5, contrast: 20, saturation: -100, temperature: 0 },
    preview: 'linear-gradient(135deg, #E0E0E0 0%, #B0B0B0 35%, #686868 68%, #222222 100%)',
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" fill="url(#bw)" />
        <defs>
          <linearGradient id="bw" x1="0" y1="0" x2="1" y2="0">
            <stop offset="50%" stopColor="#fff" />
            <stop offset="50%" stopColor="#111" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: 'vintage',
    name: 'Vintage',
    adjustments: { exposure: -10, contrast: -15, saturation: -30, temperature: 40 },
    preview: 'linear-gradient(135deg, #EED5A8 0%, #D4A87A 35%, #9B7048 68%, #5C3E22 100%)',
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".5" />
        <circle cx="6" cy="6" r="1.8" fill="currentColor" opacity=".6" />
      </svg>
    ),
  },
  {
    id: 'dramatic',
    name: 'Ciné',
    adjustments: { exposure: -25, contrast: 65, saturation: -25, temperature: -20 },
    preview: 'linear-gradient(135deg, #1C1F2E 0%, #0E1525 35%, #050C1A 68%, #010408 100%)',
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="3.5" width="10" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="3" y="1.5" width="1.2" height="2.5" fill="currentColor" rx=".3" />
        <rect x="5.4" y="1.5" width="1.2" height="2.5" fill="currentColor" rx=".3" />
        <rect x="7.8" y="1.5" width="1.2" height="2.5" fill="currentColor" rx=".3" />
        <rect x="3" y="8" width="1.2" height="2.5" fill="currentColor" rx=".3" />
        <rect x="5.4" y="8" width="1.2" height="2.5" fill="currentColor" rx=".3" />
        <rect x="7.8" y="8" width="1.2" height="2.5" fill="currentColor" rx=".3" />
      </svg>
    ),
  },
  {
    id: 'vivid',
    name: 'Éclatant',
    adjustments: { exposure: 15, contrast: 25, saturation: 55, temperature: 10 },
    preview: 'linear-gradient(135deg, #FF6B6B 0%, #FFD93D 28%, #6BCB77 58%, #4D96FF 100%)',
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M6 1L7.2 4.8H11L8 7.2L9.2 11L6 8.8L2.8 11L4 7.2L1 4.8H4.8L6 1Z" fill="currentColor" opacity=".9" />
      </svg>
    ),
  },
  {
    id: 'cold',
    name: 'Glacé',
    adjustments: { exposure: 0, contrast: 10, saturation: -20, temperature: -65 },
    preview: 'linear-gradient(135deg, #C8E0F8 0%, #7EB4E8 35%, #3A7EC8 68%, #1048A0 100%)',
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <line x1="6" y1="1" x2="6" y2="11" />
        <line x1="1" y1="6" x2="11" y2="6" />
        <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
        <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
      </svg>
    ),
  },
  {
    id: 'golden',
    name: 'Doré',
    adjustments: { exposure: 12, contrast: 8, saturation: 22, temperature: 72 },
    preview: 'linear-gradient(135deg, #FFE580 0%, #FFBA30 35%, #E07010 68%, #963000 100%)',
    icon: (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="2.8" fill="currentColor" />
        <line x1="6" y1="1" x2="6" y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="6" y1="9.5" x2="6" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="1" y1="6" x2="2.5" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="9.5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="2.4" y1="2.4" x2="3.5" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8.5" y1="8.5" x2="9.6" y2="9.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9.6" y1="2.4" x2="8.5" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="3.5" y1="8.5" x2="2.4" y2="9.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
]

/* ── Helpers ─────────────────────────────────────────────────────── */

function adjustmentsMatch(a: Adjustments, b: Adjustments) {
  return a.exposure === b.exposure
      && a.contrast === b.contrast
      && a.saturation === b.saturation
      && a.temperature === b.temperature
}

/* ── FiltersBar ──────────────────────────────────────────────────── */

interface FiltersBarProps {
  layer: ImageLayer
  onApply: (adjustments: Adjustments) => void
}

export function FiltersBar({ layer, onApply }: FiltersBarProps) {
  const activePreset = FILTER_PRESETS.find(p =>
    adjustmentsMatch(p.adjustments, layer.adjustments)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="absolute z-20"
      style={{
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(8,8,8,0.78)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 0 0 0.5px rgba(255,255,255,0.04)',
        padding: '10px 14px',
      }}
    >
      {/* Header label */}
      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        Filtres artistiques
      </div>

      {/* Filter cards */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {FILTER_PRESETS.map(preset => {
          const isActive = preset.id === activePreset?.id

          return (
            <motion.button
              key={preset.id}
              onClick={() => onApply(preset.adjustments)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {/* Preview square */}
              <div
                style={{
                  position: 'relative',
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: preset.preview,
                  border: isActive
                    ? '2px solid rgba(124,58,237,0.9)'
                    : '2px solid rgba(255,255,255,0.06)',
                  boxShadow: isActive
                    ? '0 0 0 1px rgba(124,58,237,0.4), 0 4px 16px rgba(0,0,0,0.5)'
                    : '0 2px 8px rgba(0,0,0,0.4)',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  overflow: 'hidden',
                }}
              >
                {/* Icon badge at bottom-right */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {preset.icon}
                </div>

                {/* Active glow overlay */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(124,58,237,0.12)',
                        borderRadius: 8,
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.38)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                }}
              >
                {preset.name}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
