import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { CanvasTransform, ImageLayer } from '../types/canvas'

/* ─── Types ─────────────────────────────────────────────────────── */

export interface CropRect {
  x: number   // image coords
  y: number
  w: number
  h: number
}

type HandleId = 'TL' | 'T' | 'TR' | 'R' | 'BR' | 'B' | 'BL' | 'L'

interface DragState {
  type: 'handle' | 'move'
  handle?: HandleId
  startImg: { x: number; y: number }  // pointer position in image coords at drag start
  startRect: CropRect                  // crop rect at drag start
}

interface CropOverlayProps {
  image: ImageLayer
  transform: CanvasTransform
  containerWidth: number
  containerHeight: number
  onConfirm: (rect: CropRect) => void
  onCancel: () => void
  onWheel: (e: WheelEvent, el: HTMLDivElement | null) => void
}

/* ─── Constants ─────────────────────────────────────────────────── */

const MIN_SIZE   = 20   // minimum crop dimension in image pixels
const HIT_RADIUS = 14   // handle hit area radius in screen pixels
const HANDLE_SIZE_CORNER = 10
const HANDLE_SIZE_EDGE   = 7

const HANDLE_CURSORS: Record<HandleId, string> = {
  TL: 'nwse-resize', TR: 'nesw-resize',
  BL: 'nesw-resize', BR: 'nwse-resize',
  T:  'ns-resize',   B:  'ns-resize',
  L:  'ew-resize',   R:  'ew-resize',
}

/* ─── Pure helpers ──────────────────────────────────────────────── */

/** Apply a handle drag delta (image coords) to a crop rect */
function applyHandle(r: CropRect, h: HandleId, dx: number, dy: number): CropRect {
  let { x, y, w, h: height } = r
  switch (h) {
    case 'TL': x += dx; y += dy; w -= dx; height -= dy; break
    case 'T':              y += dy;          height -= dy; break
    case 'TR':             y += dy; w += dx; height -= dy; break
    case 'R':                       w += dx;               break
    case 'BR':                      w += dx; height += dy; break
    case 'B':                                height += dy; break
    case 'BL': x += dx;            w -= dx; height += dy; break
    case 'L':  x += dx;            w -= dx;               break
  }
  return { x, y, w, h: height }
}

/** Clamp crop rect within image bounds and enforce minimum size */
function clampRect(r: CropRect, imgW: number, imgH: number): CropRect {
  let { x, y, w, h } = r
  if (w < MIN_SIZE) w = MIN_SIZE
  if (h < MIN_SIZE) h = MIN_SIZE
  if (x < 0) x = 0
  if (y < 0) y = 0
  if (x + w > imgW) { x = Math.max(0, imgW - w); w = Math.min(w, imgW) }
  if (y + h > imgH) { y = Math.max(0, imgH - h); h = Math.min(h, imgH) }
  return { x, y, w, h }
}

/* ─── Component ─────────────────────────────────────────────────── */

export function CropOverlay({
  image, transform, containerWidth, containerHeight, onConfirm, onCancel, onWheel,
}: CropOverlayProps) {
  const [cropRect, setCropRect] = useState<CropRect>({
    x: 0, y: 0, w: image.width, h: image.height,
  })
  const [cursor, setCursor]     = useState('crosshair')
  const [dragging, setDragging] = useState(false)

  const dragRef    = useRef<DragState | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  /* ── Coordinate helpers ─────────────────────────────────────────── */

  const toScreen = useCallback((ix: number, iy: number) => ({
    sx: ix * transform.scale + transform.x,
    sy: iy * transform.scale + transform.y,
  }), [transform])

  const toImage = useCallback((sx: number, sy: number) => ({
    x: (sx - transform.x) / transform.scale,
    y: (sy - transform.y) / transform.scale,
  }), [transform])

  /** Pointer position relative to the overlay div origin */
  const relativePos = useCallback((e: PointerEvent | React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  /* ── Derived screen geometry ────────────────────────────────────── */

  const { sx: cx, sy: cy } = toScreen(cropRect.x, cropRect.y)
  const cw = cropRect.w * transform.scale
  const ch = cropRect.h * transform.scale

  // All 8 handles in screen coords
  const handles: Record<HandleId, { x: number; y: number }> = {
    TL: { x: cx,      y: cy      },   T: { x: cx+cw/2, y: cy      },
    TR: { x: cx+cw,   y: cy      },   R: { x: cx+cw,   y: cy+ch/2 },
    BR: { x: cx+cw,   y: cy+ch   },   B: { x: cx+cw/2, y: cy+ch   },
    BL: { x: cx,      y: cy+ch   },   L: { x: cx,      y: cy+ch/2 },
  }

  /* ── Hit testing ────────────────────────────────────────────────── */

  const hitHandle = useCallback((px: number, py: number): HandleId | null => {
    for (const [id, pos] of Object.entries(handles)) {
      const dx = px - pos.x, dy = py - pos.y
      if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) return id as HandleId
    }
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, cy, cw, ch]) // handles derived from these

  const insideCrop = useCallback((px: number, py: number) =>
    px >= cx && px <= cx + cw && py >= cy && py <= cy + ch,
  [cx, cy, cw, ch])

  /* ── Pointer handlers ───────────────────────────────────────────── */

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const pos = relativePos(e)
    const handle = hitHandle(pos.x, pos.y)
    const imgPos = toImage(pos.x, pos.y)

    if (handle) {
      dragRef.current = { type: 'handle', handle, startImg: imgPos, startRect: { ...cropRect } }
    } else if (insideCrop(pos.x, pos.y)) {
      dragRef.current = { type: 'move', startImg: imgPos, startRect: { ...cropRect } }
    } else {
      return // click outside: ignore
    }

    overlayRef.current?.setPointerCapture(e.pointerId)
    setDragging(true)
  }, [cropRect, hitHandle, insideCrop, toImage, relativePos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const pos = relativePos(e)

    // Update cursor when not dragging
    if (!dragRef.current) {
      const h = hitHandle(pos.x, pos.y)
      if (h)                    setCursor(HANDLE_CURSORS[h])
      else if (insideCrop(pos.x, pos.y)) setCursor('move')
      else                              setCursor('crosshair')
      return
    }

    // Apply drag
    const imgPos = toImage(pos.x, pos.y)
    const dx = imgPos.x - dragRef.current.startImg.x
    const dy = imgPos.y - dragRef.current.startImg.y
    const sr = dragRef.current.startRect

    if (dragRef.current.type === 'move') {
      setCropRect(clampRect({
        x: sr.x + dx,
        y: sr.y + dy,
        w: sr.w,
        h: sr.h,
      }, image.width, image.height))
    } else if (dragRef.current.handle) {
      setCropRect(clampRect(
        applyHandle(sr, dragRef.current.handle, dx, dy),
        image.width, image.height,
      ))
    }
  }, [hitHandle, insideCrop, toImage, relativePos, image.width, image.height])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    setDragging(false)
  }, [])

  /* ── Wheel zoom passthrough ─────────────────────────────────────── */

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    const handler = (e: WheelEvent) => onWheel(e, el)
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [onWheel])

  /* ── Keyboard shortcuts ─────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.preventDefault(); onCancel() }
      if (e.code === 'Enter')  { e.preventDefault(); onConfirm(cropRect) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cropRect, onConfirm, onCancel])

  /* ── SVG overlay path (even-odd for hole) ───────────────────────── */

  const W = containerWidth, H = containerHeight
  // Outer rect (clockwise) + crop rect (clockwise) → evenodd creates the hole
  const overlayPath = [
    `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`,
    `M ${cx} ${cy} L ${cx+cw} ${cy} L ${cx+cw} ${cy+ch} L ${cx} ${cy+ch} Z`,
  ].join(' ')

  // Rule-of-thirds lines (inside crop, only while dragging)
  const t1x = cx + cw / 3,  t2x = cx + (2 * cw) / 3
  const t1y = cy + ch / 3,  t2y = cy + (2 * ch) / 3

  // Corner L-bracket length: 18px or 15% of side, whichever is smaller
  const BK = Math.min(18, cw * 0.15, ch * 0.15)
  const bracketPaths = [
    // TL
    `M ${cx} ${cy + BK} L ${cx} ${cy} L ${cx + BK} ${cy}`,
    // TR
    `M ${cx+cw-BK} ${cy} L ${cx+cw} ${cy} L ${cx+cw} ${cy+BK}`,
    // BR
    `M ${cx+cw} ${cy+ch-BK} L ${cx+cw} ${cy+ch} L ${cx+cw-BK} ${cy+ch}`,
    // BL
    `M ${cx+BK} ${cy+ch} L ${cx} ${cy+ch} L ${cx} ${cy+ch-BK}`,
  ]

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <>
      {/* ── Interaction layer ── */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-30"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* SVG: dark overlay + crop border + grid + corner brackets */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={W} height={H}
          style={{ overflow: 'visible' }}
        >
          {/* Dark vignette with hole */}
          <path d={overlayPath} fill="rgba(0,0,0,0.62)" fillRule="evenodd" />

          {/* Crop border (thin) */}
          <rect x={cx} y={cy} width={cw} height={ch}
            fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1} />

          {/* Rule-of-thirds grid — only while dragging */}
          {dragging && (
            <g stroke="rgba(255,255,255,0.22)" strokeWidth={0.75}>
              <line x1={t1x} y1={cy} x2={t1x} y2={cy+ch} />
              <line x1={t2x} y1={cy} x2={t2x} y2={cy+ch} />
              <line x1={cx} y1={t1y} x2={cx+cw} y2={t1y} />
              <line x1={cx} y1={t2y} x2={cx+cw} y2={t2y} />
            </g>
          )}

          {/* Corner L-brackets (bold, always visible) */}
          <g fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
            {bracketPaths.map((d, i) => <path key={i} d={d} />)}
          </g>
        </svg>

        {/* ── 8 handle knobs ── */}
        {(Object.entries(handles) as [HandleId, { x: number; y: number }][]).map(([id, pos]) => {
          const isCorner = ['TL', 'TR', 'BL', 'BR'].includes(id)
          const size = isCorner ? HANDLE_SIZE_CORNER : HANDLE_SIZE_EDGE
          return (
            <div
              key={id}
              className="absolute rounded-sm pointer-events-none"
              style={{
                width:  size,
                height: size,
                left:   pos.x - size / 2,
                top:    pos.y - size / 2,
                background: 'white',
                boxShadow: '0 0 0 1.5px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.5)',
                cursor: HANDLE_CURSORS[id],
              }}
            />
          )
        })}
      </div>

      {/* ── Floating confirm / cancel bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3"
        style={{
          background: 'rgba(8,8,8,0.82)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '7px 10px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Live dimensions */}
        <span
          className="font-mono tabular-nums select-none"
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}
        >
          {Math.round(cropRect.w)} × {Math.round(cropRect.h)} px
        </span>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />

        {/* Annuler */}
        <motion.button
          onClick={onCancel}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          Annuler  <kbd className="ml-1 text-[9px] opacity-40">Esc</kbd>
        </motion.button>

        {/* Confirmer */}
        <motion.button
          onClick={() => onConfirm(cropRect)}
          whileHover={{ scale: 1.04, background: '#6d28d9' }}
          whileTap={{ scale: 0.94 }}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{
            background: '#7c3aed',
            boxShadow: '0 0 18px rgba(124,58,237,0.45)',
            border: '1px solid rgba(167,139,250,0.2)',
          }}
        >
          Confirmer  <kbd className="ml-1 text-[9px] opacity-50">↵</kbd>
        </motion.button>
      </motion.div>
    </>
  )
}
