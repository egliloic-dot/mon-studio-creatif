import React, { useEffect, useRef, useCallback, useState, useLayoutEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Ellipse, RegularPolygon, Text, Transformer, Line, Star, Path as KonvaPath } from 'react-konva'
import Konva from 'konva'
import type { CanvasTransform, Layer as CanvasLayer, ImageLayer, TextLayer, DrawLayer, ShapeLayer, Tool } from '../types/canvas'
import { ExposureFilter, TemperatureFilter } from '../filters/konvaFilters'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FILTERS: any[] = [ExposureFilter, Konva.Filters.Contrast, Konva.Filters.HSL, TemperatureFilter]

const PROXY_MAX_PX = 800

/* ─── Transformer style shared by image + text nodes ─────────────── */

const TR_PROPS = {
  anchorFill: '#ffffff',
  anchorStroke: 'rgba(124,58,237,0.9)',
  anchorStrokeWidth: 1.5,
  anchorSize: 8,
  anchorCornerRadius: 2,
  borderStroke: 'rgba(124,58,237,0.7)',
  borderStrokeWidth: 1.5,
  borderDash: [5, 4],
  rotateAnchorOffset: 24,
  keepRatio: false,
  enabledAnchors: [
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
    'middle-left', 'middle-right',
  ] as Konva.TransformerConfig['enabledAnchors'],
  boundBoxFunc: (oldBox: Konva.Box, newBox: Konva.Box) =>
    (newBox.width < 20 || newBox.height < 10 ? oldBox : newBox),
}

/* ─── Props ──────────────────────────────────────────────────────── */

interface CanvasStageProps {
  layers: CanvasLayer[]
  activeLayerId: string | null
  selectedIds: string[]
  page: { width: number; height: number; fill: string }
  width: number
  height: number
  transform: CanvasTransform
  isPanningVisual: boolean
  cropActive: boolean
  stageRef: React.RefObject<Konva.Stage>
  onWheel: (e: WheelEvent, el: HTMLDivElement | null) => void
  onPanStart: (x: number, y: number) => void
  onPanUpdate: (x: number, y: number) => void
  onPanEnd: () => void
  isPanning: React.MutableRefObject<boolean>
  onLayerUpdate: (id: string, updates: Record<string, unknown>) => void
  onSelectLayer: (id: string, addToSelection?: boolean) => void
  onSelectLayers: (ids: string[]) => void
  onDeselectAll: () => void
  onMultiLayerUpdate: (updates: { id: string; x: number; y: number; scaleX?: number; scaleY?: number; rotation?: number }[]) => void
  activeTool: Tool
  brushColor: string
  brushSize: number
  onStrokeComplete: (points: number[]) => void
  hoveredLayerId: string | null
}

/* ─── Rubber-band helpers ────────────────────────────────────────── */

type Bbox = { x: number; y: number; w: number; h: number }

function getLayerBbox(layer: CanvasLayer): Bbox {
  if (layer.type === 'image' || layer.type === 'text') {
    return {
      x: layer.x,
      y: layer.y,
      w: (layer.width  || 0) * layer.scaleX,
      h: (layer.height || 0) * layer.scaleY,
    }
  }
  if (layer.type === 'shape') {
    const sl = layer as ShapeLayer
    const isTopLeft = sl.shapeType === 'rect' || sl.shapeType === 'arrow' || sl.shapeType === 'heart'
    if (isTopLeft) {
      return { x: sl.x, y: sl.y, w: sl.width * sl.scaleX, h: sl.height * sl.scaleY }
    }
    // circle / triangle / star — center-based
    const hw = (sl.width  * sl.scaleX) / 2
    const hh = (sl.height * sl.scaleY) / 2
    return { x: sl.x - hw, y: sl.y - hh, w: hw * 2, h: hh * 2 }
  }
  if (layer.type === 'draw') {
    const dl = layer as DrawLayer
    const xs = dl.points.filter((_, i) => i % 2 === 0).map(v => v + dl.x)
    const ys = dl.points.filter((_, i) => i % 2 === 1).map(v => v + dl.y)
    if (!xs.length) return { x: dl.x, y: dl.y, w: 0, h: 0 }
    const minX = Math.min(...xs); const maxX = Math.max(...xs)
    const minY = Math.min(...ys); const maxY = Math.max(...ys)
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  return { x: 0, y: 0, w: 0, h: 0 }
}

function rectsOverlap(a: Bbox, b: Bbox): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y
  )
}

/* ─── Smart-guide snap ───────────────────────────────────────────── */

type SnapMoveFn = (nx: number, ny: number, bboxW: number, bboxH: number, origin: 'top-left' | 'center') => { x: number; y: number }

const SNAP_THRESHOLD = 8 // canvas pixels

function computeSnap(
  layerId: string,
  nx: number, ny: number,
  bboxW: number, bboxH: number,
  origin: 'top-left' | 'center',
  layers: CanvasLayer[],
  page: { width: number; height: number },
): { x: number; y: number; gx: number[]; gy: number[] } {
  const bx  = origin === 'center' ? nx - bboxW / 2 : nx
  const by  = origin === 'center' ? ny - bboxH / 2 : ny
  const bmx = bx + bboxW / 2
  const bmy = by + bboxH / 2
  const brx = bx + bboxW
  const bry = by + bboxH

  const xT: number[] = [0, page.width / 2, page.width]
  const yT: number[] = [0, page.height / 2, page.height]
  for (const l of layers) {
    if (l.id === layerId || !l.visible) continue
    const b = getLayerBbox(l)
    xT.push(b.x, b.x + b.w / 2, b.x + b.w)
    yT.push(b.y, b.y + b.h / 2, b.y + b.h)
  }

  let bestDx = Infinity
  const gx: number[] = []
  for (const tx of xT) {
    for (const edge of [bx, bmx, brx]) {
      const d = tx - edge
      if (Math.abs(d) < SNAP_THRESHOLD) {
        if (Math.abs(d) < Math.abs(bestDx)) { bestDx = d; gx.length = 0; gx.push(tx) }
        else if (Math.abs(d) === Math.abs(bestDx) && !gx.includes(tx)) gx.push(tx)
      }
    }
  }

  let bestDy = Infinity
  const gy: number[] = []
  for (const ty of yT) {
    for (const edge of [by, bmy, bry]) {
      const d = ty - edge
      if (Math.abs(d) < SNAP_THRESHOLD) {
        if (Math.abs(d) < Math.abs(bestDy)) { bestDy = d; gy.length = 0; gy.push(ty) }
        else if (Math.abs(d) === Math.abs(bestDy) && !gy.includes(ty)) gy.push(ty)
      }
    }
  }

  const dx = isFinite(bestDx) ? bestDx : 0
  const dy = isFinite(bestDy) ? bestDy : 0
  const snappedX = origin === 'center' ? bx + dx + bboxW / 2 : bx + dx
  const snappedY = origin === 'center' ? by + dy + bboxH / 2 : by + dy

  return { x: snappedX, y: snappedY, gx: isFinite(bestDx) ? gx : [], gy: isFinite(bestDy) ? gy : [] }
}

/* ─── CanvasStage ────────────────────────────────────────────────── */

export function CanvasStage({
  layers, activeLayerId, selectedIds, page, width, height, transform,
  isPanningVisual, cropActive, stageRef,
  onWheel, onPanStart, onPanUpdate, onPanEnd, isPanning,
  onLayerUpdate, onSelectLayer, onSelectLayers, onDeselectAll, onMultiLayerUpdate,
  activeTool, brushColor, brushSize, onStrokeComplete,
  hoveredLayerId,
}: CanvasStageProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const isSpaceRef     = useRef(false)
  const [isSpaceDown, setIsSpaceDown] = useState(false)

  // Drawing state
  const isDrawingRef   = useRef(false)
  const drawPointsRef  = useRef<number[]>([])
  const rafDrawRef     = useRef<number | null>(null)
  const [livePoints, setLivePoints] = useState<number[]>([])
  const transformRef   = useRef(transform)

  // Rubber-band selection state
  const [rubberBand, setRubberBand] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const rubberBandStartRef = useRef<{ x: number; y: number } | null>(null)
  const isRubberBandingRef = useRef(false)

  // Smart guide lines state
  const [guideLines, setGuideLines] = useState<{ gx: number[]; gy: number[] }>({ gx: [], gy: [] })

  // Group drag: store start positions of all selected nodes
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  /**
   * suppressRef — true while Space is held OR for 2 animation frames after a pan ends.
   * Node click/drag handlers read this before acting so Space+click never selects
   * or drags a layer by accident.
   */
  const suppressRef = useRef(false)

  const isBrushMode = activeTool === 'brush'

  // Keep transformRef in sync for coordinate conversion without deps
  useEffect(() => { transformRef.current = transform }, [transform])

  // Snap callbacks — apply snapping to the dragged node and show guide lines
  const snapMove = useCallback((node: Konva.Node, layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (!layer) return
    const bbox = getLayerBbox(layer)
    let origin: 'top-left' | 'center' = 'top-left'
    if (layer.type === 'shape') {
      const isCentered = (layer as ShapeLayer).shapeType === 'circle' ||
                         (layer as ShapeLayer).shapeType === 'triangle' ||
                         (layer as ShapeLayer).shapeType === 'star'
      if (isCentered) origin = 'center'
    }
    const result = computeSnap(layerId, node.x(), node.y(), bbox.w, bbox.h, origin, layers, page)
    node.x(result.x)
    node.y(result.y)
    setGuideLines({ gx: result.gx, gy: result.gy })
    node.getLayer()?.batchDraw()
  }, [layers, page])

  const snapEnd = useCallback(() => {
    setGuideLines({ gx: [], gy: [] })
  }, [])

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left  - transformRef.current.x) / transformRef.current.scale,
      y: (clientY - rect.top   - transformRef.current.y) / transformRef.current.scale,
    }
  }, [])

  /* ── Space key → pan mode ─────────────────────────────────────── */

  useEffect(() => {
    const isEditingText = () => {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isSpaceRef.current || cropActive) return
      if (isEditingText()) return   // let the field receive the space character
      e.preventDefault()
      isSpaceRef.current = true
      suppressRef.current = true     // block Konva interactions while Space held
      setIsSpaceDown(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      isSpaceRef.current = false
      suppressRef.current = false
      setIsSpaceDown(false)
      if (isPanning.current) onPanEnd()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [isPanning, onPanEnd, cropActive])

  /* ── Cursor ───────────────────────────────────────────────────── */

  useEffect(() => {
    if (isPanningVisual)  document.body.style.cursor = 'grabbing'
    else if (isSpaceDown) document.body.style.cursor = 'grab'
    else if (isBrushMode) document.body.style.cursor = 'crosshair'
    else                  document.body.style.cursor = ''
    return () => { document.body.style.cursor = '' }
  }, [isPanningVisual, isSpaceDown, isBrushMode])

  /* ── Wheel ────────────────────────────────────────────────────── */

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => onWheel(e, el)
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [onWheel])

  /* ── HTML mouse handlers (pan) ────────────────────────────────── */

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isBrushMode && e.button === 0) {
      e.preventDefault()
      const pt = screenToCanvas(e.clientX, e.clientY)
      isDrawingRef.current = true
      drawPointsRef.current = [pt.x, pt.y]
      setLivePoints([pt.x, pt.y])
      return
    }
    if (e.button === 2 || (e.button === 0 && isSpaceRef.current)) {
      e.preventDefault()
      onPanStart(e.clientX, e.clientY)
      return
    }
    // Left click in select mode — check if we hit a konva node
    if (e.button === 0 && !isSpaceRef.current && !isBrushMode) {
      const stage = stageRef.current
      const container = containerRef.current
      if (!stage || !container) return
      const rect = container.getBoundingClientRect()
      // Position relative to the stage container (not canvas coordinates)
      const stagePos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const hit = stage.getIntersection(stagePos)
      // If no hit (empty canvas), start rubber-band
      if (!hit) {
        const pt = screenToCanvas(e.clientX, e.clientY)
        rubberBandStartRef.current = pt
        isRubberBandingRef.current = true
        setRubberBand({ x: pt.x, y: pt.y, w: 0, h: 0 })
      }
    }
  }, [isBrushMode, screenToCanvas, onPanStart, stageRef])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isBrushMode && isDrawingRef.current) {
      const pt = screenToCanvas(e.clientX, e.clientY)
      drawPointsRef.current.push(pt.x, pt.y)
      // rAF-throttle the state update (~60fps) while collecting every point
      if (rafDrawRef.current === null) {
        rafDrawRef.current = requestAnimationFrame(() => {
          rafDrawRef.current = null
          setLivePoints(drawPointsRef.current.slice())
        })
      }
      return
    }
    if (isRubberBandingRef.current && rubberBandStartRef.current) {
      const pt = screenToCanvas(e.clientX, e.clientY)
      const sx = rubberBandStartRef.current.x
      const sy = rubberBandStartRef.current.y
      setRubberBand({
        x: Math.min(sx, pt.x),
        y: Math.min(sy, pt.y),
        w: Math.abs(pt.x - sx),
        h: Math.abs(pt.y - sy),
      })
      return
    }
    if (isPanning.current) onPanUpdate(e.clientX, e.clientY)
  }, [isBrushMode, screenToCanvas, isPanning, onPanUpdate])

  const onMouseUp = useCallback((e?: React.MouseEvent) => {
    if (isBrushMode && isDrawingRef.current) {
      isDrawingRef.current = false
      if (rafDrawRef.current !== null) {
        cancelAnimationFrame(rafDrawRef.current)
        rafDrawRef.current = null
      }
      if (drawPointsRef.current.length >= 4) {
        onStrokeComplete(drawPointsRef.current.slice())
      }
      drawPointsRef.current = []
      setLivePoints([])
      return
    }
    if (isRubberBandingRef.current) {
      isRubberBandingRef.current = false
      const rb = rubberBand
      setRubberBand(null)
      rubberBandStartRef.current = null
      if (rb && (rb.w > 4 || rb.h > 4)) {
        // Find all layers whose bbox intersects the rubber-band rect
        const addShift = e?.shiftKey ?? false
        const ids: string[] = []
        for (const layer of layers) {
          if (!layer.visible || layer.locked) continue
          const bbox = getLayerBbox(layer)
          if (rectsOverlap(rb, bbox)) ids.push(layer.id)
        }
        if (ids.length > 0) {
          if (addShift) {
            const merged = Array.from(new Set([...(selectedIds ?? []), ...ids]))
            onSelectLayers(merged)
          } else {
            onSelectLayers(ids)
          }
        }
      }
      return
    }
    if (isPanning.current) {
      onPanEnd()
      // Keep interactions suppressed for 2 frames so the trailing click event
      // (which Konva may fire after mouseup) is silently dropped.
      suppressRef.current = true
      requestAnimationFrame(() => requestAnimationFrame(() => {
        suppressRef.current = false
      }))
    }
  }, [isBrushMode, isPanning, onPanEnd, onStrokeComplete, rubberBand, layers, selectedIds, onSelectLayers])

  const onContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), [])

  const gridSize = Math.max(6, Math.min(64, 24 * transform.scale))


  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={e => onMouseUp(e)}
      onMouseLeave={() => onMouseUp()}
      onContextMenu={onContextMenu}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #2a2a2e 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${transform.x % gridSize}px ${transform.y % gridSize}px`,
        }}
      />
      {/* Radial vignette — makes the center feel like the "stage" */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 65% at 50% 50%, transparent 55%, rgba(5,5,6,0.55) 100%)',
        }}
      />

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={transform.x}
        y={transform.y}
        scaleX={transform.scale}
        scaleY={transform.scale}
        listening={true}
        onClick={(e) => {
          if (suppressRef.current) return
          if (e.target === e.currentTarget) onDeselectAll()
        }}
        onTap={(e) => {
          if (suppressRef.current) return
          if (e.target === e.currentTarget) onDeselectAll()
        }}
      >
        <Layer imageSmoothingEnabled={true}>
          {/* Page shadow (rendered below the page rect) */}
          <Rect
            x={8 / transform.scale}
            y={12 / transform.scale}
            width={page.width}
            height={page.height}
            fill="rgba(0,0,0,0)"
            shadowColor="rgba(0,0,0,0.55)"
            shadowBlur={60 / transform.scale}
            shadowOffsetX={0}
            shadowOffsetY={4 / transform.scale}
            shadowOpacity={1}
            listening={false}
            cornerRadius={2 / transform.scale}
          />
          {/* Page — the artboard, non-interactive, always behind layers */}
          <Rect
            x={0}
            y={0}
            width={page.width}
            height={page.height}
            fill={page.fill}
            listening={false}
          />


          {/* All visible layers, bottom → top */}
          {layers.map(layer => {
            if (!layer.visible) return null
            const isActive   = layer.id === activeLayerId
            const isSelected = selectedIds.includes(layer.id)
            const isHovered  = layer.id === hoveredLayerId && !isActive && !isSelected
            const s          = transform.scale

            const handleSelect = (addToSelection: boolean) => {
              if (layer.locked) return
              onSelectLayer(layer.id, addToSelection)
            }

            const handleGroupDragStart = (nodeX: number, nodeY: number) => {
              // Capture start positions of ALL selected nodes
              dragStartPositionsRef.current.clear()
              dragStartPositionsRef.current.set(layer.id, { x: nodeX, y: nodeY })
              for (const id of selectedIds) {
                if (id === layer.id) continue
                const node = stageRef.current?.findOne('#' + id) as Konva.Node | undefined
                if (node) dragStartPositionsRef.current.set(id, { x: node.x(), y: node.y() })
              }
            }

            const handleGroupDragMove = (dx: number, dy: number) => {
              if (selectedIds.length <= 1) return
              for (const id of selectedIds) {
                if (id === layer.id) continue
                const node = stageRef.current?.findOne('#' + id) as Konva.Node | undefined
                const start = dragStartPositionsRef.current.get(id)
                if (node && start) {
                  node.x(start.x + dx)
                  node.y(start.y + dy)
                }
              }
            }

            const handleGroupDragEnd = (finalX: number, finalY: number) => {
              if (selectedIds.length <= 1) return
              const start = dragStartPositionsRef.current.get(layer.id)
              if (!start) return
              const dx = finalX - start.x
              const dy = finalY - start.y
              const updates = selectedIds.map(id => {
                const s2 = dragStartPositionsRef.current.get(id)
                return { id, x: (s2?.x ?? 0) + dx, y: (s2?.y ?? 0) + dy }
              })
              onMultiLayerUpdate(updates)
            }

            return (
              <React.Fragment key={layer.id}>
                {layer.type === 'image' && (
                  <KonvaImageNode
                    layer={layer}
                    isActive={isActive}
                    isBrushMode={isBrushMode}
                    suppressRef={suppressRef}
                    onSelect={handleSelect}
                    onUpdate={u => onLayerUpdate(layer.id, u)}
                    onGroupDragStart={handleGroupDragStart}
                    onGroupDragMove={handleGroupDragMove}
                    onGroupDragEnd={handleGroupDragEnd}
                    isInGroup={isSelected && selectedIds.length > 1}
                    onSnapMove={snapMove}
                    onSnapEnd={snapEnd}
                  />
                )}
                {layer.type === 'text' && (
                  <KonvaTextNode
                    layer={layer}
                    isActive={isActive}
                    isBrushMode={isBrushMode}
                    suppressRef={suppressRef}
                    onSelect={handleSelect}
                    onUpdate={u => onLayerUpdate(layer.id, u)}
                    onGroupDragStart={handleGroupDragStart}
                    onGroupDragMove={handleGroupDragMove}
                    onGroupDragEnd={handleGroupDragEnd}
                    isInGroup={isSelected && selectedIds.length > 1}
                    onSnapMove={snapMove}
                    onSnapEnd={snapEnd}
                  />
                )}
                {layer.type === 'draw' && (
                  <KonvaDrawNode
                    layer={layer}
                    isActive={isActive}
                    suppressRef={suppressRef}
                    onSelect={handleSelect}
                    onUpdate={u => onLayerUpdate(layer.id, u)}
                    onGroupDragStart={handleGroupDragStart}
                    onGroupDragMove={handleGroupDragMove}
                    onGroupDragEnd={handleGroupDragEnd}
                    isInGroup={isSelected && selectedIds.length > 1}
                    onSnapMove={snapMove}
                    onSnapEnd={snapEnd}
                  />
                )}
                {layer.type === 'shape' && (
                  <KonvaShapeNode
                    layer={layer}
                    isActive={isActive}
                    suppressRef={suppressRef}
                    onSelect={handleSelect}
                    onUpdate={u => onLayerUpdate(layer.id, u)}
                    onGroupDragStart={handleGroupDragStart}
                    onGroupDragMove={handleGroupDragMove}
                    onGroupDragEnd={handleGroupDragEnd}
                    isInGroup={isSelected && selectedIds.length > 1}
                    onSnapMove={snapMove}
                    onSnapEnd={snapEnd}
                  />
                )}

                {/* Hover highlight — dashed purple outline */}
                {isHovered && layer.type === 'image' && (
                  <Rect
                    x={layer.x}
                    y={layer.y}
                    width={layer.width}
                    height={layer.height}
                    rotation={layer.rotation}
                    scaleX={layer.scaleX}
                    scaleY={layer.scaleY}
                    fill="rgba(124,58,237,0.06)"
                    stroke="rgba(167,139,250,0.7)"
                    strokeWidth={2 / s}
                    dash={[6 / s, 4 / s]}
                    listening={false}
                  />
                )}
                {isHovered && layer.type === 'text' && layer.width > 0 && (
                  <Rect
                    x={layer.x}
                    y={layer.y}
                    width={layer.width}
                    height={layer.height}
                    rotation={layer.rotation}
                    scaleX={layer.scaleX}
                    scaleY={layer.scaleY}
                    fill="rgba(124,58,237,0.06)"
                    stroke="rgba(167,139,250,0.7)"
                    strokeWidth={2 / s}
                    dash={[6 / s, 4 / s]}
                    listening={false}
                  />
                )}
                {isHovered && layer.type === 'shape' && (() => {
                  const isTopLeft = layer.shapeType === 'rect' || layer.shapeType === 'arrow' || layer.shapeType === 'heart'
                  const cx = isTopLeft ? layer.x : layer.x - (layer.width  * layer.scaleX) / 2
                  const cy = isTopLeft ? layer.y : layer.y - (layer.height * layer.scaleY) / 2
                  return (
                    <Rect
                      x={cx} y={cy}
                      width={layer.width  * layer.scaleX}
                      height={layer.height * layer.scaleY}
                      rotation={layer.rotation}
                      fill="rgba(124,58,237,0.06)"
                      stroke="rgba(167,139,250,0.7)"
                      strokeWidth={2 / s}
                      dash={[6 / s, 4 / s]}
                      listening={false}
                    />
                  )
                })()}
                {isHovered && layer.type === 'draw' && layer.points.length >= 4 && (() => {
                  const xs = layer.points.filter((_, i) => i % 2 === 0)
                  const ys = layer.points.filter((_, i) => i % 2 === 1)
                  const minX = Math.min(...xs) + layer.x
                  const minY = Math.min(...ys) + layer.y
                  const maxX = Math.max(...xs) + layer.x
                  const maxY = Math.max(...ys) + layer.y
                  const pad  = layer.strokeWidth / 2
                  return (
                    <Rect
                      x={minX - pad}
                      y={minY - pad}
                      width={maxX - minX + pad * 2}
                      height={maxY - minY + pad * 2}
                      fill="rgba(124,58,237,0.04)"
                      stroke="rgba(167,139,250,0.6)"
                      strokeWidth={2 / s}
                      dash={[6 / s, 4 / s]}
                      listening={false}
                    />
                  )
                })()}
              </React.Fragment>
            )
          })}


          {/* Smart guide lines — shown during drag, never exported */}
          {guideLines.gx.map((gx, i) => (
            <Line
              key={`guide-x-${i}`}
              points={[gx, -10000, gx, 10000]}
              stroke="rgba(124,58,237,0.8)"
              strokeWidth={1 / transform.scale}
              dash={[4 / transform.scale, 4 / transform.scale]}
              listening={false}
            />
          ))}
          {guideLines.gy.map((gy, i) => (
            <Line
              key={`guide-y-${i}`}
              points={[-10000, gy, 10000, gy]}
              stroke="rgba(124,58,237,0.8)"
              strokeWidth={1 / transform.scale}
              dash={[4 / transform.scale, 4 / transform.scale]}
              listening={false}
            />
          ))}

          {/* Rubber-band selection rect */}
          {rubberBand && rubberBand.w > 2 && rubberBand.h > 2 && (
            <Rect
              x={rubberBand.x}
              y={rubberBand.y}
              width={rubberBand.w}
              height={rubberBand.h}
              fill="rgba(124,58,237,0.08)"
              stroke="rgba(124,58,237,0.7)"
              strokeWidth={1.5 / transform.scale}
              dash={[6 / transform.scale, 4 / transform.scale]}
              listening={false}
            />
          )}

          {/* Multi-selection Transformer (when 2+ nodes selected) */}
          {selectedIds.length > 1 && (
            <SelectionTransformer
              selectedIds={selectedIds}
              stageRef={stageRef}
              onMultiLayerUpdate={onMultiLayerUpdate}
              layers={layers}
            />
          )}

          {/* Live in-progress brush stroke */}
          {livePoints.length >= 4 && (
            <Line
              points={livePoints}
              stroke={brushColor}
              strokeWidth={brushSize}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              listening={false}
              globalCompositeOperation="source-over"
            />
          )}

          {/* Empty state hint */}
          {layers.length === 0 && (
            <Text
              x={0} y={0}
              width={width / transform.scale}
              height={height / transform.scale}
              text="Dépose une image ou utilise Fichier → Ouvrir"
              fontSize={15 / transform.scale}
              fill="#374151"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

/* ─── SelectionTransformer (multi-select) ────────────────────────── */

interface SelectionTransformerProps {
  selectedIds: string[]
  stageRef: React.RefObject<Konva.Stage>
  layers: CanvasLayer[]
  onMultiLayerUpdate: (updates: { id: string; x: number; y: number; scaleX?: number; scaleY?: number; rotation?: number }[]) => void
}

function SelectionTransformer({ selectedIds, stageRef, onMultiLayerUpdate }: SelectionTransformerProps) {
  const trRef = useRef<Konva.Transformer>(null)

  useLayoutEffect(() => {
    const stage = stageRef.current
    const tr    = trRef.current
    if (!stage || !tr) return
    const nodes = selectedIds
      .map(id => stage.findOne('#' + id) as Konva.Node | undefined)
      .filter(Boolean) as Konva.Node[]
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds, stageRef])

  return (
    <Transformer
      ref={trRef}
      {...TR_PROPS}
      onTransformEnd={() => {
        const tr = trRef.current
        if (!tr) return
        const updates = tr.nodes().map(node => ({
          id:       node.id(),
          x:        node.x(),
          y:        node.y(),
          scaleX:   node.scaleX(),
          scaleY:   node.scaleY(),
          rotation: node.rotation(),
        }))
        onMultiLayerUpdate(updates)
      }}
      onDragEnd={() => {
        const tr = trRef.current
        if (!tr) return
        const updates = tr.nodes().map(node => ({
          id:       node.id(),
          x:        node.x(),
          y:        node.y(),
          scaleX:   node.scaleX(),
          scaleY:   node.scaleY(),
          rotation: node.rotation(),
        }))
        onMultiLayerUpdate(updates)
      }}
    />
  )
}

/* ─── KonvaImageNode ─────────────────────────────────────────────── */

interface ImageNodeProps {
  layer: ImageLayer
  isActive: boolean
  isBrushMode: boolean
  suppressRef: React.MutableRefObject<boolean>
  onSelect: (addToSelection: boolean) => void
  onUpdate: (updates: Record<string, unknown>) => void
  onGroupDragStart?: (x: number, y: number) => void
  onGroupDragMove?: (dx: number, dy: number) => void
  onGroupDragEnd?: (finalX: number, finalY: number) => void
  isInGroup?: boolean
  onSnapMove?: (node: Konva.Node, layerId: string) => void
  onSnapEnd?: () => void
}

function KonvaImageNode({ layer, isActive, isBrushMode, suppressRef, onSelect, onUpdate, onGroupDragStart, onGroupDragMove, onGroupDragEnd, isInGroup, onSnapMove, onSnapEnd }: ImageNodeProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const nodeRef = useRef<Konva.Image>(null)
  const trRef   = useRef<Konva.Transformer>(null)
  const rafRef  = useRef<number | null>(null)

  /* ── 1. Load image ──────────────────────────────────────────────── */
  useEffect(() => {
    const el = new window.Image()
    el.onload = () => setImg(el)
    el.src = layer.src
    return () => {
      el.onload = null
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [layer.src])

  /* ── 2. Low-res proxy cache — only when adjustments are non-zero ── */
  const { adjustments } = layer
  const hasAdjustments = adjustments.exposure !== 0 || adjustments.contrast !== 0
    || adjustments.saturation !== 0 || adjustments.temperature !== 0

  useEffect(() => {
    if (!img || !nodeRef.current) return
    if (!hasAdjustments) {
      // No adjustments → clear any stale cache so the image renders natively
      nodeRef.current.clearCache()
      nodeRef.current.getLayer()?.batchDraw()
      return
    }
    const maxDim = Math.max(layer.width, layer.height)
    nodeRef.current.cache({ pixelRatio: Math.min(1, PROXY_MAX_PX / maxDim) })
  }, [img, layer.width, layer.height, hasAdjustments])

  /* ── 3. rAF-throttled filter attrs — skipped when no adjustments ── */
  useEffect(() => {
    if (!img || !nodeRef.current || !hasAdjustments) return
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    const node = nodeRef.current
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      node.setAttrs({
        exposure:    adjustments.exposure    / 100,
        contrast:    adjustments.contrast,
        saturation:  adjustments.saturation  / 50,
        temperature: adjustments.temperature,
      })
      node.getLayer()?.batchDraw()
    })
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [img, adjustments, layer.width, layer.height, hasAdjustments])

  /* ── 4. Attach Transformer when active ─────────────────────────── */
  useLayoutEffect(() => {
    if (!trRef.current || !nodeRef.current) return
    trRef.current.nodes([nodeRef.current])
    trRef.current.getLayer()?.batchDraw()
  }, [isActive])

  /* ── 5. Sync Transformer position after undo/redo prop changes ── */
  useEffect(() => {
    if (!isActive || !trRef.current) return
    trRef.current.forceUpdate()
    trRef.current.getLayer()?.batchDraw()
  }, [isActive, layer.x, layer.y, layer.scaleX, layer.scaleY, layer.rotation, layer.width, layer.height])

  if (!img) return null

  return (
    <>
      <KonvaImage
        ref={nodeRef}
        image={img}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        scaleX={layer.scaleX}
        scaleY={layer.scaleY}
        opacity={layer.opacity}
        filters={hasAdjustments ? FILTERS : undefined}
        globalCompositeOperation={layer.blendMode}
        draggable={!isBrushMode && !layer.locked}
        id={layer.id}
        // Select on click (guarded against Space+click pan)
        onClick={e => {
          if (suppressRef.current || layer.locked) return
          onSelect(e.evt.shiftKey)
        }}
        onTap={e => {
          if (suppressRef.current || layer.locked) return
          onSelect(e.evt.shiftKey)
        }}
        // Drag to move — also selects if not already active
        onDragStart={e => {
          if (suppressRef.current || isBrushMode || layer.locked) {
            e.target.stopDrag()
            return
          }
          if (!isActive && !isInGroup) onSelect(false)
          onGroupDragStart?.(e.target.x(), e.target.y())
        }}
        onDragMove={e => {
          if (!suppressRef.current && !isBrushMode && !layer.locked && isInGroup) {
            onGroupDragMove?.(e.target.x() - layer.x, e.target.y() - layer.y)
          } else if (!isInGroup) {
            onSnapMove?.(e.target, layer.id)
          }
        }}
        onDragEnd={e => {
          onSnapEnd?.()
          if (isInGroup) {
            onGroupDragEnd?.(e.target.x(), e.target.y())
          } else {
            onUpdate({ x: e.target.x(), y: e.target.y() })
          }
        }}
        // Transformer resize / rotate
        onTransformEnd={e => {
          const node = e.target as Konva.Image
          onUpdate({
            x:        node.x(),
            y:        node.y(),
            scaleX:   node.scaleX(),
            scaleY:   node.scaleY(),
            rotation: node.rotation(),
          })
        }}
      />

      {/* Transformer — purple-themed, appears when layer is selected */}
      {isActive && (
        <Transformer ref={trRef} {...TR_PROPS} />
      )}
    </>
  )
}

/* ─── KonvaTextNode ──────────────────────────────────────────────── */

interface TextNodeProps {
  layer: TextLayer
  isActive: boolean
  isBrushMode: boolean
  suppressRef: React.MutableRefObject<boolean>
  onSelect: (addToSelection: boolean) => void
  onUpdate: (updates: Record<string, unknown>) => void
  onGroupDragStart?: (x: number, y: number) => void
  onGroupDragMove?: (dx: number, dy: number) => void
  onGroupDragEnd?: (finalX: number, finalY: number) => void
  isInGroup?: boolean
  onSnapMove?: (node: Konva.Node, layerId: string) => void
  onSnapEnd?: () => void
}

function KonvaTextNode({ layer, isActive, isBrushMode, suppressRef, onSelect, onUpdate, onGroupDragStart, onGroupDragMove, onGroupDragEnd, isInGroup, onSnapMove, onSnapEnd }: TextNodeProps) {
  const nodeRef = useRef<Konva.Text>(null)
  const trRef   = useRef<Konva.Transformer>(null)

  useLayoutEffect(() => {
    if (!trRef.current || !nodeRef.current) return
    trRef.current.nodes([nodeRef.current])
    trRef.current.getLayer()?.batchDraw()
  }, [isActive])

  useEffect(() => {
    if (!isActive || !trRef.current) return
    trRef.current.forceUpdate()
    trRef.current.getLayer()?.batchDraw()
  }, [isActive, layer.x, layer.y, layer.scaleX, layer.scaleY, layer.rotation])

  return (
    <>
      <Text
        ref={nodeRef}
        x={layer.x}
        y={layer.y}
        text={layer.text}
        fontSize={layer.fontSize}
        fontFamily={layer.fontFamily}
        fontStyle={layer.fontStyle}
        fill={layer.fill}
        align={layer.align}
        opacity={layer.opacity}
        visible={layer.visible}
        rotation={layer.rotation}
        scaleX={layer.scaleX}
        scaleY={layer.scaleY}
        globalCompositeOperation={layer.blendMode}
        draggable={!isBrushMode && !layer.locked}
        id={layer.id}
        perfectDrawEnabled={false}
        onClick={e => {
          if (suppressRef.current || layer.locked) return
          onSelect(e.evt.shiftKey)
        }}
        onTap={e => {
          if (suppressRef.current || layer.locked) return
          onSelect(e.evt.shiftKey)
        }}
        onDragStart={e => {
          if (suppressRef.current || isBrushMode || layer.locked) {
            e.target.stopDrag()
            return
          }
          if (!isActive && !isInGroup) onSelect(false)
          onGroupDragStart?.(e.target.x(), e.target.y())
        }}
        onDragMove={e => {
          if (!suppressRef.current && !isBrushMode && !layer.locked && isInGroup) {
            onGroupDragMove?.(e.target.x() - layer.x, e.target.y() - layer.y)
          } else if (!isInGroup) {
            onSnapMove?.(e.target, layer.id)
          }
        }}
        onDragEnd={e => {
          onSnapEnd?.()
          if (isInGroup) {
            onGroupDragEnd?.(e.target.x(), e.target.y())
          } else {
            onUpdate({ x: e.target.x(), y: e.target.y() })
          }
        }}
        onTransformEnd={e => {
          const node = e.target as Konva.Text
          onUpdate({
            x:        node.x(),
            y:        node.y(),
            scaleX:   node.scaleX(),
            scaleY:   node.scaleY(),
            rotation: node.rotation(),
          })
        }}
      />

      {isActive && (
        <Transformer ref={trRef} {...TR_PROPS} />
      )}
    </>
  )
}

/* ─── KonvaDrawNode ──────────────────────────────────────────────── */

interface DrawNodeProps {
  layer: DrawLayer
  isActive: boolean
  suppressRef: React.MutableRefObject<boolean>
  onSelect: (addToSelection: boolean) => void
  onUpdate: (updates: Record<string, unknown>) => void
  onGroupDragStart?: (x: number, y: number) => void
  onGroupDragMove?: (dx: number, dy: number) => void
  onGroupDragEnd?: (finalX: number, finalY: number) => void
  isInGroup?: boolean
  onSnapMove?: (node: Konva.Node, layerId: string) => void
  onSnapEnd?: () => void
}

function KonvaDrawNode({ layer, isActive, suppressRef, onSelect, onUpdate, onGroupDragStart, onGroupDragMove, onGroupDragEnd, isInGroup, onSnapMove, onSnapEnd }: DrawNodeProps) {
  const nodeRef = useRef<Konva.Line>(null)
  const trRef   = useRef<Konva.Transformer>(null)

  // Attach Transformer to node when active
  useLayoutEffect(() => {
    if (!trRef.current || !nodeRef.current) return
    trRef.current.nodes(isActive ? [nodeRef.current] : [])
    trRef.current.getLayer()?.batchDraw()
  }, [isActive])

  // Sync Transformer after undo/redo prop changes
  useEffect(() => {
    if (!isActive || !trRef.current) return
    trRef.current.forceUpdate()
    trRef.current.getLayer()?.batchDraw()
  }, [isActive, layer.x, layer.y, layer.scaleX, layer.scaleY, layer.rotation])

  return (
    <>
      <Line
        ref={nodeRef}
        x={layer.x}
        y={layer.y}
        scaleX={layer.scaleX}
        scaleY={layer.scaleY}
        rotation={layer.rotation}
        points={layer.points}
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth}
        tension={layer.tension}
        lineCap="round"
        lineJoin="round"
        opacity={layer.opacity}
        visible={layer.visible}
        globalCompositeOperation={layer.blendMode}
        id={layer.id}
        draggable={!layer.locked}
        hitStrokeWidth={Math.max(layer.strokeWidth, 20)}
        onClick={e => { if (suppressRef.current || layer.locked) return; onSelect(e.evt.shiftKey) }}
        onTap={e =>   { if (suppressRef.current || layer.locked) return; onSelect(e.evt.shiftKey) }}
        onDragStart={e => {
          if (suppressRef.current || layer.locked) { e.target.stopDrag(); return }
          if (!isActive && !isInGroup) onSelect(false)
          onGroupDragStart?.(e.target.x(), e.target.y())
        }}
        onDragMove={e => {
          if (isInGroup) {
            onGroupDragMove?.(e.target.x() - layer.x, e.target.y() - layer.y)
          } else {
            onSnapMove?.(e.target, layer.id)
          }
        }}
        onDragEnd={e => {
          onSnapEnd?.()
          if (isInGroup) {
            onGroupDragEnd?.(e.target.x(), e.target.y())
          } else {
            onUpdate({ x: e.target.x(), y: e.target.y() })
          }
        }}
        onTransformEnd={e => {
          const node = e.target as Konva.Line
          onUpdate({
            x:        node.x(),
            y:        node.y(),
            scaleX:   node.scaleX(),
            scaleY:   node.scaleY(),
            rotation: node.rotation(),
          })
        }}
      />

      {/* Transformer — always mounted, nodes set conditionally */}
      <Transformer ref={trRef} {...TR_PROPS} />
    </>
  )
}

/* ─── KonvaShapeNode ─────────────────────────────────────────────── */


interface ShapeNodeProps {
  layer: ShapeLayer
  isActive: boolean
  suppressRef: React.MutableRefObject<boolean>
  onSelect: (addToSelection: boolean) => void
  onUpdate: (updates: Record<string, unknown>) => void
  onGroupDragStart?: (x: number, y: number) => void
  onGroupDragMove?: (dx: number, dy: number) => void
  onGroupDragEnd?: (finalX: number, finalY: number) => void
  isInGroup?: boolean
  onSnapMove?: (node: Konva.Node, layerId: string) => void
  onSnapEnd?: () => void
}

function KonvaShapeNode({ layer, isActive, suppressRef, onSelect, onUpdate, onGroupDragStart, onGroupDragMove, onGroupDragEnd, isInGroup, onSnapMove, onSnapEnd }: ShapeNodeProps) {
  const rectRef    = useRef<Konva.Rect>(null)
  const ellipseRef = useRef<Konva.Ellipse>(null)
  const polyRef    = useRef<Konva.RegularPolygon>(null)
  const starRef    = useRef<Konva.Star>(null)
  const pathRef    = useRef<Konva.Path>(null)
  const trRef      = useRef<Konva.Transformer>(null)

  // Resolve the currently active node ref
  const nodeRef = (layer.shapeType === 'rect'     ? rectRef
                : layer.shapeType === 'circle'   ? ellipseRef
                : layer.shapeType === 'triangle' ? polyRef
                : layer.shapeType === 'star'     ? starRef
                : pathRef) as React.RefObject<Konva.Node>  // arrow | heart → KonvaPath

  // Attach Transformer when active — same pattern as KonvaImageNode
  useLayoutEffect(() => {
    if (!isActive || !trRef.current || !nodeRef.current) return
    trRef.current.nodes([nodeRef.current as Konva.Node])
    trRef.current.getLayer()?.batchDraw()
  }, [isActive, nodeRef])

  // Sync Transformer after undo/redo prop changes
  useEffect(() => {
    if (!isActive || !trRef.current) return
    trRef.current.forceUpdate()
    trRef.current.getLayer()?.batchDraw()
  }, [isActive, layer.x, layer.y, layer.scaleX, layer.scaleY, layer.rotation])

  const common = {
    opacity:    layer.opacity,
    visible:    layer.visible,
    rotation:   layer.rotation,
    scaleX:     layer.scaleX,
    scaleY:     layer.scaleY,
    fill:       layer.fill === 'transparent' ? 'transparent' : layer.fill,
    stroke:     layer.strokeWidth > 0 ? layer.stroke : undefined,
    strokeWidth: layer.strokeWidth,
    globalCompositeOperation: layer.blendMode as Konva.NodeConfig['globalCompositeOperation'],
    id:         layer.id,
    draggable:  !layer.locked,
    hitStrokeWidth: Math.max(layer.strokeWidth, 10) as number,
    onClick:    (e: Konva.KonvaEventObject<MouseEvent>) => { if (suppressRef.current || layer.locked) return; onSelect(e.evt.shiftKey) },
    onTap:      (e: Konva.KonvaEventObject<TouchEvent>) => { if (suppressRef.current || layer.locked) return; onSelect(e.evt.shiftKey) },
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      if (suppressRef.current || layer.locked) { e.target.stopDrag(); return }
      if (!isActive && !isInGroup) onSelect(false)
      onGroupDragStart?.(e.target.x(), e.target.y())
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      if (isInGroup) {
        onGroupDragMove?.(e.target.x() - layer.x, e.target.y() - layer.y)
      } else {
        onSnapMove?.(e.target, layer.id)
      }
    },
    onDragEnd:  (e: Konva.KonvaEventObject<DragEvent>) => {
      onSnapEnd?.()
      if (isInGroup) {
        onGroupDragEnd?.(e.target.x(), e.target.y())
      } else {
        onUpdate({ x: e.target.x(), y: e.target.y() })
      }
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target
      onUpdate({
        x: node.x(), y: node.y(),
        scaleX: node.scaleX(), scaleY: node.scaleY(),
        rotation: node.rotation(),
      })
    },
  }

  return (
    <>
      {layer.shapeType === 'rect' && (
        <Rect
          ref={rectRef}
          x={layer.x} y={layer.y}
          width={layer.width} height={layer.height}
          cornerRadius={4}
          {...common}
        />
      )}
      {layer.shapeType === 'circle' && (
        <Ellipse
          ref={ellipseRef}
          x={layer.x} y={layer.y}
          radiusX={layer.width  / 2}
          radiusY={layer.height / 2}
          {...common}
        />
      )}
      {layer.shapeType === 'triangle' && (
        <RegularPolygon
          ref={polyRef}
          x={layer.x} y={layer.y}
          sides={3}
          radius={Math.min(layer.width, layer.height) / 2}
          {...common}
        />
      )}
      {layer.shapeType === 'star' && (
        <Star
          ref={starRef}
          x={layer.x} y={layer.y}
          numPoints={5}
          outerRadius={layer.width / 2}
          innerRadius={layer.width * 0.4}
          {...common}
        />
      )}
      {layer.shapeType === 'arrow' && (
        <KonvaPath
          ref={pathRef}
          x={layer.x} y={layer.y}
          data={`M 0 ${layer.height*0.35} L ${layer.width*0.58} ${layer.height*0.35} L ${layer.width*0.58} ${layer.height*0.1} L ${layer.width} ${layer.height*0.5} L ${layer.width*0.58} ${layer.height*0.9} L ${layer.width*0.58} ${layer.height*0.65} L 0 ${layer.height*0.65} Z`}
          {...common}
        />
      )}
      {layer.shapeType === 'heart' && (
        <KonvaPath
          ref={pathRef}
          x={layer.x} y={layer.y}
          data={`M ${layer.width*0.5} ${layer.height*0.26} C ${layer.width*0.5} ${layer.height*0.15} ${layer.width*0.38} ${layer.height*0.04} ${layer.width*0.25} ${layer.height*0.04} C ${layer.width*0.12} ${layer.height*0.04} 0 ${layer.height*0.16} 0 ${layer.height*0.32} C 0 ${layer.height*0.6} ${layer.width*0.24} ${layer.height*0.76} ${layer.width*0.5} ${layer.height*0.92} C ${layer.width*0.76} ${layer.height*0.76} ${layer.width} ${layer.height*0.6} ${layer.width} ${layer.height*0.32} C ${layer.width} ${layer.height*0.16} ${layer.width*0.88} ${layer.height*0.04} ${layer.width*0.75} ${layer.height*0.04} C ${layer.width*0.62} ${layer.height*0.04} ${layer.width*0.5} ${layer.height*0.15} ${layer.width*0.5} ${layer.height*0.26} Z`}
          {...common}
        />
      )}
      {isActive && <Transformer ref={trRef} {...TR_PROPS} />}
    </>
  )
}
